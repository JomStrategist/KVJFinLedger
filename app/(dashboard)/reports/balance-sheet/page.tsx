import { prisma } from "@/lib/prisma";
import { requireAdmin } from '@/lib/auth-utils';
import Link from 'next/link';


export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  
  const asOfFilter = typeof params.asOf === "string" ? params.asOf : "";
  const asOfDate = asOfFilter ? new Date(asOfFilter) : new Date();
  asOfDate.setHours(23, 59, 59, 999);

  // 1. Inward Cash & Accounts Receivable (Invoices & Payments)
  const [invoicePayments, taxInvoices, approvedExpenses] = await Promise.all([
    prisma.invoicePayment.findMany({
      where: { paymentDate: { lte: asOfDate } }
    }),
    prisma.taxInvoice.findMany({
      where: {
        status: { not: 'CANCELLED' },
        invoiceDate: { lte: asOfDate }
      },
      include: { payments: true }
    }),
    prisma.expense.findMany({
      where: {
        status: { not: 'CANCELLED' },
        expenseDate: { lte: asOfDate }
      }
    })
  ]);

  const cashIn = invoicePayments.reduce((sum, p) => sum + Number(p.paymentAmount || 0), 0);
  
  const expenseCashOut = approvedExpenses.reduce((sum, exp) => {
    if (exp.paymentStatus === "PAID") return sum + Number(exp.netAmount || 0);
    if (exp.paymentStatus === "PARTIALLY_PAID") return sum + Number(exp.paidAmount || 0);
    return sum;
  }, 0);

  const cashEquivalents = cashIn - expenseCashOut;

  // AR: Unpaid or partially paid portion of invoices
  const accountsReceivable = taxInvoices.reduce((sum, inv) => {
    if (inv.status === "PAID") return sum;
    const paidSum = inv.payments
      .filter(p => new Date(p.paymentDate) <= asOfDate)
      .reduce((s, p) => s + Number(p.paymentAmount || 0), 0);
    return sum + Math.max(0, Number(inv.netAmount || 0) - paidSum);
  }, 0);

  // AP: Unpaid or partially paid portion of expenses
  const accountsPayable = approvedExpenses.reduce((sum, exp) => {
    if (exp.paymentStatus === "PAID") return sum;
    if (exp.paymentStatus === "PARTIALLY_PAID") {
      return sum + Math.max(0, Number(exp.netAmount || 0) - Number(exp.paidAmount || 0));
    }
    return sum + Number(exp.netAmount || 0);
  }, 0);

  const totalAssets = cashEquivalents + accountsReceivable;
  const totalLiabilities = accountsPayable;
  
  // Equity = Assets - Liabilities (matches Retained Earnings)
  const retainedEarnings = totalAssets - totalLiabilities;
  const totalEquity = retainedEarnings;
  
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Balance Sheet</h1>
          <p className="text-theme-text-muted text-sm mt-1">Snapshot of the business financial position.</p>
        </div>
        <Link 
          href="/reports" 
          className="px-4 py-2 bg-theme-surface text-theme-text border border-theme-border rounded-lg text-sm font-medium hover:bg-theme-surface-hover transition-colors"
        >
          Back to Reports
        </Link>
      </div>

      <div className="bg-theme-surface p-4 rounded-xl shadow-sm border border-theme-border flex items-end gap-4">
        <form className="flex-1 max-w-xs">
          <label className="block text-xs font-medium text-theme-text mb-1">As Of Date</label>
          <div className="flex gap-2">
            <input type="date" name="asOf" defaultValue={asOfFilter} className="w-full border-theme-border rounded-md text-sm" />
            <button type="submit" className="bg-theme-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-theme-primary-dark">
              Apply
            </button>
          </div>
        </form>
      </div>

      <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border overflow-hidden">
        <div className="p-6 border-b border-theme-border bg-theme-surface-hover flex justify-between">
          <h2 className="text-lg font-bold text-theme-text">As of {asOfDate.toLocaleDateString()}</h2>
          <span className="text-sm font-medium text-theme-text-muted">Amounts in INR (₹)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-theme-border">
          
          {/* Assets */}
          <div className="p-6">
            <h3 className="text-lg font-bold text-theme-text mb-4 border-b pb-2">Assets</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-theme-text mb-2">Current Assets</h4>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-theme-text-muted">Cash & Bank Equivalents</span>
                  <span className="font-medium">₹{cashEquivalents.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-theme-text-muted">Accounts Receivable (AR)</span>
                  <span className="font-medium">₹{accountsReceivable.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-gray-900 flex justify-between items-center">
              <span className="font-bold text-theme-text">Total Assets</span>
              <span className="font-bold text-theme-text">₹{totalAssets.toFixed(2)}</span>
            </div>
          </div>

          {/* Liabilities & Equity */}
          <div className="p-6">
            <h3 className="text-lg font-bold text-theme-text mb-4 border-b pb-2">Liabilities & Equity</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-theme-text mb-2">Liabilities</h4>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-theme-text-muted">Accounts Payable (AP)</span>
                  <span className="font-medium">₹{accountsPayable.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-theme-text mb-2">Equity</h4>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-theme-text-muted">Retained Earnings</span>
                  <span className="font-medium">₹{retainedEarnings.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-gray-900 flex justify-between items-center">
              <span className="font-bold text-theme-text">Total Liabilities & Equity</span>
              <span className="font-bold text-theme-text">₹{totalLiabilitiesAndEquity.toFixed(2)}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
