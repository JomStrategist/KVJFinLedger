import { JournalEntryType, JournalSourceType } from "@prisma/client";
import { toPaise, fromPaise, roundToPaisa } from "@/lib/utils/currency";

export interface JournalLineInput {
  lineNumber?: number;
  accountId: string;
  accountCode?: string | null;
  accountName: string;
  financialType: string;
  statementGroup: string;
  normalBalance: string;
  debit?: number;
  credit?: number;
  particulars?: string | null;
  entityType?: "CUSTOMER" | "VENDOR" | "EMPLOYEE" | "BANK" | "LOAN" | "CATEGORY" | string | null;
  entityId?: string | null;
  bankAccountId?: string | null;
}

export interface JournalEntryInput {
  entryNumber?: string;
  entryType: JournalEntryType;
  accountingDate: Date | string;
  financialYear: string;
  fiscalPeriodId?: string | null;
  sourceType: JournalSourceType;
  sourceId: string;
  sourceNumber?: string | null;
  narration: string;
  reference?: string | null;
  postedBy?: string | null;
  authorizedBy?: string | null;
  idempotencyKey: string;
  reversalOfId?: string | null;
  reversalReason?: string | null;
  lines: JournalLineInput[];
}

export interface ValidatedJournalLine extends JournalLineInput {
  lineNumber: number;
  debit: number;
  credit: number;
  debitPaise: number;
  creditPaise: number;
}

export interface ValidatedJournalEntry extends Omit<JournalEntryInput, "lines"> {
  accountingDate: Date;
  totalDebit: number;
  totalCredit: number;
  totalDebitPaise: number;
  totalCreditPaise: number;
  isBalanced: boolean;
  lines: ValidatedJournalLine[];
}

export interface JournalValidationResult {
  isValid: boolean;
  errors: string[];
  validatedEntry?: ValidatedJournalEntry;
}

const VALID_FINANCIAL_TYPES = new Set(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]);
const VALID_NORMAL_BALANCES = new Set(["DEBIT", "CREDIT"]);

export class JournalValidator {
  /**
   * Validates a proposed journal voucher against strict double-entry invariants:
   * 1. Header non-empty fields & valid accounting date.
   * 2. Rejects empty journals and journals with fewer than 2 lines.
   * 3. Rejects invalid, non-finite, negative, or dual-sided (both Dr & Cr) line amounts.
   * 4. Enforces EXACT paise-level equilibrium: sum(debitPaise) === sum(creditPaise).
   * 5. Rejects unbalanced journals immediately without artificial balancing plugs.
   */
  static validate(input: JournalEntryInput): JournalValidationResult {
    const errors: string[] = [];

    // --- 1. Header Validation ---
    if (!input) {
      return { isValid: false, errors: ["Journal entry input is required."] };
    }

    if (!input.idempotencyKey || typeof input.idempotencyKey !== "string" || !input.idempotencyKey.trim()) {
      errors.push("Idempotency key is required and must be a non-empty string.");
    }

    if (!input.sourceType) {
      errors.push("Source type is required.");
    }

    if (!input.sourceId || typeof input.sourceId !== "string" || !input.sourceId.trim()) {
      errors.push("Source document ID is required.");
    }

    if (!input.entryType) {
      errors.push("Entry type is required.");
    }

    if (!input.narration || typeof input.narration !== "string" || !input.narration.trim()) {
      errors.push("Journal narration is required.");
    }

    if (!input.financialYear || typeof input.financialYear !== "string" || !input.financialYear.trim()) {
      errors.push("Financial year is required (e.g. '2026-27').");
    }

    const accountingDate = input.accountingDate instanceof Date ? input.accountingDate : new Date(input.accountingDate);
    if (isNaN(accountingDate.getTime())) {
      errors.push("Invalid accounting date.");
    }

    // --- 2. Line Items Presence ---
    if (!Array.isArray(input.lines) || input.lines.length < 2) {
      errors.push("A valid double-entry journal requires at least two lines (at least one debit and one credit).");
      return { isValid: false, errors };
    }

    // --- 3. Line-by-Line Mathematical & Metadata Validation ---
    let totalDebitPaise = 0;
    let totalCreditPaise = 0;
    const validatedLines: ValidatedJournalLine[] = [];

    let hasDebit = false;
    let hasCredit = false;

    input.lines.forEach((line, index) => {
      const lineNum = line.lineNumber ?? (index + 1);

      if (!line.accountId || typeof line.accountId !== "string" || !line.accountId.trim()) {
        errors.push(`Line ${lineNum}: Account reference (accountId) is required.`);
      }

      if (!line.accountName || typeof line.accountName !== "string" || !line.accountName.trim()) {
        errors.push(`Line ${lineNum}: Account name snapshot is required.`);
      }

      const finType = (line.financialType || "").toUpperCase().trim();
      if (!VALID_FINANCIAL_TYPES.has(finType)) {
        errors.push(`Line ${lineNum}: Invalid financial type '${line.financialType}'. Must be ASSET, LIABILITY, EQUITY, INCOME, or EXPENSE.`);
      }

      const normBal = (line.normalBalance || "").toUpperCase().trim();
      if (!VALID_NORMAL_BALANCES.has(normBal)) {
        errors.push(`Line ${lineNum}: Invalid normal balance '${line.normalBalance}'. Must be DEBIT or CREDIT.`);
      }

      const rawDebit = line.debit ?? 0;
      const rawCredit = line.credit ?? 0;

      // Check non-finite / NaN
      if (typeof rawDebit !== "number" || isNaN(rawDebit) || !isFinite(rawDebit)) {
        errors.push(`Line ${lineNum}: Debit amount is not a valid finite number.`);
      }
      if (typeof rawCredit !== "number" || isNaN(rawCredit) || !isFinite(rawCredit)) {
        errors.push(`Line ${lineNum}: Credit amount is not a valid finite number.`);
      }

      // Check negative amounts
      if (rawDebit < 0) {
        errors.push(`Line ${lineNum}: Debit amount cannot be negative (${rawDebit}).`);
      }
      if (rawCredit < 0) {
        errors.push(`Line ${lineNum}: Credit amount cannot be negative (${rawCredit}).`);
      }

      // Check dual-sided or zero-sided line
      const debitPaise = toPaise(rawDebit);
      const creditPaise = toPaise(rawCredit);

      if (debitPaise === 0 && creditPaise === 0) {
        errors.push(`Line ${lineNum}: Line must have either a non-zero debit or credit amount.`);
      }

      if (debitPaise > 0 && creditPaise > 0) {
        errors.push(`Line ${lineNum}: A single line cannot have both debit (₹${fromPaise(debitPaise)}) and credit (₹${fromPaise(creditPaise)}). Separate into distinct lines.`);
      }

      if (debitPaise > 0) hasDebit = true;
      if (creditPaise > 0) hasCredit = true;

      totalDebitPaise += debitPaise;
      totalCreditPaise += creditPaise;

      validatedLines.push({
        ...line,
        lineNumber: lineNum,
        financialType: finType,
        normalBalance: normBal,
        debit: fromPaise(debitPaise),
        credit: fromPaise(creditPaise),
        debitPaise,
        creditPaise,
      });
    });

    if (!hasDebit) {
      errors.push("Journal entry must contain at least one debit line.");
    }
    if (!hasCredit) {
      errors.push("Journal entry must contain at least one credit line.");
    }

    // --- 4. Double-Entry Equilibrium at Paise Precision ---
    if (totalDebitPaise !== totalCreditPaise) {
      const diffPaise = Math.abs(totalDebitPaise - totalCreditPaise);
      const diffRupees = fromPaise(diffPaise);
      errors.push(
        `Unbalanced Journal: Total Debits (₹${fromPaise(totalDebitPaise).toFixed(2)}) do not equal Total Credits (₹${fromPaise(totalCreditPaise).toFixed(2)}). Discrepancy: ₹${diffRupees.toFixed(2)} (${diffPaise} paise). Artificial balancing is strictly prohibited.`
      );
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    const validatedEntry: ValidatedJournalEntry = {
      entryNumber: input.entryNumber,
      entryType: input.entryType,
      accountingDate,
      financialYear: input.financialYear,
      fiscalPeriodId: input.fiscalPeriodId || null,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceNumber: input.sourceNumber || null,
      narration: input.narration.trim(),
      reference: input.reference || null,
      postedBy: input.postedBy || null,
      authorizedBy: input.authorizedBy || null,
      idempotencyKey: input.idempotencyKey.trim(),
      reversalOfId: input.reversalOfId || null,
      reversalReason: input.reversalReason || null,
      totalDebit: fromPaise(totalDebitPaise),
      totalCredit: fromPaise(totalCreditPaise),
      totalDebitPaise,
      totalCreditPaise,
      isBalanced: totalDebitPaise === totalCreditPaise,
      lines: validatedLines,
    };

    return { isValid: true, errors: [], validatedEntry };
  }

  /**
   * Convenience wrapper that throws an explicit ValidationError if validation fails.
   */
  static validateOrThrow(input: JournalEntryInput): ValidatedJournalEntry {
    const result = this.validate(input);
    if (!result.isValid || !result.validatedEntry) {
      const errorMsg = result.errors.join("; ");
      throw new Error(`JournalValidationError: ${errorMsg}`);
    }
    return result.validatedEntry;
  }
}
