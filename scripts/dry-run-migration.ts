import { HistoricalMigrationService } from "../services/historical-migration.service";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("================================================================================");
  console.log("FINLEDGER ERP — PROMPT 9: HISTORICAL MIGRATION DRY-RUN VALIDATOR");
  console.log("================================================================================");
  console.log("Executing read-only candidate evaluation across all 12 accounting domains...\n");

  try {
    const summary = await HistoricalMigrationService.runHistoricalDryRun();

    console.log("================================================================================");
    console.log("HISTORICAL MIGRATION DRY-RUN SUMMARY (ZERO WRITES TO DATABASE)");
    console.log("================================================================================");
    console.log(`Executed At:                       ${summary.executedAt}`);
    console.log(`Total Source Candidates:           ${summary.totalCandidatesEvaluated}`);
    console.log(`Already Journalized in GL:         ${summary.alreadyJournalizedCount}`);
    console.log(`Candidates Requiring Migration:    ${summary.candidatesRequiringMigration}`);
    console.log("--------------------------------------------------------------------------------");
    console.log("Classification Breakdown (Requiring Migration):");
    console.log(`  ✅ READY for GL Posting:         ${summary.statusBreakdown.ready}`);
    console.log(`  ❌ BLOCKED (Requires fix):       ${summary.statusBreakdown.blocked}`);
    console.log(`  ⚠️  REQUIRES CA REVIEW:          ${summary.statusBreakdown.requiresReview}`);
    console.log("--------------------------------------------------------------------------------");
    console.log("By Transaction Domain:");
    for (const [type, data] of Object.entries(summary.bySourceType)) {
      console.log(
        `  - ${type.padEnd(20)} Total: ${String(data.total).padStart(4)} | Already: ${String(data.alreadyJournalized).padStart(4)} | Ready: ${String(data.ready).padStart(4)} | Blocked: ${String(data.blocked).padStart(3)} | Review: ${String(data.requiresReview).padStart(3)} | ₹${data.totalAmount.toLocaleString()}`
      );
    }
    console.log("--------------------------------------------------------------------------------");
    console.log("By Financial Year:");
    for (const [fy, data] of Object.entries(summary.byFinancialYear)) {
      console.log(
        `  - ${fy.padEnd(15)} Total: ${String(data.total).padStart(4)} | Ready: ${String(data.ready).padStart(4)} | Blocked: ${String(data.blocked).padStart(3)} | Review: ${String(data.requiresReview).padStart(3)}`
      );
    }

    if (summary.crossCollectionDuplicateWarnings.length > 0) {
      console.log("\n⚠️  Cross-Collection Duplicate Warnings:");
      for (const w of summary.crossCollectionDuplicateWarnings) {
        console.log(`  - ${w}`);
      }
    }

    if (summary.discrepancies.length > 0) {
      console.log("\n⚠️  Discrepancy Inventory (First 10 items):");
      for (const d of summary.discrepancies.slice(0, 10)) {
        console.log(`  [${d.status}] ${d.sourceType} #${d.reference || d.sourceId} (${d.financialYear}, ₹${d.amount}): ${d.reason}`);
        console.log(`     Action: ${d.recommendedAction}`);
      }
      if (summary.discrepancies.length > 10) {
        console.log(`  ... and ${summary.discrepancies.length - 10} more discrepancies.`);
      }
    }

    console.log("\n--------------------------------------------------------------------------------");
    console.log(`Zero Writes Guarantee Confirmed:   ${summary.zeroWritesConfirmed ? "✅ PASS (0 mutations)" : "❌ FAIL"}`);
    console.log("================================================================================\n");
  } catch (err: any) {
    console.error("FATAL: Historical migration dry-run failed:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
