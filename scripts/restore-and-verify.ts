import { BackupRestoreService } from "../services/backup-restore.service";

async function main() {
  console.log("================================================================================");
  console.log("FINLEDGER ERP — PROMPT 9: DATABASE RESTORE & VERIFICATION CLI");
  console.log("================================================================================");

  const args = process.argv.slice(2);
  const backupIdArgIndex = args.indexOf("--backup-id");
  const targetUrlArgIndex = args.indexOf("--target-url");
  const hasConfirm = args.includes("--confirm-destructive-restore");

  const originalDbUrl = process.env.DATABASE_URL;
  if (!originalDbUrl) {
    console.error("FATAL: DATABASE_URL environment variable is not defined.");
    process.exit(1);
  }

  // Derive isolated test DB URL as default target
  const defaultIsolatedTestDbUrl = originalDbUrl.includes("/billing_erp?")
    ? originalDbUrl.replace("/billing_erp?", "/billing_erp_test?")
    : originalDbUrl.includes("/billing_erp")
    ? originalDbUrl.replace("/billing_erp", "/billing_erp_test")
    : `${originalDbUrl}_test`;

  const targetDbUrl = targetUrlArgIndex !== -1 ? args[targetUrlArgIndex + 1] : defaultIsolatedTestDbUrl;

  console.log(`Target Restore Database: ${BackupRestoreService.sanitizeDatabaseUrl(targetDbUrl)}`);

  // Check safety gate
  try {
    BackupRestoreService.assertSafeIsolatedTestTarget(targetDbUrl);
  } catch (err: any) {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  }

  if (!hasConfirm) {
    console.error("\n❌ SAFETY ERROR: Destructive restore requires explicit '--confirm-destructive-restore' flag.");
    console.error("Usage: npx tsx scripts/restore-and-verify.ts [--backup-id <id>] --confirm-destructive-restore");
    process.exit(1);
  }

  // Locate backup
  let backupId = backupIdArgIndex !== -1 ? args[backupIdArgIndex + 1] : undefined;
  if (!backupId) {
    const backups = BackupRestoreService.listBackups();
    if (backups.length === 0) {
      console.error("\n❌ No backups found in prisma/backups. Create a backup first via 'npm run backup:db'.");
      process.exit(1);
    }
    backupId = backups[0].backupId;
    console.log(`Using latest available verified backup: ${backupId}`);
  }

  try {
    const report = await BackupRestoreService.restoreAndVerify(backupId, targetDbUrl, {
      confirmDestructiveRestore: true,
      actorName: "CLI Administrator",
      actorEmail: "admin@kvjanalytics.com",
    });

    console.log("\n================================================================================");
    console.log(`RESTORE VERIFICATION REPORT: ${report.overallStatus}`);
    console.log("================================================================================");
    console.log(`Backup ID:             ${report.backupId}`);
    console.log(`Restored At:           ${report.restoredAt}`);
    console.log(`Target Database:       ${report.targetDatabaseSanitized}`);
    console.log(`Duration:              ${report.durationMs} ms`);
    console.log(`Restored Collections:  ${report.restoredCollectionsCount}`);
    console.log(`Restored Records:      ${report.restoredRecordsCount}`);
    console.log("--------------------------------------------------------------------------------");
    console.log("Detailed Verification Checks:");
    for (const c of report.checks) {
      const icon = c.status === "PASS" ? "✅" : c.status === "FAIL" ? "❌" : "⚠️";
      console.log(`  ${icon} [${c.status}] ${c.checkName}: ${c.details}`);
    }
    console.log("================================================================================\n");

    if (report.overallStatus !== "PASSED") {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("\n❌ FATAL RESTORE ERROR:", err.message);
    process.exit(1);
  }
}

main();
