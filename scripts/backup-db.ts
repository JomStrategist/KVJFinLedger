import { prisma } from "../lib/prisma";
import * as fs from "fs";
import * as path from "path";

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "prisma", "backup");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const snapshotFile = path.join(backupDir, `db_snapshot_pre_cleanup_${timestamp}.json`);

  console.log("Exporting database snapshot to:", snapshotFile);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    users: await prisma.user.findMany(),
    roleDefinitions: await prisma.roleDefinition.findMany(),
    employees: await prisma.employee.findMany(),
    companySettings: await prisma.companySettings.findMany(),
    customers: await prisma.customer.findMany(),
    products: await prisma.product.findMany(),
    bankAccounts: await prisma.bankAccount.findMany(),
    proformaInvoices: await prisma.proformaInvoice.findMany({ include: { items: true } }),
    taxInvoices: await prisma.taxInvoice.findMany({ include: { items: true, payments: true } }),
    financialTypes: await prisma.financialType.findMany(),
    financialStatementGroups: await prisma.financialStatementGroup.findMany(),
    accountNatures: await prisma.accountNature.findMany(),
    expenseCategories: await prisma.expenseCategory.findMany(),
    vendors: await prisma.vendor.findMany(),
    expenses: await prisma.expense.findMany({ include: { items: true, depreciations: true, disposal: true } }),
    financialTransactions: await prisma.financialTransaction.findMany(),
    bankTransfers: await prisma.bankTransfer.findMany(),
    openingBalances: await prisma.openingBalance.findMany(),
    gstFilings: await prisma.gstFiling.findMany(),
    tdsDeposits: await prisma.tdsDeposit.findMany(),
    assetDepreciations: await prisma.assetDepreciation.findMany(),
    assetDisposals: await prisma.assetDisposal.findMany(),
    loans: await prisma.loan.findMany({ include: { repayments: true } }),
    bankStatementImports: await prisma.bankStatementImport.findMany({ include: { lines: true } }),
    gstSettlements: await prisma.gstSettlement.findMany(),
  };

  fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2), "utf-8");

  const counts: Record<string, number> = {};
  for (const [key, value] of Object.entries(snapshot)) {
    if (Array.isArray(value)) {
      counts[key] = value.length;
    }
  }

  console.log("Database backup completed successfully.");
  console.log("Collection counts in backup:", JSON.stringify(counts, null, 2));
}

backupDatabase()
  .catch((err) => {
    console.error("Backup failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
