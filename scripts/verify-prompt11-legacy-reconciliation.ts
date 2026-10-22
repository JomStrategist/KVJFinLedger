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

// Safety check: Abort if target is production
if (!isolatedTestDbUrl.includes("billing_erp_test")) {
  console.error("FATAL: Target database is NOT billing_erp_test! Aborting to protect production.");
  process.exit(1);
}

const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: isolatedTestDbUrl,
    },
  },
});

(globalThis as any).prisma = testPrisma;

import { AccountingEngine } from "../services/accounting-engine.service";
import { PersistentLedgerReportingService } from "../services/persistent-ledger-reporting.service";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedCount++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function runPrompt11ReconciliationVerification() {
  console.log("==================================================================");
  console.log("PROMPT 11: LEGACY BALANCE SHEET INVESTIGATION & RECONCILIATION");
  console.log("==================================================================");
  console.log(`Target Database: ${isolatedTestDbUrl.replace(/\/\/.*@/, "//***:***@")}`);

  // Test 1: Isolated Environment Verification
  console.log("\n[1] Environment & Isolation Safety Check");
  assert(isolatedTestDbUrl.includes("billing_erp_test"), "Connected exclusively to billing_erp_test");
  assert(!isolatedTestDbUrl.includes("/billing_erp?"), "Production billing_erp is NOT target");

  // Test 2: Legacy Balance Sheet Equilibrium
  console.log("\n[2] Legacy AccountingEngine Balance Sheet Equilibrium");
  const legacyBs = await AccountingEngine.getBalanceSheet();
  console.log(`  Legacy Total Assets: ₹${legacyBs.totalAssets.toLocaleString("en-IN")}`);
  console.log(`  Legacy Total Equity & Liabilities: ₹${legacyBs.totalEquityAndLiabilities.toLocaleString("en-IN")}`);
  console.log(`  Legacy Difference: ₹${legacyBs.difference}`);
  console.log(`  Legacy isBalanced: ${legacyBs.isBalanced}`);

  assert(legacyBs.isBalanced === true, "Legacy Balance Sheet isBalanced flag is true");
  assert(legacyBs.difference === 0, `Legacy Balance Sheet difference is exactly 0 (actual: ${legacyBs.difference})`);
  assert(
    legacyBs.totalAssets === legacyBs.totalEquityAndLiabilities,
    "Legacy Total Assets equals Total Equity & Liabilities"
  );

  // Test 3: Persistent Ledger Balance Sheet Equilibrium
  console.log("\n[3] Persistent Ledger Reporting Service Balance Sheet Equilibrium");
  const persistentBs = await PersistentLedgerReportingService.getBalanceSheet();
  console.log(`  Persistent Total Assets: ₹${persistentBs.totalAssets.toLocaleString("en-IN")}`);
  console.log(`  Persistent Total Equity & Liabilities: ₹${persistentBs.totalEquityAndLiabilities.toLocaleString("en-IN")}`);
  console.log(`  Persistent Difference: ₹${persistentBs.difference}`);
  console.log(`  Persistent isBalanced: ${persistentBs.isBalanced}`);

  assert(persistentBs.isBalanced === true, "Persistent Ledger Balance Sheet isBalanced flag is true");
  assert(persistentBs.difference === 0, `Persistent Ledger Balance Sheet difference is exactly 0 (actual: ${persistentBs.difference})`);
  assert(
    persistentBs.totalAssets === persistentBs.totalEquityAndLiabilities,
    "Persistent Total Assets equals Total Equity & Liabilities"
  );

  // Test 4: Root Cause Deep Dive: Legacy Raw Documents vs TDS Balance
  console.log("\n[4] Root Cause Verification: TDS Payable Account Analysis");
  
  // A. Check raw documents queried by AccountingEngine:
  const rawDeposits = await testPrisma.tdsDeposit.findMany({ where: { status: "PAID" } });
  const rawExpenses = await testPrisma.expense.findMany({ where: { tdsAmount: { gt: 0 } } });
  
  const rawDepositSum = rawDeposits.reduce((acc, d) => acc + (d.amountPaid || 0), 0);
  const rawExpenseTdsSum = rawExpenses.reduce((acc, e) => acc + (e.tdsAmount || 0), 0);
  const rawNetTdsLiability = rawExpenseTdsSum - rawDepositSum;

  console.log(`  Legacy Raw PAID tdsDeposits: ${rawDeposits.length} records totaling ₹${rawDepositSum.toLocaleString("en-IN")}`);
  console.log(`  Legacy Raw Expenses with TDS: ${rawExpenses.length} records totaling ₹${rawExpenseTdsSum.toLocaleString("en-IN")}`);
  console.log(`  Legacy Net TDS Payable (Withheld - Deposited): ₹${rawNetTdsLiability.toLocaleString("en-IN")}`);

  assert(rawDepositSum === 42000, `Raw PAID tdsDeposits total ₹42,000 (actual: ${rawDepositSum})`);
  assert(rawExpenseTdsSum === 7500, `Raw Expenses with TDS total ₹7,500 (actual: ${rawExpenseTdsSum})`);
  assert(rawNetTdsLiability === -34500, `Raw Net TDS Liability is exactly -₹34,500 (actual: ${rawNetTdsLiability})`);

  // Verify that legacy currentLiabilities.statutoryTdsPayable preserves the negative balance (-34,500)
  assert(
    legacyBs.currentLiabilities.statutoryTdsPayable === -34500,
    `Legacy statutoryTdsPayable accurately reflects -₹34,500 (actual: ${legacyBs.currentLiabilities.statutoryTdsPayable})`
  );

  // B. Check persistent JournalLines for stat_tds_payable:
  const tdsLines = await testPrisma.journalLine.findMany({
    where: { accountId: "stat_tds_payable" },
    include: { entry: true },
  });

  let persistentTdsDr = 0;
  let persistentTdsCr = 0;
  for (const line of tdsLines) {
    persistentTdsDr += line.debit || 0;
    persistentTdsCr += line.credit || 0;
  }
  const persistentNetTdsCr = persistentTdsCr - persistentTdsDr;

  console.log(`  Persistent JournalLines for stat_tds_payable: ${tdsLines.length} lines`);
  console.log(`  Persistent TDS Debits: ₹${persistentTdsDr.toLocaleString("en-IN")}, Credits: ₹${persistentTdsCr.toLocaleString("en-IN")}`);
  console.log(`  Persistent Net TDS Credit Balance: ₹${persistentNetTdsCr.toLocaleString("en-IN")}`);

  assert(
    persistentBs.currentLiabilities.statutoryTdsPayable === persistentNetTdsCr,
    `Persistent statutoryTdsPayable matches JournalLine net balance (actual: ${persistentBs.currentLiabilities.statutoryTdsPayable})`
  );

  // Test 5: Comparative Financial Year Balance Sheet Integrity
  console.log("\n[5] Financial Year Scoped Balance Sheet Verification");
  const fy2425Legacy = await AccountingEngine.getBalanceSheet({ toDate: new Date("2025-03-31T23:59:59.999Z") });
  const fy2425Persistent = await PersistentLedgerReportingService.getBalanceSheet({ asOfDate: new Date("2025-03-31T23:59:59.999Z") });

  assert(fy2425Legacy.isBalanced, "FY 2024-25 Legacy Balance Sheet is balanced (diff === 0)");
  assert(fy2425Persistent.isBalanced, "FY 2024-25 Persistent Balance Sheet is balanced (diff === 0)");

  const fy2526Legacy = await AccountingEngine.getBalanceSheet({ toDate: new Date("2026-03-31T23:59:59.999Z") });
  const fy2526Persistent = await PersistentLedgerReportingService.getBalanceSheet({ asOfDate: new Date("2026-03-31T23:59:59.999Z") });

  assert(fy2526Legacy.isBalanced, "FY 2025-26 Legacy Balance Sheet is balanced (diff === 0)");
  assert(fy2526Persistent.isBalanced, "FY 2025-26 Persistent Balance Sheet is balanced (diff === 0)");

  // Test 6: Screen Audit Accounting Equilibrium Cross-Verification
  console.log("\n[6] Screen Audit Accounting Equilibrium Cross-Verification");
  const tb = await AccountingEngine.getTrialBalance();
  const tbDr = tb.totalDebit;
  const tbCr = tb.totalCredit;
  assert(tbDr === tbCr, `Trial Balance Dr (₹${tbDr}) equals Cr (₹${tbCr})`);

  console.log("\n==================================================================");
  console.log(`PROMPT 11 RECONCILIATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPrompt11ReconciliationVerification()
  .catch((err) => {
    console.error("Unhandled error during verification:", err);
    process.exit(1);
  })
  .finally(async () => {
    await testPrisma.$disconnect();
  });
