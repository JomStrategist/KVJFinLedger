import { prisma } from "@/lib/prisma";
import { PrismaClient, Prisma } from "@prisma/client";
import { FiscalPeriodLockedError, ActorContext, DbClientOrTx } from "./journal-posting.service";

export interface FinancialYearBounds {
  financialYear: string;
  startDate: Date;
  endDate: Date;
}

export interface YearClosingValidationResult {
  canClose: boolean;
  blockingFailures: string[];
  warnings: string[];
  trialBalanceBalanced: boolean;
  trialBalanceDifference: number;
  totalJournals: number;
  unbalancedJournalsCount: number;
  orphanLinesCount: number;
}

export class FiscalPeriodService {
  /**
   * Determine Indian Financial Year ("YYYY-YY") from a given calendar date.
   * Indian FY runs 1 April to 31 March.
   * e.g.:
   *   2026-03-31 -> "2025-26"
   *   2026-04-01 -> "2026-27"
   */
  static getFinancialYear(date: Date = new Date()): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-indexed: 0=Jan, 2=Mar, 3=Apr

    if (month >= 3) {
      // April to December: Current Year to Next Year
      const nextYearShort = String(year + 1).slice(-2);
      return `${year}-${nextYearShort}`;
    } else {
      // January to March: Previous Year to Current Year
      const prevYear = year - 1;
      const curYearShort = String(year).slice(-2);
      return `${prevYear}-${curYearShort}`;
    }
  }

  /**
   * Parse Indian Financial Year string and return exact boundary dates.
   * Format accepted: "2026-27", "FY 2026-27", "FY 2026–27"
   */
  static getFinancialYearBounds(fyStr?: string): FinancialYearBounds {
    let startYear: number;
    const now = new Date();

    if (!fyStr || fyStr === "ALL" || fyStr === "Custom" || fyStr === "CURRENT_FY") {
      const currentFy = this.getFinancialYear(now);
      const match = currentFy.match(/\d{4}/);
      startYear = match ? parseInt(match[0], 10) : now.getFullYear();
    } else if (fyStr === "PREVIOUS_FY") {
      const currentFy = this.getFinancialYear(now);
      const match = currentFy.match(/\d{4}/);
      startYear = match ? parseInt(match[0], 10) - 1 : now.getFullYear() - 1;
    } else {
      const match = fyStr.match(/\d{4}/);
      if (match) {
        startYear = parseInt(match[0], 10);
      } else {
        startYear = now.getFullYear();
      }
    }

    const nextYearShort = String(startYear + 1).slice(-2);
    const standardFy = `${startYear}-${nextYearShort}`;

    // 01-April 00:00:00.000 to 31-March 23:59:59.999
    const startDate = new Date(startYear, 3, 1, 0, 0, 0, 0);
    const endDate = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);

    return {
      financialYear: standardFy,
      startDate,
      endDate,
    };
  }

  /**
   * Validate date range: reject when toDate is strictly earlier than fromDate.
   */
  static validateDateRange(fromDate?: Date, toDate?: Date): void {
    if (fromDate && toDate && toDate.getTime() < fromDate.getTime()) {
      throw new Error(
        `InvalidDateRangeError: End date (${toDate.toISOString().slice(0, 10)}) cannot be earlier than start date (${fromDate.toISOString().slice(0, 10)}).`
      );
    }
  }

  /**
   * Asserts whether the fiscal period covering a date or periodId is currently open for mutations.
   */
  static async assertPeriodOpen(
    date: Date,
    fiscalPeriodId?: string | null,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<void> {
    const client = dbOrTx as any;

    if (fiscalPeriodId) {
      const period = await client.fiscalPeriod.findUnique({
        where: { id: fiscalPeriodId },
      });
      if (period?.isLocked) {
        throw new FiscalPeriodLockedError(
          `Accounting Period '${period.periodName}' is locked. Posting transactions into closed periods is prohibited.`
        );
      }
      return;
    }

    // Check date against locked fiscal periods
    const lockedPeriod = await client.fiscalPeriod.findFirst({
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
   * Get or initialize monthly / annual fiscal period record.
   */
  static async ensureFiscalPeriod(
    date: Date,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<any> {
    const client = dbOrTx as any;
    const fy = this.getFinancialYear(date);
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0 to 11
    const periodCode = `${year}-${String(month + 1).padStart(2, "0")}`;

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const periodName = `${monthNames[month]} ${year}`;

    const startDate = new Date(year, month, 1, 0, 0, 0, 0);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = new Date(year, month, lastDay, 23, 59, 59, 999);

    const existing = await client.fiscalPeriod.findUnique({
      where: { periodCode },
    });

    if (existing) return existing;

    return await client.fiscalPeriod.create({
      data: {
        financialYear: fy,
        periodName,
        periodCode,
        startDate,
        endDate,
        isLocked: false,
      },
    });
  }

  /**
   * Lock an existing fiscal period with audit logging.
   */
  static async lockPeriod(
    periodCodeOrId: string,
    actor: ActorContext,
    reason: string,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<any> {
    const client = dbOrTx as any;
    const period = await client.fiscalPeriod.findFirst({
      where: {
        OR: [{ id: periodCodeOrId }, { periodCode: periodCodeOrId }],
      },
    });

    if (!period) {
      throw new Error(`Fiscal period '${periodCodeOrId}' not found.`);
    }

    const updated = await client.fiscalPeriod.update({
      where: { id: period.id },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: actor.name || actor.email || "Admin",
        lockReason: reason,
      },
    });

    await client.auditLog.create({
      data: {
        actorId: actor.id || null,
        actorName: actor.name || "System",
        actorEmail: actor.email || "system@kvj.local",
        action: "LOCK_PERIOD",
        entity: "FiscalPeriod",
        entityId: period.id,
        changeSummary: `Fiscal Period ${period.periodName} (${period.periodCode}) was locked. Reason: ${reason}`,
        reason,
      },
    });

    return updated;
  }

  /**
   * Unlock a previously locked fiscal period.
   */
  static async unlockPeriod(
    periodCodeOrId: string,
    actor: ActorContext,
    reason: string,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<any> {
    const client = dbOrTx as any;
    const period = await client.fiscalPeriod.findFirst({
      where: {
        OR: [{ id: periodCodeOrId }, { periodCode: periodCodeOrId }],
      },
    });

    if (!period) {
      throw new Error(`Fiscal period '${periodCodeOrId}' not found.`);
    }

    const updated = await client.fiscalPeriod.update({
      where: { id: period.id },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedBy: null,
        lockReason: null,
      },
    });

    await client.auditLog.create({
      data: {
        actorId: actor.id || null,
        actorName: actor.name || "System",
        actorEmail: actor.email || "system@kvj.local",
        action: "UNLOCK_PERIOD",
        entity: "FiscalPeriod",
        entityId: period.id,
        changeSummary: `Fiscal Period ${period.periodName} (${period.periodCode}) was unlocked. Reason: ${reason}`,
        reason,
      },
    });

    return updated;
  }

  /**
   * Validate financial year before closing.
   * Checks for Trial Balance equilibrium, orphan lines, unposted entries, etc.
   */
  static async validateFinancialYearClosing(
    financialYear: string,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<YearClosingValidationResult> {
    const client = dbOrTx as any;
    const bounds = this.getFinancialYearBounds(financialYear);
    const blockingFailures: string[] = [];
    const warnings: string[] = [];

    // 1. Fetch all journal entries for the FY
    const entries = await client.journalEntry.findMany({
      where: {
        accountingDate: {
          gte: bounds.startDate,
          lte: bounds.endDate,
        },
      },
      include: {
        lines: true,
      },
    });

    const totalJournals = entries.length;
    let totalDebitPaise = 0;
    let totalCreditPaise = 0;
    let unbalancedJournalsCount = 0;

    for (const entry of entries) {
      const eDr = entry.lines.reduce((s: number, l: any) => s + Math.round((l.debit || 0) * 100), 0);
      const eCr = entry.lines.reduce((s: number, l: any) => s + Math.round((l.credit || 0) * 100), 0);

      if (eDr !== eCr) {
        unbalancedJournalsCount++;
      }

      totalDebitPaise += eDr;
      totalCreditPaise += eCr;
    }

    const trialBalanceDifference = (totalDebitPaise - totalCreditPaise) / 100;
    const trialBalanceBalanced = totalDebitPaise === totalCreditPaise;

    if (!trialBalanceBalanced) {
      blockingFailures.push(
        `Trial Balance is out of equilibrium by ₹${Math.abs(trialBalanceDifference).toFixed(2)} (${totalDebitPaise} paise Dr vs ${totalCreditPaise} paise Cr).`
      );
    }

    if (unbalancedJournalsCount > 0) {
      blockingFailures.push(
        `Found ${unbalancedJournalsCount} unbalanced journal entries within the financial year.`
      );
    }

    // 2. Check for orphan journal lines
    const sampleLines = await client.journalLine.findMany({
      take: 100,
      select: { id: true, entryId: true },
    });
    const entryIds = Array.from(new Set(sampleLines.map((l: { entryId: string }) => l.entryId).filter(Boolean)));
    const existingEntries = await client.journalEntry.findMany({
      where: { id: { in: entryIds } },
      select: { id: true },
    });
    const existingEntryIdSet = new Set(existingEntries.map((e: { id: string }) => e.id));
    const orphanLinesCount = sampleLines.filter((l: { entryId: string }) => !l.entryId || !existingEntryIdSet.has(l.entryId)).length;
    if (orphanLinesCount > 0) {
      blockingFailures.push(`Found ${orphanLinesCount} orphan journal lines without valid entry linkage.`);
    }

    // 3. Warnings on source coverage
    if (totalJournals === 0) {
      warnings.push(`Zero journal vouchers found for financial year ${bounds.financialYear}.`);
    }

    const canClose = blockingFailures.length === 0;

    return {
      canClose,
      blockingFailures,
      warnings,
      trialBalanceBalanced,
      trialBalanceDifference,
      totalJournals,
      unbalancedJournalsCount,
      orphanLinesCount,
    };
  }

  /**
   * Execute financial year closing after validating pre-conditions.
   */
  static async closeFinancialYear(
    financialYear: string,
    actor: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<{ success: boolean; validation: YearClosingValidationResult; periodRecord: any }> {
    if (actor.role && actor.role !== "ADMIN") {
      throw new Error("UnauthorizedActionError: Only administrators can close a financial year.");
    }

    const validation = await this.validateFinancialYearClosing(financialYear, dbOrTx);
    if (!validation.canClose) {
      throw new Error(
        `YearClosingBlockedError: Cannot close financial year '${financialYear}'. Blockers: ${validation.blockingFailures.join("; ")}`
      );
    }

    const client = dbOrTx as any;
    const bounds = this.getFinancialYearBounds(financialYear);
    const annualPeriodCode = `FY-${bounds.financialYear}`;

    // Upsert annual fiscal period as locked
    const periodRecord = await client.fiscalPeriod.upsert({
      where: { periodCode: annualPeriodCode },
      update: {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: actor.name || actor.email || "Admin",
        lockReason: `Annual Financial Year Closing for ${bounds.financialYear}`,
      },
      create: {
        financialYear: bounds.financialYear,
        periodName: `Full Financial Year ${bounds.financialYear}`,
        periodCode: annualPeriodCode,
        startDate: bounds.startDate,
        endDate: bounds.endDate,
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: actor.name || actor.email || "Admin",
        lockReason: `Annual Financial Year Closing for ${bounds.financialYear}`,
      },
    });

    // Audit log
    await client.auditLog.create({
      data: {
        actorId: actor.id || null,
        actorName: actor.name || "Admin",
        actorEmail: actor.email || "admin@kvj.local",
        action: "CLOSE_FINANCIAL_YEAR",
        entity: "FiscalPeriod",
        entityId: periodRecord.id,
        changeSummary: `Financial Year ${bounds.financialYear} was formally closed and locked by ${actor.name || "Admin"}. Total vouchers: ${validation.totalJournals}.`,
        reason: "Annual Statutory Year-End Closing",
      },
    });

    return {
      success: true,
      validation,
      periodRecord,
    };
  }
}
