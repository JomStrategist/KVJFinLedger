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

// Instantiate isolated test Prisma instance
const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: isolatedTestDbUrl,
    },
  },
});

(globalThis as any).prisma = testPrisma;

import { JournalPostingService } from "../services/journal-posting.service";
import { TaxInvoiceService } from "../services/tax-invoice.service";
import { InvoiceAccountingService } from "../services/invoice-accounting.service";
import { ExpenseService } from "../services/expense.service";
import { ExpenseAccountingService } from "../services/expense-accounting.service";
import { BankingStatutoryAccountingService } from "../services/banking-statutory-accounting.service";
import { LoanService } from "../services/loan.service";
import { PersistentLedgerReportingService } from "../services/persistent-ledger-reporting.service";
import { BackupRestoreService } from "../services/backup-restore.service";
import { HistoricalMigrationService } from "../services/historical-migration.service";
import { FiscalPeriodService } from "../services/fiscal-period.service";
import { ReportExportService } from "../services/report-export.service";

// Server Actions to test
import { createTaxInvoiceAction, cancelTaxInvoiceAction } from "../app/(dashboard)/invoices/actions";
import { createExpenseAction } from "../app/(dashboard)/expenses/actions";
import { triggerBackupAction, listBackupsAction } from "../app/(dashboard)/admin/backup-actions";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failedCount++;
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`AssertionFailed: ${message}`);
  }
  passedCount++;
  console.log(`  ✅ PASSED: ${message}`);
}

async function runPrompt10Suite() {
  console.log("================================================================================");
  console.log("FINLEDGER ERP — PROMPT 10: COMPREHENSIVE RELEASE-READINESS AUDIT");
  console.log("================================================================================");
  console.log("Target Isolated Database:", isolatedTestDbUrl.replace(/\/\/[^:]+:[^@]+@/, "//***:***@"));

  const testActor = {
    id: "admin_release_user",
    name: "Ajay Thomas (CA Auditor)",
    email: "ajay@kvj.local",
    role: "ADMIN",
  };

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Establish Baseline & Target Safety
    // -------------------------------------------------------------------------
    console.log("\n--- Phase 1: Baseline Verification & Safety Guardrails ---");
    assert(isolatedTestDbUrl.includes("billing_erp_test"), "Connected strictly to isolated test database.");
    assert(!isolatedTestDbUrl.endsWith("/billing_erp"), "Production database URL strictly prevented from test writes.");

    // Initialize required test masters
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const testCust = await testPrisma.customer.create({
      data: {
        legalName: `Prompt 10 Enterprise Solutions Pvt Ltd ${suffix}`,
        tradeName: `P10 Solutions ${suffix}`,
        gstin: `29AABCU${suffix}R1Z7`,
        state: "Karnataka",
        stateCode: "29",
        pan: `AABCU${suffix}`,
        customerType: "B2B",
      },
    });

    const testVendor = await testPrisma.vendor.create({
      data: {
        name: `Prompt 10 Infrastructure Services ${suffix}`,
        gstin: `29AABCU${suffix}R1ZZ`,
        pan: `AABCU${suffix}`,
        state: "Karnataka",
        stateCode: "29",
        isActive: true,
      },
    });

    let bank = await testPrisma.bankAccount.findFirst({ where: { isActive: true } });
    if (!bank) {
      bank = await testPrisma.bankAccount.create({
        data: {
          accountName: "Primary Operations A/c",
          accountNumber: `P10-${Date.now().toString().slice(-8)}`,
          bankName: "HDFC Bank",
          branch: "Koramangala, Bangalore",
          ifsc: "HDFC0001234",
          isActive: true,
        },
      });
    }

    assert(Boolean(testCust.id), "Customer test master initialized.");
    assert(Boolean(testVendor.id), "Vendor test master initialized.");
    assert(Boolean(bank.id), "Bank account master initialized.");

    // -------------------------------------------------------------------------
    // Phase 2: Security & Authorization Audit
    // -------------------------------------------------------------------------
    console.log("\n--- Phase 2: Security & Authorization Audit ---");

    // 1. Unauthenticated Server Action calls rejected
    const unauthTax = await createTaxInvoiceAction({ customerId: testCust.id });
    assert(unauthTax.success === false, "Unauthenticated createTaxInvoiceAction rejected.");
    assert(unauthTax.error?.includes("Unauthorized"), "Rejection reason explicitly states Unauthorized.");

    const unauthExp = await createExpenseAction({ description: "Test Expense" });
    assert(unauthExp.success === false, "Unauthenticated createExpenseAction rejected.");

    // 2. Unauthenticated Admin Action calls rejected
    const unauthBackup = await triggerBackupAction();
    assert(unauthBackup.success === false, "Unauthenticated triggerBackupAction rejected.");
    assert(unauthBackup.error?.includes("Unauthorized"), "Rejection states Unauthorized.");

    const unauthList = await listBackupsAction();
    assert(unauthList.success === false, "Unauthenticated listBackupsAction rejected.");

    // 3. Formula Injection Sanitization
    const sanitizedEqual = ReportExportService.sanitizeCell("=SUM(A1:A10)");
    const sanitizedPlus = ReportExportService.sanitizeCell("+1234567890");
    const sanitizedMinus = ReportExportService.sanitizeCell("-cmd|' /C calc'!A0");
    const sanitizedAt = ReportExportService.sanitizeCell("@calc");
    assert(sanitizedEqual.startsWith("'="), "Formula starting with '=' sanitized by quote prefix.");
    assert(sanitizedPlus.startsWith("'+"), "Formula starting with '+' sanitized by quote prefix.");
    assert(sanitizedMinus.startsWith("'-"), "Formula starting with '-' sanitized by quote prefix.");
    assert(sanitizedAt.startsWith("'@"), "Formula starting with '@' sanitized by quote prefix.");

    // 4. Path Traversal Rejection
    let pathTraversalRejected = false;
    try {
      BackupRestoreService.validateBackupId("../../../etc/passwd");
    } catch (err: any) {
      pathTraversalRejected = err.message.includes("Potential path traversal detected");
    }
    assert(pathTraversalRejected, "Path traversal pattern in backup identifier strictly rejected.");

    // 5. Credential Redaction in Sanitized Database Strings
    const sanitizedUrl = BackupRestoreService.sanitizeDatabaseUrl(isolatedTestDbUrl);
    assert(!sanitizedUrl.includes("@"), "Credentials and cluster host redacted in sanitized URL.");
    assert(!sanitizedUrl.includes("mongodb+srv://admin:"), "Password and username redacted.");

    // -------------------------------------------------------------------------
    // Phase 3: Invoice & Customer Receipt Accounting
    // -------------------------------------------------------------------------
    console.log("\n--- Phase 3: Invoice & Customer Receipt Accounting ---");

    // 1. Create Tax Invoice and confirm
    const taxInvoice = await testPrisma.taxInvoice.create({
      data: {
        invoiceNumber: `INV-P10-${suffix}`,
        invoiceDate: new Date("2026-07-10"),
        customerId: testCust.id,
        subtotal: 100000,
        taxableAmount: 100000,
        totalCGST: 9000,
        totalSGST: 9000,
        totalIGST: 0,
        totalGST: 18000,
        grossAmount: 118000,
        netAmount: 118000,
        status: "CONFIRMED",
      },
    });

    const salesEntry = await InvoiceAccountingService.postTaxInvoiceConfirmation(taxInvoice.id, testActor, testPrisma);
    assert(Boolean(salesEntry?.id), "Sales journal entry created for Tax Invoice.");
    assert(salesEntry!.entryType === "SALES", "Journal entryType is SALES.");
    assert(salesEntry!.totalDebit === 118000, "Debit equals gross ₹1,18,000.");
    assert(salesEntry!.totalCredit === 118000, "Credit equals gross ₹1,18,000.");

    // 2. Duplicate confirmation idempotency
    const duplicateSalesEntry = await InvoiceAccountingService.postTaxInvoiceConfirmation(taxInvoice.id, testActor, testPrisma);
    assert(duplicateSalesEntry?.id === salesEntry?.id, "Duplicate confirmation returns identical journal entry.");

    // 3. Repeated invoice edits test (Edit 1, then Edit 2)
    // Edit 1: change to ₹1,41,600
    const edit1Invoice = await testPrisma.taxInvoice.update({
      where: { id: taxInvoice.id },
      data: {
        subtotal: 120000,
        taxableAmount: 120000,
        totalCGST: 10800,
        totalSGST: 10800,
        totalGST: 21600,
        grossAmount: 141600,
        netAmount: 141600,
      },
    });
    const edit1Entry = await InvoiceAccountingService.adjustTaxInvoice(taxInvoice.id, testActor, testPrisma);
    assert(Boolean(edit1Entry?.id), "First invoice edit produces active revised SALES journal.");
    assert(edit1Entry!.totalDebit === 141600, "Revised journal balanced at ₹1,41,600.");

    // Edit 2: change to ₹1,77,000 (verifies that edit1Entry is cleanly reversed and not orphaned)
    await new Promise((r) => setTimeout(r, 50)); // ensure updatedAt advances
    const edit2Invoice = await testPrisma.taxInvoice.update({
      where: { id: taxInvoice.id },
      data: {
        subtotal: 150000,
        taxableAmount: 150000,
        totalCGST: 13500,
        totalSGST: 13500,
        totalGST: 27000,
        grossAmount: 177000,
        netAmount: 177000,
      },
    });
    const edit2Entry = await InvoiceAccountingService.adjustTaxInvoice(taxInvoice.id, testActor, testPrisma);
    assert(Boolean(edit2Entry?.id), "Second invoice edit produces active revised SALES journal.");
    assert(edit2Entry!.totalDebit === 177000, "Second revised journal balanced at ₹1,77,000.");

    // Verify journal lifecycle: exactly 1 active POSTED sales entry exists for this invoice
    const activeInvoiceJournals = await testPrisma.journalEntry.findMany({
      where: {
        sourceType: "TAX_INVOICE",
        sourceId: taxInvoice.id,
        entryType: "SALES",
        status: "POSTED",
      },
    });
    assert(activeInvoiceJournals.length === 1, "Exactly 1 active POSTED sales journal entry exists after repeated edits.");
    assert(activeInvoiceJournals[0].id === edit2Entry!.id, "Active entry is the latest revision.");

    // 4. Customer Receipt with TDS Withholding
    const payment = await testPrisma.invoicePayment.create({
      data: {
        taxInvoiceId: taxInvoice.id,
        paymentDate: new Date("2026-07-20"),
        paymentAmount: 177000,
        isTdsDeducted: true,
        tdsRate: 10,
        tdsAmount: 15000, // 10% on 150,000 taxable
        bankReceipt: 162000, // 177,000 - 15,000
      },
    });

    const receiptEntry = await InvoiceAccountingService.postCustomerReceipt(payment.id, testActor, testPrisma);
    assert(Boolean(receiptEntry?.id), "Receipt journal posted for invoice payment.");
    assert(receiptEntry!.entryType === "RECEIPT", "Journal entryType is RECEIPT.");
    assert(receiptEntry!.totalDebit === 177000, "Receipt journal total debit is ₹1,77,000.");
    assert(receiptEntry!.totalCredit === 177000, "Receipt journal total credit is ₹1,77,000.");

    const tdsLine = receiptEntry!.lines.find((l) => l.accountId === "stat_tds_receivable" || l.accountName.includes("TDS Receivable"));
    assert(Boolean(tdsLine && tdsLine.debit === 15000), "TDS Receivable asset debited for exact withheld ₹15,000.");

    // -------------------------------------------------------------------------
    // Phase 4: Expense, Vendor & Salary Accounting
    // -------------------------------------------------------------------------
    console.log("\n--- Phase 4: Expense, Vendor & Salary Accounting ---");

    const expCategory = await testPrisma.expenseCategory.findFirst({
      where: { OR: [{ code: "EXP-OPERATING" }, { name: "Office Operations" }] },
    }) || await testPrisma.expenseCategory.create({
      data: {
        name: "Office Operations",
        code: "EXP-OPERATING",
        financialType: "EXPENSE",
        statementGroup: "Operating Expenses",
      },
    });

    // 1. Unpaid Vendor Bill
    const expense = await ExpenseService.createExpense(
      {
        expenseDate: new Date("2026-08-05"),
        description: `Cloud Hosting Monthly Services ${suffix}`,
        categoryId: expCategory.id,
        vendorId: testVendor.id,
        paidBy: "COMPANY",
        paymentStatus: "UNPAID",
        taxableAmount: 20000,
        subtotal: 20000,
        gstRate: 18,
        inputCGST: 1800,
        inputSGST: 1800,
        totalInputGST: 3600,
        grossAmount: 23600,
        netAmount: 23600,
        balancePayable: 23600,
        isItcEligible: true,
      },
      testActor
    );

    const expEntry = await testPrisma.journalEntry.findFirst({
      where: { sourceType: "EXPENSE", sourceId: expense.id, status: "POSTED" },
      include: { lines: true },
    });
    assert(Boolean(expEntry?.id), "Journal entry created for vendor bill.");
    assert(expEntry!.entryType === "PURCHASE", "Journal entryType is PURCHASE.");
    assert(expEntry!.totalDebit === 23600, "Debit equals gross ₹23,600 (₹20,000 + 18% GST).");

    // 2. Vendor Payment with TDS deduction
    const expPayment = await testPrisma.expensePayment.create({
      data: {
        expenseId: expense.id,
        paymentDate: new Date("2026-08-15"),
        amount: 23600,
        bankAccountId: bank.id,
        isTdsDeducted: true,
        tdsSection: "194C",
        tdsRate: 2,
        tdsAmount: 400, // 2% on 20,000
        bankPayment: 23200,
      },
    });

    const expPayEntry = await ExpenseAccountingService.postExpensePayment(expPayment.id, testActor, testPrisma);
    assert(Boolean(expPayEntry?.id), "Journal entry posted for expense payment.");
    assert(expPayEntry!.entryType === "PAYMENT", "Journal entryType is PAYMENT.");
    assert(expPayEntry!.totalDebit === 23600, "Payment total debit is ₹23,600.");
    assert(expPayEntry!.totalCredit === 23600, "Payment total credit is ₹23,600.");

    const tdsPayLine = expPayEntry!.lines.find((l) => l.accountId === "stat_tds_payable");
    assert(Boolean(tdsPayLine && tdsPayLine.credit === 400), "TDS Payable credited for exact withheld ₹400.");

    // -------------------------------------------------------------------------
    // Phase 5: Banking, GST/TDS, Fixed Assets & Loans
    // -------------------------------------------------------------------------
    console.log("\n--- Phase 5: Banking, Statutory, Fixed Assets & Loans ---");

    // 1. Bank Reconciliation Adjustment
    const brsAdj = await BankingStatutoryAccountingService.postReconciliationAdjustment(
      {
        bankAccountId: bank.id,
        date: new Date("2026-08-31"),
        amount: 150,
        adjustmentType: "BANK_CHARGES",
        particulars: "Monthly ledger maintenance charges",
      },
      testActor,
      testPrisma
    );
    assert(Boolean(brsAdj?.id), "BRS adjustment journal posted.");
    assert(brsAdj.entryType === "ADJUSTMENT", "Journal entryType is ADJUSTMENT.");
    assert(brsAdj.totalDebit === 150, "BRS adjustment total debit is ₹150.");

    // 2. Loan Drawdown & Repayment
    const loan = await LoanService.createLoan(
      {
        lenderName: "HDFC Commercial Credit",
        loanType: "TERM_LOAN",
        principalAmount: 200000,
        interestRate: 10.5,
        disbursementDate: new Date("2026-09-01"),
        bankAccountId: bank.id,
      },
      testActor
    );

    const loanEntry = await testPrisma.journalEntry.findFirst({
      where: { sourceType: "LOAN_RECEIPT", sourceId: loan.id, status: "POSTED" },
    });
    assert(Boolean(loanEntry?.id), "Loan drawdown journal posted.");
    assert(loanEntry!.entryType === "RECEIPT", "Loan drawdown entryType is RECEIPT.");
    assert(loanEntry!.totalDebit === 200000, "Loan drawdown debit is ₹2,00,000.");

    const repayment = await LoanService.recordRepayment(
      {
        loanId: loan.id,
        paymentDate: new Date("2026-10-01"),
        principalAmount: 15000,
        interestAmount: 1750,
        totalAmount: 16750,
        bankAccountId: bank.id,
      },
      testActor
    );

    const repEntry = await testPrisma.journalEntry.findFirst({
      where: { sourceType: "LOAN_REPAYMENT", sourceId: repayment.id, status: "POSTED" },
      include: { lines: true },
    });
    assert(Boolean(repEntry?.id), "Loan repayment journal posted.");
    assert(repEntry!.totalDebit === 16750, "Loan repayment total debit is ₹16,750.");
    assert(repEntry!.totalCredit === 16750, "Loan repayment total credit is ₹16,750.");

    // -------------------------------------------------------------------------
    // Phase 6: Persistent General Ledger Equilibrium & Reporting
    // -------------------------------------------------------------------------
    console.log("\n--- Phase 6: Persistent General Ledger Equilibrium ---");

    const tb = await PersistentLedgerReportingService.getTrialBalance({ financialYear: "2026-27" }, testPrisma);
    assert(tb.isBalanced === true, "Persistent Trial Balance is perfectly balanced (isBalanced === true).");
    assert(tb.difference === 0, "Trial Balance difference is exactly 0 paise.");
    assert(tb.totalDebit > 0 && tb.totalCredit > 0, "Trial Balance total debits and credits quantified.");

    const pnl = await PersistentLedgerReportingService.getProfitAndLoss({ financialYear: "2026-27" }, testPrisma);
    assert(typeof pnl.netProfitAfterTax === "number", "P&L net profit after tax quantified.");
    assert(pnl.totalRevenue >= 150000, "P&L captures recognized consulting revenue.");

    const bs = await PersistentLedgerReportingService.getBalanceSheet({ financialYear: "2026-27" }, testPrisma);
    assert(bs.isBalanced === true, "Balance Sheet satisfies fundamental accounting equation (Assets === Liabilities + Equity).");
    assert(bs.difference === 0, "Balance Sheet difference is exactly 0 paise.");

    // -------------------------------------------------------------------------
    // Phase 7: Backup, Isolated Restore & Historical Migration Dry-Run
    // -------------------------------------------------------------------------
    console.log("\n--- Phase 7: Backup, Restore & Dry-Run Integrity ---");

    const backup = await BackupRestoreService.createBackup({
      actorId: testActor.id,
      actorName: testActor.name,
      actorEmail: testActor.email,
      notes: "Release-readiness test backup",
      clientOverride: testPrisma,
    });
    assert(backup.status === "COMPLETED", "Universal backup completed successfully.");
    assert(backup.totalCollections === 39, "All 39 Prisma collections captured.");
    assert(backup.checksumSha256.length === 64, "Manifest contains valid SHA-256 cryptographic checksum.");

    const restoreReport = await BackupRestoreService.restoreAndVerify(
      backup.backupId,
      isolatedTestDbUrl,
      {
        confirmDestructiveRestore: true,
        actorId: testActor.id,
        actorName: testActor.name,
      }
    );
    assert(restoreReport.overallStatus === "PASSED", "Isolated test database restore verified successfully.");
    assert(restoreReport.trialBalanceBalanced === true, "Post-restore Trial Balance in double-entry equilibrium.");

    const dryRun = await HistoricalMigrationService.runHistoricalDryRun({}, testPrisma);
    assert(dryRun.isDryRunSuccessful === true, "Historical migration dry-run completed successfully.");
    assert(dryRun.zeroWritesConfirmed === true, "Zero-write guarantee confirmed (0 database mutations during dry-run).");

    const gatesReport = await HistoricalMigrationService.evaluateHistoricalReconciliationGates(testPrisma);
    assert(gatesReport.gates.length === 18, "All 18 historical cutover reconciliation gates evaluated.");
    assert(gatesReport.passedGatesCount >= 13, `Passed gates: ${gatesReport.passedGatesCount}/18.`);
    assert(gatesReport.overallReadiness === "NOT_READY", "Overall readiness safely reports NOT_READY prior to human CA sign-off.");

    console.log("\n================================================================================");
    console.log(`PROMPT 10 RELEASE-READINESS AUDIT COMPLETE: ${passedCount} passed, ${failedCount} failed.`);
    console.log("================================================================================\n");
  } catch (err: any) {
    console.error("\nFATAL ERROR IN PROMPT 10 SUITE:", err);
    process.exit(1);
  } finally {
    await testPrisma.$disconnect();
  }
}

runPrompt10Suite();
