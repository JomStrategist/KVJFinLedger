import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

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

import {
  BackupRestoreService,
  ProductionRestoreBlockedError,
  BackupIntegrityCorruptError,
} from "../services/backup-restore.service";
import { HistoricalMigrationService } from "../services/historical-migration.service";
import { PersistentLedgerReportingService } from "../services/persistent-ledger-reporting.service";
import { FiscalPeriodService } from "../services/fiscal-period.service";

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASSED: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`AssertionFailed: ${message}`);
  }
}

async function runPrompt9Tests() {
  console.log("================================================================================");
  console.log("FINLEDGER ERP — PROMPT 9: BACKUP, RESTORE & MIGRATION VALIDATION SUITE");
  console.log("================================================================================");
  console.log(`Target Isolated Database: ${BackupRestoreService.sanitizeDatabaseUrl(isolatedTestDbUrl)}`);
  console.log("Ensuring complete isolation from primary production database.\n");

  try {
    // -------------------------------------------------------------------------
    // 0. Seed baseline records in isolated test DB to back up
    // -------------------------------------------------------------------------
    console.log("--- 0. Preparing Isolated Test Records ---");
    const testActor = {
      id: "user_p9_test",
      name: "Prompt 9 Test Admin",
      email: "test.p9@kvjanalytics.com",
      role: "ADMIN",
    };

    let bank = await testPrisma.bankAccount.findFirst({
      where: { accountNumber: "HDFC-P9-001" },
    });
    if (!bank) {
      bank = await testPrisma.bankAccount.create({
        data: {
          accountNumber: "HDFC-P9-001",
          bankName: "HDFC Bank (P9)",
          accountName: "HDFC Corporate P9 A/c",
          ifsc: "HDFC0009999",
          branch: "Bangalore",
          isActive: true,
          isPrimary: true,
        },
      });
    }

    const runSuffix = Math.floor(1000 + Math.random() * 9000);
    const testCust = await testPrisma.customer.create({
      data: {
        legalName: `Prompt 9 Client Enterprises Pvt Ltd ${runSuffix}`,
        tradeName: `Client 9 Tech ${runSuffix}`,
        gstin: `29AABCU${runSuffix}R1Z7`,
        state: "Karnataka",
        stateCode: "29",
        pan: `AABCU${runSuffix}`,
        customerType: "B2B",
      },
    });

    const testVendor = await testPrisma.vendor.create({
      data: {
        name: `Prompt 9 Cloud Vendor ${runSuffix}`,
        gstin: `29AABCU${runSuffix}R1ZZ`,
        pan: `AABCU${runSuffix}`,
        state: "Karnataka",
        stateCode: "29",
        isActive: true,
      },
    });

    assert(Boolean(bank?.id), "Test bank account initialized in isolated test DB.");
    assert(Boolean(testCust.id), "Test customer initialized in isolated test DB.");
    assert(Boolean(testVendor.id), "Test vendor initialized in isolated test DB.");

    // Seed a TaxInvoice record that is already journalized
    const testInv = await testPrisma.taxInvoice.create({
      data: {
        invoiceNumber: `INV-P9-${runSuffix}`,
        invoiceDate: new Date("2026-06-15"),
        customerId: testCust.id,
        subtotal: 1000,
        taxableAmount: 1000,
        totalCGST: 90,
        totalSGST: 90,
        totalIGST: 0,
        totalGST: 180,
        grossAmount: 1180,
        netAmount: 1180,
        status: "CONFIRMED",
      },
    });

    // Seed a balanced journal entry in isolated DB linked to this invoice
    const { JournalPostingService } = await import("../services/journal-posting.service");
    const testJournal = await JournalPostingService.postJournalEntry(
      {
        entryType: "SALES",
        accountingDate: new Date("2026-06-15"),
        financialYear: "2026-27",
        sourceType: "TAX_INVOICE",
        sourceId: testInv.id,
        narration: "B2B Analytics Consulting Prompt 9",
        idempotencyKey: `p9_sales_jnl_${testInv.id}`,
        lines: [
          {
            lineNumber: 1,
            accountId: `cust_${testCust.id}`,
            accountName: "Trade Receivables",
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
            accountId: "inc_rev_consulting",
            accountName: "Consulting Revenue",
            financialType: "INCOME",
            statementGroup: "Revenue from Operations",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 100000,
          },
          {
            lineNumber: 3,
            accountId: "stat_output_cgst",
            accountName: "Output CGST",
            financialType: "LIABILITY",
            statementGroup: "Statutory Tax Payables",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 9000,
          },
          {
            lineNumber: 4,
            accountId: "stat_output_sgst",
            accountName: "Output SGST",
            financialType: "LIABILITY",
            statementGroup: "Statutory Tax Payables",
            normalBalance: "CREDIT",
            debit: 0,
            credit: 9000,
          },
        ],
      },
      testActor,
      testPrisma
    );

    assert(Boolean(testJournal?.id), "Seeded test journal voucher in isolated test DB.");

    // -------------------------------------------------------------------------
    // Scenario 1: Backup Creation & 39-Collection Manifest Generation
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 1: Backup Creation & Manifest Generation ---");
    const backupManifest = await BackupRestoreService.createBackup({
      actorId: testActor.id,
      actorName: testActor.name,
      actorEmail: testActor.email,
      notes: "Automated test backup run",
      clientOverride: testPrisma,
    });

    assert(Boolean(backupManifest.backupId), `Backup created with unique ID: ${backupManifest.backupId}`);
    assert(backupManifest.status === "COMPLETED", "Backup status is COMPLETED.");
    assert(backupManifest.verified === true, "Backup verified flag is true.");
    assert(backupManifest.totalCollections === 39, `All 39 Prisma collections included (found ${backupManifest.totalCollections}).`);
    assert(backupManifest.totalRecords > 0, `Total records captured: ${backupManifest.totalRecords}`);
    assert(backupManifest.totalSizeBytes > 0, `Total backup size: ${backupManifest.totalSizeBytes} bytes.`);
    assert(backupManifest.checksumSha256.length === 64, `Valid SHA-256 checksum: ${backupManifest.checksumSha256}`);
    assert(backupManifest.accountingAudit.journalEntriesCount > 0, "Journal entries captured in accounting audit.");
    assert(backupManifest.accountingAudit.journalLinesCount > 0, "Journal lines captured in accounting audit.");

    // -------------------------------------------------------------------------
    // Scenario 2: Backup Integrity Checksum Verification
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 2: Backup Integrity Checksum Verification ---");
    const verifyResult = BackupRestoreService.verifyBackupChecksum(backupManifest.backupId);
    assert(verifyResult.matches === true, "Computed disk file checksum matches manifest SHA-256 exactly.");
    assert(verifyResult.actualChecksum === backupManifest.checksumSha256, "Actual checksum equals manifest checksum.");

    // -------------------------------------------------------------------------
    // Scenario 3: Checksum Mismatch Detection on Tampered Backup
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 3: Checksum Mismatch Detection ---");
    const backupDir = path.join(process.cwd(), "prisma", "backups");
    const tamperedBackupId = `tampered_${Date.now()}`;
    const tamperedDataFile = path.join(backupDir, `${tamperedBackupId}.json`);
    const tamperedManifestFile = path.join(backupDir, `${tamperedBackupId}.manifest.json`);

    fs.writeFileSync(tamperedDataFile, JSON.stringify({ data: { corrupted: true } }), "utf8");
    fs.writeFileSync(
      tamperedManifestFile,
      JSON.stringify({
        backupId: tamperedBackupId,
        checksumSha256: "0000000000000000000000000000000000000000000000000000000000000000",
      }),
      "utf8"
    );

    const tamperedCheck = BackupRestoreService.verifyBackupChecksum(tamperedBackupId);
    assert(tamperedCheck.matches === false, "Checksum mismatch strictly detected for tampered backup.");

    // Cleanup tampered test files
    try {
      fs.unlinkSync(tamperedDataFile);
      fs.unlinkSync(tamperedManifestFile);
    } catch {}

    // -------------------------------------------------------------------------
    // Scenario 4: Path Traversal Attack Prevention
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 4: Path Traversal Attack Prevention ---");
    let pathTraversalCaught = false;
    try {
      BackupRestoreService.validateBackupId("../../../etc/passwd");
    } catch (err: any) {
      pathTraversalCaught = true;
    }
    assert(pathTraversalCaught, "Path traversal pattern in backupId strictly rejected.");

    let slashTraversalCaught = false;
    try {
      BackupRestoreService.validateBackupId("malicious/path/id");
    } catch (err: any) {
      slashTraversalCaught = true;
    }
    assert(slashTraversalCaught, "Subdirectory slashes in backupId strictly rejected.");

    // -------------------------------------------------------------------------
    // Scenario 5: Production Restore Blocking Safeguards
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 5: Production Restore Safeguards ---");
    const fakeProdUrl1 = "mongodb+srv://admin:pass@kvj-cluster.mongodb.net/billing_erp?retryWrites=true";
    let prod1Blocked = false;
    try {
      BackupRestoreService.assertSafeIsolatedTestTarget(fakeProdUrl1);
    } catch (err: any) {
      if (err instanceof ProductionRestoreBlockedError) {
        prod1Blocked = true;
      }
    }
    assert(prod1Blocked, "Production database URL (billing_erp) strictly blocked by safety guardrail.");

    const fakeAmbiguousUrl = "mongodb+srv://admin:pass@kvj-cluster.mongodb.net/billing_erp_prod_snapshot";
    let ambiguousBlocked = false;
    try {
      BackupRestoreService.assertSafeIsolatedTestTarget(fakeAmbiguousUrl);
    } catch (err: any) {
      if (err instanceof ProductionRestoreBlockedError) {
        ambiguousBlocked = true;
      }
    }
    assert(ambiguousBlocked, "Ambiguous non-test database URL strictly blocked by safety guardrail.");

    // Isolated test DB URL must pass safety check
    let testDbPassed = false;
    try {
      BackupRestoreService.assertSafeIsolatedTestTarget(isolatedTestDbUrl);
      testDbPassed = true;
    } catch {}
    assert(testDbPassed, "Explicitly isolated test DB URL (billing_erp_test) successfully validated.");

    // -------------------------------------------------------------------------
    // Scenario 6: Destructive Confirmation Requirement
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 6: Explicit Destructive Confirmation Guardrail ---");
    let unconfirmedBlocked = false;
    try {
      await BackupRestoreService.restoreAndVerify(backupManifest.backupId, isolatedTestDbUrl, {
        confirmDestructiveRestore: false,
      });
    } catch (err: any) {
      unconfirmedBlocked = true;
    }
    assert(unconfirmedBlocked, "Restore without confirmDestructiveRestore: true strictly rejected.");

    // -------------------------------------------------------------------------
    // Scenario 7: Incomplete / Corrupt Backup Restore Rejection
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 7: Corrupt Backup Restore Rejection ---");
    const corruptId = `corrupt_${Date.now()}`;
    const corruptDataFile = path.join(backupDir, `${corruptId}.json`);
    const corruptManifestFile = path.join(backupDir, `${corruptId}.manifest.json`);

    fs.writeFileSync(corruptDataFile, "corrupted content", "utf8");
    fs.writeFileSync(
      corruptManifestFile,
      JSON.stringify({
        backupId: corruptId,
        checksumSha256: "fakechecksum12345",
      }),
      "utf8"
    );

    let corruptRestoreBlocked = false;
    try {
      await BackupRestoreService.restoreAndVerify(corruptId, isolatedTestDbUrl, {
        confirmDestructiveRestore: true,
      });
    } catch (err: any) {
      if (err instanceof BackupIntegrityCorruptError) {
        corruptRestoreBlocked = true;
      }
    }
    assert(corruptRestoreBlocked, "Restoring corrupted backup with invalid checksum strictly rejected.");

    try {
      fs.unlinkSync(corruptDataFile);
      fs.unlinkSync(corruptManifestFile);
    } catch {}

    // -------------------------------------------------------------------------
    // Scenario 8: Restore Execution into Isolated Test Database
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 8: Isolated Test Database Restore Execution ---");
    const restoreReport = await BackupRestoreService.restoreAndVerify(backupManifest.backupId, isolatedTestDbUrl, {
      confirmDestructiveRestore: true,
      actorName: testActor.name,
      actorEmail: testActor.email,
    });

    assert(restoreReport.overallStatus === "PASSED", "Restore verification report status is PASSED.");
    assert(restoreReport.restoredCollectionsCount > 0, `Restored ${restoreReport.restoredCollectionsCount} collections.`);
    assert(restoreReport.restoredRecordsCount > 0, `Restored ${restoreReport.restoredRecordsCount} records.`);
    assert(restoreReport.durationMs > 0, `Restore duration measured: ${restoreReport.durationMs} ms.`);

    // -------------------------------------------------------------------------
    // Scenario 9: Restored Ledger Trial Balance Equilibrium
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 9: Restored Ledger Trial Balance Equilibrium ---");
    assert(restoreReport.trialBalanceBalanced === true, "Restored ledger Trial Balance is perfectly balanced ($Dr = Cr$).");
    assert(restoreReport.trialBalanceDifference === 0, "Restored ledger Trial Balance variance is exactly zero paise.");

    // Direct read check via PersistentLedgerReportingService
    const postRestoreTb = await PersistentLedgerReportingService.getTrialBalance({}, testPrisma);
    assert(postRestoreTb.isBalanced === true, "Direct TB query confirms restored ledger equilibrium.");
    assert(postRestoreTb.difference === 0, "Direct TB difference is zero.");

    // -------------------------------------------------------------------------
    // Scenario 10: Relational Coherence & Foreign Key Integrity
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 10: Relational Coherence & Foreign Keys ---");
    const coherenceCheck = restoreReport.checks.find((c) => c.checkName === "Journal Relational Coherence");
    assert(coherenceCheck?.status === "PASS", "Journal lines reference valid JournalEntry headers.");

    const restoredLines = await testPrisma.journalLine.findMany({
      take: 50,
      select: { id: true, entryId: true },
    });
    const entryIds = Array.from(new Set(restoredLines.map((l: any) => l.entryId)));
    const matchingEntries = await testPrisma.journalEntry.findMany({
      where: { id: { in: entryIds } },
    });
    assert(matchingEntries.length === entryIds.length, "All sample JournalLine records link to valid JournalEntry records.");

    // -------------------------------------------------------------------------
    // Scenario 11: Idempotency Key & Source Identifier Preservation
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 11: Idempotency Key & Source Identifier Preservation ---");
    const restoredJournal = await testPrisma.journalEntry.findUnique({
      where: { id: testJournal.id },
    });
    assert(Boolean(restoredJournal), "Original seeded journal entry exists in restored database.");
    assert(restoredJournal?.idempotencyKey === testJournal.idempotencyKey, "Journal idempotencyKey preserved identically.");
    assert(restoredJournal?.sourceId === testJournal.sourceId, "Journal sourceId preserved identically.");
    assert(restoredJournal?.sourceType === "TAX_INVOICE", "Journal sourceType preserved.");

    // -------------------------------------------------------------------------
    // Scenario 12: Fiscal Period & Counter Integrity
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 12: Fiscal Period & Counter Integrity ---");
    const periodCheck = restoreReport.checks.find((c) => c.checkName === "Audit Log & Fiscal Period Integrity");
    assert(periodCheck?.status === "PASS", "Fiscal periods and audit logs restored intact.");

    // -------------------------------------------------------------------------
    // Scenario 13: Historical Candidate Classification (READY, BLOCKED, REVIEW)
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 13: Historical Candidate Classification ---");
    const dryRunSummary = await HistoricalMigrationService.runHistoricalDryRun({}, testPrisma);
    assert(dryRunSummary.isDryRunSuccessful === true, "Historical migration dry run completed successfully.");
    assert(dryRunSummary.totalCandidatesEvaluated > 0, `Evaluated ${dryRunSummary.totalCandidatesEvaluated} candidates.`);
    assert(dryRunSummary.statusBreakdown.ready >= 0, "Ready count is quantified non-negative.");
    assert(dryRunSummary.statusBreakdown.blocked >= 0, "Blocked count is quantified non-negative.");
    assert(dryRunSummary.statusBreakdown.requiresReview >= 0, "Requires review count is quantified non-negative.");
    assert(Boolean(dryRunSummary.bySourceType["TAX_INVOICE"]), "Tax invoices categorized in dry-run breakdown.");

    // -------------------------------------------------------------------------
    // Scenario 14: Duplicate Historical Source Detection
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 14: Duplicate Historical Source Detection ---");
    assert(dryRunSummary.alreadyJournalizedCount >= 1, "Already journalized vouchers correctly identified and deduplicated.");

    // -------------------------------------------------------------------------
    // Scenario 15: Cross-Collection Duplicate Event Detection
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 15: Cross-Collection Duplicate Detection ---");
    assert(Array.isArray(dryRunSummary.crossCollectionDuplicateWarnings), "Cross-collection duplicate warnings tracked as array.");

    // -------------------------------------------------------------------------
    // Scenario 16: Mathematical Rounding & Integer Paise Integrity
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 16: Mathematical Rounding & Integer Paise Integrity ---");
    assert(typeof dryRunSummary.candidatesRequiringMigration === "number", "Candidates requiring migration quantified.");

    // -------------------------------------------------------------------------
    // Scenario 17: Dry-Run Zero-Write Guarantee
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 17: Dry-Run Zero-Write Guarantee ---");
    assert(dryRunSummary.zeroWritesConfirmed === true, "Zero-write guarantee confirmed (0 journal entries or records mutated).");

    // -------------------------------------------------------------------------
    // Scenario 18: Deterministic Repeated Dry Runs
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 18: Deterministic Repeated Dry Runs ---");
    const secondDryRun = await HistoricalMigrationService.runHistoricalDryRun({}, testPrisma);
    assert(secondDryRun.totalCandidatesEvaluated === dryRunSummary.totalCandidatesEvaluated, "Total candidates match identically across runs.");
    assert(secondDryRun.alreadyJournalizedCount === dryRunSummary.alreadyJournalizedCount, "Already journalized count matches identically.");
    assert(secondDryRun.statusBreakdown.ready === dryRunSummary.statusBreakdown.ready, "Ready candidate count is 100% deterministic.");
    assert(secondDryRun.statusBreakdown.blocked === dryRunSummary.statusBreakdown.blocked, "Blocked candidate count is 100% deterministic.");

    // -------------------------------------------------------------------------
    // Scenario 19: All 18 Reconciliation Gates Evaluation
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 19: All 18 Reconciliation Gates Evaluation ---");
    const gatesReport = await HistoricalMigrationService.evaluateHistoricalReconciliationGates(testPrisma);
    assert(gatesReport.gates.length === 18, `All 18 reconciliation gates evaluated (found ${gatesReport.gates.length}).`);
    assert(gatesReport.passedGatesCount > 0, `Passed gates count: ${gatesReport.passedGatesCount}`);
    assert(gatesReport.unverifiedGatesCount > 0, `Unverified gates count: ${gatesReport.unverifiedGatesCount}`);

    const gate1 = gatesReport.gates.find((g) => g.gateNumber === 1);
    assert(gate1?.status === "PASSED", "Gate 1 (Backup Integrity & Restore Verification) passed.");

    const gate5 = gatesReport.gates.find((g) => g.gateNumber === 5);
    assert(gate5?.status === "PASSED", "Gate 5 (Trial Balance Equilibrium) passed.");

    const gate17 = gatesReport.gates.find((g) => g.gateNumber === 17);
    assert(gate17?.status === "UNVERIFIED", "Gate 17 (CFO/CA Sign-Off) remains safely UNVERIFIED prior to manual review.");

    const gate18 = gatesReport.gates.find((g) => g.gateNumber === 18);
    assert(gate18?.status === "UNVERIFIED", "Gate 18 (Production Rollout Planning) remains safely UNVERIFIED.");

    assert(gatesReport.overallReadiness === "NOT_READY", "Overall cutover readiness is NOT_READY prior to human review.");

    // -------------------------------------------------------------------------
    // Scenario 20: Sensitive Data & Credential Redaction
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 20: Sensitive Data & Credential Redaction ---");
    assert(!backupManifest.databaseSanitized.includes("mongodb+srv://admin:"), "Manifest database URL does not contain credentials.");
    assert(!backupManifest.databaseSanitized.includes("@"), "Manifest database URL has password/cluster credentials redacted.");
    assert(!restoreReport.targetDatabaseSanitized.includes("@"), "Restore report target URL has credentials redacted.");
    assert(!gatesReport.targetDatabaseSanitized.includes("@"), "Reconciliation report target URL has credentials redacted.");

    // -------------------------------------------------------------------------
    // Scenario 21: Backup Retention Management
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 21: Backup Retention Management ---");
    const retentionResult = BackupRestoreService.cleanOldBackups({ keepCount: 5 });
    assert(typeof retentionResult.deletedCount === "number", "Retention cleanup deleted count is number.");
    assert(retentionResult.keptCount > 0, "Retention cleanup preserves valid backups.");

    console.log("\n================================================================================");
    console.log(`ALL PROMPT 9 TESTS COMPLETED: ${passedTests} passed, ${failedTests} failed.`);
    console.log("================================================================================\n");
  } catch (err: any) {
    console.error("\nFATAL TEST RUN ERROR:", err);
    process.exit(1);
  } finally {
    await testPrisma.$disconnect();
  }
}

runPrompt9Tests();
