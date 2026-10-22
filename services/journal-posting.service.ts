import { prisma } from "@/lib/prisma";
import { PrismaClient, Prisma, JournalEntry, JournalLine, AuditLog } from "@prisma/client";
import { JournalValidator, JournalEntryInput, ValidatedJournalEntry } from "./journal-validator.service";
import { AtomicNumberingService } from "./atomic-numbering.service";

export type JournalEntryWithLines = JournalEntry & {
  lines: JournalLine[];
};

export interface ActorContext {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export class IdempotencyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdempotencyConflictError";
  }
}

export class FiscalPeriodLockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FiscalPeriodLockedError";
  }
}

export class InvalidReversalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidReversalError";
  }
}

export class JournalPostingService {
  private static readonly MAX_TRANSACTION_RETRIES = 5;

  /**
   * Helper to detect MongoDB transient transaction errors (e.g. WriteConflict, Error 112, P2034).
   */
  private static isTransientError(error: any): boolean {
    if (!error) return false;
    const msg = String(error.message || "").toLowerCase();
    const code = error.code;
    return (
      code === "P2034" || // Prisma transaction write conflict / deadlock
      code === 112 || // MongoDB WriteConflict
      code === 251 || // MongoDB NoSuchTransaction
      msg.includes("write conflict") ||
      msg.includes("writeconflict") ||
      msg.includes("deadlock") ||
      msg.includes("transaction has been aborted") ||
      msg.includes("transienttransactionerror") ||
      msg.includes("retry your transaction")
    );
  }

  /**
   * Posts a balanced double-entry journal voucher atomically with audit logging and idempotency.
   */
  static async postJournalEntry(
    input: JournalEntryInput,
    actor?: ActorContext,
    db: PrismaClient = prisma
  ): Promise<JournalEntryWithLines> {
    // Step 1: Pre-validation of input schema and paise equality
    const validated = JournalValidator.validateOrThrow(input);

    // Step 2: Idempotency Check (Fast Path before transaction)
    const existingEntry = await db.journalEntry.findUnique({
      where: { idempotencyKey: validated.idempotencyKey },
      include: { lines: { orderBy: { lineNumber: "asc" } } },
    });

    if (existingEntry) {
      // If it exists, verify whether it matches the exact same source document & debit sum
      const sameSource = existingEntry.sourceId === validated.sourceId && existingEntry.sourceType === validated.sourceType;
      const sameAmount = Math.abs(existingEntry.totalDebit - validated.totalDebit) < 0.005;

      if (sameSource && sameAmount) {
        // Safe idempotent replay: return existing entry without creating duplicate records or audit logs
        return existingEntry as JournalEntryWithLines;
      }

      throw new IdempotencyConflictError(
        `An existing journal voucher (${existingEntry.entryNumber}) already exists with idempotency key '${validated.idempotencyKey}' for a different source document or amount.`
      );
    }

    // Step 3: Fiscal Period Lock Verification
    await this.verifyFiscalPeriodOpen(validated.accountingDate, validated.fiscalPeriodId, db);

    // Step 4: Reversal Sanity Check
    if (validated.reversalOfId) {
      await this.verifyReversalPrerequisites(validated.reversalOfId, db);
    }

    // Step 5: Atomic Transaction Execution with Bounded Retries for Transient Errors
    let attempts = 0;
    while (attempts < this.MAX_TRANSACTION_RETRIES) {
      attempts++;
      try {
        return await this.executeTransactionalPost(validated, actor, db);
      } catch (err: any) {
        // If another concurrent request just committed the exact same idempotency key
        const replay = await db.journalEntry.findUnique({
          where: { idempotencyKey: validated.idempotencyKey },
          include: { lines: { orderBy: { lineNumber: "asc" } } },
        });

        if (replay) {
          const sameSource = replay.sourceId === validated.sourceId && replay.sourceType === validated.sourceType;
          const sameAmount = Math.abs(replay.totalDebit - validated.totalDebit) < 0.005;
          if (sameSource && sameAmount) {
            return replay as JournalEntryWithLines;
          }
          throw new IdempotencyConflictError(
            `Idempotency Conflict: Key '${validated.idempotencyKey}' was committed by a concurrent request with different parameters.`
          );
        }

        // Retry only if transient MongoDB error
        if (this.isTransientError(err) && attempts < this.MAX_TRANSACTION_RETRIES) {
          const delayMs = attempts * 60 + Math.floor(Math.random() * 60);
          await new Promise((res) => setTimeout(res, delayMs));
          continue;
        }

        throw err;
      }
    }

    throw new Error(`JournalPostingError: Exceeded maximum transaction retries (${this.MAX_TRANSACTION_RETRIES}).`);
  }

  /**
   * Internal transactional execution logic.
   */
  private static async executeTransactionalPost(
    validated: ValidatedJournalEntry,
    actor?: ActorContext,
    db: PrismaClient = prisma
  ): Promise<JournalEntryWithLines> {
    return await db.$transaction(async (tx) => {
      // 1. Allocate Entry Number if not already provided
      let entryNumber = validated.entryNumber;
      if (!entryNumber) {
        const fyClean = validated.financialYear.replace(/[^0-9]/g, "");
        const prefix = `${validated.entryType}-${fyClean}`;
        const seq = await AtomicNumberingService.getNextSequence(tx, prefix);
        entryNumber = seq.formattedNumber;
      }

      // 2. Create JournalEntry and nested JournalLine records atomically
      const created = await tx.journalEntry.create({
        data: {
          entryNumber,
          entryType: validated.entryType,
          accountingDate: validated.accountingDate,
          financialYear: validated.financialYear,
          fiscalPeriodId: validated.fiscalPeriodId,
          sourceType: validated.sourceType,
          sourceId: validated.sourceId,
          sourceNumber: validated.sourceNumber,
          narration: validated.narration,
          reference: validated.reference,
          totalDebit: validated.totalDebit,
          totalCredit: validated.totalCredit,
          isBalanced: validated.isBalanced,
          status: "POSTED",
          postedBy: actor?.id || validated.postedBy || null,
          authorizedBy: actor?.id || validated.authorizedBy || null,
          idempotencyKey: validated.idempotencyKey,
          reversalOfId: validated.reversalOfId,
          reversalReason: validated.reversalReason,
          lines: {
            create: validated.lines.map((l) => ({
              lineNumber: l.lineNumber,
              accountId: l.accountId,
              accountCode: l.accountCode || null,
              accountName: l.accountName,
              financialType: l.financialType,
              statementGroup: l.statementGroup,
              normalBalance: l.normalBalance,
              debit: l.debit,
              credit: l.credit,
              particulars: l.particulars || null,
              entityType: l.entityType || null,
              entityId: l.entityId || null,
              bankAccountId: l.bankAccountId || null,
            })),
          },
        },
        include: {
          lines: { orderBy: { lineNumber: "asc" } },
        },
      });

      // 3. If this is a reversal entry, atomically update the original target entry
      if (validated.reversalOfId) {
        await tx.journalEntry.update({
          where: { id: validated.reversalOfId },
          data: {
            status: "REVERSED",
            reversedAt: new Date(),
            reversalReason: validated.reversalReason || `Reversed by voucher ${created.entryNumber}`,
          },
        });
      }

      // 4. Create immutable AuditLog entry in the same transaction
      const auditAction =
        validated.entryType === "REVERSAL"
          ? "REVERSE_JOURNAL"
          : validated.entryType === "ADJUSTMENT"
          ? "ADJUSTMENT_JOURNAL"
          : "POST_JOURNAL";

      await tx.auditLog.create({
        data: {
          actorId: actor?.id || null,
          actorName: actor?.name || "System / Automated",
          actorEmail: actor?.email || "system@kvj.local",
          action: auditAction,
          entity: "JournalEntry",
          entityId: created.id,
          changeSummary: `${created.entryType} voucher ${created.entryNumber} posted for ₹${created.totalDebit.toFixed(2)} with ${created.lines.length} lines.`,
          reason: validated.reversalReason || validated.narration,
          afterState: {
            entryNumber: created.entryNumber,
            entryType: created.entryType,
            accountingDate: created.accountingDate,
            financialYear: created.financialYear,
            sourceType: created.sourceType,
            sourceId: created.sourceId,
            totalDebit: created.totalDebit,
            totalCredit: created.totalCredit,
            isBalanced: created.isBalanced,
            linesCount: created.lines.length,
          },
        },
      });

      return created as JournalEntryWithLines;
    }, { timeout: 15000 });
  }

  /**
   * Reverses a previously posted journal voucher by generating and persisting an exact inverse entry.
   */
  /**
   * Reverses a previously posted journal voucher by generating and persisting an exact inverse entry.
   */
  static async reverseJournalEntry(
    params: {
      originalEntryId: string;
      reason: string;
      actor: ActorContext;
      accountingDate?: Date;
      financialYear?: string;
    },
    db: PrismaClient = prisma
  ): Promise<JournalEntryWithLines> {
    const { originalEntryId, reason, actor, accountingDate, financialYear } = params;

    if (!reason || !reason.trim()) {
      throw new Error("InvalidReversalError: Cancellation/reversal reason is required.");
    }

    const original = await db.journalEntry.findUnique({
      where: { id: originalEntryId },
      include: { lines: { orderBy: { lineNumber: "asc" } } },
    });

    if (!original) {
      throw new InvalidReversalError(`Original journal entry '${originalEntryId}' was not found.`);
    }

    if (original.status === "REVERSED") {
      throw new InvalidReversalError(`Journal voucher '${original.entryNumber}' has already been reversed.`);
    }

    if (original.entryType === "REVERSAL") {
      throw new InvalidReversalError(`Cannot reverse a reversal voucher (${original.entryNumber}).`);
    }

    // Invert the lines: all original debits become credits; all original credits become debits
    const invertedLines = original.lines.map((line, idx) => ({
      lineNumber: idx + 1,
      accountId: line.accountId,
      accountCode: line.accountCode,
      accountName: line.accountName,
      financialType: line.financialType,
      statementGroup: line.statementGroup,
      normalBalance: line.normalBalance,
      debit: line.credit, // Invert
      credit: line.debit, // Invert
      particulars: `Reversal: ${line.particulars || original.narration}`,
      entityType: line.entityType,
      entityId: line.entityId,
      bankAccountId: line.bankAccountId,
    }));

    const targetDate = accountingDate || new Date();
    const targetFY = financialYear || original.financialYear;

    const reversalInput: JournalEntryInput = {
      entryType: "REVERSAL",
      accountingDate: targetDate,
      financialYear: targetFY,
      sourceType: original.sourceType,
      sourceId: original.sourceId,
      sourceNumber: original.sourceNumber,
      narration: `Reversal of ${original.entryNumber}: ${reason}`,
      reference: `REV-${original.entryNumber}`,
      postedBy: actor.id || null,
      authorizedBy: actor.id || null,
      idempotencyKey: `REVERSAL:${original.id}`,
      reversalOfId: original.id,
      reversalReason: reason,
      lines: invertedLines,
    };

    return await this.postJournalEntry(reversalInput, actor, db);
  }

  /**
   * Posts an authorized administrative adjustment journal voucher.
   */
  static async postManualAdjustment(
    params: {
      input: JournalEntryInput;
      actor: ActorContext;
      justification: string;
    },
    db: PrismaClient = prisma
  ): Promise<JournalEntryWithLines> {
    const { input, actor, justification } = params;

    if (!justification || !justification.trim()) {
      throw new Error("AdministrativeAdjustmentError: Written business justification is required.");
    }

    // Force entryType to ADJUSTMENT
    const adjustmentInput: JournalEntryInput = {
      ...input,
      entryType: "ADJUSTMENT",
      postedBy: actor.id || null,
      authorizedBy: actor.id || null,
      idempotencyKey: input.idempotencyKey.startsWith("ADJUSTMENT:")
        ? input.idempotencyKey
        : `ADJUSTMENT:${input.idempotencyKey}`,
      reversalReason: justification,
    };

    return await this.postJournalEntry(adjustmentInput, actor, db);
  }

  /**
   * Period locking validation.
   */
  private static async verifyFiscalPeriodOpen(date: Date, fiscalPeriodId?: string | null, db: PrismaClient = prisma) {
    if (fiscalPeriodId) {
      const period = await db.fiscalPeriod.findUnique({
        where: { id: fiscalPeriodId },
      });
      if (period?.isLocked) {
        throw new FiscalPeriodLockedError(
          `Accounting Period '${period.periodName}' is locked. Posting transactions into closed periods is prohibited.`
        );
      }
      return;
    }

    // Auto-match by date
    const lockedPeriod = await db.fiscalPeriod.findFirst({
      where: {
        startDate: { lte: date },
        endDate: { gte: date },
        isLocked: true,
      },
    });

    if (lockedPeriod) {
      throw new FiscalPeriodLockedError(
        `Accounting Period '${lockedPeriod.periodName}' covering date ${date.toISOString().slice(0, 10)} is locked.`
      );
    }
  }

  /**
   * Verification of reversal prerequisites.
   */
  private static async verifyReversalPrerequisites(reversalOfId: string, db: PrismaClient = prisma) {
    const target = await db.journalEntry.findUnique({
      where: { id: reversalOfId },
    });
    if (!target) {
      throw new InvalidReversalError(`Target journal entry for reversal (${reversalOfId}) does not exist.`);
    }
    if (target.status === "REVERSED") {
      throw new InvalidReversalError(`Journal entry ${target.entryNumber} has already been reversed.`);
    }
    if (target.entryType === "REVERSAL") {
      throw new InvalidReversalError(`Cannot reverse entry ${target.entryNumber} because it is already a reversal.`);
    }
  }
}
