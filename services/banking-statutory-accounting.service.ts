import { prisma } from "@/lib/prisma";
import { PrismaClient, Prisma } from "@prisma/client";
import {
  JournalPostingService,
  DbClientOrTx,
  ActorContext,
  JournalEntryWithLines,
} from "./journal-posting.service";
import { JournalEntryInput, JournalLineInput } from "./journal-validator.service";
import { roundToPaisa, toPaise, fromPaise } from "@/lib/utils/currency";
import { AuditService } from "./audit.service";
import { AccountingEngine } from "./accounting-engine.service";

export class BankingStatutoryAccountingService {
  /**
   * Helper to derive Indian Financial Year string (e.g. "2026-27") from a Date.
   */
  static getFinancialYear(dateInput: Date | string): string {
    const d = new Date(dateInput);
    const month = d.getMonth() + 1; // 1-indexed (1 to 12)
    const year = d.getFullYear();
    const startYear = month >= 4 ? year : year - 1;
    const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
    return `${startYear}-${endYearShort}`;
  }

  /**
   * Resolves a BankAccount record from ID, account number, or name.
   * Throws an informative error if nonexistent or inactive.
   */
  static async resolveBankAccount(
    identifier?: string | null,
    fallbackIdentifier?: string | null,
    dbOrTx: DbClientOrTx = prisma
  ) {
    const client = dbOrTx as any;
    const lookup = identifier || fallbackIdentifier;
    if (!lookup) {
      // Fallback to primary active bank account
      const primary = await client.bankAccount.findFirst({
        where: { isPrimary: true, isActive: true },
      });
      if (primary) return primary;

      const firstActive = await client.bankAccount.findFirst({
        where: { isActive: true },
      });
      if (!firstActive) {
        throw new Error("InvalidBankAccountError: No active bank account found in the system.");
      }
      return firstActive;
    }

    // Try lookup by ObjectId only if string matches 24-char hex pattern
    let acc = null;
    const isObjectId = typeof lookup === "string" && /^[0-9a-fA-F]{24}$/.test(lookup);
    if (isObjectId) {
      try {
        acc = await client.bankAccount.findUnique({ where: { id: lookup } });
      } catch {
        acc = null;
      }
    }

    if (!acc) {
      // Try lookup by accountNumber
      acc = await client.bankAccount.findFirst({
        where: { accountNumber: lookup },
      });
    }

    if (!acc) {
      // Try lookup by accountName or bankName
      acc = await client.bankAccount.findFirst({
        where: {
          OR: [
            { accountName: lookup },
            { bankName: lookup },
          ],
        },
      });
    }

    if (!acc) {
      // Partial match for compound strings like "HDFC Bank (Current)"
      const allAccounts = await client.bankAccount.findMany();
      acc = allAccounts.find((a: any) =>
        lookup.includes(a.accountNumber) ||
        lookup.includes(a.bankName) ||
        (a.accountName && lookup.includes(a.accountName))
      ) || null;
    }

    if (!acc) {
      throw new Error(`InvalidBankAccountError: Bank account '${lookup}' does not exist.`);
    }

    if (acc.isActive === false) {
      throw new Error(`InactiveBankAccountError: Bank account '${acc.bankName}' (${acc.accountName || acc.id}) is inactive.`);
    }

    return acc;
  }

  // ==========================================================================
  // 1. BANK TRANSFERS & CONTRA POSTINGS
  // ==========================================================================

  /**
   * Posts a balanced Contra journal for an inter-bank fund transfer.
   * Debit: Destination Bank Account
   * Credit: Source Bank Account
   * Amount: Actual transfer amount
   * Zero impact on Revenue, Expense, GST, or TDS.
   */
  static async postBankTransfer(
    transferId: string,
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines> {
    const client = dbOrTx as any;
    const transfer = await client.bankTransfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new Error(`BankTransferNotFound: Bank transfer '${transferId}' does not exist.`);
    }

    if (transfer.status === "CANCELLED" || transfer.status === "REVERSED") {
      throw new Error(`CancelledTransferError: Cannot post journal for cancelled bank transfer '${transferId}'.`);
    }

    const amount = roundToPaisa(transfer.amount);
    if (amount <= 0) {
      throw new Error("InvalidTransferAmountError: Transfer amount must be greater than zero.");
    }

    // Resolve source and destination bank accounts
    const fromBank = await this.resolveBankAccount(transfer.fromAccountId, transfer.fromAccount, dbOrTx);
    const toBank = await this.resolveBankAccount(transfer.toAccountId, transfer.toAccount, dbOrTx);

    if (fromBank.id === toBank.id) {
      throw new Error("IdenticalAccountTransferError: Source and destination bank accounts must be different.");
    }

    const transferDate = transfer.date || new Date();
    const financialYear = this.getFinancialYear(transferDate);
    const idempotencyKey = `transfer_${transfer.id}_v1`;

    const lines: JournalLineInput[] = [
      // 1. Debit Destination Bank Account (Asset Inflow)
      {
        lineNumber: 1,
        accountId: `bank_${toBank.id}`,
        accountCode: `BANK-${toBank.accountNumber.slice(-4)}`,
        accountName: `${toBank.bankName} (${toBank.accountName || "Current"})`,
        financialType: "ASSET",
        statementGroup: "Cash and Bank Balances",
        normalBalance: "DEBIT",
        debit: amount,
        credit: 0,
        particulars: `Contra transfer received from ${fromBank.bankName}`,
        entityType: "BANK",
        entityId: toBank.id,
        bankAccountId: toBank.id,
      },
      // 2. Credit Source Bank Account (Asset Outflow)
      {
        lineNumber: 2,
        accountId: `bank_${fromBank.id}`,
        accountCode: `BANK-${fromBank.accountNumber.slice(-4)}`,
        accountName: `${fromBank.bankName} (${fromBank.accountName || "Current"})`,
        financialType: "ASSET",
        statementGroup: "Cash and Bank Balances",
        normalBalance: "DEBIT",
        debit: 0,
        credit: amount,
        particulars: `Contra transfer disbursed to ${toBank.bankName}`,
        entityType: "BANK",
        entityId: fromBank.id,
        bankAccountId: fromBank.id,
      },
    ];

    const journalInput: JournalEntryInput = {
      entryType: "CONTRA",
      accountingDate: transferDate,
      financialYear,
      sourceType: "BANK_TRANSFER",
      sourceId: transfer.id,
      sourceNumber: transfer.reference || `TRF-${transfer.id.slice(-6)}`,
      narration: transfer.description || `Inter-bank fund transfer from ${fromBank.bankName} to ${toBank.bankName}`,
      reference: transfer.reference || null,
      postedBy: actor?.name || actor?.email || "Banking Service",
      authorizedBy: actor?.email || null,
      idempotencyKey,
      lines,
    };

    const postedJournal = await JournalPostingService.postJournalEntry(journalInput, actor, dbOrTx);

    // Update bankTransfer record with canonical bank account IDs
    await client.bankTransfer.update({
      where: { id: transfer.id },
      data: {
        fromAccountId: fromBank.id,
        toAccountId: toBank.id,
        status: "COMPLETED",
      },
    });

    AccountingEngine.invalidateCache();
    return postedJournal;
  }

  /**
   * Reverses a posted Bank Transfer journal cleanly upon cancellation or deletion.
   */
  static async reverseBankTransfer(
    transferId: string,
    reason: string = "Bank transfer cancelled or deleted",
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines | null> {
    const client = dbOrTx as any;
    const transfer = await client.bankTransfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new Error(`BankTransferNotFound: Bank transfer '${transferId}' does not exist.`);
    }

    const originalJournal = await client.journalEntry.findFirst({
      where: {
        sourceType: "BANK_TRANSFER",
        sourceId: transferId,
        status: "POSTED",
      },
    });

    if (!originalJournal) {
      return null;
    }

    const reversal = await JournalPostingService.reverseJournalEntry(
      {
        originalEntryId: originalJournal.id,
        reason,
        actor: actor || { id: "banking_service", name: "Banking Service", email: "banking@kvj.local" },
      },
      dbOrTx
    );

    await client.bankTransfer.update({
      where: { id: transferId },
      data: { status: "REVERSED" },
    });

    AccountingEngine.invalidateCache();
    return reversal;
  }

  // ==========================================================================
  // 2. BANK RECONCILIATION ADJUSTMENTS
  // ==========================================================================

  /**
   * Posts an auditable reconciliation adjustment journal (e.g. Bank Charges, Bank Interest, or Correction).
   */
  static async postReconciliationAdjustment(
    data: {
      bankAccountId: string;
      adjustmentType: "BANK_CHARGES" | "INTEREST_RECEIVED" | "CUSTOM";
      amount: number;
      date: Date | string;
      reference?: string;
      particulars?: string;
      contraAccountId?: string;
      contraAccountName?: string;
      contraFinancialType?: string;
      contraStatementGroup?: string;
      contraNormalBalance?: string;
    },
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines> {
    const client = dbOrTx as any;
    const bank = await this.resolveBankAccount(data.bankAccountId, null, dbOrTx);
    const amount = roundToPaisa(data.amount);

    if (amount <= 0) {
      throw new Error("InvalidAdjustmentAmountError: Adjustment amount must be greater than zero.");
    }

    const accountingDate = new Date(data.date);
    const financialYear = this.getFinancialYear(accountingDate);
    const idempotencyKey = `brs_adj_${bank.id}_${accountingDate.toISOString().split("T")[0]}_${amount}_${data.adjustmentType}_v1`;

    const lines: JournalLineInput[] = [];

    if (data.adjustmentType === "BANK_CHARGES") {
      // Debit: Bank Charges (Expense)
      lines.push({
        lineNumber: 1,
        accountId: "cat_bank_charges",
        accountCode: "EXP-BANK-CHG",
        accountName: "Bank Charges & Commission",
        financialType: "EXPENSE",
        statementGroup: "Finance Costs",
        normalBalance: "DEBIT",
        debit: amount,
        credit: 0,
        particulars: data.particulars || "Bank service charges deducted per statement",
      });
      // Credit: Bank Account (Asset Outflow)
      lines.push({
        lineNumber: 2,
        accountId: `bank_${bank.id}`,
        accountCode: `BANK-${bank.accountNumber.slice(-4)}`,
        accountName: `${bank.bankName} (${bank.accountName || "Current"})`,
        financialType: "ASSET",
        statementGroup: "Cash and Bank Balances",
        normalBalance: "DEBIT",
        debit: 0,
        credit: amount,
        particulars: data.particulars || "Bank charges outflow",
        entityType: "BANK",
        entityId: bank.id,
        bankAccountId: bank.id,
      });
    } else if (data.adjustmentType === "INTEREST_RECEIVED") {
      // Debit: Bank Account (Asset Inflow)
      lines.push({
        lineNumber: 1,
        accountId: `bank_${bank.id}`,
        accountCode: `BANK-${bank.accountNumber.slice(-4)}`,
        accountName: `${bank.bankName} (${bank.accountName || "Current"})`,
        financialType: "ASSET",
        statementGroup: "Cash and Bank Balances",
        normalBalance: "DEBIT",
        debit: amount,
        credit: 0,
        particulars: data.particulars || "Bank interest credited per statement",
        entityType: "BANK",
        entityId: bank.id,
        bankAccountId: bank.id,
      });
      // Credit: Interest Income (Income)
      lines.push({
        lineNumber: 2,
        accountId: "inc_bank_interest",
        accountCode: "INC-BANK-INT",
        accountName: "Interest on Bank Deposits",
        financialType: "INCOME",
        statementGroup: "Other Income",
        normalBalance: "CREDIT",
        debit: 0,
        credit: amount,
        particulars: data.particulars || "Bank interest received",
      });
    } else {
      // Custom contra entry
      const contraId = data.contraAccountId || "cat_general_adj";
      const contraName = data.contraAccountName || "Reconciliation Adjustment";
      const contraType = data.contraFinancialType || "EXPENSE";
      const contraGroup = data.contraStatementGroup || "Other Expenses";
      const contraNorm = data.contraNormalBalance || "DEBIT";

      lines.push({
        lineNumber: 1,
        accountId: contraId,
        accountCode: "ADJ-CUSTOM",
        accountName: contraName,
        financialType: contraType,
        statementGroup: contraGroup,
        normalBalance: contraNorm,
        debit: amount,
        credit: 0,
        particulars: data.particulars || "Reconciliation adjustment",
      });
      lines.push({
        lineNumber: 2,
        accountId: `bank_${bank.id}`,
        accountCode: `BANK-${bank.accountNumber.slice(-4)}`,
        accountName: `${bank.bankName} (${bank.accountName || "Current"})`,
        financialType: "ASSET",
        statementGroup: "Cash and Bank Balances",
        normalBalance: "DEBIT",
        debit: 0,
        credit: amount,
        particulars: data.particulars || "Bank adjustment outflow",
        entityType: "BANK",
        entityId: bank.id,
        bankAccountId: bank.id,
      });
    }

    const journalInput: JournalEntryInput = {
      entryType: "ADJUSTMENT",
      accountingDate,
      financialYear,
      sourceType: "MANUAL_ADJUSTMENT",
      sourceId: bank.id,
      sourceNumber: data.reference || `BRS-ADJ-${Date.now().toString().slice(-6)}`,
      narration: data.particulars || `Bank reconciliation adjustment for ${bank.bankName}`,
      reference: data.reference || null,
      postedBy: actor?.name || actor?.email || "BRS Service",
      authorizedBy: actor?.email || null,
      idempotencyKey,
      lines,
    };

    const entry = await JournalPostingService.postJournalEntry(journalInput, actor, dbOrTx);
    AccountingEngine.invalidateCache();
    return entry;
  }

  // ==========================================================================
  // 3. GST SETTLEMENT & STATUTORY TAX PAYMENT
  // ==========================================================================

  /**
   * Posts a balanced General Ledger journal for GST Settlement & Challan Payment.
   * Settles Output GST liabilities against Input GST credits (ITC) and records bank challan remittance.
   * Zero duplicate GST expense recognized!
   */
  static async postGstSettlement(
    settlementId: string,
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines> {
    const client = dbOrTx as any;
    const settlement = await client.gstSettlement.findUnique({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new Error(`GstSettlementNotFound: GST Settlement '${settlementId}' does not exist.`);
    }

    const cgstPaid = roundToPaisa(settlement.cgstPaid || 0);
    const sgstPaid = roundToPaisa(settlement.sgstPaid || 0);
    const igstPaid = roundToPaisa(settlement.igstPaid || 0);
    const itcCgst = roundToPaisa(settlement.itcCgstUtilized || 0);
    const itcSgst = roundToPaisa(settlement.itcSgstUtilized || 0);
    const itcIgst = roundToPaisa(settlement.itcIgstUtilized || 0);

    const totalCashPaid = roundToPaisa(cgstPaid + sgstPaid + igstPaid);
    const totalItcUtilized = roundToPaisa(itcCgst + itcSgst + itcIgst);

    if (totalCashPaid === 0 && totalItcUtilized === 0) {
      throw new Error("ZeroSettlementError: Both cash payment and ITC utilization cannot be zero.");
    }

    let bank = null;
    if (totalCashPaid > 0) {
      bank = await this.resolveBankAccount(settlement.bankAccountId, null, dbOrTx);
    }

    const paymentDate = settlement.paymentDate || new Date();
    const financialYear = this.getFinancialYear(paymentDate);
    const idempotencyKey = `gst_settle_${settlement.id}_v1`;

    const lines: JournalLineInput[] = [];
    let nextLineNum = 1;

    // 1. Debit Output GST Liabilities (reducing the tax liabilities)
    const totalCgstSettled = roundToPaisa(cgstPaid + itcCgst);
    if (totalCgstSettled > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "stat_output_cgst",
        accountCode: "GST-OUT-CGST",
        accountName: "Output CGST Payable",
        financialType: "LIABILITY",
        statementGroup: "Statutory Tax Liabilities",
        normalBalance: "CREDIT",
        debit: totalCgstSettled,
        credit: 0,
        particulars: `CGST settled for return period ${settlement.returnPeriod}`,
      });
    }

    const totalSgstSettled = roundToPaisa(sgstPaid + itcSgst);
    if (totalSgstSettled > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "stat_output_sgst",
        accountCode: "GST-OUT-SGST",
        accountName: "Output SGST Payable",
        financialType: "LIABILITY",
        statementGroup: "Statutory Tax Liabilities",
        normalBalance: "CREDIT",
        debit: totalSgstSettled,
        credit: 0,
        particulars: `SGST settled for return period ${settlement.returnPeriod}`,
      });
    }

    const totalIgstSettled = roundToPaisa(igstPaid + itcIgst);
    if (totalIgstSettled > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "stat_output_igst",
        accountCode: "GST-OUT-IGST",
        accountName: "Output IGST Payable",
        financialType: "LIABILITY",
        statementGroup: "Statutory Tax Liabilities",
        normalBalance: "CREDIT",
        debit: totalIgstSettled,
        credit: 0,
        particulars: `IGST settled for return period ${settlement.returnPeriod}`,
      });
    }

    // 2. Credit Input GST Assets (consuming eligible ITC credit balances)
    if (itcCgst > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "stat_input_cgst",
        accountCode: "GST-INP-CGST",
        accountName: "Input CGST Credit (ITC)",
        financialType: "ASSET",
        statementGroup: "Statutory Tax Assets",
        normalBalance: "DEBIT",
        debit: 0,
        credit: itcCgst,
        particulars: `ITC CGST set-off against liability for ${settlement.returnPeriod}`,
      });
    }

    if (itcSgst > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "stat_input_sgst",
        accountCode: "GST-INP-SGST",
        accountName: "Input SGST Credit (ITC)",
        financialType: "ASSET",
        statementGroup: "Statutory Tax Assets",
        normalBalance: "DEBIT",
        debit: 0,
        credit: itcSgst,
        particulars: `ITC SGST set-off against liability for ${settlement.returnPeriod}`,
      });
    }

    if (itcIgst > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "stat_input_igst",
        accountCode: "GST-INP-IGST",
        accountName: "Input IGST Credit (ITC)",
        financialType: "ASSET",
        statementGroup: "Statutory Tax Assets",
        normalBalance: "DEBIT",
        debit: 0,
        credit: itcIgst,
        particulars: `ITC IGST set-off against liability for ${settlement.returnPeriod}`,
      });
    }

    // 3. Credit Bank Account for cash challan remittance
    if (totalCashPaid > 0 && bank) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: `bank_${bank.id}`,
        accountCode: `BANK-${bank.accountNumber.slice(-4)}`,
        accountName: `${bank.bankName} (${bank.accountName || "Current"})`,
        financialType: "ASSET",
        statementGroup: "Cash and Bank Balances",
        normalBalance: "DEBIT",
        debit: 0,
        credit: totalCashPaid,
        particulars: `GST Challan Payment (CIN: ${settlement.challanRef || "PMT-06"}) for ${settlement.returnPeriod}`,
        entityType: "BANK",
        entityId: bank.id,
        bankAccountId: bank.id,
      });
    }

    const journalInput: JournalEntryInput = {
      entryType: totalCashPaid > 0 ? "PAYMENT" : "JOURNAL",
      accountingDate: paymentDate,
      financialYear,
      sourceType: "GST_SETTLEMENT",
      sourceId: settlement.id,
      sourceNumber: settlement.settlementNumber || `GST-SETTLE-${settlement.id.slice(-6)}`,
      narration: settlement.notes || `GST Settlement & Challan remittance for ${settlement.returnPeriod}`,
      reference: settlement.challanRef || null,
      postedBy: actor?.name || actor?.email || "GST Service",
      authorizedBy: actor?.email || null,
      idempotencyKey,
      lines,
    };

    const entry = await JournalPostingService.postJournalEntry(journalInput, actor, dbOrTx);
    AccountingEngine.invalidateCache();
    return entry;
  }

  /**
   * Reverses a GST settlement journal upon deletion or reopening.
   */
  static async reverseGstSettlement(
    settlementId: string,
    reason: string = "GST settlement deleted or reopened",
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines | null> {
    const client = dbOrTx as any;
    const originalJournal = await client.journalEntry.findFirst({
      where: {
        sourceType: "GST_SETTLEMENT",
        sourceId: settlementId,
        status: "POSTED",
      },
    });

    if (!originalJournal) {
      return null;
    }

    const reversal = await JournalPostingService.reverseJournalEntry(
      {
        originalEntryId: originalJournal.id,
        reason,
        actor: actor || { id: "gst_service", name: "GST Service", email: "gst@kvj.local" },
      },
      dbOrTx
    );

    AccountingEngine.invalidateCache();
    return reversal;
  }

  // ==========================================================================
  // 4. TDS DEPOSIT & CHALLAN REMITTANCE
  // ==========================================================================

  /**
   * Posts a balanced General Ledger journal when depositing withheld TDS to the Government (ITNS 281).
   * Debit: Statutory TDS Payable (reduces liability)
   * Credit: Bank Account (cash outflow)
   * Does NOT recognize TDS as an expense at deposit time!
   */
  static async postTdsDeposit(
    depositId: string,
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines> {
    const client = dbOrTx as any;
    const deposit = await client.tdsDeposit.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new Error(`TdsDepositNotFound: TDS deposit record '${depositId}' does not exist.`);
    }

    const amountPaid = roundToPaisa(deposit.amountPaid);
    if (amountPaid <= 0) {
      throw new Error("InvalidTdsDepositAmountError: TDS deposit amount must be greater than zero.");
    }

    const bank = await this.resolveBankAccount(deposit.bankAccountId, deposit.bankAccount, dbOrTx);
    const depositDate = deposit.depositDate || new Date();
    const financialYear = this.getFinancialYear(depositDate);
    const idempotencyKey = `tds_deposit_${deposit.id}_v1`;

    const sectionLabel = deposit.section || "194J/194C";

    const lines: JournalLineInput[] = [
      // 1. Debit Statutory TDS Payable (Clearing Liability)
      {
        lineNumber: 1,
        accountId: "stat_tds_payable",
        accountCode: "TDS-PAY-194",
        accountName: `Statutory TDS Payable (${sectionLabel})`,
        financialType: "LIABILITY",
        statementGroup: "Statutory Tax Liabilities",
        normalBalance: "CREDIT",
        debit: amountPaid,
        credit: 0,
        particulars: `TDS Challan ITNS 281 deposit (BSR: ${deposit.bsrCode || "N/A"}, Challan: ${deposit.challanNumber})`,
      },
      // 2. Credit Bank Account (Outflow)
      {
        lineNumber: 2,
        accountId: `bank_${bank.id}`,
        accountCode: `BANK-${bank.accountNumber.slice(-4)}`,
        accountName: `${bank.bankName} (${bank.accountName || "Current"})`,
        financialType: "ASSET",
        statementGroup: "Cash and Bank Balances",
        normalBalance: "DEBIT",
        debit: 0,
        credit: amountPaid,
        particulars: `TDS Remittance via ${bank.bankName}`,
        entityType: "BANK",
        entityId: bank.id,
        bankAccountId: bank.id,
      },
    ];

    const journalInput: JournalEntryInput = {
      entryType: "PAYMENT",
      accountingDate: depositDate,
      financialYear,
      sourceType: "TDS_DEPOSIT",
      sourceId: deposit.id,
      sourceNumber: deposit.challanNumber,
      narration: deposit.notes || `TDS deposit for ${deposit.financialYear} (${deposit.quarter || "Annual"}) under Section ${sectionLabel}`,
      reference: deposit.challanNumber || null,
      postedBy: actor?.name || actor?.email || "TDS Service",
      authorizedBy: actor?.email || null,
      idempotencyKey,
      lines,
    };

    const entry = await JournalPostingService.postJournalEntry(journalInput, actor, dbOrTx);

    // Ensure deposit record stores the canonical bankAccountId
    await client.tdsDeposit.update({
      where: { id: deposit.id },
      data: { bankAccountId: bank.id },
    });

    AccountingEngine.invalidateCache();
    return entry;
  }

  /**
   * Reverses a TDS deposit journal upon deletion or reopening.
   */
  static async reverseTdsDeposit(
    depositId: string,
    reason: string = "TDS deposit cancelled or deleted",
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines | null> {
    const client = dbOrTx as any;
    const originalJournal = await client.journalEntry.findFirst({
      where: {
        sourceType: "TDS_DEPOSIT",
        sourceId: depositId,
        status: "POSTED",
      },
    });

    if (!originalJournal) {
      return null;
    }

    const reversal = await JournalPostingService.reverseJournalEntry(
      {
        originalEntryId: originalJournal.id,
        reason,
        actor: actor || { id: "tds_service", name: "TDS Service", email: "tds@kvj.local" },
      },
      dbOrTx
    );

    AccountingEngine.invalidateCache();
    return reversal;
  }

  // ==========================================================================
  // 5. FIXED ASSETS: DEPRECIATION & DISPOSAL
  // ==========================================================================

  /**
   * Calculates annual depreciation using SLM or WDV conventions.
   * Enforces that Net Book Value (NBV) never becomes negative.
   */
  static async calculateDepreciation(
    expenseId: string,
    method: "WDV" | "SLM",
    rate: number,
    financialYear: string,
    salvageValue: number = 0,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<{
    grossCost: number;
    accumulatedDepreciation: number;
    currentNBV: number;
    depreciationAmount: number;
    remainingNBV: number;
  }> {
    const client = dbOrTx as any;
    const expense = await client.expense.findUnique({
      where: { id: expenseId },
      include: { depreciations: true },
    });

    if (!expense) {
      throw new Error(`ExpenseNotFound: Asset expense record '${expenseId}' does not exist.`);
    }

    if (!expense.isAsset) {
      throw new Error("InvalidAssetError: Selected transaction is not marked as a Fixed Asset.");
    }

    // Capitalized Gross Cost: taxableAmount if ITC eligible, grossAmount if ITC ineligible
    const isItcEligible = expense.isItcEligible !== false;
    const grossCost = isItcEligible
      ? roundToPaisa(expense.taxableAmount || 0)
      : roundToPaisa(expense.grossAmount || (Number(expense.taxableAmount || 0) + Number(expense.totalInputGST || 0)));

    // Sum of PRIOR depreciations (excluding the requested FY if updating)
    const priorDepreciations = (expense.depreciations || []).filter(
      (d: any) => d.financialYear !== financialYear
    );
    const accumDep = roundToPaisa(
      priorDepreciations.reduce((sum: number, d: any) => sum + Number(d.depreciationAmount || 0), 0)
    );

    const currentNBV = Math.max(0, roundToPaisa(grossCost - accumDep));
    const effectiveSalvage = Math.max(0, roundToPaisa(salvageValue));

    let depreciationAmount = 0;
    if (method === "SLM") {
      // Straight Line Method: Base = (Gross Cost - Salvage Value) * (Rate / 100)
      const depreciableBase = Math.max(0, roundToPaisa(grossCost - effectiveSalvage));
      depreciationAmount = roundToPaisa(depreciableBase * (rate / 100));
    } else {
      // Written Down Value: Base = Current NBV * (Rate / 100)
      depreciationAmount = roundToPaisa(currentNBV * (rate / 100));
    }

    // Cap depreciation so NBV cannot fall below salvage value or zero
    const maxPermissibleDepreciation = Math.max(0, roundToPaisa(currentNBV - effectiveSalvage));
    depreciationAmount = Math.min(depreciationAmount, maxPermissibleDepreciation);

    const remainingNBV = Math.max(0, roundToPaisa(currentNBV - depreciationAmount));

    return {
      grossCost,
      accumulatedDepreciation: accumDep,
      currentNBV,
      depreciationAmount,
      remainingNBV,
    };
  }

  /**
   * Posts annual depreciation journal entry for a Fixed Asset.
   * Debit: Depreciation Expense
   * Credit: Accumulated Depreciation
   */
  static async postAssetDepreciation(
    depreciationId: string,
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines> {
    const client = dbOrTx as any;
    const dep = await client.assetDepreciation.findUnique({
      where: { id: depreciationId },
      include: {
        expense: {
          include: { category: true },
        },
      },
    });

    if (!dep) {
      throw new Error(`DepreciationNotFound: Asset depreciation record '${depreciationId}' does not exist.`);
    }

    const amount = roundToPaisa(dep.depreciationAmount);
    if (amount <= 0) {
      throw new Error("ZeroDepreciationError: Depreciation amount must be greater than zero.");
    }

    const effectiveDate = dep.effectiveDate || new Date();
    const financialYear = dep.financialYear || this.getFinancialYear(effectiveDate);
    const idempotencyKey = `depr_${dep.expenseId}_${financialYear}_v1`;

    const lines: JournalLineInput[] = [
      // 1. Debit Depreciation Expense
      {
        lineNumber: 1,
        accountId: "cat_depreciation",
        accountCode: "EXP-DEP-001",
        accountName: "Depreciation & Amortisation Expense",
        financialType: "EXPENSE",
        statementGroup: "Depreciation and Amortisation Expenses",
        normalBalance: "DEBIT",
        debit: amount,
        credit: 0,
        particulars: `Annual depreciation (${dep.method || "WDV"} @ ${dep.rate || 0}%) for ${dep.expense.expenseNumber} for ${financialYear}`,
        entityType: "CATEGORY",
        entityId: dep.expense.categoryId || undefined,
      },
      // 2. Credit Accumulated Depreciation (Contra Asset)
      {
        lineNumber: 2,
        accountId: "asset_depr_accum",
        accountCode: "AST-DEP-ACCUM",
        accountName: "Accumulated Depreciation - Fixed Assets",
        financialType: "ASSET",
        statementGroup: "Property, Plant & Equipment",
        normalBalance: "CREDIT",
        debit: 0,
        credit: amount,
        particulars: `Accumulated depreciation reserve on ${dep.expense.description || "Fixed Asset"}`,
        entityType: "ASSET",
        entityId: dep.expenseId,
      },
    ];

    const journalInput: JournalEntryInput = {
      entryType: "JOURNAL",
      accountingDate: effectiveDate,
      financialYear,
      sourceType: "ASSET_DEPRECIATION",
      sourceId: dep.id,
      sourceNumber: `${dep.expense.expenseNumber}-DEP-${financialYear}`,
      narration: dep.remarks || `Annual ${dep.method} depreciation for ${dep.expense.expenseNumber} (${financialYear})`,
      reference: dep.expense.expenseNumber,
      postedBy: actor?.name || actor?.email || "Depreciation Engine",
      authorizedBy: actor?.email || null,
      idempotencyKey,
      lines,
    };

    const entry = await JournalPostingService.postJournalEntry(journalInput, actor, dbOrTx);
    AccountingEngine.invalidateCache();
    return entry;
  }

  /**
   * Reverses an asset depreciation journal upon deletion.
   */
  static async reverseAssetDepreciation(
    depreciationId: string,
    reason: string = "Depreciation entry removed",
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines | null> {
    const client = dbOrTx as any;
    const originalJournal = await client.journalEntry.findFirst({
      where: {
        sourceType: "ASSET_DEPRECIATION",
        sourceId: depreciationId,
        status: "POSTED",
      },
    });

    if (!originalJournal) {
      return null;
    }

    const reversal = await JournalPostingService.reverseJournalEntry(
      {
        originalEntryId: originalJournal.id,
        reason,
        actor: actor || { id: "depr_service", name: "Depreciation Service", email: "depr@kvj.local" },
      },
      dbOrTx
    );

    AccountingEngine.invalidateCache();
    return reversal;
  }

  /**
   * Posts an Asset Disposal journal.
   * Removes gross cost from Fixed Assets.
   * Removes accumulated depreciation.
   * Records sale proceeds into Bank.
   * Recognizes Gain on Disposal (Income) or Loss on Disposal (Expense).
   */
  static async postAssetDisposal(
    disposalId: string,
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines> {
    const client = dbOrTx as any;
    const disposal = await client.assetDisposal.findUnique({
      where: { id: disposalId },
      include: {
        expense: {
          include: { category: true },
        },
      },
    });

    if (!disposal) {
      throw new Error(`AssetDisposalNotFound: Disposal record '${disposalId}' does not exist.`);
    }

    const grossCost = roundToPaisa(disposal.grossCost);
    const accumDep = roundToPaisa(disposal.accumulatedDepreciation || 0);
    const saleProceeds = roundToPaisa(disposal.saleProceeds || 0);
    const netBookValue = Math.max(0, roundToPaisa(grossCost - accumDep));
    const gainOrLoss = roundToPaisa(saleProceeds - netBookValue);

    let bank = null;
    if (saleProceeds > 0) {
      bank = await this.resolveBankAccount(disposal.bankAccountId, null, dbOrTx);
    }

    const disposalDate = disposal.disposalDate || new Date();
    const financialYear = this.getFinancialYear(disposalDate);
    const idempotencyKey = `disposal_${disposal.expenseId}_v1`;

    const lines: JournalLineInput[] = [];
    let nextLineNum = 1;

    // 1. Debit Bank Account for sale proceeds
    if (saleProceeds > 0 && bank) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: `bank_${bank.id}`,
        accountCode: `BANK-${bank.accountNumber.slice(-4)}`,
        accountName: `${bank.bankName} (${bank.accountName || "Current"})`,
        financialType: "ASSET",
        statementGroup: "Cash and Bank Balances",
        normalBalance: "DEBIT",
        debit: saleProceeds,
        credit: 0,
        particulars: `Disposal proceeds for ${disposal.expense.expenseNumber} from ${disposal.buyerName || "Buyer"}`,
        entityType: "BANK",
        entityId: bank.id,
        bankAccountId: bank.id,
      });
    }

    // 2. Debit Accumulated Depreciation (clearing the asset's accumulated depreciation)
    if (accumDep > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "asset_depr_accum",
        accountCode: "AST-DEP-ACCUM",
        accountName: "Accumulated Depreciation - Fixed Assets",
        financialType: "ASSET",
        statementGroup: "Property, Plant & Equipment",
        normalBalance: "CREDIT",
        debit: accumDep,
        credit: 0,
        particulars: `Derecognition of accumulated depreciation upon disposal of ${disposal.expense.expenseNumber}`,
        entityType: "ASSET",
        entityId: disposal.expenseId,
      });
    }

    // 3. Gain or Loss recognition
    if (gainOrLoss < 0) {
      // Net Loss on disposal -> Debit Loss Expense
      const lossAmount = Math.abs(gainOrLoss);
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "exp_asset_loss",
        accountCode: "EXP-DISP-LOSS",
        accountName: "Loss on Disposal of Fixed Assets",
        financialType: "EXPENSE",
        statementGroup: "Other Expenses",
        normalBalance: "DEBIT",
        debit: lossAmount,
        credit: 0,
        particulars: `Loss on sale of ${disposal.expense.description || "Fixed Asset"}`,
      });
    } else if (gainOrLoss > 0) {
      // Net Gain on disposal -> Credit Gain Income
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "inc_asset_gain",
        accountCode: "INC-DISP-GAIN",
        accountName: "Gain on Disposal of Fixed Assets",
        financialType: "INCOME",
        statementGroup: "Other Income",
        normalBalance: "CREDIT",
        debit: 0,
        credit: gainOrLoss,
        particulars: `Gain on sale of ${disposal.expense.description || "Fixed Asset"}`,
      });
    }

    // 4. Credit Fixed Assets account (derecognizing historical cost)
    lines.push({
      lineNumber: nextLineNum++,
      accountId: "asset_fixed",
      accountCode: "ASSET-FIXED-001",
      accountName: "Fixed Assets & Equipment",
      financialType: "ASSET",
      statementGroup: "Property, Plant & Equipment",
      normalBalance: "DEBIT",
      debit: 0,
      credit: grossCost,
      particulars: `Derecognition of gross cost on disposal of ${disposal.expense.expenseNumber}`,
      entityType: "ASSET",
      entityId: disposal.expenseId,
    });

    const journalInput: JournalEntryInput = {
      entryType: "JOURNAL",
      accountingDate: disposalDate,
      financialYear,
      sourceType: "ASSET_DISPOSAL",
      sourceId: disposal.id,
      sourceNumber: `DISP-${disposal.expense.expenseNumber}`,
      narration: disposal.notes || `Disposal of Fixed Asset ${disposal.expense.expenseNumber} (Proceeds: ₹${saleProceeds}, Gain/Loss: ₹${gainOrLoss})`,
      reference: disposal.buyerName || null,
      postedBy: actor?.name || actor?.email || "Asset Management",
      authorizedBy: actor?.email || null,
      idempotencyKey,
      lines,
    };

    const entry = await JournalPostingService.postJournalEntry(journalInput, actor, dbOrTx);
    AccountingEngine.invalidateCache();
    return entry;
  }

  /**
   * Reverses an asset disposal journal upon deletion.
   */
  static async reverseAssetDisposal(
    disposalId: string,
    reason: string = "Disposal cancelled",
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines | null> {
    const client = dbOrTx as any;
    const originalJournal = await client.journalEntry.findFirst({
      where: {
        sourceType: "ASSET_DISPOSAL",
        sourceId: disposalId,
        status: "POSTED",
      },
    });

    if (!originalJournal) {
      return null;
    }

    const reversal = await JournalPostingService.reverseJournalEntry(
      {
        originalEntryId: originalJournal.id,
        reason,
        actor: actor || { id: "asset_service", name: "Asset Service", email: "asset@kvj.local" },
      },
      dbOrTx
    );

    AccountingEngine.invalidateCache();
    return reversal;
  }

  // ==========================================================================
  // 6. LOAN MANAGEMENT: DRAWDOWN & REPAYMENT
  // ==========================================================================

  /**
   * Posts a balanced journal for a Loan Drawdown / Disbursement.
   * Debit: Bank Account receiving funds
   * Credit: Loan Payable (Borrowings liability)
   * NEVER recognizes loan principal as revenue!
   */
  static async postLoanDrawdown(
    loanId: string,
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines> {
    const client = dbOrTx as any;
    const loan = await client.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan) {
      throw new Error(`LoanNotFound: Loan '${loanId}' does not exist.`);
    }

    const principal = roundToPaisa(loan.principalAmount);
    if (principal <= 0) {
      throw new Error("InvalidLoanPrincipalError: Loan principal amount must be greater than zero.");
    }

    const bank = await this.resolveBankAccount(loan.bankAccountId, null, dbOrTx);
    const disbursementDate = loan.disbursementDate || new Date();
    const financialYear = this.getFinancialYear(disbursementDate);
    const idempotencyKey = `loan_drawdown_${loan.id}_v1`;

    const lines: JournalLineInput[] = [
      // 1. Debit Bank Account (Funds Inflow)
      {
        lineNumber: 1,
        accountId: `bank_${bank.id}`,
        accountCode: `BANK-${bank.accountNumber.slice(-4)}`,
        accountName: `${bank.bankName} (${bank.accountName || "Current"})`,
        financialType: "ASSET",
        statementGroup: "Cash and Bank Balances",
        normalBalance: "DEBIT",
        debit: principal,
        credit: 0,
        particulars: `Loan drawdown received from ${loan.lenderName}`,
        entityType: "BANK",
        entityId: bank.id,
        bankAccountId: bank.id,
      },
      // 2. Credit Loan Liability (Borrowings)
      {
        lineNumber: 2,
        accountId: `loan_${loan.id}`,
        accountCode: `LOAN-${loan.loanNumber.slice(-6)}`,
        accountName: `Loan Payable - ${loan.lenderName}`,
        financialType: "LIABILITY",
        statementGroup: "Borrowings / Loans Payable",
        normalBalance: "CREDIT",
        debit: 0,
        credit: principal,
        particulars: `${loan.loanType || "Term"} Loan from ${loan.lenderName} (${loan.loanNumber})`,
        entityType: "LOAN",
        entityId: loan.id,
      },
    ];

    const journalInput: JournalEntryInput = {
      entryType: "RECEIPT",
      accountingDate: disbursementDate,
      financialYear,
      sourceType: "LOAN_RECEIPT",
      sourceId: loan.id,
      sourceNumber: loan.loanNumber,
      narration: loan.notes || `Loan disbursement from ${loan.lenderName} (${loan.loanNumber})`,
      reference: loan.loanNumber,
      postedBy: actor?.name || actor?.email || "Loan Service",
      authorizedBy: actor?.email || null,
      idempotencyKey,
      lines,
    };

    const entry = await JournalPostingService.postJournalEntry(journalInput, actor, dbOrTx);
    AccountingEngine.invalidateCache();
    return entry;
  }

  /**
   * Posts a balanced journal for a Loan Repayment with Principal/Interest split.
   * Debit: Loan Payable (principal portion)
   * Debit: Loan Interest Expense (interest portion)
   * Credit: Bank Account (total payment)
   * Principal is NOT an expense; only interest is an expense.
   */
  static async postLoanRepayment(
    repaymentId: string,
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines> {
    const client = dbOrTx as any;
    const repayment = await client.loanRepayment.findUnique({
      where: { id: repaymentId },
      include: { loan: true },
    });

    if (!repayment) {
      throw new Error(`LoanRepaymentNotFound: Loan repayment '${repaymentId}' does not exist.`);
    }

    const loan = repayment.loan;
    const pAmt = roundToPaisa(repayment.principalAmount || 0);
    const iAmt = roundToPaisa(repayment.interestAmount || 0);
    const totAmt = roundToPaisa(repayment.totalAmount || (pAmt + iAmt));

    if (pAmt < 0 || iAmt < 0) {
      throw new Error("InvalidRepaymentAmountError: Principal and interest amounts cannot be negative.");
    }

    if (totAmt <= 0) {
      throw new Error("ZeroRepaymentError: Total repayment amount must be greater than zero.");
    }

    if (roundToPaisa(pAmt + iAmt) !== totAmt) {
      throw new Error(`RepaymentSplitMismatchError: Sum of principal (₹${pAmt}) and interest (₹${iAmt}) does not match total amount (₹${totAmt}).`);
    }

    const bank = await this.resolveBankAccount(repayment.bankAccountId, loan.bankAccountId, dbOrTx);
    const paymentDate = repayment.paymentDate || new Date();
    const financialYear = this.getFinancialYear(paymentDate);
    const idempotencyKey = `loan_repayment_${repayment.id}_v1`;

    const lines: JournalLineInput[] = [];
    let nextLineNum = 1;

    // 1. Debit Loan Payable for Principal repayment
    if (pAmt > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: `loan_${loan.id}`,
        accountCode: `LOAN-${loan.loanNumber.slice(-6)}`,
        accountName: `Loan Payable - ${loan.lenderName}`,
        financialType: "LIABILITY",
        statementGroup: "Borrowings / Loans Payable",
        normalBalance: "CREDIT",
        debit: pAmt,
        credit: 0,
        particulars: `Principal repayment on ${loan.loanNumber}`,
        entityType: "LOAN",
        entityId: loan.id,
      });
    }

    // 2. Debit Interest Expense for Finance Cost
    if (iAmt > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "exp_loan_interest",
        accountCode: "EXP-FIN-INT",
        accountName: "Loan Interest Expense",
        financialType: "EXPENSE",
        statementGroup: "Finance Costs",
        normalBalance: "DEBIT",
        debit: iAmt,
        credit: 0,
        particulars: `Interest portion on loan ${loan.loanNumber}`,
      });
    }

    // 3. Credit Bank Account for total outflow
    lines.push({
      lineNumber: nextLineNum++,
      accountId: `bank_${bank.id}`,
      accountCode: `BANK-${bank.accountNumber.slice(-4)}`,
      accountName: `${bank.bankName} (${bank.accountName || "Current"})`,
      financialType: "ASSET",
      statementGroup: "Cash and Bank Balances",
      normalBalance: "DEBIT",
      debit: 0,
      credit: totAmt,
      particulars: `Loan EMI / Repayment to ${loan.lenderName}`,
      entityType: "BANK",
      entityId: bank.id,
      bankAccountId: bank.id,
    });

    const journalInput: JournalEntryInput = {
      entryType: "PAYMENT",
      accountingDate: paymentDate,
      financialYear,
      sourceType: "LOAN_REPAYMENT",
      sourceId: repayment.id,
      sourceNumber: repayment.reference || `REPAY-${repayment.id.slice(-6)}`,
      narration: repayment.notes || `Repayment on ${loan.lenderName} loan ${loan.loanNumber} (Principal: ₹${pAmt}, Interest: ₹${iAmt})`,
      reference: repayment.reference || null,
      postedBy: actor?.name || actor?.email || "Loan Service",
      authorizedBy: actor?.email || null,
      idempotencyKey,
      lines,
    };

    const entry = await JournalPostingService.postJournalEntry(journalInput, actor, dbOrTx);
    AccountingEngine.invalidateCache();
    return entry;
  }

  /**
   * Reverses a loan repayment journal upon deletion.
   */
  static async reverseLoanRepayment(
    repaymentId: string,
    reason: string = "Loan repayment deleted",
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines | null> {
    const client = dbOrTx as any;
    const originalJournal = await client.journalEntry.findFirst({
      where: {
        sourceType: "LOAN_REPAYMENT",
        sourceId: repaymentId,
        status: "POSTED",
      },
    });

    if (!originalJournal) {
      return null;
    }

    const reversal = await JournalPostingService.reverseJournalEntry(
      {
        originalEntryId: originalJournal.id,
        reason,
        actor: actor || { id: "loan_service", name: "Loan Service", email: "loan@kvj.local" },
      },
      dbOrTx
    );

    AccountingEngine.invalidateCache();
    return reversal;
  }
}
