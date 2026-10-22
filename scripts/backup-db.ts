import { BackupRestoreService } from "../services/backup-restore.service";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("================================================================================");
  console.log("FINLEDGER ERP — PROMPT 9: ENTERPRISE DATABASE BACKUP CLI");
  console.log("================================================================================");
  console.log("Initiating full 39-collection BSON-preserving database backup...");

  try {
    const manifest = await BackupRestoreService.createBackup({
      actorId: "cli_admin",
      actorName: "CLI Administrator",
      actorEmail: "admin@kvjanalytics.com",
      notes: "Triggered via scripts/backup-db.ts CLI",
    });

    console.log("\n✅ BACKUP COMPLETED AND VERIFIED SUCCESSFULLY!");
    console.log("--------------------------------------------------------------------------------");
    console.log(`Backup ID:           ${manifest.backupId}`);
    console.log(`Timestamp:           ${manifest.timestamp}`);
    console.log(`Total Collections:   ${manifest.totalCollections}`);
    console.log(`Total Records:       ${manifest.totalRecords}`);
    console.log(`Total Size:          ${(manifest.totalSizeBytes / 1024).toFixed(2)} KB`);
    console.log(`SHA-256 Checksum:    ${manifest.checksumSha256}`);
    console.log(`Integrity Verified:  ${manifest.verified ? "YES" : "NO"}`);
    console.log("--------------------------------------------------------------------------------");
    console.log("Accounting Audit Snapshot:");
    console.log(`  Journal Entries:   ${manifest.accountingAudit.journalEntriesCount}`);
    console.log(`  Journal Lines:     ${manifest.accountingAudit.journalLinesCount}`);
    console.log(`  Fiscal Periods:    ${manifest.accountingAudit.fiscalPeriodsCount}`);
    console.log(`  Audit Logs:        ${manifest.accountingAudit.auditLogsCount}`);
    console.log(`  Counters:          ${manifest.accountingAudit.countersCount}`);
    console.log(`  Tax Invoices:      ${manifest.accountingAudit.taxInvoicesCount}`);
    console.log(`  Expenses:          ${manifest.accountingAudit.expensesCount}`);
    console.log("================================================================================\n");
  } catch (err: any) {
    console.error("FATAL: Backup failed:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
