import { PrismaClient } from "@prisma/client";

// Ensure tests execute strictly against an isolated test database, preserving production data 100%
const originalDbUrl = process.env.DATABASE_URL;
if (!originalDbUrl) {
  console.error("FATAL: DATABASE_URL environment variable is not defined.");
  process.exit(1);
}

const isolatedTestDbUrl = originalDbUrl.includes("/billing_erp?")
  ? originalDbUrl.replace("/billing_erp?", "/billing_erp_test?")
  : originalDbUrl.includes("/billing_erp")
  ? originalDbUrl.replace("/billing_erp", "/billing_erp_test")
  : `${originalDbUrl}_test`;

process.env.DATABASE_URL = isolatedTestDbUrl;

// Instantiate test prisma instance pointing to isolated test DB
const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: isolatedTestDbUrl,
    },
  },
});

// Configure global prisma so all services share the isolated test instance
(globalThis as any).prisma = testPrisma;

import { PersistentLedgerReportingService } from "../services/persistent-ledger-reporting.service";
import { FiscalPeriodService } from "../services/fiscal-period.service";
import { ReportExportService } from "../services/report-export.service";
import { JournalPostingService, IdempotencyConflictError, FiscalPeriodLockedError } from "../services/journal-posting.service";
import { BankingStatutoryAccountingService } from "../services/banking-statutory-accounting.service";
import { AccountingEngine } from "../services/accounting-engine.service";

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failedTests++;
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`AssertionFailed: ${message}`);
  }
  passedTests++;
  console.log(`  ✅ PASSED: ${message}`);
}

async function runPrompt8Tests() {
  console.log("================================================================================");
  console.log("FINLEDGER ERP — PROMPT 8: PERSISTENT LEDGER REPORTING, RECONCILIATION & CONTINUITY");
  console.log("================================================================================");
  console.log("Target Isolated Database:", isolatedTestDbUrl.replace(/\/\/[^:]+:[^@]+@/, "//***:***@"));

  const testActor = {
    id: "admin_test_user",
    name: "Ajay Thomas (CA Admin)",
    email: "ajay@kvj.local",
    role: "ADMIN",
  };

  try {
    // -------------------------------------------------------------------------
    // Primary Active Bank Account
    let testBank = await testPrisma.bankAccount.findFirst({
      where: { accountNumber: "HDFC-P8-001" },
    });
    if (!testBank) {
      testBank = await testPrisma.bankAccount.create({
        data: {
          accountNumber: "HDFC-P8-001",
          bankName: "HDFC Bank",
          accountName: "HDFC Corporate Operating A/c",
          ifsc: "HDFC0001234",
          branch: "Koramangala, Bangalore",
          isActive: true,
          isPrimary: true,
        },
      });
    }

    const runSuffix = Math.floor(1000 + Math.random() * 9000);

    // Customer
    const testCust = await testPrisma.customer.create({
      data: {
        legalName: `Prompt 8 Client Enterprises Pvt Ltd ${runSuffix}`,
        tradeName: `Client 8 Tech ${runSuffix}`,
        gstin: `29AABCU${runSuffix}R1Z7`,
        state: "Karnataka",
        stateCode: "29",
        pan: `AABCU${runSuffix}`,
        customerType: "B2B",
      },
    });

    // Vendor
    const testVendor = await testPrisma.vendor.create({
      data: {
        name: `Prompt 8 Cloud Infrastructure Services ${runSuffix}`,
        gstin: `29AABCU${runSuffix}R1ZZ`,
        pan: `AABCU${runSuffix}`,
        state: "Karnataka",
        stateCode: "29",
        isActive: true,
      },
    });

    assert(Boolean(testBank.id), "Test bank account initialized in isolated DB.");
    assert(Boolean(testCust.id), "Test customer initialized in isolated DB.");
    assert(Boolean(testVendor.id), "Test vendor initialized in isolated DB.");

    // Seed baseline balanced persistent journal vouchers in FY 2026-27
    const journalDate1 = new Date("2026-05-15");
    const journalDate2 = new Date("2026-06-20");

    // 1. Sales invoice voucher (Dr Trade Receivables ₹1,18,000, Cr Revenue ₹1,00,000, Cr Output CGST ₹9,000, Cr Output SGST ₹9,000)
    const salesJournal = await JournalPostingService.postJournalEntry(
      {
        entryType: "SALES",
        accountingDate: journalDate1,
        financialYear: "2026-27",
        sourceType: "TAX_INVOICE",
        sourceId: `test_inv_${Date.now()}`,
        narration: "B2B Professional IT Consulting Services",
        idempotencyKey: `p8_sales_${Date.now()}`,
        lines: [
          {
            lineNumber: 1,
            accountId: `cust_${testCust.id}`,
            accountName: "Trade Receivables — Prompt 8 Client Enterprises",
            financialType: "ASSET",
            statementGroup: "Trade Receivables",
            normalBalance: "DEBIT",
            debit: 118000,
            credit: 0,
            entityType: "CUSTOMER",
            entityId: testCust.id,
          },
          {
            lineNumber: 2,
            accountId: "cat_revenue_service",
            accountName: "Service Revenue",
            financialType: "INCOME",
            statementGroup: "Revenue from Operations",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 100000,
          },
          {
            lineNumber: 3,
            accountId: "stat_output_cgst",
            accountName: "Output CGST Payable",
            financialType: "LIABILITY",
            statementGroup: "Statutory Tax Liabilities",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 9000,
          },
          {
            lineNumber: 4,
            accountId: "stat_output_sgst",
            accountName: "Output SGST Payable",
            financialType: "LIABILITY",
            statementGroup: "Statutory Tax Liabilities",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 9000,
          },
        ],
      },
      testActor,
      testPrisma
    );

    // 2. Receipt voucher (Dr Bank ₹1,08,000, Dr TDS Receivable ₹10,000, Cr Trade Receivables ₹1,18,000)
    const receiptJournal = await JournalPostingService.postJournalEntry(
      {
        entryType: "RECEIPT",
        accountingDate: journalDate2,
        financialYear: "2026-27",
        sourceType: "INVOICE_PAYMENT",
        sourceId: `test_pmt_${Date.now()}`,
        narration: "Customer Settlement via NEFT (Net of TDS u/s 194J)",
        idempotencyKey: `p8_receipt_${Date.now()}`,
        lines: [
          {
            lineNumber: 1,
            accountId: `bank_${testBank.id}`,
            accountName: "HDFC Corporate Operating A/c",
            financialType: "ASSET",
            statementGroup: "Cash and Bank Balances",
            normalBalance: "DEBIT",
            debit: 108000,
            credit: 0,
            bankAccountId: testBank.id,
          },
          {
            lineNumber: 2,
            accountId: "stat_tds_receivable",
            accountName: "TDS Receivable (Tax Asset u/s 194J)",
            financialType: "ASSET",
            statementGroup: "Current Assets",
            normalBalance: "DEBIT",
            debit: 10000,
            credit: 0,
          },
          {
            lineNumber: 3,
            accountId: `cust_${testCust.id}`,
            accountName: "Trade Receivables — Prompt 8 Client Enterprises",
            financialType: "ASSET",
            statementGroup: "Trade Receivables",
            normalBalance: "DEBIT",
            debit: 0,
            credit: 118000,
            entityType: "CUSTOMER",
            entityId: testCust.id,
          },
        ],
      },
      testActor,
      testPrisma
    );

    // 3. Operating Expense voucher (Dr Software Expense ₹30,000, Dr Input CGST ₹2,700, Dr Input SGST ₹2,700, Cr Vendor Payable ₹35,400)
    const expenseJournal = await JournalPostingService.postJournalEntry(
      {
        entryType: "PURCHASE",
        accountingDate: journalDate1,
        financialYear: "2026-27",
        sourceType: "EXPENSE",
        sourceId: `test_exp_${Date.now()}`,
        narration: "Cloud Server Hosting & SaaS Subscription",
        idempotencyKey: `p8_expense_${Date.now()}`,
        lines: [
          {
            lineNumber: 1,
            accountId: "cat_exp_software",
            accountName: "Cloud Infrastructure & Software",
            financialType: "EXPENSE",
            statementGroup: "Operating Expenses",
            normalBalance: "DEBIT",
            debit: 30000,
            credit: 0,
          },
          {
            lineNumber: 2,
            accountId: "stat_input_cgst",
            accountName: "Input CGST Credit (ITC)",
            financialType: "ASSET",
            statementGroup: "Statutory Tax Assets",
            normalBalance: "DEBIT",
            debit: 2700,
            credit: 0,
          },
          {
            lineNumber: 3,
            accountId: "stat_input_sgst",
            accountName: "Input SGST Credit (ITC)",
            financialType: "ASSET",
            statementGroup: "Statutory Tax Assets",
            normalBalance: "DEBIT",
            debit: 2700,
            credit: 0,
          },
          {
            lineNumber: 4,
            accountId: `vend_${testVendor.id}`,
            accountName: "Trade Payables — Prompt 8 Cloud Infrastructure",
            financialType: "LIABILITY",
            statementGroup: "Trade Payables",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 35400,
            entityType: "VENDOR",
            entityId: testVendor.id,
          },
        ],
      },
      testActor,
      testPrisma
    );

    // -------------------------------------------------------------------------
    // Scenario 1: Trial Balance Aggregates Correct Journal Movements
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 1: Persistent Trial Balance Aggregates Movements ---");
    const tb = await PersistentLedgerReportingService.getTrialBalance(
      { financialYear: "2026-27" },
      testPrisma
    );

    assert(Boolean(tb), "Persistent Trial Balance report generated successfully.");
    assert(tb.isBalanced, "Persistent Trial Balance is double-entry balanced (difference === 0).");
    assert(tb.totalDebit > 0, "Total debit is positive and quantified.");
    assert(tb.totalCredit > 0, "Total credit is positive and quantified.");
    assert(tb.totalDebit === tb.totalCredit, "Total Debit matches Total Credit exactly to zero paise.");
    assert(tb.totalJournals >= 3, "All seeded journal entries included in TB calculation.");

    // -------------------------------------------------------------------------
    // Scenario 2: Reversals Included per Documented Rules (Cancelling Original)
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 2: Original Journals & Reversals Integrity ---");
    const initialTbDebits = tb.totalDebit;

    // Post temporary journal, then reverse it
    const tempEntry = await JournalPostingService.postJournalEntry(
      {
        entryType: "JOURNAL",
        accountingDate: new Date("2026-07-01"),
        financialYear: "2026-27",
        sourceType: "MANUAL_ADJUSTMENT",
        sourceId: `temp_${Date.now()}`,
        narration: "Temporary test journal to be reversed",
        idempotencyKey: `p8_rev_test_${Date.now()}`,
        lines: [
          {
            lineNumber: 1,
            accountId: "cat_exp_software",
            accountName: "Cloud Infrastructure & Software",
            financialType: "EXPENSE",
            statementGroup: "Operating Expenses",
            normalBalance: "DEBIT",
            debit: 50000,
            credit: 0,
          },
          {
            lineNumber: 2,
            accountId: `bank_${testBank.id}`,
            accountName: "HDFC Corporate Operating A/c",
            financialType: "ASSET",
            statementGroup: "Cash and Bank Balances",
            normalBalance: "DEBIT",
            debit: 0,
            credit: 50000,
          },
        ],
      },
      testActor,
      testPrisma
    );

    // Reverse the temporary journal
    const reversalEntry = await JournalPostingService.reverseJournalEntry(
      {
        originalEntryId: tempEntry.id,
        reason: "Prompt 8 test reversal verification",
        actor: testActor,
      },
      testPrisma
    );

    assert(reversalEntry.entryType === "REVERSAL", "Reversal journal entry created with type REVERSAL.");

    // Check TB again: Net closing balance of the accounts should be unaffected because original + reversal = 0
    const tbAfterReversal = await PersistentLedgerReportingService.getTrialBalance(
      { financialYear: "2026-27" },
      testPrisma
    );

    assert(tbAfterReversal.isBalanced, "TB remains 100% balanced after reversal entry.");
    assert(
      Math.abs(tbAfterReversal.totalDebit - initialTbDebits) < 0.01,
      "Net closing balances reflect zero phantom economic activity from reversed transaction."
    );

    // -------------------------------------------------------------------------
    // Scenario 3: Duplicate or Invalid Journal Sources Detected
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 3: Idempotency & Duplicate Protection ---");
    let dupRejected = false;
    try {
      await JournalPostingService.postJournalEntry(
        {
          entryType: "SALES",
          accountingDate: journalDate1,
          financialYear: "2026-27",
          sourceType: "TAX_INVOICE",
          sourceId: "different_source_id",
          narration: "Attempt duplicate idempotency key with different source",
          idempotencyKey: salesJournal.idempotencyKey, // Reused key!
          lines: [
            {
              lineNumber: 1,
              accountId: `cust_${testCust.id}`,
              accountName: "Trade Receivables",
              financialType: "ASSET",
              statementGroup: "Trade Receivables",
              normalBalance: "DEBIT",
              debit: 1000,
              credit: 0,
            },
            {
              lineNumber: 2,
              accountId: "cat_revenue_service",
              accountName: "Revenue",
              financialType: "INCOME",
              statementGroup: "Revenue",
              normalBalance: "CREDIT",
              debit: 0,
              credit: 1000,
            },
          ],
        },
        testActor,
        testPrisma
      );
    } catch (e: any) {
      dupRejected = e instanceof IdempotencyConflictError;
    }
    assert(dupRejected, "Attempting duplicate idempotency key was strictly rejected with IdempotencyConflictError.");

    // -------------------------------------------------------------------------
    // Scenario 4: Trial Balance Displays Real Imbalances (No Concealment)
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 4: Transparent Imbalance Reporting ---");
    // Insert an isolated unbalanced entry into test DB to test reporting transparency
    const fakeUnbalancedEntry = await testPrisma.journalEntry.create({
      data: {
        entryNumber: `UNBAL-${Date.now()}`,
        entryType: "JOURNAL",
        accountingDate: new Date("2026-08-01"),
        financialYear: "2026-27",
        sourceType: "MANUAL_ADJUSTMENT",
        sourceId: `unbal_${Date.now()}`,
        narration: "Simulated intentional unbalance to verify zero-concealment",
        totalDebit: 1000,
        totalCredit: 800,
        isBalanced: false,
        status: "POSTED",
        idempotencyKey: `unbal_${Date.now()}`,
        lines: {
          create: [
            {
              lineNumber: 1,
              accountId: "cat_exp_software",
              accountName: "Software",
              financialType: "EXPENSE",
              statementGroup: "Operating Expenses",
              normalBalance: "DEBIT",
              debit: 1000,
              credit: 0,
            },
            {
              lineNumber: 2,
              accountId: `bank_${testBank.id}`,
              accountName: "Bank",
              financialType: "ASSET",
              statementGroup: "Cash and Bank Balances",
              normalBalance: "DEBIT",
              debit: 0,
              credit: 800, // ₹200 imbalance!
            },
          ],
        },
      },
    });

    const unbalTb = await PersistentLedgerReportingService.getTrialBalance(
      { financialYear: "2026-27" },
      testPrisma
    );

    assert(!unbalTb.isBalanced, "Imbalanced ledger is transparently reported as isBalanced: false.");
    assert(Math.abs(unbalTb.difference) === 200, "Exact ₹200 variance is displayed without hiding or balancing entries.");

    // Clean up fake unbalanced entry so subsequent tests operate on balanced books
    await testPrisma.journalLine.deleteMany({ where: { entryId: fakeUnbalancedEntry.id } });
    await testPrisma.journalEntry.delete({ where: { id: fakeUnbalancedEntry.id } });

    // -------------------------------------------------------------------------
    // Scenario 5: Profit & Loss Includes Correct Classifications
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 5: Persistent P&L Nominal Classification ---");
    const pnl = await PersistentLedgerReportingService.getProfitAndLoss(
      { financialYear: "2026-27" },
      testPrisma
    );

    assert(Boolean(pnl), "Persistent Profit & Loss report generated successfully.");
    assert(pnl.totalRevenue >= 100000, "Service Revenue recognized under Total Revenue (₹100,000+).");
    assert(pnl.totalExpenses >= 30000, "Software Expense recognized under Total Expenses (₹30,000+).");
    assert(pnl.profitBeforeTax === pnl.totalRevenue - pnl.totalExpenses, "Profit Before Tax mathematically equals Total Revenue - Total Expenses.");
    assert(pnl.netProfitAfterTax === pnl.profitBeforeTax, "Net Profit After Tax reflects Profit Before Tax less tax expense.");

    // -------------------------------------------------------------------------
    // Scenario 6: Balance-Sheet Accounts Excluded from P&L Totals
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 6: Balance Sheet Accounts Excluded from P&L ---");
    const pnlAccounts = [
      ...pnl.revenueFromOperations,
      ...pnl.otherIncome,
      ...pnl.operatingExpenses,
      ...pnl.employeeCosts,
      ...pnl.depreciationAmortization,
      ...pnl.financeCosts,
      ...pnl.otherExpenses,
    ].map((i) => i.accountId);

    assert(!pnlAccounts.includes(`bank_${testBank.id}`), "Cash and Bank accounts strictly excluded from P&L.");
    assert(!pnlAccounts.includes(`cust_${testCust.id}`), "Trade Receivables strictly excluded from P&L.");
    assert(!pnlAccounts.includes(`vend_${testVendor.id}`), "Trade Payables strictly excluded from P&L.");
    assert(!pnlAccounts.includes("stat_output_cgst"), "Output GST liability strictly excluded from P&L.");
    assert(!pnlAccounts.includes("stat_input_cgst"), "Input GST ITC asset strictly excluded from P&L.");
    assert(!pnlAccounts.includes("stat_tds_receivable"), "TDS Receivable asset strictly excluded from P&L.");

    // -------------------------------------------------------------------------
    // Scenario 7: Balance Sheet Classifies Assets, Liabilities & Equity Correctly
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 7: Balance Sheet Structure & Accounting Equation ---");
    const bs = await PersistentLedgerReportingService.getBalanceSheet(
      { financialYear: "2026-27" },
      testPrisma
    );

    assert(Boolean(bs), "Persistent Balance Sheet report generated successfully.");
    assert(bs.currentAssets.cashAndBank >= 108000, "Bank receipt accurately reflected in Cash & Bank assets.");
    assert(bs.currentAssets.tdsReceivable >= 10000, "TDS Receivable accurately reflected in Current Assets.");
    assert(bs.currentLiabilities.tradePayables >= 35400, "Vendor payable accurately reflected in Trade Payables.");
    assert(bs.currentLiabilities.statutoryGstPayable >= 18000, "Output GST liabilities accurately reflected in Statutory Tax Payables.");
    assert(bs.currentAssets.gstInputCredit >= 5400, "Input GST credits accurately reflected in Statutory Tax Assets.");
    assert(bs.isBalanced, "Balance Sheet satisfies fundamental accounting equation (Assets === Liabilities + Equity).");

    // -------------------------------------------------------------------------
    // Scenario 8: Retained Earnings Do Not Double-Count Profit
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 8: Retained Earnings Continuity & Zero Double-Counting ---");
    assert(
      bs.equity.currentPeriodNetProfit === pnl.netProfitAfterTax,
      "Balance Sheet currentPeriodNetProfit exactly matches P&L netProfitAfterTax."
    );
    assert(
      bs.equity.totalRetainedEarnings === bs.equity.openingRetainedEarnings + bs.equity.currentPeriodNetProfit,
      "Retained earnings does not double count profit (Opening Retained + Current P&L = Total Retained)."
    );

    // -------------------------------------------------------------------------
    // Scenario 9: Financial-Year Date Boundaries (31 March vs 1 April)
    // -------------------------------------------------------------------------
    const fyMarch = FiscalPeriodService.getFinancialYear(new Date(2026, 2, 31, 23, 59, 59));
    const fyApril = FiscalPeriodService.getFinancialYear(new Date(2026, 3, 1, 0, 0, 0));
    assert(fyMarch === "2025-26", "31 March 2026 correctly maps to Indian FY 2025-26.");
    assert(fyApril === "2026-27", "01 April 2026 correctly maps to Indian FY 2026-27.");


    const bounds2627 = FiscalPeriodService.getFinancialYearBounds("2026-27");
    assert(bounds2627.startDate.getMonth() === 3 && bounds2627.startDate.getDate() === 1, "FY starts on April 1.");
    assert(bounds2627.endDate.getMonth() === 2 && bounds2627.endDate.getDate() === 31, "FY ends on March 31.");

    // -------------------------------------------------------------------------
    // Scenario 10: Balance Sheet Balances Carry Forward into Next Year
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 10: Balance Sheet Continuity Across Years ---");
    const bsAsOfEnd = await PersistentLedgerReportingService.getBalanceSheet(
      { asOfDate: new Date("2027-03-31") },
      testPrisma
    );
    const bsAsOfNextDay = await PersistentLedgerReportingService.getBalanceSheet(
      { asOfDate: new Date("2027-04-01") },
      testPrisma
    );
    assert(
      bsAsOfEnd.totalAssets === bsAsOfNextDay.totalAssets,
      "Total Assets carry forward identically into the next financial year."
    );
    assert(
      bsAsOfEnd.totalLiabilities === bsAsOfNextDay.totalLiabilities,
      "Total Liabilities carry forward identically into the next financial year."
    );

    // -------------------------------------------------------------------------
    // Scenario 11: Nominal Accounts Reset per Period (Zero Carry-Forward in P&L)
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 11: Nominal Account Period Isolation ---");
    const pnlNextYear = await PersistentLedgerReportingService.getProfitAndLoss(
      { financialYear: "2028-29" },
      testPrisma
    );
    // Since zero transactions were posted in FY 2028-29, nominal revenue and expense must reset to zero
    assert(pnlNextYear.totalRevenue === 0, "Nominal revenue resets to zero in subsequent financial year.");
    assert(pnlNextYear.totalExpenses === 0, "Nominal expense resets to zero in subsequent financial year.");

    // -------------------------------------------------------------------------
    // Scenario 12: Locked Periods Reject Postings & Closing Controls
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 12: Locked Fiscal Period Safeguards ---");
    const testLockedPeriod = await testPrisma.fiscalPeriod.upsert({
      where: { periodCode: "2024-03" },
      update: { isLocked: true },
      create: {
        financialYear: "2023-24",
        periodName: "March 2024 (Locked)",
        periodCode: "2024-03",
        startDate: new Date("2024-03-01"),
        endDate: new Date("2024-03-31"),
        isLocked: true,
        lockReason: "Audit Finalization",
      },
    });

    let lockedRejected = false;
    try {
      await FiscalPeriodService.assertPeriodOpen(new Date("2024-03-15"), null, testPrisma);
    } catch (e: any) {
      lockedRejected = e instanceof FiscalPeriodLockedError;
    }
    assert(lockedRejected, "Posting into a locked fiscal period is strictly rejected.");

    // Closing validation check
    const closingValidation = await FiscalPeriodService.validateFinancialYearClosing("2026-27", testPrisma);
    assert(closingValidation.trialBalanceBalanced, "Closing validation confirms Trial Balance is balanced.");
    assert(closingValidation.canClose === true, "Closing validation allows closure when checks pass.");

    // -------------------------------------------------------------------------
    // Scenario 13, 14 & 15: Historical Ledger Coverage & Amount Reconciliation
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 13, 14 & 15: Historical Coverage & Reconciliation ---");
    const coverageReport = await PersistentLedgerReportingService.getHistoricalCoverageReport(
      { financialYear: "2026-27" },
      testPrisma
    );

    assert(Boolean(coverageReport), "Historical coverage report generated successfully.");
    assert(typeof coverageReport.overallCoveragePercentage === "number", "Overall coverage percentage quantified.");
    assert(coverageReport.totalSourceEvents >= 0, "Total source events counted.");
    assert(coverageReport.totalJournalizedEvents >= 0, "Total journalized events counted.");
    assert(Boolean(coverageReport.bySourceType.TAX_INVOICE), "TAX_INVOICE coverage categorized.");
    assert(Boolean(coverageReport.bySourceType.EXPENSE), "EXPENSE coverage categorized.");
    assert(Array.isArray(coverageReport.recommendations), "Actionable migration recommendations provided.");

    // -------------------------------------------------------------------------
    // Scenario 16: Customer Receivables & Advances Subledger Reconciliation
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 16: Customer Subledger Reconciliation ---");
    const custStatement = await PersistentLedgerReportingService.getLedgerStatement(
      `cust_${testCust.id}`,
      {},
      testPrisma
    );
    assert(Boolean(custStatement), "Customer subledger statement generated.");
    assert(custStatement.transactions.length >= 2, "Customer subledger contains sales and receipt vouchers.");
    // Invoice 118,000 Dr - Payment 118,000 Cr = Closing Balance 0
    assert(custStatement.closingBalance === 0, "Customer subledger accurately reflects settled balance of ₹0.");

    // -------------------------------------------------------------------------
    // Scenario 17: Vendor Payables Subledger Reconciliation
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 17: Vendor Subledger Reconciliation ---");
    const vendStatement = await PersistentLedgerReportingService.getLedgerStatement(
      `vend_${testVendor.id}`,
      {},
      testPrisma
    );
    assert(Boolean(vendStatement), "Vendor subledger statement generated.");
    assert(vendStatement.transactions.length >= 1, "Vendor subledger contains purchase voucher.");
    assert(vendStatement.closingBalance === -35400, "Vendor subledger reflects credit payable balance of ₹35,400.");

    // -------------------------------------------------------------------------
    // Scenario 18: Bank Balances Subledger Reconciliation
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 18: Bank Subledger Reconciliation ---");
    const bankStatement = await PersistentLedgerReportingService.getLedgerStatement(
      `bank_${testBank.id}`,
      {},
      testPrisma
    );
    assert(Boolean(bankStatement), "Bank account subledger statement generated.");
    assert(bankStatement.transactions.length >= 1, "Bank subledger captures receipt deposit.");

    // -------------------------------------------------------------------------
    // Scenario 19: Fixed-Asset Net Book Value Reconciliation
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 19: Fixed Assets NBV Reconciliation ---");
    assert(
      bs.nonCurrentAssets.fixedAssetsNet === bs.nonCurrentAssets.fixedAssetsGross - bs.nonCurrentAssets.accumulatedDepreciation,
      "Fixed asset NBV equals gross cost minus accumulated depreciation reserve."
    );

    // -------------------------------------------------------------------------
    // Scenario 20: Loan Principal Reconciliation
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 20: Loan Principal Balance Integrity ---");
    assert(
      typeof bs.nonCurrentLiabilities.longTermBorrowings === "number" && bs.nonCurrentLiabilities.longTermBorrowings >= 0,
      "Outstanding loan principal balance is non-negative."
    );

    // -------------------------------------------------------------------------
    // Scenario 21, 22 & 23: Global Filters & Date Range Validation
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 21, 22 & 23: Global Filters & Validation ---");
    const curFyBounds = PersistentLedgerReportingService.resolveDateRange({ financialYear: "CURRENT_FY" });
    assert(Boolean(curFyBounds.fromDate && curFyBounds.toDate), "CURRENT_FY resolves to valid date boundaries.");

    const prevFyBounds = PersistentLedgerReportingService.resolveDateRange({ financialYear: "PREVIOUS_FY" });
    assert(prevFyBounds.toDate.getTime() < curFyBounds.fromDate.getTime(), "PREVIOUS_FY strictly precedes CURRENT_FY.");

    let invalidRangeError = false;
    try {
      FiscalPeriodService.validateDateRange(new Date("2026-06-01"), new Date("2026-05-01"));
    } catch (e: any) {
      invalidRangeError = e.message.includes("cannot be earlier than start date");
    }
    assert(invalidRangeError, "Validation strictly rejects toDate < fromDate with informative message.");

    // -------------------------------------------------------------------------
    // Scenario 24: Read-Only Report Refresh (Zero Mutation)
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 24: Read-Only Report Generation ---");
    const preCount = await testPrisma.journalEntry.count();
    await PersistentLedgerReportingService.getTrialBalance({ financialYear: "2026-27" }, testPrisma);
    await PersistentLedgerReportingService.getProfitAndLoss({ financialYear: "2026-27" }, testPrisma);
    await PersistentLedgerReportingService.getBalanceSheet({ financialYear: "2026-27" }, testPrisma);
    const postCount = await testPrisma.journalEntry.count();
    assert(preCount === postCount, "Financial report generation is 100% read-only; zero journal entries created.");

    // -------------------------------------------------------------------------
    // Scenario 25 & 26: Export Formats & Formula Injection Sanitization
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 25 & 26: Exports & Formula Injection Security ---");
    // 25. Export data generation
    const exportRows = ReportExportService.formatTrialBalanceForExport(tb.lines);
    const csvContent = ReportExportService.generateCSV(exportRows, "Trial_Balance");
    const xlsxBuffer = ReportExportService.generateXLSX(exportRows, "Trial_Balance");

    assert(typeof csvContent === "string" && csvContent.length > 50, "CSV export content generated successfully.");
    assert(Buffer.isBuffer(xlsxBuffer) && xlsxBuffer.length > 500, "XLSX export binary buffer generated successfully.");

    // 26. Formula Injection Sanitization (CWE-1236)
    const dangerousInput1 = "=cmd|' /C calc'!A0";
    const dangerousInput2 = "+123456";
    const dangerousInput3 = "-@dangerousFormula";
    const safeInput = "Standard Account Name";

    assert(ReportExportService.sanitizeCell(dangerousInput1).startsWith("'="), "Formula starting with '=' is sanitized by prepending quote.");
    assert(ReportExportService.sanitizeCell(dangerousInput2).startsWith("'+"), "Formula starting with '+' is sanitized by prepending quote.");
    assert(ReportExportService.sanitizeCell(dangerousInput3).startsWith("'-"), "Formula starting with '-' is sanitized by prepending quote.");
    assert(ReportExportService.sanitizeCell(safeInput) === safeInput, "Safe text is unaltered.");

    // -------------------------------------------------------------------------
    // Scenario 27: Executive Dashboard Metrics Integration
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 27: Executive Dashboard Persistent Metrics ---");
    const dashMetrics = await PersistentLedgerReportingService.getExecutiveDashboardMetrics(
      { financialYear: "2026-27" },
      testPrisma
    );

    assert(dashMetrics.totalRevenue >= 100000, "Executive dashboard captures persistent totalRevenue.");
    assert(dashMetrics.totalExpenses >= 30000, "Executive dashboard captures persistent totalExpenses.");
    assert(typeof dashMetrics.cashAndBankBalance === "number", "Executive dashboard captures cashAndBankBalance.");
    assert(dashMetrics.isBalanceSheetBalanced, "Executive dashboard confirms balance sheet equilibrium.");

    // -------------------------------------------------------------------------
    // Scenario 28: Cutover Readiness Evaluation
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 28: Cutover Readiness 15-Gate Audit ---");
    const cutover = await PersistentLedgerReportingService.getCutoverReadinessReport(testPrisma);

    assert(cutover.gates.length === 15, "All 15 cutover readiness gates evaluated.");
    assert(cutover.passedGatesCount >= 10, "Core accounting gates pass verification.");
    assert(cutover.unverifiedGatesCount >= 2, "Unverified gates (e.g. backup & business signoff) remain safely unverified.");
    assert(cutover.overallReady === false, "Overall cutover readiness is NOT falsely declared ready prior to business signoff.");

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log("\n================================================================================");
    console.log(`ALL PROMPT 8 CORE SCENARIOS VERIFIED: ${passedTests} passed, ${failedTests} failed.`);
    console.log("================================================================================");
  } catch (err: any) {
    console.error("\nFATAL TEST RUN ERROR:", err);
    process.exit(1);
  } finally {
    await testPrisma.$disconnect();
  }
}

runPrompt8Tests().catch((e) => {
  console.error("Unhandled rejection:", e);
  process.exit(1);
});
