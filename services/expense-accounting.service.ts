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

export class ExpenseAccountingService {
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
   * Resolves the canonical bank account to attribute a payment disbursement to.
   * Throws an informative error if an explicitly specified account is invalid/inactive.
   */
  static async resolveBankAccount(
    bankAccountId?: string | null,
    fallbackBankAccountId?: string | null,
    dbOrTx: DbClientOrTx = prisma
  ) {
    const client = dbOrTx as any;
    if (bankAccountId) {
      let b = null;
      try {
        b = await client.bankAccount.findUnique({ where: { id: bankAccountId } });
      } catch {
        b = null;
      }
      if (!b) {
        throw new Error(`InvalidBankAccountError: Disbursing bank account '${bankAccountId}' does not exist.`);
      }
      if (b.isActive === false) {
        throw new Error(`InactiveBankAccountError: Disbursing bank account '${b.bankName}' (${b.accountName || b.id}) is inactive.`);
      }
      return b;
    }
    if (fallbackBankAccountId) {
      let b = null;
      try {
        b = await client.bankAccount.findUnique({ where: { id: fallbackBankAccountId } });
      } catch {
        b = null;
      }
      if (b && b.isActive !== false) return b;
    }
    // Fallback to primary active bank account
    const primary = await client.bankAccount.findFirst({
      where: { isPrimary: true, isActive: true },
    });
    if (primary) return primary;

    // Fallback to any active bank account
    return await client.bankAccount.findFirst({
      where: { isActive: true },
    });
  }

  /**
   * Posts a balanced General Ledger journal for an approved Expense.
   * Supports:
   * - Operating Expenses, Fixed Assets (capitalized), Business Losses, Employee/Salary Expenses
   * - Input GST / ITC eligibility vs ineligible (capitalized into expense/asset)
   * - Company-paid direct bank settlement vs unpaid vendor liability vs employee payable
   * - Statutory TDS withholding liability where deducted at expense creation
   */
  static async postExpenseConfirmation(
    expenseId: string,
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines | null> {
    const client = dbOrTx as any;
    const expense = await client.expense.findUnique({
      where: { id: expenseId },
      include: {
        vendor: true,
        category: true,
        employee: true,
        items: true,
        payments: true,
      },
    });

    if (!expense) {
      throw new Error(`ExpenseNotFound: Cannot post journal for nonexistent expense '${expenseId}'.`);
    }

    if (expense.status === "CANCELLED") {
      throw new Error(`CancelledExpenseError: Cannot post confirmation journal for cancelled expense '${expense.expenseNumber}'.`);
    }

    if (expense.status === "DRAFT") {
      // Draft expenses do not post accounting entries until approved
      return null;
    }

    const catAny = expense.category as any;
    const isAsset = Boolean(expense.isAsset || catAny?.isCapitalAsset || catAny?.accountingClassification === "FIXED_ASSET");
    const isLoss = Boolean(expense.isLoss || catAny?.isLossCategory || catAny?.accountingClassification === "BUSINESS_LOSS");
    const isEmployee = Boolean(expense.employeeId || catAny?.accountingClassification === "EMPLOYEE_EXPENSE");

    const vendorName = expense.vendor?.businessName || expense.vendor?.name || "Vendor";
    const vendorId = expense.vendorId ? `vendor_${expense.vendorId}` : "vendor_cash";
    const employeeName = expense.employee?.name || "Employee";
    const employeeId = expense.employeeId ? `emp_${expense.employeeId}` : "emp_unassigned";

    // Canonical Account Identity determination
    let catId = `cat_${expense.categoryId || "exp_general"}`;
    let catCode = catAny?.code || "EXP-OPS-001";
    let catName = expense.category?.name || "Operating Expenses";
    let catGroup = expense.category?.statementGroup || "Operating Expenses";
    let finType = "EXPENSE";

    if (isAsset) {
      catId = "asset_fixed";
      catCode = "ASSET-FIXED-001";
      catName = "Fixed Assets & Equipment";
      catGroup = "Property, Plant & Equipment";
      finType = "ASSET";
    } else if (isLoss) {
      catId = expense.categoryId ? `cat_${expense.categoryId}` : "cat_exp_loss";
      catCode = catAny?.code || "EXP-LOSS-001";
      catName = expense.lossType ? `Business Loss (${expense.lossType})` : (expense.category?.name || "Business Loss");
      catGroup = "Other Expenses";
      finType = "EXPENSE";
    } else if (isEmployee) {
      catId = expense.categoryId ? `cat_${expense.categoryId}` : "cat_exp_emp";
      catCode = catAny?.code || "EXP-SAL-001";
      catName = expense.category?.name || "Employee Benefit Expenses";
      catGroup = "Employee Benefits Expense";
      finType = "EXPENSE";
    }

    const taxableAmount = roundToPaisa(expense.taxableAmount || 0);
    const inputCgst = roundToPaisa(expense.inputCGST || 0);
    const inputSgst = roundToPaisa(expense.inputSGST || 0);
    const inputIgst = roundToPaisa(expense.inputIGST || 0);
    const totalInputGst = roundToPaisa(expense.totalInputGST || 0);
    const tdsAmount = roundToPaisa(expense.tdsAmount || 0);
    const netAmount = roundToPaisa(expense.netAmount || (taxableAmount + totalInputGst - tdsAmount));

    // FROZEN RULE: Input GST ITC Eligibility
    // If ITC is ineligible, GST is capitalized into the cost of the expense/asset debit!
    const isItcEligible = expense.isItcEligible !== false;
    const expenseDebit = isItcEligible ? taxableAmount : roundToPaisa(taxableAmount + totalInputGst);

    const lines: JournalLineInput[] = [];
    let nextLineNum = 1;

    // 1. Debit Primary Expense or Fixed Asset Account
    lines.push({
      lineNumber: nextLineNum++,
      accountId: catId,
      accountCode: catCode,
      accountName: catName,
      financialType: finType,
      statementGroup: catGroup,
      normalBalance: "DEBIT",
      debit: expenseDebit,
      credit: 0,
      particulars: expense.description || (isAsset ? "Fixed Asset Purchase" : isLoss ? "Business Loss" : "Business Expense"),
      entityType: "CATEGORY",
      entityId: expense.categoryId || undefined,
    });

    // 2. Debit Input Tax Credit accounts (ITC Assets) ONLY if eligible
    if (isItcEligible) {
      if (inputCgst > 0) {
        lines.push({
          lineNumber: nextLineNum++,
          accountId: "stat_input_cgst",
          accountCode: "GST-INP-CGST",
          accountName: "Input CGST Credit (ITC)",
          financialType: "ASSET",
          statementGroup: "Statutory Tax Assets",
          normalBalance: "DEBIT",
          debit: inputCgst,
          credit: 0,
          particulars: `Input CGST on expense ${expense.expenseNumber}`,
        });
      }
      if (inputSgst > 0) {
        lines.push({
          lineNumber: nextLineNum++,
          accountId: "stat_input_sgst",
          accountCode: "GST-INP-SGST",
          accountName: "Input SGST Credit (ITC)",
          financialType: "ASSET",
          statementGroup: "Statutory Tax Assets",
          normalBalance: "DEBIT",
          debit: inputSgst,
          credit: 0,
          particulars: `Input SGST on expense ${expense.expenseNumber}`,
        });
      }
      if (inputIgst > 0) {
        lines.push({
          lineNumber: nextLineNum++,
          accountId: "stat_input_igst",
          accountCode: "GST-INP-IGST",
          accountName: "Input IGST Credit (ITC)",
          financialType: "ASSET",
          statementGroup: "Statutory Tax Assets",
          normalBalance: "DEBIT",
          debit: inputIgst,
          credit: 0,
          particulars: `Input IGST on expense ${expense.expenseNumber}`,
        });
      }
    }

    // 3. Credit Statutory TDS Payable if withheld at expense creation time
    if (tdsAmount > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "stat_tds_payable",
        accountCode: "TDS-PAY-194",
        accountName: `Statutory TDS Payable (${expense.tdsSection || "Section 194J/194C"})`,
        financialType: "LIABILITY",
        statementGroup: "Statutory Tax Liabilities",
        normalBalance: "CREDIT",
        debit: 0,
        credit: tdsAmount,
        particulars: `TDS withheld on expense ${expense.expenseNumber}`,
      });
    }

    // 4. Credit Settlement Liability or Bank Outflow
    // If separate ExpensePayment rows exist, the accrual voucher credits the respective payable
    // (Employee Payable or Vendor Payable), and the ExpensePayment records create their own payment vouchers.
    const hasSeparatePayments = Array.isArray(expense.payments) && expense.payments.length > 0;

    if (expense.paidBy === "EMPLOYEE") {
      // Paid personally by employee -> Company owes employee
      lines.push({
        lineNumber: nextLineNum++,
        accountId: employeeId,
        accountCode: expense.employee?.employeeCode || `EMP-${expense.employeeId?.slice(-4).toUpperCase() || "PAY"}`,
        accountName: `${employeeName} (Employee Payable)`,
        financialType: "LIABILITY",
        statementGroup: "Employee Payables",
        normalBalance: "CREDIT",
        debit: 0,
        credit: netAmount,
        particulars: `Expense incurred by employee ${employeeName}`,
        entityType: "EMPLOYEE",
        entityId: expense.employeeId || undefined,
      });
    } else if (hasSeparatePayments) {
      // Separate payment voucher(s) handle the bank disbursement
      if (expense.employeeId) {
        lines.push({
          lineNumber: nextLineNum++,
          accountId: employeeId,
          accountCode: expense.employee?.employeeCode || `EMP-${expense.employeeId?.slice(-4).toUpperCase() || "PAY"}`,
          accountName: `${employeeName} (Employee Payable)`,
          financialType: "LIABILITY",
          statementGroup: "Employee Payables",
          normalBalance: "CREDIT",
          debit: 0,
          credit: netAmount,
          particulars: `Salary / Remuneration payable to ${employeeName}`,
          entityType: "EMPLOYEE",
          entityId: expense.employeeId || undefined,
        });
      } else {
        lines.push({
          lineNumber: nextLineNum++,
          accountId: vendorId,
          accountCode: expense.vendor?.pan || `VEND-${expense.vendorId?.slice(-4).toUpperCase() || "CASH"}`,
          accountName: `${vendorName} (Trade Payable)`,
          financialType: "LIABILITY",
          statementGroup: "Trade Payables",
          normalBalance: "CREDIT",
          debit: 0,
          credit: netAmount,
          particulars: `Expense payable to ${vendorName}`,
          entityType: "VENDOR",
          entityId: expense.vendorId || undefined,
        });
      }
    } else {
      // Single-step expense without separate ExpensePayment rows
      if (expense.paymentStatus === "PAID") {
        const bankAccount = await this.resolveBankAccount(expense.bankAccountId, null, dbOrTx);
        const bankId = bankAccount?.id ? `bank_${bankAccount.id}` : "default_bank";
        const bankName = bankAccount
          ? `${bankAccount.bankName} (${bankAccount.accountName || "Bank"})`
          : "Primary Bank Account";

        lines.push({
          lineNumber: nextLineNum++,
          accountId: bankId,
          accountCode: bankAccount?.accountNumber ? `BANK-${bankAccount.accountNumber.slice(-4)}` : "BANK-001",
          accountName: bankName,
          financialType: "ASSET",
          statementGroup: "Bank Accounts",
          normalBalance: "DEBIT",
          debit: 0,
          credit: netAmount,
          particulars: `Bank disbursement for expense ${expense.expenseNumber}`,
          entityType: "BANK",
          bankAccountId: bankAccount?.id || undefined,
        });
      } else if (expense.paymentStatus === "PARTIALLY_PAID") {
        const paidAmount = roundToPaisa(expense.paidAmount || 0);
        const balancePayable = roundToPaisa(Math.max(0, netAmount - paidAmount));

        if (paidAmount > 0) {
          const bankAccount = await this.resolveBankAccount(expense.bankAccountId, null, dbOrTx);
          const bankId = bankAccount?.id ? `bank_${bankAccount.id}` : "default_bank";
          const bankName = bankAccount
            ? `${bankAccount.bankName} (${bankAccount.accountName || "Bank"})`
            : "Primary Bank Account";

          lines.push({
            lineNumber: nextLineNum++,
            accountId: bankId,
            accountCode: bankAccount?.accountNumber ? `BANK-${bankAccount.accountNumber.slice(-4)}` : "BANK-001",
            accountName: bankName,
            financialType: "ASSET",
            statementGroup: "Bank Accounts",
            normalBalance: "DEBIT",
            debit: 0,
            credit: paidAmount,
            particulars: `Part payment for expense ${expense.expenseNumber}`,
            entityType: "BANK",
            bankAccountId: bankAccount?.id || undefined,
          });
        }

        if (balancePayable > 0) {
          const targetPayableId = expense.employeeId ? employeeId : vendorId;
          const targetPayableName = expense.employeeId ? `${employeeName} (Employee Payable)` : `${vendorName} (Trade Payable)`;
          const targetGroup = expense.employeeId ? "Employee Payables" : "Trade Payables";
          const targetEntityType = expense.employeeId ? "EMPLOYEE" : "VENDOR";
          const targetEntityId = expense.employeeId || expense.vendorId || undefined;

          lines.push({
            lineNumber: nextLineNum++,
            accountId: targetPayableId,
            accountCode: expense.vendor?.pan || (expense.employee?.employeeCode ?? "PAY-001"),
            accountName: targetPayableName,
            financialType: "LIABILITY",
            statementGroup: targetGroup,
            normalBalance: "CREDIT",
            debit: 0,
            credit: balancePayable,
            particulars: `Outstanding balance payable for ${expense.expenseNumber}`,
            entityType: targetEntityType,
            entityId: targetEntityId,
          });
        }
      } else {
        // UNPAID liability
        const targetPayableId = expense.employeeId ? employeeId : vendorId;
        const targetPayableName = expense.employeeId ? `${employeeName} (Employee Payable)` : `${vendorName} (Trade Payable)`;
        const targetGroup = expense.employeeId ? "Employee Payables" : "Trade Payables";
        const targetEntityType = expense.employeeId ? "EMPLOYEE" : "VENDOR";
        const targetEntityId = expense.employeeId || expense.vendorId || undefined;

        lines.push({
          lineNumber: nextLineNum++,
          accountId: targetPayableId,
          accountCode: expense.vendor?.pan || (expense.employee?.employeeCode ?? "PAY-001"),
          accountName: targetPayableName,
          financialType: "LIABILITY",
          statementGroup: targetGroup,
          normalBalance: "CREDIT",
          debit: 0,
          credit: netAmount,
          particulars: `Outstanding balance payable for ${expense.expenseNumber}`,
          entityType: targetEntityType,
          entityId: targetEntityId,
        });
      }
    }

    // Mathematical equilibrium check to prevent odd-paise drift
    const totalDrPaise = lines.filter((l) => Number(l.debit || 0) > 0).reduce((sum, l) => sum + toPaise(l.debit || 0), 0);
    const totalCrPaise = lines.filter((l) => Number(l.credit || 0) > 0).reduce((sum, l) => sum + toPaise(l.credit || 0), 0);
    const diffPaise = totalDrPaise - totalCrPaise;
    if (diffPaise !== 0 && Math.abs(diffPaise) <= 5) {
      // Reconcile small rounding discrepancy against primary debit line
      const primeDebit = lines.find((l) => Number(l.debit || 0) > 0);
      if (primeDebit) {
        primeDebit.debit = fromPaise(toPaise(primeDebit.debit || 0) - diffPaise);
      }
    }

    const journalInput: JournalEntryInput = {
      entryType: isAsset ? "JOURNAL" : "PURCHASE",
      accountingDate: new Date(expense.expenseDate),
      financialYear: this.getFinancialYear(expense.expenseDate),
      sourceType: "EXPENSE",
      sourceId: expense.id,
      sourceNumber: expense.expenseNumber,
      narration: `${isAsset ? "Fixed Asset Purchase" : isEmployee ? "Employee Salary / Remuneration" : "Expense"} ${expense.expenseNumber} — ${expense.description || catName}`,
      reference: expense.billNumber || null,
      postedBy: actor?.id || null,
      authorizedBy: actor?.id || null,
      idempotencyKey: `EXPENSE:CONFIRM:${expense.id}`,
      lines,
    };

    return await JournalPostingService.postJournalEntry(journalInput, actor, dbOrTx);
  }

  /**
   * Reverses an expense confirmation journal when the expense is cancelled or deleted.
   */
  static async reverseExpenseConfirmation(
    expenseId: string,
    reason: string,
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines | null> {
    const client = dbOrTx as any;
    // Find the currently active POSTED purchase/journal entry (original or revised) for this expense
    const activeExisting = await client.journalEntry.findFirst({
      where: {
        sourceType: "EXPENSE",
        sourceId: expenseId,
        entryType: { in: ["PURCHASE", "JOURNAL"] },
        status: "POSTED",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activeExisting) {
      return null;
    }

    return await JournalPostingService.reverseJournalEntry(
      {
        originalEntryId: activeExisting.id,
        reason: reason || "Expense cancelled by user",
        actor: actor || { id: "system", name: "System" },
        accountingDate: new Date(),
      },
      dbOrTx
    );
  }

  /**
   * Applies an auditable revision when an approved Expense is edited.
   * Reverses the prior confirmed voucher and posts the revised confirmed voucher.
   */
  static async adjustExpense(
    expenseId: string,
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines | null> {
    const client = dbOrTx as any;
    const expense = await client.expense.findUnique({
      where: { id: expenseId },
      include: {
        vendor: true,
        category: true,
        employee: true,
        items: true,
        payments: true,
      },
    });

    if (!expense || expense.status === "CANCELLED" || expense.status === "DRAFT") {
      return null;
    }

    // Find the currently active POSTED journal entry for this expense to reverse it
    const activeExisting = await client.journalEntry.findFirst({
      where: {
        sourceType: "EXPENSE",
        sourceId: expenseId,
        entryType: { in: ["PURCHASE", "JOURNAL"] },
        status: "POSTED",
      },
      orderBy: { createdAt: "desc" },
    });

    if (activeExisting) {
      await JournalPostingService.reverseJournalEntry(
        {
          originalEntryId: activeExisting.id,
          reason: `Reversal due to Expense modification`,
          actor: actor || { id: "system", name: "System" },
          accountingDate: new Date(),
        },
        dbOrTx
      );
    }

    const revisionId = expense.updatedAt ? new Date(expense.updatedAt).getTime() : Date.now();
    const versionedKey = `EXPENSE:CONFIRM:${expenseId}:REV_${revisionId}`;

    const catAny = expense.category as any;
    const isAsset = Boolean(expense.isAsset || catAny?.isCapitalAsset || catAny?.accountingClassification === "FIXED_ASSET");
    const isLoss = Boolean(expense.isLoss || catAny?.isLossCategory || catAny?.accountingClassification === "BUSINESS_LOSS");
    const isEmployee = Boolean(expense.employeeId || catAny?.accountingClassification === "EMPLOYEE_EXPENSE");

    const vendorName = expense.vendor?.businessName || expense.vendor?.name || "Vendor";
    const vendorId = expense.vendorId ? `vendor_${expense.vendorId}` : "vendor_cash";
    const employeeName = expense.employee?.name || "Employee";
    const employeeId = expense.employeeId ? `emp_${expense.employeeId}` : "emp_unassigned";

    let catId = `cat_${expense.categoryId || "exp_general"}`;
    let catCode = catAny?.code || "EXP-OPS-001";
    let catName = expense.category?.name || "Operating Expenses";
    let catGroup = expense.category?.statementGroup || "Operating Expenses";
    let finType = "EXPENSE";

    if (isAsset) {
      catId = "asset_fixed";
      catCode = "ASSET-FIXED-001";
      catName = "Fixed Assets & Equipment";
      catGroup = "Property, Plant & Equipment";
      finType = "ASSET";
    } else if (isLoss) {
      catId = expense.categoryId ? `cat_${expense.categoryId}` : "cat_exp_loss";
      catCode = catAny?.code || "EXP-LOSS-001";
      catName = expense.lossType ? `Business Loss (${expense.lossType})` : (expense.category?.name || "Business Loss");
      catGroup = "Other Expenses";
      finType = "EXPENSE";
    } else if (isEmployee) {
      catId = expense.categoryId ? `cat_${expense.categoryId}` : "cat_exp_emp";
      catCode = catAny?.code || "EXP-SAL-001";
      catName = expense.category?.name || "Employee Benefit Expenses";
      catGroup = "Employee Benefits Expense";
      finType = "EXPENSE";
    }

    const taxableAmount = roundToPaisa(expense.taxableAmount || 0);
    const inputCgst = roundToPaisa(expense.inputCGST || 0);
    const inputSgst = roundToPaisa(expense.inputSGST || 0);
    const inputIgst = roundToPaisa(expense.inputIGST || 0);
    const totalInputGst = roundToPaisa(expense.totalInputGST || 0);
    const tdsAmount = roundToPaisa(expense.tdsAmount || 0);
    const netAmount = roundToPaisa(expense.netAmount || (taxableAmount + totalInputGst - tdsAmount));

    const isItcEligible = expense.isItcEligible !== false;
    const expenseDebit = isItcEligible ? taxableAmount : roundToPaisa(taxableAmount + totalInputGst);

    const lines: JournalLineInput[] = [];
    let nextLineNum = 1;

    lines.push({
      lineNumber: nextLineNum++,
      accountId: catId,
      accountCode: catCode,
      accountName: catName,
      financialType: finType,
      statementGroup: catGroup,
      normalBalance: "DEBIT",
      debit: expenseDebit,
      credit: 0,
      particulars: expense.description || (isAsset ? "Fixed Asset Purchase" : isLoss ? "Business Loss" : "Business Expense"),
      entityType: "CATEGORY",
      entityId: expense.categoryId || undefined,
    });

    if (isItcEligible) {
      if (inputCgst > 0) {
        lines.push({
          lineNumber: nextLineNum++,
          accountId: "stat_input_cgst",
          accountCode: "GST-INP-CGST",
          accountName: "Input CGST Credit (ITC)",
          financialType: "ASSET",
          statementGroup: "Statutory Tax Assets",
          normalBalance: "DEBIT",
          debit: inputCgst,
          credit: 0,
          particulars: `Input CGST on expense ${expense.expenseNumber}`,
        });
      }
      if (inputSgst > 0) {
        lines.push({
          lineNumber: nextLineNum++,
          accountId: "stat_input_sgst",
          accountCode: "GST-INP-SGST",
          accountName: "Input SGST Credit (ITC)",
          financialType: "ASSET",
          statementGroup: "Statutory Tax Assets",
          normalBalance: "DEBIT",
          debit: inputSgst,
          credit: 0,
          particulars: `Input SGST on expense ${expense.expenseNumber}`,
        });
      }
      if (inputIgst > 0) {
        lines.push({
          lineNumber: nextLineNum++,
          accountId: "stat_input_igst",
          accountCode: "GST-INP-IGST",
          accountName: "Input IGST Credit (ITC)",
          financialType: "ASSET",
          statementGroup: "Statutory Tax Assets",
          normalBalance: "DEBIT",
          debit: inputIgst,
          credit: 0,
          particulars: `Input IGST on expense ${expense.expenseNumber}`,
        });
      }
    }

    if (tdsAmount > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "stat_tds_payable",
        accountCode: "TDS-PAY-194",
        accountName: `Statutory TDS Payable (${expense.tdsSection || "Section 194J/194C"})`,
        financialType: "LIABILITY",
        statementGroup: "Statutory Tax Liabilities",
        normalBalance: "CREDIT",
        debit: 0,
        credit: tdsAmount,
        particulars: `TDS withheld on expense ${expense.expenseNumber}`,
      });
    }

    const hasSeparatePayments = Array.isArray(expense.payments) && expense.payments.length > 0;
    if (expense.paidBy === "EMPLOYEE" || hasSeparatePayments) {
      const targetPayableId = (expense.paidBy === "EMPLOYEE" || expense.employeeId) ? employeeId : vendorId;
      const targetPayableName = (expense.paidBy === "EMPLOYEE" || expense.employeeId) ? `${employeeName} (Employee Payable)` : `${vendorName} (Trade Payable)`;
      const targetGroup = (expense.paidBy === "EMPLOYEE" || expense.employeeId) ? "Employee Payables" : "Trade Payables";
      const targetEntityType = (expense.paidBy === "EMPLOYEE" || expense.employeeId) ? "EMPLOYEE" : "VENDOR";
      const targetEntityId = (expense.paidBy === "EMPLOYEE" || expense.employeeId) ? expense.employeeId || undefined : expense.vendorId || undefined;

      lines.push({
        lineNumber: nextLineNum++,
        accountId: targetPayableId,
        accountCode: expense.vendor?.pan || (expense.employee?.employeeCode ?? "PAY-001"),
        accountName: targetPayableName,
        financialType: "LIABILITY",
        statementGroup: targetGroup,
        normalBalance: "CREDIT",
        debit: 0,
        credit: netAmount,
        particulars: `Revised liability for ${expense.expenseNumber}`,
        entityType: targetEntityType,
        entityId: targetEntityId,
      });
    } else {
      const bankAccount = await this.resolveBankAccount(expense.bankAccountId, null, dbOrTx);
      const bankId = bankAccount?.id ? `bank_${bankAccount.id}` : "default_bank";
      const bankName = bankAccount
        ? `${bankAccount.bankName} (${bankAccount.accountName || "Bank"})`
        : "Primary Bank Account";

      lines.push({
        lineNumber: nextLineNum++,
        accountId: bankId,
        accountCode: bankAccount?.accountNumber ? `BANK-${bankAccount.accountNumber.slice(-4)}` : "BANK-001",
        accountName: bankName,
        financialType: "ASSET",
        statementGroup: "Bank Accounts",
        normalBalance: "DEBIT",
        debit: 0,
        credit: netAmount,
        particulars: `Bank disbursement for expense ${expense.expenseNumber}`,
        entityType: "BANK",
        bankAccountId: bankAccount?.id || undefined,
      });
    }

    const totalDrPaise = lines.filter((l) => Number(l.debit || 0) > 0).reduce((sum, l) => sum + toPaise(l.debit || 0), 0);
    const totalCrPaise = lines.filter((l) => Number(l.credit || 0) > 0).reduce((sum, l) => sum + toPaise(l.credit || 0), 0);
    const diffPaise = totalDrPaise - totalCrPaise;
    if (diffPaise !== 0 && Math.abs(diffPaise) <= 5) {
      const primeDebit = lines.find((l) => Number(l.debit || 0) > 0);
      if (primeDebit) {
        primeDebit.debit = fromPaise(toPaise(primeDebit.debit || 0) - diffPaise);
      }
    }

    return await JournalPostingService.postJournalEntry(
      {
        entryType: isAsset ? "JOURNAL" : "PURCHASE",
        accountingDate: new Date(expense.expenseDate),
        financialYear: this.getFinancialYear(expense.expenseDate),
        sourceType: "EXPENSE",
        sourceId: expense.id,
        sourceNumber: expense.expenseNumber,
        narration: `Revised ${isAsset ? "Fixed Asset Purchase" : "Expense"} ${expense.expenseNumber} — ${expense.description || catName}`,
        reference: expense.billNumber || null,
        postedBy: actor?.id || null,
        authorizedBy: actor?.id || null,
        idempotencyKey: versionedKey,
        lines,
      },
      actor,
      dbOrTx
    );
  }

  /**
   * Posts a balanced General Ledger payment/reimbursement voucher for an ExpensePayment record.
   * Handles:
   * - Trade Payable reduction (Debits Vendor Payable)
   * - Employee Payable reduction (Debits Employee Payable for Reimbursement or Salary)
   * - Bank Outflow (Credits Bank Account)
   * - Vendor TDS Withholding (Credits Statutory TDS Payable when TDS was withheld at payment time)
   * Zero P&L duplication: only Balance Sheet settlement accounts are affected.
   */
  static async postExpensePayment(
    paymentId: string,
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines | null> {
    const client = dbOrTx as any;
    const payment = await client.expensePayment.findUnique({
      where: { id: paymentId },
      include: {
        expense: {
          include: {
            vendor: true,
            employee: true,
          },
        },
        bankAccount: true,
      },
    });

    if (!payment) {
      throw new Error(`ExpensePaymentNotFound: Cannot post payment journal for nonexistent payment '${paymentId}'.`);
    }

    if (payment.isCancelled) {
      throw new Error(`CancelledPaymentError: Cannot post payment journal for cancelled payment '${paymentId}'.`);
    }

    const expense = payment.expense;
    if (!expense) {
      throw new Error(`ExpenseNotFound: Payment '${paymentId}' is not associated with an expense.`);
    }

    const isReimbursement = Boolean(payment.isReimbursement || payment.paymentType === "REIMBURSEMENT" || expense.paidBy === "EMPLOYEE");
    const isEmployee = Boolean(isReimbursement || expense.employeeId);

    const vendorName = expense.vendor?.businessName || expense.vendor?.name || "Vendor";
    const vendorId = expense.vendorId ? `vendor_${expense.vendorId}` : "vendor_cash";
    const employeeName = expense.employee?.name || "Employee";
    const employeeId = expense.employeeId ? `emp_${expense.employeeId}` : "emp_unassigned";

    const targetPayableId = isEmployee ? employeeId : vendorId;
    const targetPayableName = isEmployee ? `${employeeName} (Employee Payable)` : `${vendorName} (Trade Payable)`;
    const targetPayableGroup = isEmployee ? "Employee Payables" : "Trade Payables";
    const targetEntityType = isEmployee ? "EMPLOYEE" : "VENDOR";
    const targetEntityId = isEmployee ? expense.employeeId || undefined : expense.vendorId || undefined;

    // Resolve Bank Account
    const bankAccount = await this.resolveBankAccount(payment.bankAccountId, expense.bankAccountId, dbOrTx);
    const bankId = bankAccount?.id ? `bank_${bankAccount.id}` : "default_bank";
    const bankName = bankAccount
      ? `${bankAccount.bankName} (${bankAccount.accountName || "Bank"})`
      : "Primary Bank Account";

    // Amounts
    const settlementAmount = roundToPaisa(payment.amount);
    const isTds = Boolean(payment.isTdsDeducted);
    const tdsAmount = isTds ? roundToPaisa(payment.tdsAmount || 0) : 0;
    const bankDisbursement = roundToPaisa(payment.bankPayment ?? (settlementAmount - tdsAmount));

    const lines: JournalLineInput[] = [];

    // 1. Debit Payable (clears liability by full settlement amount)
    lines.push({
      lineNumber: 1,
      accountId: targetPayableId,
      accountCode: isEmployee ? (expense.employee?.employeeCode ?? "EMP-001") : (expense.vendor?.pan ?? "VEND-001"),
      accountName: targetPayableName,
      financialType: "LIABILITY",
      statementGroup: targetPayableGroup,
      normalBalance: "CREDIT",
      debit: settlementAmount,
      credit: 0,
      particulars: isReimbursement
        ? `Reimbursement paid to ${employeeName} for ${expense.expenseNumber}`
        : `Payment disbursed to ${isEmployee ? employeeName : vendorName} for ${expense.expenseNumber}`,
      entityType: targetEntityType,
      entityId: targetEntityId,
    });

    let nextLineNum = 2;

    // 2. Credit Statutory TDS Payable (if TDS deducted at payment time)
    if (tdsAmount > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "stat_tds_payable",
        accountCode: "TDS-PAY-194",
        accountName: `Statutory TDS Payable (${payment.tdsSection || expense.tdsSection || "Section 194J/194C"})`,
        financialType: "LIABILITY",
        statementGroup: "Statutory Tax Liabilities",
        normalBalance: "CREDIT",
        debit: 0,
        credit: tdsAmount,
        particulars: `TDS withheld on payment to ${isEmployee ? employeeName : vendorName} for ${expense.expenseNumber}`,
      });
    }

    // 3. Credit Bank Account (actual cash outflow)
    lines.push({
      lineNumber: nextLineNum++,
      accountId: bankId,
      accountCode: bankAccount?.accountNumber ? `BANK-${bankAccount.accountNumber.slice(-4)}` : "BANK-001",
      accountName: bankName,
      financialType: "ASSET",
      statementGroup: "Bank Accounts",
      normalBalance: "DEBIT",
      debit: 0,
      credit: bankDisbursement,
      particulars: `Bank payment for expense ${expense.expenseNumber}${payment.referenceNumber ? ` [Ref: ${payment.referenceNumber}]` : ""}`,
      entityType: "BANK",
      bankAccountId: bankAccount?.id || undefined,
    });

    // Check balance
    const totalDrPaise = toPaise(settlementAmount);
    const totalCrPaise = lines.filter((l) => Number(l.credit || 0) > 0).reduce((sum, l) => sum + toPaise(l.credit || 0), 0);
    const diffPaise = totalDrPaise - totalCrPaise;
    if (diffPaise !== 0 && Math.abs(diffPaise) <= 5) {
      const bankLine = lines.find((l) => l.financialType === "ASSET" && Number(l.credit || 0) > 0);
      if (bankLine) {
        bankLine.credit = fromPaise(toPaise(bankLine.credit || 0) + diffPaise);
      }
    }

    const journalInput: JournalEntryInput = {
      entryType: "PAYMENT",
      accountingDate: new Date(payment.paymentDate),
      financialYear: this.getFinancialYear(payment.paymentDate),
      sourceType: "EXPENSE_PAYMENT",
      sourceId: payment.id,
      sourceNumber: expense.expenseNumber,
      narration: `${isReimbursement ? "Reimbursement" : "Payment"} of ₹${settlementAmount} for ${expense.expenseNumber} to ${isEmployee ? employeeName : vendorName}`,
      reference: payment.referenceNumber || null,
      postedBy: actor?.id || null,
      authorizedBy: actor?.id || null,
      idempotencyKey: `EXPENSE_PAYMENT:${payment.id}`,
      lines,
    };

    return await JournalPostingService.postJournalEntry(journalInput, actor, dbOrTx);
  }

  /**
   * Reverses an ExpensePayment journal when the payment is deleted or reversed.
   */
  static async reverseExpensePayment(
    paymentId: string,
    reason: string,
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines | null> {
    const client = dbOrTx as any;
    const existing = await client.journalEntry.findUnique({
      where: { idempotencyKey: `EXPENSE_PAYMENT:${paymentId}` },
    });

    if (!existing) {
      return null;
    }

    if (existing.status === "REVERSED") {
      // Already reversed — idempotent
      return null;
    }

    return await JournalPostingService.reverseJournalEntry(
      {
        originalEntryId: existing.id,
        reason: reason || "Expense payment deleted/reversed",
        actor: actor || { id: "system", name: "System" },
        accountingDate: new Date(),
      },
      dbOrTx
    );
  }
}
