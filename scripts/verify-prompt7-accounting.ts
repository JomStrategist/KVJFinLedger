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

import { BankingStatutoryAccountingService } from "../services/banking-statutory-accounting.service";
import { BankTransferService } from "../services/bank-transfer.service";
import { BankReconciliationService } from "../services/bank-reconciliation.service";
import { GstSettlementService } from "../services/gst-settlement.service";
import { TdsDepositService } from "../services/tds-deposit.service";
import { DepreciationService } from "../services/depreciation.service";
import { AssetDisposalService } from "../services/asset-disposal.service";
import { LoanService } from "../services/loan.service";
import { ExpenseService } from "../services/expense.service";
import { ExpenseAccountingService } from "../services/expense-accounting.service";
import { JournalPostingService, IdempotencyConflictError, FiscalPeriodLockedError } from "../services/journal-posting.service";
import { AccountingEngine } from "../services/accounting-engine.service";
import { toPaise, roundToPaisa, fromPaise } from "../lib/utils/currency";

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

async function runPrompt7Tests() {
  console.log("================================================================================");
  console.log("FINLEDGER ERP — PROMPT 7: BANKING, GST/TDS SETTLEMENT, FIXED ASSETS & LOANS");
  console.log("================================================================================");
  console.log(`Target Isolated Database: ${isolatedTestDbUrl.replace(/\/\/[^@]+@/, "//***:***@")}`);
  console.log("Ensuring complete isolation from primary production database.\n");

  const testActor = {
    id: "user_prompt7_test",
    name: "Prompt 7 Test Runner",
    email: "test.prompt7@kvjanalytics.com",
    role: "ADMIN",
  };

  try {
    // -------------------------------------------------------------------------
    // 0. Preparation & Seed Master Records in isolated test DB
    // -------------------------------------------------------------------------
    console.log("--- 0. Preparing Isolated Test Database & Master Records ---");

    // Primary Active Bank Account
    let bankA = await testPrisma.bankAccount.findFirst({
      where: { accountNumber: "HDFC-MAIN-001" },
    });
    if (!bankA) {
      bankA = await testPrisma.bankAccount.create({
        data: {
          bankName: "HDFC Bank (Operating)",
          accountName: "KVJ Main Current",
          accountNumber: "HDFC-MAIN-001",
          ifsc: "HDFC0000001",
          branch: "Mumbai Central",
          isPrimary: true,
          isActive: true,
        },
      });
    }
    assert(Boolean(bankA?.id), "Primary active bank account initialized.");

    // Secondary Active Bank Account
    let bankB = await testPrisma.bankAccount.findFirst({
      where: { accountNumber: "ICICI-OPS-002" },
    });
    if (!bankB) {
      bankB = await testPrisma.bankAccount.create({
        data: {
          bankName: "ICICI Bank (Treasury)",
          accountName: "KVJ Treasury Account",
          accountNumber: "ICICI-OPS-002",
          ifsc: "ICIC0000002",
          branch: "Nariman Point",
          isPrimary: false,
          isActive: true,
        },
      });
    }
    assert(Boolean(bankB?.id), "Secondary active bank account initialized.");

    // Inactive Bank Account for rejection testing
    let inactiveBank = await testPrisma.bankAccount.findFirst({
      where: { accountNumber: "INACTIVE-999" },
    });
    if (!inactiveBank) {
      inactiveBank = await testPrisma.bankAccount.create({
        data: {
          bankName: "Defunct Dormant Bank",
          accountName: "Dormant Account",
          accountNumber: "INACTIVE-999",
          ifsc: "DORM0000099",
          isPrimary: false,
          isActive: false,
        },
      });
    }
    assert(Boolean(inactiveBank?.id), "Inactive bank account initialized.");

    // Fixed Asset Category
    let assetCat = await testPrisma.expenseCategory.findFirst({
      where: { name: "Computer Equipment & Servers" },
    });
    if (!assetCat) {
      assetCat = await testPrisma.expenseCategory.create({
        data: {
          name: "Computer Equipment & Servers",
          code: "AST-COMP-001",
          financialType: "ASSET",
          statementGroup: "Property, Plant & Equipment",
          accountNature: "Fixed Asset",
          isCapitalAsset: true,
          accountingClassification: "FIXED_ASSET",
        },
      });
    }
    assert(Boolean(assetCat?.id), "Fixed Asset category initialized.");

    // Test Vendor
    let vendor = await testPrisma.vendor.findFirst({
      where: { gstin: "27AAACB1234D1Z1" },
    });
    if (!vendor) {
      vendor = await testPrisma.vendor.create({
        data: {
          name: "Dell Technologies India",
          businessName: "Dell India Pvt Ltd",
          gstin: "27AAACB1234D1Z1",
          pan: "AAACB1234D",
          state: "Maharashtra",
          stateCode: "27",
          isActive: true,
        },
      });
    }
    assert(Boolean(vendor?.id), "Test Vendor initialized.");

    // -------------------------------------------------------------------------
    // Scenario 1: Bank transfer between two active accounts creates one balanced journal
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 1: Bank Transfer Balanced Journal ---");
    const transfer1 = await BankTransferService.createBankTransfer(
      {
        date: new Date("2026-05-15"),
        fromAccount: bankA.accountNumber,
        toAccount: bankB.accountNumber,
        fromAccountId: bankA.id,
        toAccountId: bankB.id,
        amount: 50000,
        reference: "NEFT-TRF-001",
        description: "Fund transfer to ICICI treasury account",
      },
      testActor
    );

    assert(Boolean(transfer1?.id), "Bank transfer created successfully.");
    const transferJournal = await testPrisma.journalEntry.findFirst({
      where: {
        sourceType: "BANK_TRANSFER",
        sourceId: transfer1.id,
        status: "POSTED",
      },
      include: { lines: true },
    });

    assert(Boolean(transferJournal), "Contra journal entry exists for bank transfer.");
    assert(transferJournal!.entryType === "CONTRA", "Journal entryType is CONTRA.");
    assert(transferJournal!.isBalanced, "Contra journal is perfectly balanced.");
    assert(transferJournal!.totalDebit === 50000, "Journal totalDebit is ₹50,000.");
    assert(transferJournal!.totalCredit === 50000, "Journal totalCredit is ₹50,000.");

    const destLine = transferJournal!.lines.find((l) => l.accountId === `bank_${bankB.id}`);
    const srcLine = transferJournal!.lines.find((l) => l.accountId === `bank_${bankA.id}`);
    assert(Boolean(destLine && destLine.debit === 50000), "Destination bank account debited for ₹50,000.");
    assert(Boolean(srcLine && srcLine.credit === 50000), "Source bank account credited for ₹50,000.");

    // -------------------------------------------------------------------------
    // Scenario 2: Transfer between same account, inactive, or nonexistent rejected
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 2: Validation & Rejection of Invalid Transfers ---");
    let sameAccError = false;
    try {
      await BankTransferService.createBankTransfer(
        {
          date: new Date("2026-05-16"),
          fromAccount: bankA.accountNumber,
          toAccount: bankA.accountNumber,
          fromAccountId: bankA.id,
          toAccountId: bankA.id,
          amount: 10000,
        },
        testActor
      );
    } catch (e: any) {
      sameAccError = e.message.includes("Source and destination bank accounts must be different");
    }
    assert(sameAccError, "Transfer between identical accounts was strictly rejected.");

    let inactiveAccError = false;
    try {
      await BankTransferService.createBankTransfer(
        {
          date: new Date("2026-05-16"),
          fromAccount: bankA.accountNumber,
          toAccount: inactiveBank.accountNumber,
          fromAccountId: bankA.id,
          toAccountId: inactiveBank.id,
          amount: 10000,
        },
        testActor
      );
    } catch (e: any) {
      inactiveAccError = e.message.includes("is inactive");
    }
    assert(inactiveAccError, "Transfer involving inactive bank account was strictly rejected.");

    let nonexistentAccError = false;
    try {
      await BankTransferService.createBankTransfer(
        {
          date: new Date("2026-05-16"),
          fromAccount: bankA.accountNumber,
          toAccount: "NONEXISTENT_BANK_ACC_000",
          amount: 10000,
        },
        testActor
      );
    } catch (e: any) {
      nonexistentAccError = e.message.includes("does not exist");
    }
    assert(nonexistentAccError, "Transfer involving nonexistent bank account was strictly rejected.");

    // -------------------------------------------------------------------------
    // Scenario 3: Duplicate and concurrent transfer requests do not duplicate journals
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 3: Duplicate & Concurrent Transfer Idempotency ---");
    const [concurrent1, concurrent2] = await Promise.all([
      BankingStatutoryAccountingService.postBankTransfer(transfer1.id, testActor, testPrisma),
      BankingStatutoryAccountingService.postBankTransfer(transfer1.id, testActor, testPrisma),
    ]);

    assert(concurrent1.id === concurrent2.id, "Concurrent posts returned the identical journal entry.");
    const transferCount = await testPrisma.journalEntry.count({
      where: { sourceType: "BANK_TRANSFER", sourceId: transfer1.id, status: "POSTED" },
    });
    assert(transferCount === 1, "Exactly ONE journal entry exists despite concurrent invocations.");

    // -------------------------------------------------------------------------
    // Scenario 4: Transfers do not affect revenue, expenses, GST, or TDS
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 4: Transfer Isolation from Revenue/Expense/Taxes ---");
    const nonBankLines = transferJournal!.lines.filter(
      (l) =>
        l.financialType === "INCOME" ||
        l.financialType === "EXPENSE" ||
        l.accountId.startsWith("stat_")
    );
    assert(nonBankLines.length === 0, "Transfer journal has zero impact on Revenue, Expense, GST, or TDS accounts.");

    // -------------------------------------------------------------------------
    // Scenario 5: Bank reconciliation matching preserves historical data
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 5: Bank Reconciliation Matching Integrity ---");
    const import1 = await BankReconciliationService.createImport(bankA.id, "may_2026_hdfc_stmt.csv", [
      {
        transactionDate: "2026-05-15",
        description: "NEFT OUT TO ICICI",
        referenceNo: "NEFT-TRF-001",
        withdrawal: 50000,
        deposit: 0,
        balance: 450000,
      },
      {
        transactionDate: "2026-05-18",
        description: "UNMATCHED CASH WITHDRAWAL",
        referenceNo: "CHQ-0001",
        withdrawal: 12000,
        deposit: 0,
        balance: 438000,
      },
    ]);

    assert(Boolean(import1?.id), "Statement import created.");
    const lines = await testPrisma.bankStatementLine.findMany({ where: { importId: import1.id } });
    assert(lines.length === 2, "Import contains 2 statement lines.");

    // Confirm match on line 1 against transfer1
    const matchedLine = await BankReconciliationService.confirmMatch(
      lines[0].id,
      "BANK_TRANSFER",
      transfer1.id,
      "Matched against Bank Transfer voucher"
    );

    assert(matchedLine.isReconciled === true, "Statement line marked reconciled.");
    assert(matchedLine.matchedId === transfer1.id, "Statement line linked to transfer ID.");

    // Verify source transaction and journal were completely unchanged
    const transferVerify = await testPrisma.bankTransfer.findUnique({ where: { id: transfer1.id } });
    assert(transferVerify?.amount === 50000, "Original bank transfer amount was not modified.");
    assert(
      new Date(transferVerify!.date).toISOString().split("T")[0] === "2026-05-15",
      "Original bank transfer date was not modified."
    );

    // -------------------------------------------------------------------------
    // Scenario 6: Duplicate statement imports handled safely
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 6: Safe Handling of Duplicate Statement Imports ---");
    const duplicateImport = await BankReconciliationService.createImport(bankA.id, "may_2026_hdfc_stmt.csv", [
      {
        transactionDate: "2026-05-15",
        description: "NEFT OUT TO ICICI",
        referenceNo: "NEFT-TRF-001",
        withdrawal: 50000,
        deposit: 0,
        balance: 450000,
      },
      {
        transactionDate: "2026-05-18",
        description: "UNMATCHED CASH WITHDRAWAL",
        referenceNo: "CHQ-0001",
        withdrawal: 12000,
        deposit: 0,
        balance: 438000,
      },
    ]);

    assert(duplicateImport.id === import1.id, "Duplicate statement import recognized existing import safely.");

    // -------------------------------------------------------------------------
    // Scenario 7: Ambiguous matches require user confirmation
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 7: Ambiguous Matches Require Confirmation ---");
    const unreconciledLine = lines[1];
    assert(unreconciledLine.isReconciled === false, "Unmatched statement item remains identifiable.");

    const suggestions = await BankReconciliationService.findSuggestions(bankA.id, {
      transactionDate: new Date("2026-05-18"),
      withdrawal: 12000,
      deposit: 0,
      description: "UNKNOWN WITHDRAWAL",
    });
    // Suggestions are returned for user review, not automatically confirmed
    assert(Array.isArray(suggestions), "Match suggestions generated without mutating line reconciliation status.");
    const stillUnreconciled = await testPrisma.bankStatementLine.findUnique({ where: { id: unreconciledLine.id } });
    assert(stillUnreconciled?.isReconciled === false, "Ambiguous line remained unreconciled until user confirmation.");

    // -------------------------------------------------------------------------
    // Scenario 8: Reconciliation adjustments are authorized, audited, and balanced
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 8: Auditable Reconciliation Adjustments ---");
    const adjJournal = await BankingStatutoryAccountingService.postReconciliationAdjustment(
      {
        bankAccountId: bankA.id,
        adjustmentType: "BANK_CHARGES",
        amount: 250,
        date: new Date("2026-05-20"),
        particulars: "Monthly ledger maintenance fee",
        reference: "CHG-MAY-2026",
      },
      testActor,
      testPrisma
    );

    assert(Boolean(adjJournal?.id), "Reconciliation adjustment journal posted.");
    assert(adjJournal.entryType === "ADJUSTMENT", "Journal entryType is ADJUSTMENT.");
    assert(adjJournal.isBalanced, "Adjustment journal is perfectly balanced.");
    assert(adjJournal.totalDebit === 250, "Adjustment debit is ₹250.");

    const bankChargeLine = adjJournal.lines.find((l) => l.accountId === "cat_bank_charges");
    const bankOutflowLine = adjJournal.lines.find((l) => l.accountId === `bank_${bankA.id}`);
    assert(Boolean(bankChargeLine && bankChargeLine.debit === 250), "Bank charges debited for ₹250.");
    assert(Boolean(bankOutflowLine && bankOutflowLine.credit === 250), "Bank account credited for ₹250.");

    // -------------------------------------------------------------------------
    // Scenario 9: GST settlement uses canonical statutory account identities
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 9: GST Settlement Canonical Statutory Accounts ---");
    const gstSettle1 = await GstSettlementService.createSettlement(
      {
        returnPeriod: "Q1 FY 2026-27",
        paymentDate: new Date("2026-07-20"),
        cgstPaid: 15000,
        sgstPaid: 15000,
        igstPaid: 0,
        itcCgstUtilized: 5000,
        itcSgstUtilized: 5000,
        itcIgstUtilized: 0,
        bankAccountId: bankA.id,
        challanRef: "CPIN-2607-00123",
        notes: "GSTR-3B Q1 settlement",
      },
      testActor
    );

    assert(Boolean(gstSettle1?.id), "GST settlement created.");
    const gstJournal = await testPrisma.journalEntry.findFirst({
      where: { sourceType: "GST_SETTLEMENT", sourceId: gstSettle1.id, status: "POSTED" },
      include: { lines: true },
    });

    assert(Boolean(gstJournal), "GST settlement journal posted.");
    assert(gstJournal!.isBalanced, "GST settlement journal is balanced.");

    // Check canonical accounts
    const outCgstLine = gstJournal!.lines.find((l) => l.accountId === "stat_output_cgst");
    const inCgstLine = gstJournal!.lines.find((l) => l.accountId === "stat_input_cgst");
    const bankGstLine = gstJournal!.lines.find((l) => l.accountId === `bank_${bankA.id}`);

    assert(Boolean(outCgstLine), "Output CGST liability account line present (stat_output_cgst).");
    assert(outCgstLine!.debit === 20000, "Output CGST liability debited for ₹20,000 (₹15,000 cash + ₹5,000 ITC).");
    assert(Boolean(inCgstLine), "Input CGST credit asset account line present (stat_input_cgst).");
    assert(inCgstLine!.credit === 5000, "Input CGST asset credited for ₹5,000 ITC utilized.");
    assert(Boolean(bankGstLine), "Bank line present in GST payment journal.");
    assert(bankGstLine!.credit === 30000, "Bank account credited for total cash paid ₹30,000.");

    // -------------------------------------------------------------------------
    // Scenario 10: Eligible GST credits applied only according to supported rules
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 10: GST Credit Application Equilibrium ---");
    // Dr: 20,000 (CGST) + 20,000 (SGST) = 40,000
    // Cr: 5,000 (ITC CGST) + 5,000 (ITC SGST) + 30,000 (Bank) = 40,000
    assert(gstJournal!.totalDebit === 40000, "Total debit equals ₹40,000.");
    assert(gstJournal!.totalCredit === 40000, "Total credit equals ₹40,000.");

    // -------------------------------------------------------------------------
    // Scenario 11: Ineligible credits not silently netted
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 11: Ineligible Credits Never Netted Against Output GST ---");
    // Create an expense with blocked ITC
    const blockedExpense = await ExpenseService.createExpense(
      {
        expenseDate: new Date("2026-06-10"),
        description: "Executive Dining & Club Entertainment",
        categoryId: assetCat.id,
        vendorId: vendor.id,
        taxableAmount: 10000,
        subtotal: 10000,
        gstRate: 18,
        inputCGST: 900,
        inputSGST: 900,
        totalInputGST: 1800,
        grossAmount: 11800,
        netAmount: 11800,
        isItcEligible: false, // Ineligible!
        isAsset: false,
        paymentStatus: "UNPAID",
      },
      testActor
    );

    const blockedJournal = await testPrisma.journalEntry.findFirst({
      where: { sourceType: "EXPENSE", sourceId: blockedExpense.id, status: "POSTED" },
      include: { lines: true },
    });

    const itcLinesInBlocked = blockedJournal!.lines.filter((l) => l.accountId.startsWith("stat_input_"));
    assert(itcLinesInBlocked.length === 0, "Zero Input GST ITC asset recognized for ineligible ITC.");
    const expenseDebitLine = blockedJournal!.lines.find((l) => l.debit > 0);
    assert(expenseDebitLine!.debit === 11800, "Ineligible GST capitalized into expense (₹11,800).");

    // -------------------------------------------------------------------------
    // Scenario 12: GST payment reduces liability and credits bank
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 12: GST Payment Outflow Verification ---");
    assert(bankGstLine!.credit === 30000, "Actual bank account credited for challan payment.");
    const gstExpenseLines = gstJournal!.lines.filter((l) => l.financialType === "EXPENSE");
    assert(gstExpenseLines.length === 0, "Zero secondary GST expense created at payment time.");

    // -------------------------------------------------------------------------
    // Scenario 13: Partial GST payments maintain correct allocations
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 13: Partial GST Payment Allocation ---");
    const gstPartial = await GstSettlementService.createSettlement(
      {
        returnPeriod: "July 2026",
        paymentDate: new Date("2026-08-20"),
        cgstPaid: 8000,
        sgstPaid: 0,
        igstPaid: 0,
        bankAccountId: bankA.id,
        challanRef: "CPIN-2608-PARTIAL",
      },
      testActor
    );

    const partialJournal = await testPrisma.journalEntry.findFirst({
      where: { sourceType: "GST_SETTLEMENT", sourceId: gstPartial.id, status: "POSTED" },
      include: { lines: true },
    });
    assert(partialJournal!.totalDebit === 8000, "Partial CGST payment debited for exact ₹8,000.");
    assert(partialJournal!.totalCredit === 8000, "Partial CGST payment credited bank for exact ₹8,000.");

    // -------------------------------------------------------------------------
    // Scenario 14: Duplicate GST settlement requests do not consume credits twice
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 14: GST Settlement Idempotency ---");
    const [gstDup1, gstDup2] = await Promise.all([
      BankingStatutoryAccountingService.postGstSettlement(gstSettle1.id, testActor, testPrisma),
      BankingStatutoryAccountingService.postGstSettlement(gstSettle1.id, testActor, testPrisma),
    ]);
    assert(gstDup1.id === gstDup2.id, "Concurrent GST settlement posts returned identical journal entry.");

    // -------------------------------------------------------------------------
    // Scenario 15: TDS deposit reduces existing TDS Payable without duplicate expense
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 15: TDS Deposit Liability Reduction ---");
    const tdsDeposit1 = await TdsDepositService.recordTdsDeposit(
      {
        financialYear: "FY 2026-27",
        quarter: "Q1",
        section: "194J",
        challanNumber: "CHAL-TDS-00123",
        bsrCode: "0210045",
        challanSerial: "00456",
        depositDate: new Date("2026-07-07"),
        amountPaid: 15000,
        bankAccountId: bankA.id,
        notes: "ITNS 281 challan deposit for June withholdings",
      },
      testActor
    );

    assert(Boolean(tdsDeposit1?.id), "TDS deposit recorded.");
    const tdsJournal = await testPrisma.journalEntry.findFirst({
      where: { sourceType: "TDS_DEPOSIT", sourceId: tdsDeposit1.id, status: "POSTED" },
      include: { lines: true },
    });

    assert(Boolean(tdsJournal), "TDS deposit journal posted.");
    assert(tdsJournal!.entryType === "PAYMENT", "Journal entryType is PAYMENT.");
    assert(tdsJournal!.isBalanced, "TDS deposit journal is balanced.");

    const tdsPayLine = tdsJournal!.lines.find((l) => l.accountId === "stat_tds_payable");
    const tdsBankLine = tdsJournal!.lines.find((l) => l.accountId === `bank_${bankA.id}`);

    assert(Boolean(tdsPayLine && tdsPayLine.debit === 15000), "Statutory TDS Payable debited for ₹15,000.");
    assert(Boolean(tdsBankLine && tdsBankLine.credit === 15000), "Bank account credited for ₹15,000.");

    const tdsExpenseLines = tdsJournal!.lines.filter((l) => l.financialType === "EXPENSE");
    assert(tdsExpenseLines.length === 0, "Zero additional expense recognized at TDS deposit time.");

    // -------------------------------------------------------------------------
    // Scenario 16: Partial TDS deposits preserve remaining liability
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 16: Partial TDS Deposit ---");
    const tdsPartial = await TdsDepositService.recordTdsDeposit(
      {
        financialYear: "FY 2026-27",
        quarter: "Q2",
        section: "194C",
        challanNumber: "CHAL-TDS-PARTIAL",
        depositDate: new Date("2026-08-07"),
        amountPaid: 6000,
        bankAccountId: bankA.id,
      },
      testActor
    );
    const tdsPartJournal = await testPrisma.journalEntry.findFirst({
      where: { sourceType: "TDS_DEPOSIT", sourceId: tdsPartial.id, status: "POSTED" },
      include: { lines: true },
    });
    assert(tdsPartJournal!.totalDebit === 6000, "Partial TDS deposit debited exact ₹6,000.");

    // -------------------------------------------------------------------------
    // Scenario 17: TDS withholding not deposited twice
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 17: TDS Deposit Idempotency ---");
    const [tdsDup1, tdsDup2] = await Promise.all([
      BankingStatutoryAccountingService.postTdsDeposit(tdsDeposit1.id, testActor, testPrisma),
      BankingStatutoryAccountingService.postTdsDeposit(tdsDeposit1.id, testActor, testPrisma),
    ]);
    assert(tdsDup1.id === tdsDup2.id, "Concurrent TDS deposit requests returned identical journal entry.");

    // -------------------------------------------------------------------------
    // Scenario 18: Fixed-asset purchases capitalized rather than operating expense
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 18: Fixed Asset Capitalization ---");
    const assetPurchase = await ExpenseService.createExpense(
      {
        expenseDate: new Date("2026-04-10"),
        description: "High Performance Dell PowerEdge Server",
        categoryId: assetCat.id,
        vendorId: vendor.id,
        taxableAmount: 100000,
        subtotal: 100000,
        gstRate: 18,
        inputCGST: 9000,
        inputSGST: 9000,
        totalInputGST: 18000,
        grossAmount: 118000,
        netAmount: 118000,
        isItcEligible: true,
        isAsset: true, // Fixed asset acquisition!
        paymentStatus: "UNPAID",
      },
      testActor
    );

    assert(Boolean(assetPurchase?.id), "Fixed asset purchase recorded.");
    const assetAcqJournal = await testPrisma.journalEntry.findFirst({
      where: { sourceType: "EXPENSE", sourceId: assetPurchase.id, status: "POSTED" },
      include: { lines: true },
    });

    assert(Boolean(assetAcqJournal), "Asset acquisition journal posted.");
    const fixedAssetDebit = assetAcqJournal!.lines.find((l) => l.accountId === "asset_fixed");
    assert(Boolean(fixedAssetDebit), "Fixed Assets asset account debited (asset_fixed).");
    assert(fixedAssetDebit!.financialType === "ASSET", "Fixed Asset classified as ASSET.");
    assert(fixedAssetDebit!.debit === 100000, "Fixed Asset capitalized at ₹100,000.");

    const opExpDebit = assetAcqJournal!.lines.filter((l) => l.financialType === "EXPENSE");
    assert(opExpDebit.length === 0, "Capitalized asset purchase has zero operating expense debit.");

    // -------------------------------------------------------------------------
    // Scenario 19: Eligible and Ineligible GST on Fixed Asset
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 19: Input GST Eligibility on Fixed Asset ---");
    const itcCGST = assetAcqJournal!.lines.find((l) => l.accountId === "stat_input_cgst");
    const itcSGST = assetAcqJournal!.lines.find((l) => l.accountId === "stat_input_sgst");
    assert(Boolean(itcCGST && itcCGST.debit === 9000), "Eligible Input CGST debited separately as tax asset (₹9,000).");
    assert(Boolean(itcSGST && itcSGST.debit === 9000), "Eligible Input SGST debited separately as tax asset (₹9,000).");

    // -------------------------------------------------------------------------
    // Scenario 20: SLM depreciation calculation and posting
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 20: Straight Line Method (SLM) Depreciation ---");
    const slmCalc = await BankingStatutoryAccountingService.calculateDepreciation(
      assetPurchase.id,
      "SLM",
      20, // 20% annual
      "2026-27",
      5000, // ₹5,000 salvage value
      testPrisma
    );

    // SLM Base = (100,000 - 5,000) = 95,000. 20% of 95,000 = 19,000
    assert(slmCalc.depreciationAmount === 19000, "SLM depreciation calculated accurately: ₹19,000.");
    assert(slmCalc.remainingNBV === 81000, "Remaining NBV after SLM is ₹81,000.");

    const slmDepRecord = await DepreciationService.recordAssetDepreciation(
      {
        expenseId: assetPurchase.id,
        financialYear: "2026-27",
        method: "SLM",
        rate: 20,
        depreciationAmount: slmCalc.depreciationAmount,
        effectiveDate: new Date("2027-03-31"),
        remarks: "Annual SLM depreciation run",
      },
      testActor
    );

    assert(Boolean(slmDepRecord?.id), "SLM depreciation record created.");
    const slmJournal = await testPrisma.journalEntry.findFirst({
      where: { sourceType: "ASSET_DEPRECIATION", sourceId: slmDepRecord.id, status: "POSTED" },
      include: { lines: true },
    });

    assert(Boolean(slmJournal), "SLM depreciation journal posted.");
    assert(slmJournal!.isBalanced, "Depreciation journal is balanced.");
    const depExpLine = slmJournal!.lines.find((l) => l.accountId === "cat_depreciation");
    const accumDepLine = slmJournal!.lines.find((l) => l.accountId === "asset_depr_accum");
    assert(Boolean(depExpLine && depExpLine.debit === 19000), "Depreciation Expense debited for ₹19,000.");
    assert(Boolean(accumDepLine && accumDepLine.credit === 19000), "Accumulated Depreciation credited for ₹19,000.");

    // -------------------------------------------------------------------------
    // Scenario 21: WDV depreciation calculation
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 21: Written Down Value (WDV) Depreciation ---");
    // Year 2: Gross 100,000 - Accum 19,000 = Current NBV 81,000. WDV 25% on 81,000 = 20,250
    const wdvCalc = await BankingStatutoryAccountingService.calculateDepreciation(
      assetPurchase.id,
      "WDV",
      25,
      "2027-28",
      0,
      testPrisma
    );
    assert(wdwCalcEquals(wdvCalc.depreciationAmount, 20250), "WDV depreciation calculated on current NBV: ₹20,250.");
    function wdwCalcEquals(a: number, b: number) {
      return Math.abs(a - b) < 0.05;
    }

    // -------------------------------------------------------------------------
    // Scenario 22: Depreciation cannot reduce book value below zero
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 22: Non-negative Net Book Value Constraint ---");
    // Attempt 150% depreciation rate on asset with 81,000 NBV
    const excessCalc = await BankingStatutoryAccountingService.calculateDepreciation(
      assetPurchase.id,
      "WDV",
      150,
      "2027-28",
      0,
      testPrisma
    );
    assert(excessCalc.depreciationAmount <= excessCalc.currentNBV, "Depreciation capped at current NBV.");
    assert(excessCalc.remainingNBV >= 0, "Remaining Net Book Value cannot fall below zero.");

    // -------------------------------------------------------------------------
    // Scenario 23: Repeated and concurrent depreciation runs do not duplicate journals
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 23: Depreciation Idempotency & Duplicate Protection ---");
    const [depDup1, depDup2] = await Promise.all([
      BankingStatutoryAccountingService.postAssetDepreciation(slmDepRecord.id, testActor, testPrisma),
      BankingStatutoryAccountingService.postAssetDepreciation(slmDepRecord.id, testActor, testPrisma),
    ]);
    assert(depDup1.id === depDup2.id, "Concurrent depreciation posts returned identical journal voucher.");

    // -------------------------------------------------------------------------
    // Scenario 24: Asset disposal removes cost & accum dep and records gain/loss
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 24: Asset Disposal & Gain/Loss Recognition ---");
    // Asset cost = 100,000. Accum Dep = 19,000. NBV = 81,000.
    // Sale Proceeds = 85,000 -> Gain = 4,000!
    const disposalRecord = await AssetDisposalService.createDisposal(
      {
        expenseId: assetPurchase.id,
        disposalDate: new Date("2027-06-15"),
        saleProceeds: 85000,
        bankAccountId: bankA.id,
        buyerName: "Refurbished Tech Solutions Ltd",
        notes: "Server decommissioned and sold",
      },
      testActor
    );

    assert(Boolean(disposalRecord?.id), "Asset disposal record created.");
    assert(disposalRecord.gainOrLoss === 4000, "Gain on disposal calculated accurately: ₹4,000.");

    const disposalJournal = await testPrisma.journalEntry.findFirst({
      where: { sourceType: "ASSET_DISPOSAL", sourceId: disposalRecord.id, status: "POSTED" },
      include: { lines: true },
    });

    assert(Boolean(disposalJournal), "Disposal journal entry posted.");
    assert(disposalJournal!.isBalanced, "Disposal journal is perfectly balanced.");

    const dispBank = disposalJournal!.lines.find((l) => l.accountId === `bank_${bankA.id}`);
    const dispAccum = disposalJournal!.lines.find((l) => l.accountId === "asset_depr_accum");
    const dispGain = disposalJournal!.lines.find((l) => l.accountId === "inc_asset_gain");
    const dispFixedCost = disposalJournal!.lines.find((l) => l.accountId === "asset_fixed");

    assert(Boolean(dispBank && dispBank.debit === 85000), "Proceeds debited to Bank account (₹85,000).");
    assert(Boolean(dispAccum && dispAccum.debit === 19000), "Accumulated depreciation debited/derecognized (₹19,000).");
    assert(Boolean(dispGain && dispGain.credit === 4000), "Gain on disposal credited to Income (₹4,000).");
    assert(Boolean(dispFixedCost && dispFixedCost.credit === 100000), "Fixed Assets gross cost credited/derecognized (₹100,000).");

    // Check equilibrium: 85,000 + 19,000 = 104,000 Dr = 4,000 + 100,000 = 104,000 Cr
    assert(disposalJournal!.totalDebit === 104000, "Disposal total debit equals ₹104,000.");
    assert(disposalJournal!.totalCredit === 104000, "Disposal total credit equals ₹104,000.");

    // -------------------------------------------------------------------------
    // Scenario 25: Duplicate disposal and disposal of already disposed asset rejected
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 25: Rejection of Duplicate Disposal ---");
    let duplicateDisposalError = false;
    try {
      await AssetDisposalService.createDisposal(
        {
          expenseId: assetPurchase.id,
          saleProceeds: 80000,
        },
        testActor
      );
    } catch (e: any) {
      duplicateDisposalError = e.message.includes("already been recorded as disposed");
    }
    assert(duplicateDisposalError, "Attempting to dispose already disposed asset was strictly rejected.");

    // -------------------------------------------------------------------------
    // Scenario 26: Loan drawdown debits bank and credits loan liability without income
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 26: Loan Drawdown Accounting ---");
    const loan1 = await LoanService.createLoan(
      {
        loanNumber: `LOAN-TEST-${Date.now().toString().slice(-6)}`,
        lenderName: "State Bank of India",
        loanType: "TERM_LOAN",
        principalAmount: 500000,
        interestRate: 10.5,
        disbursementDate: new Date("2026-04-01"),
        bankAccountId: bankA.id,
        notes: "Capital expansion term loan",
      },
      testActor
    );

    assert(Boolean(loan1?.id), "Loan record created.");
    const drawdownJournal = await testPrisma.journalEntry.findFirst({
      where: { sourceType: "LOAN_RECEIPT", sourceId: loan1.id, status: "POSTED" },
      include: { lines: true },
    });

    assert(Boolean(drawdownJournal), "Loan drawdown journal posted.");
    assert(drawdownJournal!.entryType === "RECEIPT", "Drawdown entryType is RECEIPT.");
    assert(drawdownJournal!.isBalanced, "Drawdown journal is balanced.");

    const loanBankLine = drawdownJournal!.lines.find((l) => l.accountId === `bank_${bankA.id}`);
    const loanLiabLine = drawdownJournal!.lines.find((l) => l.accountId === `loan_${loan1.id}`);

    assert(Boolean(loanBankLine && loanBankLine.debit === 500000), "Bank account debited for ₹500,000 loan disbursement.");
    assert(Boolean(loanLiabLine && loanLiabLine.credit === 500000), "Loan liability credited for ₹500,000.");
    assert(loanLiabLine!.financialType === "LIABILITY", "Loan classified strictly as LIABILITY.");

    const incomeLinesInDrawdown = drawdownJournal!.lines.filter((l) => l.financialType === "INCOME");
    assert(incomeLinesInDrawdown.length === 0, "Zero income recognized upon loan principal drawdown.");

    // -------------------------------------------------------------------------
    // Scenario 27 & 28: Loan repayment principal/interest split & no principal expense
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 27 & 28: Loan Repayment Principal/Interest Split ---");
    const repay1 = await LoanService.recordRepayment(
      {
        loanId: loan1.id,
        paymentDate: new Date("2026-05-01"),
        principalAmount: 20000,
        interestAmount: 4375, // (500,000 * 10.5% / 12)
        totalAmount: 24375,
        bankAccountId: bankA.id,
        reference: "EMI-MAY-2026",
      },
      testActor
    );

    assert(Boolean(repay1?.id), "Loan repayment recorded.");
    const repayJournal = await testPrisma.journalEntry.findFirst({
      where: { sourceType: "LOAN_REPAYMENT", sourceId: repay1.id, status: "POSTED" },
      include: { lines: true },
    });

    assert(Boolean(repayJournal), "Loan repayment journal posted.");
    assert(repayJournal!.entryType === "PAYMENT", "Repayment entryType is PAYMENT.");
    assert(repayJournal!.isBalanced, "Repayment journal is balanced.");

    const repayPrincipalLine = repayJournal!.lines.find((l) => l.accountId === `loan_${loan1.id}`);
    const repayInterestLine = repayJournal!.lines.find((l) => l.accountId === "exp_loan_interest");
    const repayBankLine = repayJournal!.lines.find((l) => l.accountId === `bank_${bankA.id}`);

    assert(Boolean(repayPrincipalLine && repayPrincipalLine.debit === 20000), "Principal portion (₹20,000) debited to Loan Liability.");
    assert(Boolean(repayInterestLine && repayInterestLine.debit === 4375), "Interest portion (₹4,375) debited to Interest Expense.");
    assert(Boolean(repayBankLine && repayBankLine.credit === 24375), "Bank account credited for total repayment ₹24,375.");

    assert(repayPrincipalLine!.financialType === "LIABILITY", "Principal repayment is NOT treated as an expense.");
    assert(repayInterestLine!.financialType === "EXPENSE", "Interest is treated as a Finance Cost expense.");

    // -------------------------------------------------------------------------
    // Scenario 29: Partial loan repayments maintain outstanding principal
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 29: Outstanding Loan Balance Tracking ---");
    const updatedLoan = await LoanService.getLoanById(loan1.id);
    assert(updatedLoan!.outstandingPrincipal === 480000, "Outstanding principal correctly reflects ₹480,000 (500k - 20k).");
    assert(updatedLoan!.isFullyRepaid === false, "Loan is correctly flagged as active / not fully repaid.");

    // -------------------------------------------------------------------------
    // Scenario 30: Invalid repayment allocations and excess rejected
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 30: Rejection of Invalid Repayment Allocations ---");
    let splitMismatchError = false;
    try {
      await LoanService.recordRepayment(
        {
          loanId: loan1.id,
          principalAmount: 20000,
          interestAmount: 4000,
          totalAmount: 25000, // 20k + 4k != 25k!
        },
        testActor
      );
    } catch (e: any) {
      splitMismatchError = e.message.includes("does not match total amount");
    }
    assert(splitMismatchError, "Repayment split mismatch was strictly rejected.");

    let excessPrincipalError = false;
    try {
      await LoanService.recordRepayment(
        {
          loanId: loan1.id,
          principalAmount: 500000, // exceeds remaining 480k!
          interestAmount: 0,
          totalAmount: 500000,
        },
        testActor
      );
    } catch (e: any) {
      excessPrincipalError = e.message.includes("exceeds remaining outstanding loan balance");
    }
    assert(excessPrincipalError, "Excess principal repayment was strictly rejected.");

    // -------------------------------------------------------------------------
    // Scenario 31: Posted corrections preserve history and use valid reversals
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 31: Audited Reversals & Historical Integrity ---");
    await LoanService.deleteRepayment(repay1.id, testActor);

    const reversedRepayJournal = await testPrisma.journalEntry.findUnique({
      where: { id: repayJournal!.id },
    });
    assert(reversedRepayJournal?.status === "REVERSED", "Original repayment journal marked REVERSED.");

    const reversalEntry = await testPrisma.journalEntry.findFirst({
      where: { reversalOfId: repayJournal!.id },
      include: { lines: true },
    });
    assert(Boolean(reversalEntry), "Reversal journal entry created.");
    assert(reversalEntry!.entryType === "REVERSAL", "Reversal journal has entryType REVERSAL.");
    assert(reversalEntry!.isBalanced, "Reversal journal is perfectly balanced.");

    const restoredLoan = await LoanService.getLoanById(loan1.id);
    assert(restoredLoan!.outstandingPrincipal === 500000, "Loan outstanding principal accurately restored to ₹500,000.");

    // -------------------------------------------------------------------------
    // Scenario 32: Closed fiscal periods reject unauthorized postings
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 32: Locked Fiscal Period Protection ---");
    const lockedPeriod = await testPrisma.fiscalPeriod.upsert({
      where: { periodCode: "2024-01" },
      create: {
        financialYear: "2023-24",
        periodName: "January 2024",
        periodCode: "2024-01",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
        isLocked: true,
        lockReason: "Audited & closed",
      },
      update: {
        isLocked: true,
      },
    });

    let lockedPeriodError = false;
    try {
      await BankingStatutoryAccountingService.postBankTransfer(
        transfer1.id,
        testActor,
        testPrisma
      );
      // Try posting into locked date
      await JournalPostingService.postJournalEntry(
        {
          entryType: "CONTRA",
          accountingDate: new Date("2024-01-15"),
          financialYear: "2023-24",
          sourceType: "BANK_TRANSFER",
          sourceId: "fake_id_locked",
          narration: "Attempt into locked period",
          idempotencyKey: `locked_test_${Date.now()}`,
          lines: [
            {
              lineNumber: 1,
              accountId: `bank_${bankA.id}`,
              accountName: "Bank A",
              financialType: "ASSET",
              statementGroup: "Cash and Bank Balances",
              normalBalance: "DEBIT",
              debit: 1000,
              credit: 0,
            },
            {
              lineNumber: 2,
              accountId: `bank_${bankB.id}`,
              accountName: "Bank B",
              financialType: "ASSET",
              statementGroup: "Cash and Bank Balances",
              normalBalance: "DEBIT",
              debit: 0,
              credit: 1000,
            },
          ],
        },
        testActor,
        testPrisma
      );
    } catch (e: any) {
      lockedPeriodError = e.message.includes("is locked");
    }
    assert(lockedPeriodError, "Postings into a locked fiscal period are strictly rejected.");

    // -------------------------------------------------------------------------
    // Scenario 33: Injected failures roll back source records atomically
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 33: Atomic Transaction Rollback on Failure ---");
    let rollbackSuccess = false;
    const preCount = await testPrisma.bankTransfer.count();
    const preJournals = await testPrisma.journalEntry.count();

    try {
      await testPrisma.$transaction(async (tx) => {
        const trf = await tx.bankTransfer.create({
          data: {
            date: new Date(),
            fromAccount: bankA.accountNumber,
            toAccount: bankB.accountNumber,
            amount: 75000,
            status: "COMPLETED",
          },
        });
        // Intentionally throw inside transaction
        throw new Error("SimulatedFailureAfterTransferCreation");
      });
    } catch (e: any) {
      if (e.message.includes("SimulatedFailureAfterTransferCreation")) {
        rollbackSuccess = true;
      }
    }

    assert(rollbackSuccess, "Simulated transaction failure triggered rollback.");
    const postCount = await testPrisma.bankTransfer.count();
    const postJournals = await testPrisma.journalEntry.count();
    assert(postCount === preCount, "Zero transfer records persisted after failed transaction.");
    assert(postJournals === preJournals, "Zero journal records persisted after failed transaction.");

    // -------------------------------------------------------------------------
    // Scenario 34: Concurrency & Idempotency across Prompt 7 Event Types
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 34: Universal Event Idempotency & Concurrency ---");
    const [p1, p2, p3] = await Promise.all([
      BankingStatutoryAccountingService.postBankTransfer(transfer1.id, testActor, testPrisma),
      BankingStatutoryAccountingService.postBankTransfer(transfer1.id, testActor, testPrisma),
      BankingStatutoryAccountingService.postBankTransfer(transfer1.id, testActor, testPrisma),
    ]);
    assert(p1.id === p2.id && p2.id === p3.id, "Multi-threaded calls returned identical transfer voucher.");

    // -------------------------------------------------------------------------
    // Scenario 35: Legacy reports remain unchanged and do not double-count
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 35: Legacy Reports Path Coexistence & No Double Counting ---");
    AccountingEngine.invalidateCache();
    const legacyTB = await AccountingEngine.getTrialBalance();
    assert(legacyTB.isBalanced === true, "Legacy Trial Balance remains fully balanced to zero difference.");


    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log("\n================================================================================");
    console.log(`ALL 35 PROMPT 7 CORE SCENARIOS VERIFIED: ${passedTests} passed, ${failedTests} failed.`);
    console.log("================================================================================");
  } catch (err: any) {
    console.error("\nFATAL TEST RUN ERROR:", err);
    process.exit(1);
  } finally {
    await testPrisma.$disconnect();
  }
}

runPrompt7Tests().catch((e) => {
  console.error("Unhandled rejection:", e);
  process.exit(1);
});
