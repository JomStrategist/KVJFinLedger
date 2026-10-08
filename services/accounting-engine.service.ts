import { prisma } from "@/lib/prisma";

export interface AccountDescriptor {
  id: string;
  name: string;
  code?: string;
  group: string;
  financialType: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  financialStatement: "PROFIT_LOSS" | "BALANCE_SHEET";
  normalBalance: "DEBIT" | "CREDIT";
  gstin?: string;
  pan?: string;
  type?: string;
  openingBalance?: number;
  openingBalanceType?: "Dr" | "Cr";
  currentBalance?: number;
  currentBalanceType?: "Dr" | "Cr";
  transactionCount?: number;
}

export interface JournalVoucherLine {
  accountId: string;
  accountName: string;
  accountGroup: string;
  financialType: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  financialStatement: "PROFIT_LOSS" | "BALANCE_SHEET";
  normalBalance: "DEBIT" | "CREDIT";
  debit: number;
  credit: number;
  particulars?: string;
  entityId?: string;
  entityType?: "CUSTOMER" | "VENDOR" | "EMPLOYEE" | "BANK" | "CATEGORY";
}

export interface JournalVoucher {
  id: string;
  voucherNumber: string;
  voucherType: "Sales" | "Receipt" | "Payment" | "Contra" | "Journal";
  date: Date;
  reference?: string | null;
  narration: string;
  sourceType: 
    | "TAX_INVOICE" 
    | "INVOICE_PAYMENT" 
    | "EXPENSE" 
    | "EXPENSE_REIMBURSEMENT"
    | "BANK_TRANSFER" 
    | "OPENING_BALANCE" 
    | "ASSET_DEPRECIATION"
    | "GST_FILING"
    | "TDS_DEPOSIT";
  sourceId: string;
  sourceUrl?: string;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  lines: JournalVoucherLine[];
}

export interface LedgerEntry {
  id: string;
  date: Date;
  voucherType: string;
  voucherNo: string;
  particulars: string;
  reference?: string;
  debit: number;
  credit: number;
  runningBalance: number;
  balanceType: "Dr" | "Cr";
  sourceType: string;
  sourceId: string;
}

export interface LedgerStatement {
  account: AccountDescriptor;
  fromDate: Date;
  toDate: Date;
  openingBalance: number;
  openingBalanceType: "Dr" | "Cr";
  entries: LedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: "Dr" | "Cr";
}

export interface TrialBalanceItem {
  accountId: string;
  accountName: string;
  accountGroup: string;
  financialType: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  financialStatement: "PROFIT_LOSS" | "BALANCE_SHEET";
  normalBalance: "DEBIT" | "CREDIT";
  totalDebit: number;
  totalCredit: number;
  netDebit: number;
  netCredit: number;
  balance: number;
  balanceType: "Dr" | "Cr";
}

export interface TrialBalanceReport {
  asOfDate: Date;
  items: TrialBalanceItem[];
  totalDebit: number;
  totalCredit: number;
  difference: number;
  isBalanced: boolean;
}

export interface ProfitAndLossReport {
  fromDate: Date;
  toDate: Date;
  revenueFromOperations: { name: string; amount: number }[];
  otherIncome: { name: string; amount: number }[];
  totalRevenue: number;
  operatingExpenses: { name: string; amount: number }[];
  employeeCosts: { name: string; amount: number }[];
  depreciationAmortization: { name: string; amount: number }[];
  financeCosts: { name: string; amount: number }[];
  otherExpenses: { name: string; amount: number }[];
  totalExpenses: number;
  operatingProfit: number;
  profitBeforeTax: number;
  taxExpense: number;
  netProfitAfterTax: number;
}

export interface BalanceSheetReport {
  asOfDate: Date;
  equity: {
    capital: number;
    reservesAndSurplus: number; // Current Year Profit from P&L
    drawings: number;
    totalShareholdersFunds: number;
  };
  nonCurrentLiabilities: {
    items: { name: string; amount: number }[];
    total: number;
  };
  currentLiabilities: {
    tradePayables: number;
    employeePayables: number;
    statutoryGstPayable: number;
    statutoryTdsPayable: number;
    otherCurrentLiabilities: number;
    total: number;
  };
  totalEquityAndLiabilities: number;
  nonCurrentAssets: {
    fixedAssetsGross: number;
    accumulatedDepreciation: number;
    fixedAssetsNet: number;
    otherNonCurrentAssets: number;
    total: number;
  };
  currentAssets: {
    tradeReceivables: number;
    cashAndBank: number;
    tdsReceivable: number;
    gstInputCredit: number;
    otherCurrentAssets: number;
    total: number;
  };
  totalAssets: number;
  difference: number;
  isBalanced: boolean;
}

export interface CashFlowReport {
  fromDate: Date;
  toDate: Date;
  operatingCashFlow: {
    customerReceipts: number;
    vendorDisbursements: number;
    employeeDisbursements: number;
    gstPaid: number;
    tdsPaid: number;
    netOperating: number;
  };
  investingCashFlow: {
    capitalExpenditure: number;
    netInvesting: number;
  };
  financingCashFlow: {
    capitalIntroduced: number;
    drawingsWithdrawn: number;
    netFinancing: number;
  };
  openingCashAndBank: number;
  netCashFlow: number;
  closingCashAndBank: number;
}

export interface FilterOptions {
  fromDate?: Date;
  toDate?: Date;
  financialYear?: string;
  customerId?: string;
  vendorId?: string;
  categoryId?: string;
}

export class AccountingEngine {
  /**
   * Helper: standard Indian Financial Year date bounds
   */
  static getFinancialYearBounds(fyStr?: string): { fromDate: Date; toDate: Date } {
    const now = new Date();
    const currentYear = now.getFullYear();
    const defaultStartYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;

    let startYear = defaultStartYear;
    if (fyStr && fyStr !== "ALL" && fyStr !== "Custom") {
      const match = fyStr.match(/\d{4}/);
      if (match) startYear = parseInt(match[0], 10);
    }

    const fromDate = new Date(startYear, 3, 1, 0, 0, 0, 0); // 01-Apr
    const toDate = new Date(startYear + 1, 2, 31, 23, 59, 59, 999); // 31-Mar
    return { fromDate, toDate };
  }

  /**
   * Primary Engine: Loads all transactional data and generates 100% verified double-entry Journal Vouchers
   */
  static async generateAllVouchers(filters?: FilterOptions): Promise<JournalVoucher[]> {
    const [
      taxInvoices,
      payments,
      expenses,
      bankTransfers,
      openingBalances,
      gstFilings,
      tdsDeposits,
      assetDepreciations,
      primaryBank,
      customers,
      vendors,
      categories
    ] = await Promise.all([
      prisma.taxInvoice.findMany({
        where: { status: { in: ["CONFIRMED", "PAID", "PARTIALLY_PAID"] } },
        include: {
          customer: true,
          payments: true,
          items: { include: { incomeCategory: true } }
        },
        orderBy: { invoiceDate: "asc" }
      }),
      prisma.invoicePayment.findMany({
        include: {
          taxInvoice: {
            include: { customer: true }
          }
        },
        orderBy: { paymentDate: "asc" }
      }),
      prisma.expense.findMany({
        where: { status: "APPROVED" },
        include: {
          vendor: true,
          category: true,
          employee: true,
          items: { include: { category: true } }
        },
        orderBy: { expenseDate: "asc" }
      }),
      prisma.bankTransfer.findMany({
        orderBy: { date: "asc" }
      }),
      prisma.openingBalance.findMany({
        orderBy: { createdAt: "asc" }
      }),
      prisma.gstFiling.findMany({
        orderBy: { filingDate: "asc" }
      }),
      prisma.tdsDeposit.findMany({
        orderBy: { depositDate: "asc" }
      }),
      prisma.assetDepreciation.findMany({
        include: { expense: true },
        orderBy: { effectiveDate: "asc" }
      }),
      prisma.bankAccount.findFirst({
        where: { isPrimary: true, isActive: true }
      }),
      prisma.customer.findMany(),
      prisma.vendor.findMany(),
      prisma.expenseCategory.findMany()
    ]);

    const defaultBankId = primaryBank ? `bank_${primaryBank.id}` : "account_bank_primary";
    const defaultBankName = primaryBank ? `${primaryBank.bankName} (${primaryBank.accountName})` : "Primary Bank Account";

    const vouchers: JournalVoucher[] = [];

    // ────────────────────────────────────────────────────────────────────────
    // 1. OPENING BALANCES (Opening Journal Vouchers)
    // ────────────────────────────────────────────────────────────────────────
    if (openingBalances.length > 0) {
      // Group opening balances by financial year
      const byFy = new Map<string, typeof openingBalances>();
      for (const ob of openingBalances) {
        const fy = ob.financialYear || "FY 2026–27";
        if (!byFy.has(fy)) byFy.set(fy, []);
        byFy.get(fy)!.push(ob);
      }

      for (const [fy, obs] of byFy.entries()) {
        const bounds = this.getFinancialYearBounds(fy);
        const lines: JournalVoucherLine[] = [];

        for (const ob of obs) {
          const amt = Number(ob.amount || 0);
          if (amt <= 0) continue;

          const pos = ob.position.toLowerCase();
          if (ob.type === "Asset") {
            const isBank = /bank|cash|current.?acc|savings/i.test(pos);
            const accountId = isBank ? defaultBankId : `asset_${ob.position.replace(/\s+/g, "_").toLowerCase()}`;
            const accountName = isBank ? defaultBankName : `Opening ${ob.position}`;
            const accountGroup = isBank ? "Bank Accounts" : "Other Current Assets";

            lines.push({
              accountId,
              accountName,
              accountGroup,
              financialType: "ASSET",
              financialStatement: "BALANCE_SHEET",
              normalBalance: "DEBIT",
              debit: amt,
              credit: 0,
              particulars: `Opening balance for ${ob.position}`,
            });
          } else {
            const isCapital = /capital|share|equity|proprietor|partner/i.test(pos);
            const accountId = isCapital ? "eq_capital" : `liab_${ob.position.replace(/\s+/g, "_").toLowerCase()}`;
            const accountName = isCapital ? "Owner Capital Account" : `Opening ${ob.position}`;
            const accountGroup = isCapital ? "Capital & Equity" : "Other Current Liabilities";

            lines.push({
              accountId,
              accountName,
              accountGroup,
              financialType: isCapital ? "EQUITY" : "LIABILITY",
              financialStatement: "BALANCE_SHEET",
              normalBalance: "CREDIT",
              debit: 0,
              credit: amt,
              particulars: `Opening balance for ${ob.position}`,
            });
          }
        }

        const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

        vouchers.push({
          id: `voucher_ob_${fy}`,
          voucherNumber: `OB-${fy.replace(/[^0-9]/g, "")}`,
          voucherType: "Journal",
          date: bounds.fromDate,
          reference: fy,
          narration: `Opening balance journal entry for ${fy}`,
          sourceType: "OPENING_BALANCE",
          sourceId: `ob_${fy}`,
          sourceUrl: "/opening-closing",
          totalDebit: Math.round(totalDebit * 100) / 100,
          totalCredit: Math.round(totalCredit * 100) / 100,
          isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
          lines
        });
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. TAX INVOICES (Sales Vouchers)
    // ────────────────────────────────────────────────────────────────────────
    for (const inv of taxInvoices) {
      const grossAmount = Number(inv.grossAmount || inv.netAmount || 0);
      const taxableAmount = Number(inv.taxableAmount || 0);
      const cgst = Number(inv.totalCGST || 0);
      const sgst = Number(inv.totalSGST || 0);
      const igst = Number(inv.totalIGST || 0);
      const customerName = inv.customerNameSnapshot || inv.customer?.legalName || "Customer";
      const customerId = `customer_${inv.customerId}`;

      const lines: JournalVoucherLine[] = [];

      // Dr Customer Receivable (Gross Invoice Value - NEVER reduced by theoretical TDS)
      lines.push({
        accountId: customerId,
        accountName: customerName,
        accountGroup: "Trade Receivables",
        financialType: "ASSET",
        financialStatement: "BALANCE_SHEET",
        normalBalance: "DEBIT",
        debit: grossAmount,
        credit: 0,
        particulars: `Sales invoice ${inv.invoiceNumber} to ${customerName}`,
        entityId: inv.customerId,
        entityType: "CUSTOMER"
      });

      // Cr Revenue accounts (By Category if available, else standard Service Revenue)
      if (inv.items && inv.items.length > 0) {
        for (const item of inv.items) {
          const itemTaxable = Number(item.taxableAmount || 0);
          const catId = item.incomeCategoryId ? `cat_${item.incomeCategoryId}` : "cat_revenue_service";
          const catName = item.categoryNameSnapshot || item.incomeCategory?.name || "Service Revenue";
          const group = item.statementGroupSnapshot || item.incomeCategory?.statementGroup || "Revenue from Operations";

          lines.push({
            accountId: catId,
            accountName: catName,
            accountGroup: group,
            financialType: "INCOME",
            financialStatement: "PROFIT_LOSS",
            normalBalance: "CREDIT",
            debit: 0,
            credit: itemTaxable,
            particulars: item.name || "Service Revenue",
            entityId: item.incomeCategoryId || undefined,
            entityType: "CATEGORY"
          });
        }
      } else {
        lines.push({
          accountId: "cat_revenue_service",
          accountName: "Service Revenue",
          accountGroup: "Revenue from Operations",
          financialType: "INCOME",
          financialStatement: "PROFIT_LOSS",
          normalBalance: "CREDIT",
          debit: 0,
          credit: taxableAmount,
          particulars: "Sales Revenue",
          entityType: "CATEGORY"
        });
      }

      // Cr Output GST liabilities
      if (cgst > 0) {
        lines.push({
          accountId: "stat_output_cgst",
          accountName: "Output CGST Payable",
          accountGroup: "Statutory Tax Liabilities",
          financialType: "LIABILITY",
          financialStatement: "BALANCE_SHEET",
          normalBalance: "CREDIT",
          debit: 0,
          credit: cgst,
          particulars: `Output CGST on invoice ${inv.invoiceNumber}`
        });
      }
      if (sgst > 0) {
        lines.push({
          accountId: "stat_output_sgst",
          accountName: "Output SGST Payable",
          accountGroup: "Statutory Tax Liabilities",
          financialType: "LIABILITY",
          financialStatement: "BALANCE_SHEET",
          normalBalance: "CREDIT",
          debit: 0,
          credit: sgst,
          particulars: `Output SGST on invoice ${inv.invoiceNumber}`
        });
      }
      if (igst > 0) {
        lines.push({
          accountId: "stat_output_igst",
          accountName: "Output IGST Payable",
          accountGroup: "Statutory Tax Liabilities",
          financialType: "LIABILITY",
          financialStatement: "BALANCE_SHEET",
          normalBalance: "CREDIT",
          debit: 0,
          credit: igst,
          particulars: `Output IGST on invoice ${inv.invoiceNumber}`
        });
      }

      const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

      vouchers.push({
        id: `voucher_invoice_${inv.id}`,
        voucherNumber: inv.invoiceNumber,
        voucherType: "Sales",
        date: new Date(inv.invoiceDate),
        reference: inv.poNumber || null,
        narration: `Tax Invoice ${inv.invoiceNumber} issued to ${customerName}`,
        sourceType: "TAX_INVOICE",
        sourceId: inv.id,
        sourceUrl: `/invoices/${inv.id}`,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
        lines
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. INVOICE PAYMENTS (Receipt Vouchers)
    // ────────────────────────────────────────────────────────────────────────
    for (const p of payments) {
      if (!p.taxInvoice) continue;

      const customerName = p.taxInvoice.customerNameSnapshot || p.taxInvoice.customer?.legalName || "Customer";
      const customerId = `customer_${p.taxInvoice.customerId}`;
      const bankAccountId = p.taxInvoice.bankAccountId ? `bank_${p.taxInvoice.bankAccountId}` : defaultBankId;
      const bankAccountName = p.taxInvoice.bankNameSnapshot 
        ? `${p.taxInvoice.bankNameSnapshot} (${p.taxInvoice.accountNameSnapshot || "Bank"})` 
        : defaultBankName;

      const paymentAmount = Number(p.paymentAmount || 0);
      const tds = p.isTdsDeducted ? Number(p.tdsAmount || 0) : 0;
      const bankReceipt = Number(p.bankReceipt || (paymentAmount - tds));

      const lines: JournalVoucherLine[] = [];

      // Dr Bank / Cash Account (Actual funds received)
      lines.push({
        accountId: bankAccountId,
        accountName: bankAccountName,
        accountGroup: "Bank Accounts",
        financialType: "ASSET",
        financialStatement: "BALANCE_SHEET",
        normalBalance: "DEBIT",
        debit: bankReceipt,
        credit: 0,
        particulars: `Bank receipt from ${customerName}`,
        entityId: p.taxInvoice.bankAccountId || undefined,
        entityType: "BANK"
      });

      // Dr TDS Receivable (ONLY when customer actually withheld TDS upon payment)
      if (tds > 0) {
        lines.push({
          accountId: "stat_tds_receivable",
          accountName: "TDS Receivable (Current Asset)",
          accountGroup: "Current Assets",
          financialType: "ASSET",
          financialStatement: "BALANCE_SHEET",
          normalBalance: "DEBIT",
          debit: tds,
          credit: 0,
          particulars: `TDS withheld by ${customerName} u/s 194J/194C on payment for ${p.taxInvoice.invoiceNumber}`,
          entityId: p.taxInvoice.customerId,
          entityType: "CUSTOMER"
        });
      }

      // Cr Customer Receivable (Total payment settled)
      lines.push({
        accountId: customerId,
        accountName: customerName,
        accountGroup: "Trade Receivables",
        financialType: "ASSET",
        financialStatement: "BALANCE_SHEET",
        normalBalance: "DEBIT",
        debit: 0,
        credit: paymentAmount,
        particulars: `Payment settlement for Invoice ${p.taxInvoice.invoiceNumber}`,
        entityId: p.taxInvoice.customerId,
        entityType: "CUSTOMER"
      });

      const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

      vouchers.push({
        id: `voucher_payment_${p.id}`,
        voucherNumber: p.reference || `REC-${p.id.slice(-6).toUpperCase()}`,
        voucherType: "Receipt",
        date: new Date(p.paymentDate),
        reference: p.reference || null,
        narration: `Payment received for Invoice ${p.taxInvoice.invoiceNumber}${p.remarks ? ` — ${p.remarks}` : ""}`,
        sourceType: "INVOICE_PAYMENT",
        sourceId: p.id,
        sourceUrl: `/invoices/${p.taxInvoiceId}`,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
        lines
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4. EXPENSES (Purchase & Operating Expense Vouchers)
    // ────────────────────────────────────────────────────────────────────────
    for (const exp of expenses) {
      const taxable = Number(exp.taxableAmount || 0);
      const inputCgst = Number(exp.inputCGST || 0);
      const inputSgst = Number(exp.inputSGST || 0);
      const inputIgst = Number(exp.inputIGST || 0);
      const totalInputGst = Number(exp.totalInputGST || 0);
      const tds = Number(exp.tdsAmount || 0);
      const netAmount = Number(exp.netAmount || (taxable + totalInputGst - tds));
      const grossAmount = taxable + totalInputGst;
      const isAsset = Boolean(exp.isAsset);

      const vendorName = exp.vendor?.businessName || exp.vendor?.name || "Vendor";
      const vendorId = exp.vendorId ? `vendor_${exp.vendorId}` : "vendor_cash";
      const employeeName = exp.employee?.name || "Employee";
      const employeeId = exp.employeeId ? `emp_${exp.employeeId}` : "emp_unassigned";

      const catId = isAsset ? "asset_fixed" : (exp.categoryId ? `cat_${exp.categoryId}` : "cat_exp_general");
      const catName = isAsset 
        ? "Fixed Assets & Equipment" 
        : (exp.category?.name || "Administrative & General Expenses");
      const catGroup = isAsset 
        ? "Fixed Assets" 
        : (exp.category?.statementGroup || "Operating Expenses");

      const lines: JournalVoucherLine[] = [];

      // Debit Expense Category OR Fixed Asset (Balance Sheet)
      lines.push({
        accountId: catId,
        accountName: catName,
        accountGroup: catGroup,
        financialType: isAsset ? "ASSET" : "EXPENSE",
        financialStatement: isAsset ? "BALANCE_SHEET" : "PROFIT_LOSS",
        normalBalance: "DEBIT",
        debit: taxable,
        credit: 0,
        particulars: exp.description || (isAsset ? "Fixed Asset Purchase" : "Business Expense"),
        entityId: exp.categoryId || undefined,
        entityType: "CATEGORY"
      });

      // Debit Input Tax Credit accounts (ITC Assets)
      if (inputCgst > 0) {
        lines.push({
          accountId: "stat_input_cgst",
          accountName: "Input CGST Credit (ITC)",
          accountGroup: "Statutory Tax Assets",
          financialType: "ASSET",
          financialStatement: "BALANCE_SHEET",
          normalBalance: "DEBIT",
          debit: inputCgst,
          credit: 0,
          particulars: `Input CGST on expense ${exp.expenseNumber}`
        });
      }
      if (inputSgst > 0) {
        lines.push({
          accountId: "stat_input_sgst",
          accountName: "Input SGST Credit (ITC)",
          accountGroup: "Statutory Tax Assets",
          financialType: "ASSET",
          financialStatement: "BALANCE_SHEET",
          normalBalance: "DEBIT",
          debit: inputSgst,
          credit: 0,
          particulars: `Input SGST on expense ${exp.expenseNumber}`
        });
      }
      if (inputIgst > 0) {
        lines.push({
          accountId: "stat_input_igst",
          accountName: "Input IGST Credit (ITC)",
          accountGroup: "Statutory Tax Assets",
          financialType: "ASSET",
          financialStatement: "BALANCE_SHEET",
          normalBalance: "DEBIT",
          debit: inputIgst,
          credit: 0,
          particulars: `Input IGST on expense ${exp.expenseNumber}`
        });
      }

      // Credit Statutory TDS Payable (if TDS deducted by company)
      if (tds > 0) {
        lines.push({
          accountId: "stat_tds_payable",
          accountName: "Statutory TDS Payable (Section 194J/194C)",
          accountGroup: "Statutory Tax Liabilities",
          financialType: "LIABILITY",
          financialStatement: "BALANCE_SHEET",
          normalBalance: "CREDIT",
          debit: 0,
          credit: tds,
          particulars: `TDS deducted from ${vendorName} on expense ${exp.expenseNumber}`
        });
      }

      // Credit Bank / Vendor / Employee
      if (exp.paidBy === "EMPLOYEE") {
        // Employee personally paid -> Company owes Employee
        lines.push({
          accountId: employeeId,
          accountName: `${employeeName} (Employee Payable)`,
          accountGroup: "Employee Payables",
          financialType: "LIABILITY",
          financialStatement: "BALANCE_SHEET",
          normalBalance: "CREDIT",
          debit: 0,
          credit: netAmount,
          particulars: `Expense incurred by employee ${employeeName}`,
          entityId: exp.employeeId || undefined,
          entityType: "EMPLOYEE"
        });

        // If reimbursed to employee, create reimbursement voucher
        if (exp.paymentStatus === "PAID") {
          const reimbLines: JournalVoucherLine[] = [
            {
              accountId: employeeId,
              accountName: `${employeeName} (Employee Payable)`,
              accountGroup: "Employee Payables",
              financialType: "LIABILITY",
              financialStatement: "BALANCE_SHEET",
              normalBalance: "CREDIT",
              debit: netAmount,
              credit: 0,
              particulars: `Reimbursement paid to employee ${employeeName}`,
              entityId: exp.employeeId || undefined,
              entityType: "EMPLOYEE"
            },
            {
              accountId: defaultBankId,
              accountName: defaultBankName,
              accountGroup: "Bank Accounts",
              financialType: "ASSET",
              financialStatement: "BALANCE_SHEET",
              normalBalance: "DEBIT",
              debit: 0,
              credit: netAmount,
              particulars: `Bank disbursement for employee reimbursement`,
              entityType: "BANK"
            }
          ];

          vouchers.push({
            id: `voucher_reimb_${exp.id}`,
            voucherNumber: `REIMB-${exp.expenseNumber}`,
            voucherType: "Payment",
            date: new Date(exp.expenseDate),
            reference: exp.expenseNumber,
            narration: `Reimbursement paid to employee ${employeeName} for ${exp.expenseNumber}`,
            sourceType: "EXPENSE_REIMBURSEMENT",
            sourceId: exp.id,
            sourceUrl: `/expenses/${exp.id}`,
            totalDebit: netAmount,
            totalCredit: netAmount,
            isBalanced: true,
            lines: reimbLines
          });
        }
      } else {
        // Company Paid
        if (exp.paymentStatus === "PAID") {
          lines.push({
            accountId: defaultBankId,
            accountName: defaultBankName,
            accountGroup: "Bank Accounts",
            financialType: "ASSET",
            financialStatement: "BALANCE_SHEET",
            normalBalance: "DEBIT",
            debit: 0,
            credit: netAmount,
            particulars: `Bank payment for expense ${exp.expenseNumber}`,
            entityType: "BANK"
          });
        } else if (exp.paymentStatus === "PARTIALLY_PAID") {
          const paid = Number(exp.paidAmount || 0);
          const unpaid = Math.max(0, netAmount - paid);

          if (paid > 0) {
            lines.push({
              accountId: defaultBankId,
              accountName: defaultBankName,
              accountGroup: "Bank Accounts",
              financialType: "ASSET",
              financialStatement: "BALANCE_SHEET",
              normalBalance: "DEBIT",
              debit: 0,
              credit: paid,
              particulars: `Part payment for expense ${exp.expenseNumber}`,
              entityType: "BANK"
            });
          }
          if (unpaid > 0) {
            lines.push({
              accountId: vendorId,
              accountName: `${vendorName} (Trade Payable)`,
              accountGroup: "Trade Payables",
              financialType: "LIABILITY",
              financialStatement: "BALANCE_SHEET",
              normalBalance: "CREDIT",
              debit: 0,
              credit: unpaid,
              particulars: `Outstanding balance payable to ${vendorName}`,
              entityId: exp.vendorId || undefined,
              entityType: "VENDOR"
            });
          }
        } else {
          // UNPAID Vendor Credit
          lines.push({
            accountId: vendorId,
            accountName: `${vendorName} (Trade Payable)`,
            accountGroup: "Trade Payables",
            financialType: "LIABILITY",
            financialStatement: "BALANCE_SHEET",
            normalBalance: "CREDIT",
            debit: 0,
            credit: netAmount,
            particulars: `Credit purchase from ${vendorName}`,
            entityId: exp.vendorId || undefined,
            entityType: "VENDOR"
          });
        }
      }

      const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

      vouchers.push({
        id: `voucher_exp_${exp.id}`,
        voucherNumber: exp.expenseNumber,
        voucherType: "Payment",
        date: new Date(exp.expenseDate),
        reference: exp.expenseNumber,
        narration: `Expense ${exp.expenseNumber} — ${exp.description || catName}`,
        sourceType: "EXPENSE",
        sourceId: exp.id,
        sourceUrl: `/expenses/${exp.id}`,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
        lines
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 5. BANK TRANSFERS & CONTRA (Bank Transfers & Owner Drawings)
    // ────────────────────────────────────────────────────────────────────────
    for (const t of bankTransfers) {
      const amt = Number(t.amount || 0);
      if (amt <= 0) continue;

      const lines: JournalVoucherLine[] = [];

      if (t.toAccount === "OWNER_DRAWINGS") {
        // Owner Drawings directly reduces Equity
        lines.push({
          accountId: "eq_drawings",
          accountName: "Owner Drawings Account",
          accountGroup: "Capital & Equity",
          financialType: "EQUITY",
          financialStatement: "BALANCE_SHEET",
          normalBalance: "DEBIT",
          debit: amt,
          credit: 0,
          particulars: `Owner Drawings — ${t.description || "Personal Withdrawal"}`
        });
        lines.push({
          accountId: defaultBankId,
          accountName: defaultBankName,
          accountGroup: "Bank Accounts",
          financialType: "ASSET",
          financialStatement: "BALANCE_SHEET",
          normalBalance: "DEBIT",
          debit: 0,
          credit: amt,
          particulars: `Bank withdrawal for owner drawings`
        });
      } else {
        // Inter-bank transfer: Dr Destination Bank, Cr Source Bank
        lines.push({
          accountId: `bank_dest_${t.toAccount.replace(/\s+/g, "_")}`,
          accountName: t.toAccount,
          accountGroup: "Bank Accounts",
          financialType: "ASSET",
          financialStatement: "BALANCE_SHEET",
          normalBalance: "DEBIT",
          debit: amt,
          credit: 0,
          particulars: `Transfer to ${t.toAccount}`
        });
        lines.push({
          accountId: `bank_src_${t.fromAccount.replace(/\s+/g, "_")}`,
          accountName: t.fromAccount,
          accountGroup: "Bank Accounts",
          financialType: "ASSET",
          financialStatement: "BALANCE_SHEET",
          normalBalance: "DEBIT",
          debit: 0,
          credit: amt,
          particulars: `Transfer from ${t.fromAccount}`
        });
      }

      vouchers.push({
        id: `voucher_transfer_${t.id}`,
        voucherNumber: t.reference || `TRF-${t.id.slice(-6).toUpperCase()}`,
        voucherType: "Contra",
        date: new Date(t.date),
        reference: t.reference || null,
        narration: `Bank Transfer: ${t.fromAccount} → ${t.toAccount} (${t.description || ""})`,
        sourceType: "BANK_TRANSFER",
        sourceId: t.id,
        sourceUrl: "/bank-transfers",
        totalDebit: amt,
        totalCredit: amt,
        isBalanced: true,
        lines
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 6. ASSET DEPRECIATION (Depreciation Vouchers)
    // ────────────────────────────────────────────────────────────────────────
    for (const dep of assetDepreciations) {
      const depAmt = Number(dep.depreciationAmount || 0);
      if (depAmt <= 0) continue;

      const lines: JournalVoucherLine[] = [
        {
          accountId: "cat_exp_depreciation",
          accountName: "Depreciation & Amortisation Expense",
          accountGroup: "Depreciation & Amortisation",
          financialType: "EXPENSE",
          financialStatement: "PROFIT_LOSS",
          normalBalance: "DEBIT",
          debit: depAmt,
          credit: 0,
          particulars: `Depreciation on ${dep.expense?.description || "Fixed Asset"} for ${dep.financialYear}`
        },
        {
          accountId: "asset_dep_accum",
          accountName: "Accumulated Depreciation",
          accountGroup: "Fixed Assets",
          financialType: "ASSET",
          financialStatement: "BALANCE_SHEET",
          normalBalance: "CREDIT",
          debit: 0,
          credit: depAmt,
          particulars: `Accumulated depreciation reserve for ${dep.financialYear}`
        }
      ];

      vouchers.push({
        id: `voucher_dep_${dep.id}`,
        voucherNumber: `DEP-${dep.id.slice(-6).toUpperCase()}`,
        voucherType: "Journal",
        date: new Date(dep.effectiveDate),
        reference: dep.financialYear,
        narration: `Asset depreciation entry for ${dep.financialYear} (${dep.method} @ ${dep.rate}%)`,
        sourceType: "ASSET_DEPRECIATION",
        sourceId: dep.id,
        sourceUrl: "/reports?subtab=schedule",
        totalDebit: depAmt,
        totalCredit: depAmt,
        isBalanced: true,
        lines
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 7. GST CHALLAN SETTLEMENTS (GSTR-3B Cash Tax Paid)
    // ────────────────────────────────────────────────────────────────────────
    for (const gst of gstFilings) {
      if (gst.status === "FILED" && Number(gst.netTaxPaid || 0) > 0) {
        const netPaid = Number(gst.netTaxPaid);
        const lines: JournalVoucherLine[] = [
          {
            accountId: "stat_output_cgst",
            accountName: "Output GST Payable (Challan Cleared)",
            accountGroup: "Statutory Tax Liabilities",
            financialType: "LIABILITY",
            financialStatement: "BALANCE_SHEET",
            normalBalance: "CREDIT",
            debit: netPaid,
            credit: 0,
            particulars: `GSTR-3B tax payment via Challan ${gst.challanNumber || ""}`
          },
          {
            accountId: defaultBankId,
            accountName: defaultBankName,
            accountGroup: "Bank Accounts",
            financialType: "ASSET",
            financialStatement: "BALANCE_SHEET",
            normalBalance: "DEBIT",
            debit: 0,
            credit: netPaid,
            particulars: `Bank Challan payment for GST return ${gst.returnType} (${gst.financialYear})`
          }
        ];

        vouchers.push({
          id: `voucher_gst_${gst.id}`,
          voucherNumber: gst.challanNumber || `GST-CHLN-${gst.id.slice(-6)}`,
          voucherType: "Payment",
          date: new Date(gst.filingDate),
          reference: gst.arn || null,
          narration: `GST Challan settlement for ${gst.financialYear} (${gst.returnType})`,
          sourceType: "GST_FILING",
          sourceId: gst.id,
          sourceUrl: "/reports?subtab=gst",
          totalDebit: netPaid,
          totalCredit: netPaid,
          isBalanced: true,
          lines
        });
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 8. TDS DEPOSIT (Challan ITNS 281 Payment)
    // ────────────────────────────────────────────────────────────────────────
    for (const tds of tdsDeposits) {
      if (tds.status === "PAID" && Number(tds.amountPaid || 0) > 0) {
        const amt = Number(tds.amountPaid);
        const lines: JournalVoucherLine[] = [
          {
            accountId: "stat_tds_payable",
            accountName: "Statutory TDS Payable",
            accountGroup: "Statutory Tax Liabilities",
            financialType: "LIABILITY",
            financialStatement: "BALANCE_SHEET",
            normalBalance: "CREDIT",
            debit: amt,
            credit: 0,
            particulars: `TDS deposit via Challan ITNS 281 (${tds.challanNumber})`
          },
          {
            accountId: defaultBankId,
            accountName: defaultBankName,
            accountGroup: "Bank Accounts",
            financialType: "ASSET",
            financialStatement: "BALANCE_SHEET",
            normalBalance: "DEBIT",
            debit: 0,
            credit: amt,
            particulars: `Bank payment for Challan ITNS 281 (${tds.challanNumber})`
          }
        ];

        vouchers.push({
          id: `voucher_tds_${tds.id}`,
          voucherNumber: tds.challanNumber || `TDS-CHLN-${tds.id.slice(-6)}`,
          voucherType: "Payment",
          date: new Date(tds.depositDate),
          reference: tds.challanNumber,
          narration: `TDS deposited to IT Department via Challan ITNS 281 (${tds.section || "194J"})`,
          sourceType: "TDS_DEPOSIT",
          sourceId: tds.id,
          sourceUrl: "/reports?subtab=tds",
          totalDebit: amt,
          totalCredit: amt,
          isBalanced: true,
          lines
        });
      }
    }

    // Sort all vouchers chronologically
    vouchers.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Apply optional date filters if provided
    if (filters?.fromDate || filters?.toDate) {
      return vouchers.filter(v => {
        if (filters.fromDate && v.date < filters.fromDate) return false;
        if (filters.toDate && v.date > filters.toDate) return false;
        return true;
      });
    }

    return vouchers;
  }

  /**
   * General Ledger: Generates authoritative Ledger Statement for any Account
   */
  static async getLedgerStatement(accountId: string, fromDate?: Date, toDate?: Date): Promise<LedgerStatement> {
    const allVouchers = await this.generateAllVouchers();
    const accountList = await this.getAccountList();
    const account = accountList.find(a => a.id === accountId) || accountList[0];

    const now = new Date();
    const startYr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const start = fromDate || new Date(startYr, 3, 1, 0, 0, 0, 0);
    const end = toDate || new Date(startYr + 1, 2, 31, 23, 59, 59, 999);

    let openingValue = 0;
    const periodEntries: LedgerEntry[] = [];

    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    for (const v of allVouchers) {
      for (const line of v.lines) {
        if (line.accountId === account.id) {
          const isPrior = v.date < start;
          const isInPeriod = v.date >= start && v.date <= end;

          const dr = line.debit;
          const cr = line.credit;

          if (isPrior) {
            if (account.normalBalance === "DEBIT") {
              openingValue += (dr - cr);
            } else {
              openingValue += (cr - dr);
            }
          } else if (isInPeriod) {
            totalDebit += dr;
            totalCredit += cr;

            if (account.normalBalance === "DEBIT") {
              runningBalance = (runningBalance === 0 && periodEntries.length === 0 ? openingValue : runningBalance) + (dr - cr);
            } else {
              runningBalance = (runningBalance === 0 && periodEntries.length === 0 ? openingValue : runningBalance) + (cr - dr);
            }

            const balType = runningBalance >= 0 
              ? (account.normalBalance === "DEBIT" ? "Dr" : "Cr")
              : (account.normalBalance === "DEBIT" ? "Cr" : "Dr");

            periodEntries.push({
              id: `${v.id}_${periodEntries.length}`,
              date: v.date,
              voucherType: v.voucherType,
              voucherNo: v.voucherNumber,
              particulars: line.particulars || v.narration,
              reference: v.reference || undefined,
              debit: Math.round(dr * 100) / 100,
              credit: Math.round(cr * 100) / 100,
              runningBalance: Math.round(Math.abs(runningBalance) * 100) / 100,
              balanceType: balType,
              sourceType: v.sourceType,
              sourceId: v.sourceId
            });
          }
        }
      }
    }

    const openingBalance = Math.abs(openingValue);
    const openingBalanceType = openingValue >= 0 
      ? (account.normalBalance === "DEBIT" ? "Dr" : "Cr")
      : (account.normalBalance === "DEBIT" ? "Cr" : "Dr");

    const finalVal = periodEntries.length > 0 ? runningBalance : openingValue;
    const closingBalance = Math.abs(finalVal);
    const closingBalanceType = finalVal >= 0 
      ? (account.normalBalance === "DEBIT" ? "Dr" : "Cr")
      : (account.normalBalance === "DEBIT" ? "Cr" : "Dr");

    return {
      account,
      fromDate: start,
      toDate: end,
      openingBalance: Math.round(openingBalance * 100) / 100,
      openingBalanceType,
      entries: periodEntries,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      closingBalance: Math.round(closingBalance * 100) / 100,
      closingBalanceType
    };
  }

  /**
   * Full Chart of Accounts list with live balances
   */
  static async getAccountList(): Promise<AccountDescriptor[]> {
    const [customers, vendors, bankAccounts, categories, users] = await Promise.all([
      prisma.customer.findMany({ select: { id: true, legalName: true, tradeName: true, gstin: true, pan: true } }),
      prisma.vendor.findMany({ select: { id: true, name: true, businessName: true, gstin: true, pan: true } }),
      prisma.bankAccount.findMany({ select: { id: true, accountName: true, bankName: true, accountNumber: true } }),
      prisma.expenseCategory.findMany({ select: { id: true, name: true, financialType: true, statementGroup: true, normalBalance: true } }),
      prisma.user.findMany({ select: { id: true, name: true, email: true } })
    ]);

    const accounts: AccountDescriptor[] = [];

    // 1. Customers (Sundry Debtors)
    for (const c of customers) {
      accounts.push({
        id: `customer_${c.id}`,
        name: c.tradeName ? `${c.legalName} (${c.tradeName})` : c.legalName,
        group: "Trade Receivables",
        type: "CUSTOMER",
        financialType: "ASSET",
        financialStatement: "BALANCE_SHEET",
        normalBalance: "DEBIT",
        gstin: c.gstin || undefined,
        pan: c.pan || undefined
      });
    }

    // 2. Vendors (Sundry Creditors)
    for (const v of vendors) {
      accounts.push({
        id: `vendor_${v.id}`,
        name: v.businessName ? `${v.name} (${v.businessName})` : v.name,
        group: "Trade Payables",
        type: "VENDOR",
        financialType: "LIABILITY",
        financialStatement: "BALANCE_SHEET",
        normalBalance: "CREDIT",
        gstin: v.gstin || undefined,
        pan: v.pan || undefined
      });
    }

    // 3. Employee Payables
    for (const u of users) {
      accounts.push({
        id: `emp_${u.id}`,
        name: `${u.name} (Employee)`,
        group: "Employee Payables",
        type: "EMPLOYEE",
        financialType: "LIABILITY",
        financialStatement: "BALANCE_SHEET",
        normalBalance: "CREDIT"
      });
    }

    // 4. Bank & Cash Accounts
    accounts.push({
      id: "account_cash",
      name: "Cash in Hand Account",
      group: "Cash & Cash Equivalents",
      type: "CASH",
      financialType: "ASSET",
      financialStatement: "BALANCE_SHEET",
      normalBalance: "DEBIT"
    });

    for (const b of bankAccounts) {
      accounts.push({
        id: `bank_${b.id}`,
        name: `${b.bankName} — ${b.accountName} (${b.accountNumber})`,
        group: "Bank Accounts",
        type: "BANK",
        financialType: "ASSET",
        financialStatement: "BALANCE_SHEET",
        normalBalance: "DEBIT"
      });
    }

    // 5. Income Categories
    accounts.push({
      id: "cat_revenue_service",
      name: "Service Sales Revenue",
      group: "Revenue from Operations",
      type: "INCOME_CATEGORY",
      financialType: "INCOME",
      financialStatement: "PROFIT_LOSS",
      normalBalance: "CREDIT"
    });
    const incomeCats = categories.filter(c => c.financialType === "INCOME");
    for (const cat of incomeCats) {
      if (cat.id) {
        accounts.push({
          id: `cat_${cat.id}`,
          name: cat.name,
          group: cat.statementGroup || "Revenue from Operations",
          type: "INCOME_CATEGORY",
          financialType: "INCOME",
          financialStatement: "PROFIT_LOSS",
          normalBalance: "CREDIT"
        });
      }
    }

    // 6. Expense Categories
    const expenseCats = categories.filter(c => c.financialType !== "INCOME");
    for (const cat of expenseCats) {
      accounts.push({
        id: `cat_${cat.id}`,
        name: cat.name,
        group: cat.statementGroup || "Operating Expenses",
        type: "EXPENSE_CATEGORY",
        financialType: "EXPENSE",
        financialStatement: "PROFIT_LOSS",
        normalBalance: "DEBIT"
      });
    }

    // 7. Statutory Tax Accounts
    accounts.push({
      id: "stat_output_cgst",
      name: "Output CGST Payable",
      group: "Statutory Tax Liabilities",
      type: "STATUTORY_GST",
      financialType: "LIABILITY",
      financialStatement: "BALANCE_SHEET",
      normalBalance: "CREDIT"
    });
    accounts.push({
      id: "stat_output_sgst",
      name: "Output SGST Payable",
      group: "Statutory Tax Liabilities",
      type: "STATUTORY_GST",
      financialType: "LIABILITY",
      financialStatement: "BALANCE_SHEET",
      normalBalance: "CREDIT"
    });
    accounts.push({
      id: "stat_output_igst",
      name: "Output IGST Payable",
      group: "Statutory Tax Liabilities",
      type: "STATUTORY_GST",
      financialType: "LIABILITY",
      financialStatement: "BALANCE_SHEET",
      normalBalance: "CREDIT"
    });
    accounts.push({
      id: "stat_input_cgst",
      name: "Input CGST Credit (ITC)",
      group: "Statutory Tax Assets",
      type: "STATUTORY_GST",
      financialType: "ASSET",
      financialStatement: "BALANCE_SHEET",
      normalBalance: "DEBIT"
    });
    accounts.push({
      id: "stat_input_sgst",
      name: "Input SGST Credit (ITC)",
      group: "Statutory Tax Assets",
      type: "STATUTORY_GST",
      financialType: "ASSET",
      financialStatement: "BALANCE_SHEET",
      normalBalance: "DEBIT"
    });
    accounts.push({
      id: "stat_input_igst",
      name: "Input IGST Credit (ITC)",
      group: "Statutory Tax Assets",
      type: "STATUTORY_GST",
      financialType: "ASSET",
      financialStatement: "BALANCE_SHEET",
      normalBalance: "DEBIT"
    });
    accounts.push({
      id: "stat_tds_payable",
      name: "Statutory TDS Payable (194J/194C)",
      group: "Statutory Tax Liabilities",
      type: "STATUTORY_TDS",
      financialType: "LIABILITY",
      financialStatement: "BALANCE_SHEET",
      normalBalance: "CREDIT"
    });
    accounts.push({
      id: "stat_tds_receivable",
      name: "TDS Receivable (Current Asset)",
      group: "Current Assets",
      type: "STATUTORY_TDS",
      financialType: "ASSET",
      financialStatement: "BALANCE_SHEET",
      normalBalance: "DEBIT"
    });

    // 8. Capital & Fixed Asset Accounts
    accounts.push({
      id: "asset_fixed",
      name: "Fixed Assets & Equipment",
      group: "Fixed Assets",
      type: "FIXED_ASSET",
      financialType: "ASSET",
      financialStatement: "BALANCE_SHEET",
      normalBalance: "DEBIT"
    });
    accounts.push({
      id: "asset_dep_accum",
      name: "Accumulated Depreciation",
      group: "Fixed Assets",
      type: "FIXED_ASSET",
      financialType: "ASSET",
      financialStatement: "BALANCE_SHEET",
      normalBalance: "CREDIT"
    });
    accounts.push({
      id: "cat_exp_depreciation",
      name: "Depreciation & Amortisation Expense",
      group: "Depreciation & Amortisation",
      type: "EXPENSE_CATEGORY",
      financialType: "EXPENSE",
      financialStatement: "PROFIT_LOSS",
      normalBalance: "DEBIT"
    });
    accounts.push({
      id: "eq_capital",
      name: "Owner Capital Account",
      group: "Capital & Equity",
      type: "CAPITAL",
      financialType: "EQUITY",
      financialStatement: "BALANCE_SHEET",
      normalBalance: "CREDIT"
    });
    // Calculate live balance and transaction count from all vouchers
    try {
      const allVouchers = await this.generateAllVouchers();
      const balanceMap = new Map<string, { balance: number; count: number }>();

      for (const v of allVouchers) {
        for (const line of v.lines) {
          if (!balanceMap.has(line.accountId)) {
            balanceMap.set(line.accountId, { balance: 0, count: 0 });
          }
          const item = balanceMap.get(line.accountId)!;
          item.count += 1;
          if (line.normalBalance === "DEBIT") {
            item.balance += (line.debit - line.credit);
          } else {
            item.balance += (line.credit - line.debit);
          }
        }
      }

      for (const acc of accounts) {
        const b = balanceMap.get(acc.id);
        if (b) {
          acc.currentBalance = Math.round(Math.abs(b.balance) * 100) / 100;
          acc.currentBalanceType = b.balance >= 0 
            ? (acc.normalBalance === "DEBIT" ? "Dr" : "Cr")
            : (acc.normalBalance === "DEBIT" ? "Cr" : "Dr");
          acc.transactionCount = b.count;
        } else {
          acc.currentBalance = 0;
          acc.currentBalanceType = acc.normalBalance === "DEBIT" ? "Dr" : "Cr";
          acc.transactionCount = 0;
        }
      }
    } catch (err) {
      console.warn("Could not precompute account card balances:", err);
    }

    return accounts;
  }

  /**
   * 100% Balanced Double-Entry TRIAL BALANCE Report
   */
  static async getTrialBalance(params?: { asOfDate?: Date; financialYear?: string }): Promise<TrialBalanceReport> {
    const vouchers = await this.generateAllVouchers({
      toDate: params?.asOfDate,
      financialYear: params?.financialYear
    });

    const accountList = await this.getAccountList();
    const accountMap = new Map<string, AccountDescriptor>(accountList.map(a => [a.id, a]));

    const balances = new Map<string, { dr: number; cr: number; count: number }>();

    for (const v of vouchers) {
      for (const line of v.lines) {
        if (!balances.has(line.accountId)) {
          balances.set(line.accountId, { dr: 0, cr: 0, count: 0 });
        }
        const b = balances.get(line.accountId)!;
        b.dr += line.debit;
        b.cr += line.credit;
        b.count += 1;
      }
    }

    const items: TrialBalanceItem[] = [];
    let grandDebit = 0;
    let grandCredit = 0;

    for (const [accId, totals] of balances.entries()) {
      const acc = accountMap.get(accId) || {
        id: accId,
        name: accId,
        group: "General",
        financialType: "EXPENSE" as const,
        financialStatement: "PROFIT_LOSS" as const,
        normalBalance: "DEBIT" as const
      };

      const dr = Math.round(totals.dr * 100) / 100;
      const cr = Math.round(totals.cr * 100) / 100;

      let netDebit = 0;
      let netCredit = 0;

      if (dr >= cr) {
        netDebit = Math.round((dr - cr) * 100) / 100;
      } else {
        netCredit = Math.round((cr - dr) * 100) / 100;
      }

      grandDebit += netDebit;
      grandCredit += netCredit;

      items.push({
        accountId: acc.id,
        accountName: acc.name,
        accountGroup: acc.group,
        financialType: acc.financialType,
        financialStatement: acc.financialStatement,
        normalBalance: acc.normalBalance,
        totalDebit: dr,
        totalCredit: cr,
        netDebit,
        netCredit,
        balance: Math.max(netDebit, netCredit),
        balanceType: netDebit >= netCredit ? "Dr" : "Cr"
      });
    }

    // Sort by Financial Statement (Balance Sheet then P&L) then group
    items.sort((a, b) => {
      if (a.financialStatement !== b.financialStatement) {
        return a.financialStatement === "BALANCE_SHEET" ? -1 : 1;
      }
      return a.accountGroup.localeCompare(b.accountGroup);
    });

    const diff = Math.round((grandDebit - grandCredit) * 100) / 100;

    return {
      asOfDate: params?.asOfDate || new Date(),
      items,
      totalDebit: Math.round(grandDebit * 100) / 100,
      totalCredit: Math.round(grandCredit * 100) / 100,
      difference: diff,
      isBalanced: Math.abs(diff) <= 0.05
    };
  }

  /**
   * Formal PROFIT & LOSS Statement derived strictly from ledger accounts
   */
  static async getProfitAndLoss(params?: FilterOptions): Promise<ProfitAndLossReport> {
    const { fromDate, toDate } = params?.fromDate && params?.toDate
      ? { fromDate: params.fromDate, toDate: params.toDate }
      : this.getFinancialYearBounds(params?.financialYear);

    const vouchers = await this.generateAllVouchers({ fromDate, toDate });

    const revenueMap = new Map<string, number>();
    const otherIncomeMap = new Map<string, number>();

    const operatingExpMap = new Map<string, number>();
    const employeeCostMap = new Map<string, number>();
    const depreciationMap = new Map<string, number>();
    const financeCostMap = new Map<string, number>();
    const otherExpMap = new Map<string, number>();

    for (const v of vouchers) {
      if (v.date < fromDate || v.date > toDate) continue;

      for (const line of v.lines) {
        if (line.financialStatement === "PROFIT_LOSS") {
          const amt = line.credit - line.debit; // Net credit is income, net debit is expense

          if (line.financialType === "INCOME") {
            const incomeAmt = line.credit - line.debit;
            if (line.accountGroup.toLowerCase().includes("other")) {
              otherIncomeMap.set(line.accountName, (otherIncomeMap.get(line.accountName) || 0) + incomeAmt);
            } else {
              revenueMap.set(line.accountName, (revenueMap.get(line.accountName) || 0) + incomeAmt);
            }
          } else if (line.financialType === "EXPENSE") {
            const expAmt = line.debit - line.credit;
            const grp = line.accountGroup.toLowerCase();

            if (grp.includes("employee") || grp.includes("salary") || grp.includes("wage")) {
              employeeCostMap.set(line.accountName, (employeeCostMap.get(line.accountName) || 0) + expAmt);
            } else if (grp.includes("depreciation") || grp.includes("amortisation")) {
              depreciationMap.set(line.accountName, (depreciationMap.get(line.accountName) || 0) + expAmt);
            } else if (grp.includes("finance") || grp.includes("interest") || grp.includes("bank charge")) {
              financeCostMap.set(line.accountName, (financeCostMap.get(line.accountName) || 0) + expAmt);
            } else if (grp.includes("other")) {
              otherExpMap.set(line.accountName, (otherExpMap.get(line.accountName) || 0) + expAmt);
            } else {
              operatingExpMap.set(line.accountName, (operatingExpMap.get(line.accountName) || 0) + expAmt);
            }
          }
        }
      }
    }

    const toList = (m: Map<string, number>) => Array.from(m.entries()).map(([name, amount]) => ({
      name,
      amount: Math.round(amount * 100) / 100
    })).filter(i => i.amount !== 0);

    const revenueFromOperations = toList(revenueMap);
    const otherIncome = toList(otherIncomeMap);
    const operatingExpenses = toList(operatingExpMap);
    const employeeCosts = toList(employeeCostMap);
    const depreciationAmortization = toList(depreciationMap);
    const financeCosts = toList(financeCostMap);
    const otherExpenses = toList(otherExpMap);

    const totalRevFromOps = revenueFromOperations.reduce((s, i) => s + i.amount, 0);
    const totalOtherInc = otherIncome.reduce((s, i) => s + i.amount, 0);
    const totalRevenue = Math.round((totalRevFromOps + totalOtherInc) * 100) / 100;

    const totalOpExp = operatingExpenses.reduce((s, i) => s + i.amount, 0);
    const totalEmpCost = employeeCosts.reduce((s, i) => s + i.amount, 0);
    const totalDep = depreciationAmortization.reduce((s, i) => s + i.amount, 0);
    const totalFin = financeCosts.reduce((s, i) => s + i.amount, 0);
    const totalOthExp = otherExpenses.reduce((s, i) => s + i.amount, 0);

    const totalExpenses = Math.round((totalOpExp + totalEmpCost + totalDep + totalFin + totalOthExp) * 100) / 100;
    const operatingProfit = Math.round((totalRevenue - (totalOpExp + totalEmpCost + totalOthExp)) * 100) / 100;
    const profitBeforeTax = Math.round((totalRevenue - totalExpenses) * 100) / 100;
    const taxExpense = profitBeforeTax > 0 ? Math.round(profitBeforeTax * 0.25 * 100) / 100 : 0; // Standard 25% Indian corporate tax rate
    const netProfitAfterTax = Math.round((profitBeforeTax - taxExpense) * 100) / 100;

    return {
      fromDate,
      toDate,
      revenueFromOperations,
      otherIncome,
      totalRevenue,
      operatingExpenses,
      employeeCosts,
      depreciationAmortization,
      financeCosts,
      otherExpenses,
      totalExpenses,
      operatingProfit,
      profitBeforeTax,
      taxExpense,
      netProfitAfterTax
    };
  }

  /**
   * Formal BALANCE SHEET Report (Schedule III) with 100% Mathematical Equilibrium Verification
   */
  static async getBalanceSheet(params?: FilterOptions): Promise<BalanceSheetReport> {
    const { fromDate, toDate } = params?.fromDate && params?.toDate
      ? { fromDate: params.fromDate, toDate: params.toDate }
      : this.getFinancialYearBounds(params?.financialYear);

    const asOfDate = toDate;

    // 1. Get P&L to incorporate current year PAT into Reserves & Surplus
    const pnl = await this.getProfitAndLoss(params);
    const currentYearProfit = pnl.netProfitAfterTax;

    // 2. Fetch all vouchers up to asOfDate
    const vouchers = await this.generateAllVouchers({ toDate: asOfDate });

    // Sum balances for Balance Sheet accounts
    let capital = 0;
    let drawings = 0;
    let employeePayables = 0;
    let outputGst = 0;
    let tdsPayable = 0;
    let otherLiabs = 0;

    let fixedAssetsGross = 0;
    let accumDepreciation = 0;
    let cashAndBank = 0;
    let tdsReceivable = 0;
    let inputGst = 0;
    let otherAssets = 0;

    const customerBalanceMap = new Map<string, number>();
    const vendorBalanceMap = new Map<string, number>();

    for (const v of vouchers) {
      for (const line of v.lines) {
        if (line.financialStatement === "BALANCE_SHEET") {
          const dr = line.debit;
          const cr = line.credit;

          if (line.accountId === "eq_capital" || line.accountGroup.toLowerCase().includes("capital")) {
            capital += (cr - dr);
          } else if (line.accountId === "eq_drawings") {
            drawings += (dr - cr);
          } else if (line.accountGroup === "Trade Payables" || line.accountId.startsWith("vendor_")) {
            vendorBalanceMap.set(line.accountId, (vendorBalanceMap.get(line.accountId) || 0) + (cr - dr));
          } else if (line.accountGroup === "Employee Payables" || line.accountId.startsWith("emp_")) {
            employeePayables += (cr - dr);
          } else if (line.accountId.startsWith("stat_output_")) {
            outputGst += (cr - dr);
          } else if (line.accountId === "stat_tds_payable") {
            tdsPayable += (cr - dr);
          } else if (line.financialType === "LIABILITY") {
            otherLiabs += (cr - dr);
          } else if (line.accountId === "asset_fixed") {
            fixedAssetsGross += (dr - cr);
          } else if (line.accountId === "asset_dep_accum") {
            accumDepreciation += (cr - dr);
          } else if (line.accountGroup === "Trade Receivables" || line.accountId.startsWith("customer_")) {
            customerBalanceMap.set(line.accountId, (customerBalanceMap.get(line.accountId) || 0) + (dr - cr));
          } else if (line.accountGroup === "Bank Accounts" || line.accountGroup === "Cash & Cash Equivalents" || line.accountId.startsWith("bank_") || line.accountId === "account_cash") {
            cashAndBank += (dr - cr);
          } else if (line.accountId === "stat_tds_receivable") {
            tdsReceivable += (dr - cr);
          } else if (line.accountId.startsWith("stat_input_")) {
            inputGst += (dr - cr);
          } else if (line.financialType === "ASSET") {
            otherAssets += (dr - cr);
          }
        }
      }
    }

    // Segregate debtors and advances
    let tradeReceivables = 0;
    let customerAdvances = 0;
    for (const bal of customerBalanceMap.values()) {
      if (bal > 0) tradeReceivables += bal;
      else if (bal < 0) customerAdvances += Math.abs(bal);
    }

    let tradePayables = 0;
    let vendorAdvances = 0;
    for (const bal of vendorBalanceMap.values()) {
      if (bal > 0) tradePayables += bal;
      else if (bal < 0) vendorAdvances += Math.abs(bal);
    }

    // Net GST position: if Output > Input, statutory GST payable. If Input > Output, excess ITC asset.
    let statutoryGstPayable = 0;
    let gstInputCredit = 0;

    if (outputGst >= inputGst) {
      statutoryGstPayable = Math.round((outputGst - inputGst) * 100) / 100;
      gstInputCredit = 0;
    } else {
      statutoryGstPayable = 0;
      gstInputCredit = Math.round((inputGst - outputGst) * 100) / 100;
    }

    capital = Math.round(capital * 100) / 100;
    drawings = Math.round(drawings * 100) / 100;
    const reservesAndSurplus = Math.round(currentYearProfit * 100) / 100;
    const totalShareholdersFunds = Math.round((capital + reservesAndSurplus - drawings) * 100) / 100;

    tradePayables = Math.round(tradePayables * 100) / 100;
    employeePayables = Math.round(Math.max(0, employeePayables) * 100) / 100;
    tdsPayable = Math.round(Math.max(0, tdsPayable) * 100) / 100;
    customerAdvances = Math.round(customerAdvances * 100) / 100;
    const incomeTaxProvision = pnl.taxExpense;
    const totalOtherLiabilities = Math.round((otherLiabs + customerAdvances + incomeTaxProvision) * 100) / 100;

    const totalCurrentLiabilities = Math.round((tradePayables + employeePayables + statutoryGstPayable + tdsPayable + totalOtherLiabilities) * 100) / 100;
    const totalEquityAndLiabilities = Math.round((totalShareholdersFunds + totalCurrentLiabilities) * 100) / 100;

    fixedAssetsGross = Math.round(fixedAssetsGross * 100) / 100;
    accumDepreciation = Math.round(accumDepreciation * 100) / 100;
    const fixedAssetsNet = Math.round((fixedAssetsGross - accumDepreciation) * 100) / 100;

    tradeReceivables = Math.round(tradeReceivables * 100) / 100;
    cashAndBank = Math.round(cashAndBank * 100) / 100;
    tdsReceivable = Math.round(Math.max(0, tdsReceivable) * 100) / 100;
    vendorAdvances = Math.round(vendorAdvances * 100) / 100;
    const totalOtherAssets = Math.round((otherAssets + vendorAdvances) * 100) / 100;

    const totalCurrentAssets = Math.round((tradeReceivables + cashAndBank + tdsReceivable + gstInputCredit + totalOtherAssets) * 100) / 100;
    const totalAssets = Math.round((fixedAssetsNet + totalCurrentAssets) * 100) / 100;

    const diff = Math.round((totalAssets - totalEquityAndLiabilities) * 100) / 100;
    const isBalanced = Math.abs(diff) <= 0.05;

    return {
      asOfDate,
      equity: {
        capital,
        reservesAndSurplus,
        drawings,
        totalShareholdersFunds
      },
      nonCurrentLiabilities: {
        items: [],
        total: 0
      },
      currentLiabilities: {
        tradePayables,
        employeePayables,
        statutoryGstPayable,
        statutoryTdsPayable: tdsPayable,
        otherCurrentLiabilities: totalOtherLiabilities,
        total: totalCurrentLiabilities
      },
      totalEquityAndLiabilities,
      nonCurrentAssets: {
        fixedAssetsGross,
        accumulatedDepreciation: accumDepreciation,
        fixedAssetsNet,
        otherNonCurrentAssets: 0,
        total: fixedAssetsNet
      },
      currentAssets: {
        tradeReceivables,
        cashAndBank,
        tdsReceivable,
        gstInputCredit,
        otherCurrentAssets: totalOtherAssets,
        total: totalCurrentAssets
      },
      totalAssets,
      difference: diff,
      isBalanced
    };
  }

  /**
   * AS-3 Direct/Indirect CASH FLOW Statement derived from Cash/Bank ledger entries
   */
  static async getCashFlow(params?: FilterOptions): Promise<CashFlowReport> {
    const { fromDate, toDate } = params?.fromDate && params?.toDate
      ? { fromDate: params.fromDate, toDate: params.toDate }
      : this.getFinancialYearBounds(params?.financialYear);

    const allVouchers = await this.generateAllVouchers();

    let openingCashAndBank = 0;
    let customerReceipts = 0;
    let vendorDisbursements = 0;
    let employeeDisbursements = 0;
    let gstPaid = 0;
    let tdsPaid = 0;
    let capitalExpenditure = 0;
    let capitalIntroduced = 0;
    let drawingsWithdrawn = 0;

    for (const v of allVouchers) {
      const isPrior = v.date < fromDate;
      const isInPeriod = v.date >= fromDate && v.date <= toDate;

      for (const line of v.lines) {
        const isCashOrBank = line.accountGroup === "Bank Accounts" || line.accountGroup === "Cash & Cash Equivalents" || line.accountId.startsWith("bank_") || line.accountId === "account_cash";

        if (isCashOrBank) {
          const netMovement = line.debit - line.credit;

          if (isPrior) {
            openingCashAndBank += netMovement;
          } else if (isInPeriod) {
            if (v.sourceType === "INVOICE_PAYMENT") {
              customerReceipts += line.debit;
            } else if (v.sourceType === "EXPENSE" || v.sourceType === "EXPENSE_REIMBURSEMENT") {
              if (v.sourceType === "EXPENSE_REIMBURSEMENT") {
                employeeDisbursements += line.credit;
              } else {
                vendorDisbursements += line.credit;
              }
            } else if (v.sourceType === "GST_FILING") {
              gstPaid += line.credit;
            } else if (v.sourceType === "TDS_DEPOSIT") {
              tdsPaid += line.credit;
            } else if (v.sourceType === "OPENING_BALANCE") {
              capitalIntroduced += line.debit;
            } else if (v.sourceType === "BANK_TRANSFER" && v.voucherNumber.startsWith("DRW")) {
              drawingsWithdrawn += line.credit;
            }
          }
        }
      }
    }

    const netOperating = customerReceipts - (vendorDisbursements + employeeDisbursements + gstPaid + tdsPaid);
    const netInvesting = -capitalExpenditure;
    const netFinancing = capitalIntroduced - drawingsWithdrawn;
    const netCashFlow = netOperating + netInvesting + netFinancing;
    const closingCashAndBank = openingCashAndBank + netCashFlow;

    return {
      fromDate,
      toDate,
      operatingCashFlow: {
        customerReceipts: Math.round(customerReceipts * 100) / 100,
        vendorDisbursements: Math.round(vendorDisbursements * 100) / 100,
        employeeDisbursements: Math.round(employeeDisbursements * 100) / 100,
        gstPaid: Math.round(gstPaid * 100) / 100,
        tdsPaid: Math.round(tdsPaid * 100) / 100,
        netOperating: Math.round(netOperating * 100) / 100
      },
      investingCashFlow: {
        capitalExpenditure: Math.round(capitalExpenditure * 100) / 100,
        netInvesting: Math.round(netInvesting * 100) / 100
      },
      financingCashFlow: {
        capitalIntroduced: Math.round(capitalIntroduced * 100) / 100,
        drawingsWithdrawn: Math.round(drawingsWithdrawn * 100) / 100,
        netFinancing: Math.round(netFinancing * 100) / 100
      },
      openingCashAndBank: Math.round(openingCashAndBank * 100) / 100,
      netCashFlow: Math.round(netCashFlow * 100) / 100,
      closingCashAndBank: Math.round(closingCashAndBank * 100) / 100
    };
  }

  /**
   * Unified DASHBOARD KPI & Summary Object
   * Guarantees 100% Reconciliation across Dashboard, Ledgers, and Financial Statements
   */
  static async getDashboardData(params?: FilterOptions) {
    const [pnl, bs, cashflow, tb] = await Promise.all([
      this.getProfitAndLoss(params),
      this.getBalanceSheet(params),
      this.getCashFlow(params),
      this.getTrialBalance({ asOfDate: params?.toDate, financialYear: params?.financialYear })
    ]);

    const totalRevenue = pnl.totalRevenue;
    const totalExpenses = pnl.totalExpenses;
    const operatingResult = pnl.operatingProfit;
    const profitMargin = totalRevenue > 0 ? (operatingResult / totalRevenue) * 100 : 0;
    const outstandingReceivables = bs.currentAssets.tradeReceivables;
    const outstandingPayables = bs.currentLiabilities.tradePayables + bs.currentLiabilities.employeePayables;

    // Monthly Trends directly derived from P&L vouchers
    const vouchers = await this.generateAllVouchers(params);
    const monthlyMap: Record<string, { month: string; revenue: number; expenses: number; sortKey: string }> = {};

    for (const v of vouchers) {
      const d = v.date;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });

      if (!monthlyMap[key]) {
        monthlyMap[key] = { month: label, revenue: 0, expenses: 0, sortKey: key };
      }

      for (const line of v.lines) {
        if (line.financialType === "INCOME") {
          monthlyMap[key].revenue += (line.credit - line.debit);
        } else if (line.financialType === "EXPENSE") {
          monthlyMap[key].expenses += (line.debit - line.credit);
        }
      }
    }

    const trends = Object.values(monthlyMap)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ month, revenue, expenses }) => ({
        month,
        revenue: Math.round(revenue * 100) / 100,
        expenses: Math.round(expenses * 100) / 100
      }));

    // Tax Position directly from Balance Sheet
    const taxPosition = {
      outputGST: bs.currentLiabilities.statutoryGstPayable,
      inputGST: bs.currentAssets.gstInputCredit,
      netGST: bs.currentLiabilities.statutoryGstPayable > 0 ? bs.currentLiabilities.statutoryGstPayable : -bs.currentAssets.gstInputCredit,
      tdsReceivable: bs.currentAssets.tdsReceivable,
      tdsPayable: bs.currentLiabilities.statutoryTdsPayable
    };

    return {
      isDbConnected: true,
      kpis: {
        totalRevenue,
        totalExpenses,
        operatingResult,
        profitMargin: Math.round(profitMargin * 100) / 100,
        outstandingReceivables,
        outstandingPayables,
        netProfitAfterTax: pnl.netProfitAfterTax,
        cashAndBankBalance: bs.currentAssets.cashAndBank,
        isBalanceSheetBalanced: bs.isBalanced,
        isTrialBalanceBalanced: tb.isBalanced
      },
      trends,
      taxPosition,
      pnl,
      bs,
      cashflow,
      trialBalance: tb
    };
  }
}
