import { prisma } from "@/lib/prisma";

export interface AccountDescriptor {
  id: string;
  name: string;
  type: 
    | "CUSTOMER" 
    | "VENDOR" 
    | "BANK" 
    | "CASH" 
    | "INCOME_CATEGORY" 
    | "EXPENSE_CATEGORY" 
    | "STATUTORY_GST" 
    | "STATUTORY_TDS" 
    | "FIXED_ASSET" 
    | "CAPITAL";
  group: string;
  normalBalance: "DEBIT" | "CREDIT";
  gstin?: string;
  pan?: string;
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
  sourceType: "TAX_INVOICE" | "EXPENSE" | "BANK_TRANSFER" | "PAYMENT" | "OPENING";
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

export class LedgerService {
  /**
   * Fetch list of all selectable Ledger Accounts in the system
   */
  static async getAccountList(): Promise<AccountDescriptor[]> {
    const [customers, vendors, bankAccounts, categories] = await Promise.all([
      prisma.customer.findMany({ select: { id: true, legalName: true, tradeName: true, gstin: true, pan: true } }),
      prisma.vendor.findMany({ select: { id: true, name: true, businessName: true, gstin: true, pan: true } }),
      prisma.bankAccount.findMany({ select: { id: true, accountName: true, bankName: true, accountNumber: true } }),
      prisma.expenseCategory.findMany({ select: { id: true, name: true, financialType: true, statementGroup: true } }),
    ]);

    const accounts: AccountDescriptor[] = [];

    // 1. Customers (Sundry Debtors)
    for (const c of customers) {
      accounts.push({
        id: `customer_${c.id}`,
        name: c.tradeName ? `${c.legalName} (${c.tradeName})` : c.legalName,
        type: "CUSTOMER",
        group: "Sundry Debtors",
        normalBalance: "DEBIT",
        gstin: c.gstin || undefined,
        pan: c.pan || undefined,
      });
    }

    // 2. Vendors (Sundry Creditors)
    for (const v of vendors) {
      accounts.push({
        id: `vendor_${v.id}`,
        name: v.businessName ? `${v.name} (${v.businessName})` : v.name,
        type: "VENDOR",
        group: "Sundry Creditors",
        normalBalance: "CREDIT",
        gstin: v.gstin || undefined,
        pan: v.pan || undefined,
      });
    }

    // 3. Cash & Bank Accounts
    accounts.push({
      id: "account_cash",
      name: "Cash in Hand Account",
      type: "CASH",
      group: "Cash & Bank Balances",
      normalBalance: "DEBIT",
    });

    for (const b of bankAccounts) {
      accounts.push({
        id: `bank_${b.id}`,
        name: `${b.bankName} — ${b.accountName} (${b.accountNumber})`,
        type: "BANK",
        group: "Cash & Bank Balances",
        normalBalance: "DEBIT",
      });
    }

    // 4. Income Categories
    const incomeCats = categories.filter(c => c.financialType === "INCOME");
    if (incomeCats.length === 0) {
      accounts.push({ id: "cat_income_default", name: "Service Sales Revenue", type: "INCOME_CATEGORY", group: "Revenue Accounts", normalBalance: "CREDIT" });
    } else {
      for (const cat of incomeCats) {
        accounts.push({
          id: `cat_${cat.id}`,
          name: cat.name,
          type: "INCOME_CATEGORY",
          group: cat.statementGroup || "Revenue Accounts",
          normalBalance: "CREDIT",
        });
      }
    }

    // 5. Expense Categories
    const expenseCats = categories.filter(c => c.financialType !== "INCOME");
    for (const cat of expenseCats) {
      accounts.push({
        id: `cat_${cat.id}`,
        name: cat.name,
        type: "EXPENSE_CATEGORY",
        group: cat.statementGroup || "Operating Expenses",
        normalBalance: "DEBIT",
      });
    }

    // 6. Statutory Tax Accounts
    accounts.push({ id: "stat_output_cgst", name: "Output CGST Payable", type: "STATUTORY_GST", group: "Statutory Tax Liabilities", normalBalance: "CREDIT" });
    accounts.push({ id: "stat_output_sgst", name: "Output SGST Payable", type: "STATUTORY_GST", group: "Statutory Tax Liabilities", normalBalance: "CREDIT" });
    accounts.push({ id: "stat_output_igst", name: "Output IGST Payable", type: "STATUTORY_GST", group: "Statutory Tax Liabilities", normalBalance: "CREDIT" });
    accounts.push({ id: "stat_input_cgst", name: "Input CGST Credit (ITC)", type: "STATUTORY_GST", group: "Statutory Tax Assets", normalBalance: "DEBIT" });
    accounts.push({ id: "stat_input_sgst", name: "Input SGST Credit (ITC)", type: "STATUTORY_GST", group: "Statutory Tax Assets", normalBalance: "DEBIT" });
    accounts.push({ id: "stat_input_igst", name: "Input IGST Credit (ITC)", type: "STATUTORY_GST", group: "Statutory Tax Assets", normalBalance: "DEBIT" });
    accounts.push({ id: "stat_tds_payable", name: "TDS Payable Account", type: "STATUTORY_TDS", group: "Statutory Tax Liabilities", normalBalance: "CREDIT" });
    accounts.push({ id: "stat_tds_receivable", name: "TDS Receivable Account", type: "STATUTORY_TDS", group: "Statutory Tax Assets", normalBalance: "DEBIT" });

    // 7. Capital & Fixed Asset Accounts
    accounts.push({ id: "asset_fixed", name: "Fixed Assets & Equipment", type: "FIXED_ASSET", group: "Fixed Assets", normalBalance: "DEBIT" });
    accounts.push({ id: "eq_capital", name: "Owner Capital Account", type: "CAPITAL", group: "Capital & Equity", normalBalance: "CREDIT" });

    return accounts;
  }

  /**
   * Generate complete CA Account Ledger Statement
   */
  static async getLedgerStatement(accountId: string, fromDateStr?: string, toDateStr?: string): Promise<LedgerStatement> {
    const accountList = await this.getAccountList();
    const account = accountList.find(a => a.id === accountId) || accountList[0];

    const now = new Date();
    const startYr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fromDate = fromDateStr ? new Date(fromDateStr) : new Date(startYr, 3, 1);
    const toDate = toDateStr ? new Date(toDateStr) : new Date(startYr + 1, 2, 31);
    toDate.setHours(23, 59, 59, 999);

    // Targeted transaction queries based on Account Type
    let invoices: any[] = [];
    let expenses: any[] = [];
    let payments: any[] = [];

    if (account.type === "CUSTOMER") {
      const custId = account.id.replace("customer_", "");
      [invoices, payments] = await Promise.all([
        prisma.taxInvoice.findMany({
          where: { status: { in: ["CONFIRMED", "PAID", "PARTIALLY_PAID"] }, customerId: custId },
          include: { customer: true, payments: true, items: { include: { incomeCategory: true } } },
          orderBy: { invoiceDate: "asc" }
        }),
        prisma.invoicePayment.findMany({
          where: { taxInvoice: { customerId: custId } },
          include: { taxInvoice: { include: { customer: true } } },
          orderBy: { paymentDate: "asc" }
        })
      ]);
    } else if (account.type === "VENDOR") {
      const vendorId = account.id.replace("vendor_", "");
      expenses = await prisma.expense.findMany({
        where: { status: "APPROVED", vendorId: vendorId },
        include: { vendor: true, category: true, items: { include: { category: true } } },
        orderBy: { expenseDate: "asc" }
      });
    } else if (account.type === "EXPENSE_CATEGORY") {
      const catId = account.id.replace("cat_", "");
      expenses = await prisma.expense.findMany({
        where: {
          status: "APPROVED",
          OR: [
            { categoryId: catId },
            { items: { some: { categoryId: catId } } }
          ]
        },
        include: { vendor: true, category: true, items: { include: { category: true } } },
        orderBy: { expenseDate: "asc" }
      });
    } else if (account.type === "INCOME_CATEGORY") {
      const catId = account.id.replace("cat_", "");
      invoices = await prisma.taxInvoice.findMany({
        where: {
          status: { in: ["CONFIRMED", "PAID", "PARTIALLY_PAID"] },
          ...(catId !== "cat_income_default" ? { items: { some: { incomeCategoryId: catId } } } : {})
        },
        include: { customer: true, payments: true, items: { include: { incomeCategory: true } } },
        orderBy: { invoiceDate: "asc" }
      });
    } else if (account.type === "BANK" || account.type === "CASH") {
      [payments, expenses] = await Promise.all([
        prisma.invoicePayment.findMany({
          include: { taxInvoice: { include: { customer: true } } },
          orderBy: { paymentDate: "asc" }
        }),
        prisma.expense.findMany({
          where: { status: "APPROVED", paymentStatus: "PAID" },
          include: { vendor: true, category: true, items: { include: { category: true } } },
          orderBy: { expenseDate: "asc" }
        })
      ]);
    } else if (account.type === "STATUTORY_GST") {
      if (account.id.includes("output")) {
        invoices = await prisma.taxInvoice.findMany({
          where: { status: { in: ["CONFIRMED", "PAID", "PARTIALLY_PAID"] }, totalGST: { gt: 0 } },
          include: { customer: true, payments: true, items: { include: { incomeCategory: true } } },
          orderBy: { invoiceDate: "asc" }
        });
      } else {
        expenses = await prisma.expense.findMany({
          where: { status: "APPROVED", totalInputGST: { gt: 0 } },
          include: { vendor: true, category: true, items: { include: { category: true } } },
          orderBy: { expenseDate: "asc" }
        });
      }
    } else if (account.type === "STATUTORY_TDS") {
      if (account.id.includes("payable")) {
        expenses = await prisma.expense.findMany({
          where: { status: "APPROVED", tdsAmount: { gt: 0 } },
          include: { vendor: true, category: true, items: { include: { category: true } } },
          orderBy: { expenseDate: "asc" }
        });
      } else {
        invoices = await prisma.taxInvoice.findMany({
          where: { status: { in: ["CONFIRMED", "PAID", "PARTIALLY_PAID"] }, tdsAmount: { gt: 0 } },
          include: { customer: true, payments: true, items: { include: { incomeCategory: true } } },
          orderBy: { invoiceDate: "asc" }
        });
      }
    } else if (account.type === "FIXED_ASSET") {
      expenses = await prisma.expense.findMany({
        where: { status: "APPROVED", isAsset: true },
        include: { vendor: true, category: true, items: { include: { category: true } } },
        orderBy: { expenseDate: "asc" }
      });
    }

    const rawLedgerItems: Array<{
      date: Date;
      voucherType: string;
      voucherNo: string;
      particulars: string;
      reference?: string;
      debit: number;
      credit: number;
      sourceType: "TAX_INVOICE" | "EXPENSE" | "BANK_TRANSFER" | "PAYMENT" | "OPENING";
      sourceId: string;
    }> = [];

    // Filter relevant transactions based on Account Type
    if (account.type === "CUSTOMER") {
      const custId = account.id.replace("customer_", "");
      
      for (const inv of invoices) {
        if (inv.customerId === custId) {
          rawLedgerItems.push({
            date: new Date(inv.invoiceDate),
            voucherType: "Tax Invoice",
            voucherNo: inv.invoiceNumber,
            particulars: "To Sales / Service Income",
            debit: Number(inv.netAmount || 0),
            credit: 0,
            sourceType: "TAX_INVOICE",
            sourceId: inv.id,
          });
        }
      }
      for (const p of payments) {
        if (p.taxInvoice.customerId === custId) {
          rawLedgerItems.push({
            date: new Date(p.paymentDate),
            voucherType: "Payment Receipt",
            voucherNo: p.reference || `REC-${p.id.slice(-4)}`,
            particulars: "By Bank / Cash Receipt",
            reference: p.reference || undefined,
            debit: 0,
            credit: Number(p.paymentAmount || 0),
            sourceType: "PAYMENT",
            sourceId: p.taxInvoiceId,
          });
        }
      }
    } else if (account.type === "VENDOR") {
      const vendorId = account.id.replace("vendor_", "");

      for (const exp of expenses) {
        if (exp.vendorId === vendorId) {
          const net = Number(exp.netAmount || 0);
          rawLedgerItems.push({
            date: new Date(exp.expenseDate),
            voucherType: "Expense Voucher",
            voucherNo: exp.expenseNumber,
            particulars: `By ${exp.category?.name || "Expense"}`,
            debit: 0,
            credit: net,
            sourceType: "EXPENSE",
            sourceId: exp.id,
          });

          if (exp.paymentStatus === "PAID") {
            rawLedgerItems.push({
              date: new Date(exp.expenseDate),
              voucherType: "Vendor Payment",
              voucherNo: `PMT-${exp.expenseNumber}`,
              particulars: "To Bank / Cash Payment",
              debit: net,
              credit: 0,
              sourceType: "EXPENSE",
              sourceId: exp.id,
            });
          }
        }
      }
    } else if (account.type === "EXPENSE_CATEGORY") {
      const catId = account.id.replace("cat_", "");
      for (const exp of expenses) {
        if (exp.categoryId === catId || (exp.items || []).some((i: any) => i.categoryId === catId)) {
          const net = Number(exp.netAmount || 0);
          rawLedgerItems.push({
            date: new Date(exp.expenseDate),
            voucherType: "Expense Voucher",
            voucherNo: exp.expenseNumber,
            particulars: `To ${exp.vendor?.name || "Party / Bank Account"}`,
            debit: net,
            credit: 0,
            sourceType: "EXPENSE",
            sourceId: exp.id,
          });
        }
      }
    } else if (account.type === "INCOME_CATEGORY") {
      const catId = account.id.replace("cat_", "");
      for (const inv of invoices) {
        const matchingItems = (inv.items || []).filter((i: any) => i.incomeCategoryId === catId);
        if (matchingItems.length > 0 || catId === "cat_income_default") {
          const catAmount = matchingItems.length > 0 
            ? matchingItems.reduce((sum: number, item: any) => sum + Number(item.taxableAmount || 0), 0)
            : Number(inv.taxableAmount || inv.netAmount || 0);

          rawLedgerItems.push({
            date: new Date(inv.invoiceDate),
            voucherType: "Tax Invoice",
            voucherNo: inv.invoiceNumber,
            particulars: `By ${inv.customerNameSnapshot || inv.customer?.legalName || "Customer"}`,
            debit: 0,
            credit: catAmount,
            sourceType: "TAX_INVOICE",
            sourceId: inv.id,
          });
        }
      }
    } else if (account.type === "BANK" || account.type === "CASH") {
      for (const p of payments) {
        rawLedgerItems.push({
          date: new Date(p.paymentDate),
          voucherType: "Receipt Voucher",
          voucherNo: p.reference || `REC-${p.id.slice(-4)}`,
          particulars: `To Customer (${p.taxInvoice.customerNameSnapshot || p.taxInvoice.customer?.legalName})`,
          debit: Number(p.paymentAmount || 0),
          credit: 0,
          sourceType: "PAYMENT",
          sourceId: p.taxInvoiceId,
        });
      }
      for (const exp of expenses) {
        if (exp.paymentStatus === "PAID") {
          rawLedgerItems.push({
            date: new Date(exp.expenseDate),
            voucherType: "Payment Voucher",
            voucherNo: exp.expenseNumber,
            particulars: `By ${exp.vendor?.name || exp.category?.name || "Business Expense"}`,
            debit: 0,
            credit: Number(exp.netAmount || 0),
            sourceType: "EXPENSE",
            sourceId: exp.id,
          });
        }
      }
    } else if (account.type === "STATUTORY_GST") {
      if (account.id.includes("output")) {
        for (const inv of invoices) {
          if (Number(inv.totalGST || 0) > 0) {
            let gstAmt = Number(inv.totalGST || 0);
            if (account.id.includes("cgst")) gstAmt = Number(inv.totalCGST || 0);
            if (account.id.includes("sgst")) gstAmt = Number(inv.totalSGST || 0);
            if (account.id.includes("igst")) gstAmt = Number(inv.totalIGST || 0);

            rawLedgerItems.push({
              date: new Date(inv.invoiceDate),
              voucherType: "Tax Invoice",
              voucherNo: inv.invoiceNumber,
              particulars: `By ${inv.customerNameSnapshot || inv.customer?.legalName || "Customer"}`,
              debit: 0,
              credit: gstAmt,
              sourceType: "TAX_INVOICE",
              sourceId: inv.id,
            });
          }
        }
      } else {
        for (const exp of expenses) {
          if (Number(exp.totalInputGST || 0) > 0) {
            let gstAmt = Number(exp.totalInputGST || 0);
            if (account.id.includes("cgst")) gstAmt = Number(exp.inputCGST || 0);
            if (account.id.includes("sgst")) gstAmt = Number(exp.inputSGST || 0);
            if (account.id.includes("igst")) gstAmt = Number(exp.inputIGST || 0);

            rawLedgerItems.push({
              date: new Date(exp.expenseDate),
              voucherType: "Expense Purchase",
              voucherNo: exp.expenseNumber,
              particulars: `To ${exp.vendor?.name || "Vendor"}`,
              debit: gstAmt,
              credit: 0,
              sourceType: "EXPENSE",
              sourceId: exp.id,
            });
          }
        }
      }
    } else if (account.type === "STATUTORY_TDS") {
      if (account.id.includes("payable")) {
        for (const exp of expenses) {
          if (Number(exp.tdsAmount || 0) > 0) {
            rawLedgerItems.push({
              date: new Date(exp.expenseDate),
              voucherType: "TDS Deduction",
              voucherNo: exp.expenseNumber,
              particulars: `By ${exp.vendor?.name || "Vendor"}`,
              debit: 0,
              credit: Number(exp.tdsAmount || 0),
              sourceType: "EXPENSE",
              sourceId: exp.id,
            });
          }
        }
      } else {
        for (const inv of invoices) {
          if (Number(inv.tdsAmount || 0) > 0) {
            rawLedgerItems.push({
              date: new Date(inv.invoiceDate),
              voucherType: "TDS Receivable",
              voucherNo: inv.invoiceNumber,
              particulars: `To ${inv.customerNameSnapshot || inv.customer?.legalName || "Customer"}`,
              debit: Number(inv.tdsAmount || 0),
              credit: 0,
              sourceType: "TAX_INVOICE",
              sourceId: inv.id,
            });
          }
        }
      }
    } else if (account.type === "FIXED_ASSET") {
      for (const exp of expenses) {
        if (exp.isAsset) {
          rawLedgerItems.push({
            date: new Date(exp.expenseDate),
            voucherType: "Asset Purchase",
            voucherNo: exp.expenseNumber,
            particulars: `To ${exp.vendor?.name || "Bank / Vendor"}`,
            debit: Number(exp.netAmount || 0),
            credit: 0,
            sourceType: "EXPENSE",
            sourceId: exp.id,
          });
        }
      }
    }

    // Sort all raw items by Date ascending
    rawLedgerItems.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate Opening Balance prior to fromDate
    let openingVal = 0;
    const priorItems = rawLedgerItems.filter(item => item.date < fromDate);

    for (const item of priorItems) {
      if (account.normalBalance === "DEBIT") {
        openingVal += (item.debit - item.credit);
      } else {
        openingVal += (item.credit - item.debit);
      }
    }

    const openingBalance = Math.abs(openingVal);
    const openingBalanceType = openingVal >= 0 ? (account.normalBalance === "DEBIT" ? "Dr" : "Cr") : (account.normalBalance === "DEBIT" ? "Cr" : "Dr");

    // Process items within selected date range
    const periodItems = rawLedgerItems.filter(item => item.date >= fromDate && item.date <= toDate);

    let runningVal = account.normalBalance === "DEBIT" ? (openingBalanceType === "Dr" ? openingBalance : -openingBalance) : (openingBalanceType === "Cr" ? openingBalance : -openingBalance);
    let totalDebit = 0;
    let totalCredit = 0;

    const entries: LedgerEntry[] = [];

    for (const item of periodItems) {
      totalDebit += item.debit;
      totalCredit += item.credit;

      if (account.normalBalance === "DEBIT") {
        runningVal += (item.debit - item.credit);
      } else {
        runningVal += (item.credit - item.debit);
      }

      const balanceType = runningVal >= 0 ? (account.normalBalance === "DEBIT" ? "Dr" : "Cr") : (account.normalBalance === "DEBIT" ? "Cr" : "Dr");

      entries.push({
        id: `${item.sourceType}_${item.sourceId}_${entries.length}`,
        date: item.date,
        voucherType: item.voucherType,
        voucherNo: item.voucherNo,
        particulars: item.particulars,
        reference: item.reference,
        debit: Number(item.debit.toFixed(2)),
        credit: Number(item.credit.toFixed(2)),
        runningBalance: Number(Math.abs(runningVal).toFixed(2)),
        balanceType,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
      });
    }

    const closingBalance = Math.abs(runningVal);
    const closingBalanceType = runningVal >= 0 ? (account.normalBalance === "DEBIT" ? "Dr" : "Cr") : (account.normalBalance === "DEBIT" ? "Cr" : "Dr");

    return {
      account,
      fromDate,
      toDate,
      openingBalance: Number(openingBalance.toFixed(2)),
      openingBalanceType,
      entries,
      totalDebit: Number(totalDebit.toFixed(2)),
      totalCredit: Number(totalCredit.toFixed(2)),
      closingBalance: Number(closingBalance.toFixed(2)),
      closingBalanceType,
    };
  }
}
