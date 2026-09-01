import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { OpeningClosingClient } from "./OpeningClosingClient";

export const dynamic = "force-dynamic";

export default async function OpeningClosingPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  await requireAuth();
  const params = await searchParams;
  const currentFY = params.fy || "2026-2027";

  // Derive current closing position from active invoices and expenses
  const [taxInvoices, expenses, transactions] = await Promise.all([
    prisma.taxInvoice.findMany({ where: { status: { not: "CANCELLED" } } }),
    prisma.expense.findMany({ where: { status: { not: "CANCELLED" } } }),
    prisma.financialTransaction.findMany(),
  ]);

  // Calculate live financial positions
  const totalReceivables = taxInvoices
    .filter((inv) => inv.status !== "PAID")
    .reduce((sum, inv) => sum + Number(inv.netAmount), 0);

  const totalPayables = expenses
    .filter((exp) => exp.paymentStatus !== "PAID")
    .reduce((sum, exp) => sum + Number(exp.netAmount), 0);

  const outputGST = taxInvoices.reduce((sum, inv) => sum + Number(inv.totalGST), 0);
  const inputGST = expenses.reduce((sum, exp) => sum + Number(exp.totalInputGST), 0);
  const netGSTPayable = Math.max(0, outputGST - inputGST);
  const netGSTReceivable = Math.max(0, inputGST - outputGST);

  const tdsReceivable = taxInvoices.reduce((sum, inv) => sum + Number(inv.tdsAmount || 0), 0);
  const tdsPayable = expenses.reduce((sum, exp) => sum + Number(exp.tdsAmount || 0), 0);

  const totalRevenue = transactions
    .filter((t) => t.type === "REVENUE")
    .reduce((sum, t) => sum + Number(t.netAmount), 0);

  const totalExpensePaid = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.netAmount), 0);

  const bankBalance = Math.max(0, 1500000 + totalRevenue - totalExpensePaid); // baseline + movement

  const liveClosingData = {
    bankBalance,
    accountsReceivable: totalReceivables,
    accountsPayable: totalPayables,
    gstReceivable: netGSTReceivable,
    gstPayable: netGSTPayable,
    tdsReceivable,
    tdsPayable,
    fixedAssets: 850000,
    capitalEquity: 2500000,
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <OpeningClosingClient selectedFY={currentFY} initialClosing={liveClosingData} />
    </div>
  );
}
