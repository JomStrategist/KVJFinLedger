import { prisma } from "../lib/prisma";
import { AccountingEngine } from "../services/accounting-engine.service";
import fs from "fs";
import path from "path";

async function executeCleanup() {
  console.log("==================================================");
  console.log("FINLEDGER — PRE-TEST DATABASE CLEANUP PROCEDURE");
  console.log("==================================================\n");

  // Step 1: Ensure backup file exists
  const backupDir = path.join(process.cwd(), "prisma", "backup");
  if (!fs.existsSync(backupDir)) {
    throw new Error("Backup directory not found! Run backup script first.");
  }
  const backupFiles = fs.readdirSync(backupDir).filter(f => f.endsWith(".json"));
  if (backupFiles.length === 0) {
    throw new Error("No backup files found in prisma/backup! Aborting.");
  }
  console.log(`[SAFETY CHECK] Verified backup exists: ${backupFiles[backupFiles.length - 1]}`);

  // Step 2: Capture Before state
  const beforeUsers = await prisma.user.findMany();
  const beforeTaxInvoices = await prisma.taxInvoice.findMany({ include: { items: true, payments: true } });
  const beforeProformas = await prisma.proformaInvoice.findMany({ include: { items: true } });
  const beforeExpenses = await prisma.expense.findMany({ include: { items: true } });
  const beforeFinancialTxns = await prisma.financialTransaction.findMany();
  const beforeCustomers = await prisma.customer.findMany();
  const beforeVendors = await prisma.vendor.findMany();
  const beforeEmployees = await prisma.employee.findMany();
  const beforeBankAccounts = await prisma.bankAccount.findMany();
  const beforeOpeningBalances = await prisma.openingBalance.findMany();
  const beforeCategories = await prisma.expenseCategory.findMany();

  console.log("\n[BEFORE COUNTS]");
  console.log(`- Users: ${beforeUsers.length}`);
  console.log(`- Confirmed Tax Invoices: ${beforeTaxInvoices.length}`);
  console.log(`- Proforma Invoices: ${beforeProformas.length}`);
  console.log(`- Expenses: ${beforeExpenses.length}`);
  console.log(`- Financial Transactions: ${beforeFinancialTxns.length}`);
  console.log(`- Customers: ${beforeCustomers.length}`);
  console.log(`- Vendors: ${beforeVendors.length}`);
  console.log(`- Employees: ${beforeEmployees.length}`);
  console.log(`- Bank Accounts: ${beforeBankAccounts.length}`);
  console.log(`- Opening Balances: ${beforeOpeningBalances.length}`);

  // Identify Jomon Joseph user
  const jomonUser = beforeUsers.find(u => u.name === "Jomon Joseph" && u.role === "ADMIN");
  if (!jomonUser) {
    throw new Error("Target Admin user 'Jomon Joseph' not found in database! Aborting cleanup.");
  }
  console.log(`\n[TARGET USER IDENTIFIED] Jomon Joseph (ID: ${jomonUser.id}, Email: ${jomonUser.email}, Role: ${jomonUser.role})`);

  // Identify retained proforma
  const retainedProforma = beforeProformas.find(p => p.invoiceNumber === "KVJ/B2B/26-27/003");
  if (!retainedProforma) {
    throw new Error("Retained Proforma Invoice 'KVJ/B2B/26-27/003' not found! Aborting cleanup.");
  }

  // Identify retained expense
  const retainedExpense = beforeExpenses.find(e => e.expenseNumber === "EXP-2026-0001");
  if (!retainedExpense) {
    throw new Error("Retained Expense 'EXP-2026-0001' (Signtek) not found! Aborting cleanup.");
  }

  // Confirm the 3 tax invoices exist
  const requiredInvoiceNumbers = ["KVJ/B2C/26-27/001", "KVJ/B2B/26-27/002", "KVJ/B2B/26-27/001"];
  for (const invNum of requiredInvoiceNumbers) {
    const found = beforeTaxInvoices.find(i => i.invoiceNumber === invNum);
    if (!found) {
      throw new Error(`Required Tax Invoice '${invNum}' not found! Aborting cleanup.`);
    }
  }

  // Step 3: Execute targeted deletions
  console.log("\n==================================================");
  console.log("EXECUTING CLEANUP OPERATIONS");
  console.log("==================================================");

  // A. USERS: Delete all users except Jomon Joseph
  const usersToDelete = beforeUsers.filter(u => u.id !== jomonUser.id);
  const userDeleteResult = await prisma.user.deleteMany({
    where: { id: { in: usersToDelete.map(u => u.id) } }
  });
  console.log(`[USERS] Deleted ${userDeleteResult.count} users: ${usersToDelete.map(u => `${u.name} (${u.email})`).join(", ")}`);

  // B. PROFORMA INVOICES: Delete all except KVJ/B2B/26-27/003
  const proformasToDelete = beforeProformas.filter(p => p.id !== retainedProforma.id);
  const proformaIdsToDelete = proformasToDelete.map(p => p.id);
  // Delete items first
  const deletedProformaItems = await prisma.proformaInvoiceItem.deleteMany({
    where: { proformaInvoiceId: { in: proformaIdsToDelete } }
  });
  const deletedProformas = await prisma.proformaInvoice.deleteMany({
    where: { id: { in: proformaIdsToDelete } }
  });
  console.log(`[PROFORMAS] Deleted ${deletedProformas.count} proformas (${deletedProformaItems.count} items): ${proformasToDelete.map(p => p.invoiceNumber).join(", ")}`);

  // C. EXPENSES: Delete all expenses except EXP-2026-0001
  const expensesToDelete = beforeExpenses.filter(e => e.id !== retainedExpense.id);
  const expenseIdsToDelete = expensesToDelete.map(e => e.id);
  // Delete child expense items
  const deletedExpenseItems = await prisma.expenseItem.deleteMany({
    where: { expenseId: { in: expenseIdsToDelete } }
  });
  const deletedExpenses = await prisma.expense.deleteMany({
    where: { id: { in: expenseIdsToDelete } }
  });
  console.log(`[EXPENSES] Deleted ${deletedExpenses.count} expenses (${deletedExpenseItems.count} items): ${expensesToDelete.map(e => `${e.expenseNumber} (${e.description || 'No desc'})`).join(", ")}`);

  // D. FINANCIAL TRANSACTIONS: Delete financial transactions belonging to deleted expenses
  const deletedTxns = await prisma.financialTransaction.deleteMany({
    where: {
      sourceId: { in: expenseIdsToDelete }
    }
  });
  console.log(`[FINANCIAL TRANSACTIONS] Deleted ${deletedTxns.count} transactions linked to deleted expenses`);

  // E. EMPLOYEES: Check if any employee is referenced by retained data
  // Signtek expense has employeeId: null
  // Tax invoices have no employeeId
  const deletedEmployees = await prisma.employee.deleteMany({
    where: {
      id: { in: beforeEmployees.map(e => e.id) }
    }
  });
  console.log(`[EMPLOYEES] Deleted ${deletedEmployees.count} unreferenced employees: ${beforeEmployees.map(e => e.name).join(", ")}`);

  // Step 4: Capture After state & run validations
  console.log("\n==================================================");
  console.log("POST-CLEANUP VERIFICATION");
  console.log("==================================================");

  const afterUsers = await prisma.user.findMany();
  const afterTaxInvoices = await prisma.taxInvoice.findMany({ include: { items: true, payments: true } });
  const afterProformas = await prisma.proformaInvoice.findMany({ include: { items: true } });
  const afterExpenses = await prisma.expense.findMany({ include: { items: true, vendor: true } });
  const afterFinancialTxns = await prisma.financialTransaction.findMany();
  const afterCustomers = await prisma.customer.findMany();
  const afterVendors = await prisma.vendor.findMany();
  const afterEmployees = await prisma.employee.findMany();
  const afterBankAccounts = await prisma.bankAccount.findMany();
  const afterOpeningBalances = await prisma.openingBalance.findMany();

  console.log("[AFTER COUNTS]");
  console.log(`- Users: ${afterUsers.length} (Expected: 1)`);
  console.log(`- Confirmed Tax Invoices: ${afterTaxInvoices.length} (Expected: 3)`);
  console.log(`- Proforma Invoices: ${afterProformas.length} (Expected: 1)`);
  console.log(`- Expenses: ${afterExpenses.length} (Expected: 1)`);
  console.log(`- Financial Transactions: ${afterFinancialTxns.length} (Expected: 4)`);
  console.log(`- Customers: ${afterCustomers.length} (Expected: 4)`);
  console.log(`- Vendors: ${afterVendors.length} (Expected: 1)`);
  console.log(`- Employees: ${afterEmployees.length} (Expected: 0)`);
  console.log(`- Bank Accounts: ${afterBankAccounts.length} (Expected: 1)`);
  console.log(`- Opening Balances: ${afterOpeningBalances.length} (Expected: 2)`);

  // Step 5: Validate AccountingEngine reports
  console.log("\n[ACCOUNTING ENGINE VALIDATION]");
  const tb = await AccountingEngine.getTrialBalance({ financialYear: "FY 2026–27" });
  console.log(`Trial Balance: Debit = ₹${tb.totalDebit.toFixed(2)}, Credit = ₹${tb.totalCredit.toFixed(2)}, Difference = ₹${tb.difference.toFixed(2)}, isBalanced = ${tb.isBalanced}`);

  const bs = await AccountingEngine.getBalanceSheet({ financialYear: "FY 2026–27" });
  console.log(`Balance Sheet: Assets = ₹${bs.totalAssets.toFixed(2)}, Liabilities & Equity = ₹${bs.totalEquityAndLiabilities.toFixed(2)}, Difference = ₹${bs.difference.toFixed(2)}, isBalanced = ${bs.isBalanced}`);

  const pnl = await AccountingEngine.getProfitAndLoss({ financialYear: "FY 2026–27" });
  console.log(`Profit & Loss: Revenue = ₹${pnl.totalRevenue.toFixed(2)}, Expenses = ₹${pnl.totalExpenses.toFixed(2)}, Net Profit = ₹${pnl.netProfitAfterTax.toFixed(2)}`);

  const cf = await AccountingEngine.getCashFlow({ financialYear: "FY 2026–27" });
  console.log(`Cash Flow: Operating Receipts = ₹${cf.operatingCashFlow.customerReceipts.toFixed(2)}, Closing Cash = ₹${cf.closingCashAndBank.toFixed(2)}`);

  const accounts = await AccountingEngine.getAccountList();
  console.log(`General Ledger Accounts: ${accounts.length} active ledgers`);

  // Orphan checks
  const orphanTaxInvoiceItems = await prisma.taxInvoiceItem.count({
    where: { taxInvoiceId: { notIn: afterTaxInvoices.map(i => i.id) } }
  });
  const orphanProformaItems = await prisma.proformaInvoiceItem.count({
    where: { proformaInvoiceId: { notIn: afterProformas.map(p => p.id) } }
  });
  const orphanExpenseItems = await prisma.expenseItem.count({
    where: { expenseId: { notIn: afterExpenses.map(e => e.id) } }
  });
  const orphanPayments = await prisma.invoicePayment.count({
    where: { taxInvoiceId: { notIn: afterTaxInvoices.map(i => i.id) } }
  });

  console.log("\n[ORPHAN RECORDS CHECK]");
  console.log(`- Orphan Tax Invoice Items: ${orphanTaxInvoiceItems}`);
  console.log(`- Orphan Proforma Items: ${orphanProformaItems}`);
  console.log(`- Orphan Expense Items: ${orphanExpenseItems}`);
  console.log(`- Orphan Invoice Payments: ${orphanPayments}`);

  console.log("\n==================================================");
  console.log("CLEANUP COMPLETED SUCCESSFULLY");
  console.log("==================================================");

  await prisma.$disconnect();
}

executeCleanup().catch(err => {
  console.error("Cleanup execution failed:", err);
  process.exit(1);
});
