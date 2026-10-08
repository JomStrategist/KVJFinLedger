import { requireAuth } from '@/lib/auth-utils';
import { AccountingEngine } from '@/services/accounting-engine.service';
import { formatCurrency } from '@/lib/utils/currency';
import Link from 'next/link';
import { PrintButton } from '@/components/PrintButton';

export const dynamic = "force-dynamic";

export default async function TrialBalancePage({
  searchParams,
}: {
  searchParams?: Promise<{
    fromDate?: string;
    toDate?: string;
    financialYear?: string;
  }>;
}) {
  await requireAuth();
  const params = (await searchParams) || {};

  const filters = {
    financialYear: params.financialYear,
    fromDate: params.fromDate ? new Date(params.fromDate) : undefined,
    toDate: params.toDate ? new Date(params.toDate) : undefined,
  };

  const tb = await AccountingEngine.getTrialBalance(filters);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 print:p-0 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-theme-text">Trial Balance</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                tb.isBalanced
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {tb.isBalanced ? '✓ Double Entry Balanced' : `⚠ Variance: ${formatCurrency(Math.abs(tb.difference))}`}
            </span>
          </div>
          <p className="text-theme-text-muted mt-1 text-sm">
            Authoritative statement of all ledger debit and credit closing balances.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <PrintButton />
          <Link
            href="/reports"
            className="px-4 py-2 bg-theme-surface text-theme-text border border-theme-border rounded-lg text-sm font-medium hover:bg-theme-surface-hover transition-colors"
          >
            All Reports
          </Link>
        </div>
      </div>

      {/* Print-only title */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-3xl font-bold">TRIAL BALANCE</h1>
        <p className="text-sm text-theme-text-muted mt-1">
          {filters.fromDate ? filters.fromDate.toLocaleDateString('en-IN') : 'Inception'} to{' '}
          {filters.toDate ? filters.toDate.toLocaleDateString('en-IN') : 'Present'}
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="bg-theme-surface p-4 rounded-xl border border-theme-border shadow-sm">
          <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Total Debits (Dr)</span>
          <p className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(tb.totalDebit)}</p>
        </div>

        <div className="bg-theme-surface p-4 rounded-xl border border-theme-border shadow-sm">
          <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Total Credits (Cr)</span>
          <p className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(tb.totalCredit)}</p>
        </div>

        <div className="bg-theme-surface p-4 rounded-xl border border-theme-border shadow-sm">
          <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Equilibrium Status</span>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-3 h-3 rounded-full ${tb.isBalanced ? 'bg-emerald-500' : 'bg-rose-500'}`}
            />
            <p className="text-sm font-bold text-theme-text">
              {tb.isBalanced ? 'Balanced (₹0.00 Variance)' : `Out of Balance by ${formatCurrency(Math.abs(tb.difference))}`}
            </p>
          </div>
        </div>

        <div className="bg-theme-surface p-4 rounded-xl border border-theme-border shadow-sm">
          <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Active Ledgers</span>
          <p className="text-xl font-bold text-theme-text mt-1">{tb.items.length} Accounts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-theme-surface p-4 rounded-xl border border-theme-border no-print">
        <form className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-theme-text-muted mb-1">From Date</label>
            <input
              type="date"
              name="fromDate"
              defaultValue={params.fromDate || ''}
              className="border border-theme-border rounded-lg px-3 py-1.5 text-sm bg-theme-surface text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-theme-text-muted mb-1">To Date</label>
            <input
              type="date"
              name="toDate"
              defaultValue={params.toDate || ''}
              className="border border-theme-border rounded-lg px-3 py-1.5 text-sm bg-theme-surface text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary"
            />
          </div>
          <button
            type="submit"
            className="bg-theme-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-theme-primary-dark transition-colors"
          >
            Apply Filter
          </button>
          {(params.fromDate || params.toDate) && (
            <Link
              href="/reports/trial-balance"
              className="px-4 py-2 bg-theme-surface border border-theme-border text-theme-text-muted rounded-lg text-sm hover:text-theme-text"
            >
              Reset
            </Link>
          )}
        </form>
      </div>

      {/* Trial Balance Table */}
      <div className="bg-theme-surface rounded-xl border border-theme-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-theme-border text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs tracking-wider">
              <tr>
                <th className="py-3 px-4 text-left">Account Head</th>
                <th className="py-3 px-4 text-left">Group</th>
                <th className="py-3 px-3 text-center">Classification</th>
                <th className="py-3 px-4 text-right">Debit (Dr ₹)</th>
                <th className="py-3 px-4 text-right">Credit (Cr ₹)</th>
                <th className="py-3 px-4 text-right">Net Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border bg-theme-surface">
              {tb.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-theme-text-muted">
                    No active ledger transactions recorded for this period.
                  </td>
                </tr>
              ) : (
                tb.items.map((item) => (
                  <tr key={item.accountId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-theme-text">
                      <Link
                        href={`/ledgers?accountId=${item.accountId}`}
                        className="text-theme-primary hover:underline"
                        title="Click to view detailed ledger statement"
                      >
                        {item.accountName}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-theme-text-muted">{item.accountGroup}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          item.financialType === 'ASSET'
                            ? 'bg-sky-50 text-sky-700'
                            : item.financialType === 'LIABILITY'
                            ? 'bg-amber-50 text-amber-700'
                            : item.financialType === 'EQUITY'
                            ? 'bg-purple-50 text-purple-700'
                            : item.financialType === 'INCOME'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {item.financialType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800">
                      {item.netDebit > 0 ? formatCurrency(item.netDebit) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800">
                      {item.netCredit > 0 ? formatCurrency(item.netCredit) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {item.balance > 0 ? `${formatCurrency(item.balance)} ${item.balanceType}` : '₹0.00'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
              <tr>
                <td colSpan={3} className="py-4 px-4 text-left uppercase text-slate-800">
                  Total Trial Balance
                </td>
                <td className="py-4 px-4 text-right font-mono text-base text-slate-900">
                  {formatCurrency(tb.totalDebit)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-base text-slate-900">
                  {formatCurrency(tb.totalCredit)}
                </td>
                <td className="py-4 px-4 text-right">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      tb.isBalanced
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    {tb.isBalanced ? 'Balanced' : `Diff: ${formatCurrency(Math.abs(tb.difference))}`}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
