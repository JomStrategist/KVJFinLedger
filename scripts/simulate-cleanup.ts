import { prisma } from "../lib/prisma";
import { AccountingEngine } from "../services/accounting-engine.service";

async function simulate() {
  console.log("Simulating post-cleanup state...");

  // Let's test AccountingEngine right now
  const tbBefore = await AccountingEngine.getTrialBalance({ financialYear: "FY 2026–27" });
  console.log("TB Before Cleanup:", {
    totalDebit: tbBefore.totalDebit,
    totalCredit: tbBefore.totalCredit,
    difference: tbBefore.difference,
    isBalanced: tbBefore.isBalanced,
  });

  const pnlBefore = await AccountingEngine.getProfitAndLoss({ financialYear: "FY 2026–27" });
  console.log("P&L Before Cleanup:", {
    totalRevenue: pnlBefore.totalRevenue,
    totalExpenses: pnlBefore.totalExpenses,
    netProfit: pnlBefore.netProfitAfterTax,
  });

  const bsBefore = await AccountingEngine.getBalanceSheet({ financialYear: "FY 2026–27" });
  console.log("Balance Sheet Before Cleanup:", {
    totalAssets: bsBefore.totalAssets,
    totalEquityAndLiabilities: bsBefore.totalEquityAndLiabilities,
    difference: bsBefore.difference,
    isBalanced: bsBefore.isBalanced,
  });

  await prisma.$disconnect();
}

simulate().catch(err => {
  console.error("Simulation error:", err);
  process.exit(1);
});
