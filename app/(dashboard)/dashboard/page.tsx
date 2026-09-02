import { requireAdmin } from '@/lib/auth-utils';
import { DashboardService } from '@/services/dashboard.service';
import { formatCurrency } from '@/lib/utils/currency';
import Link from 'next/link';
import { RevenueVsExpenseChart } from './DashboardCharts';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  await requireAdmin();

  const fromFilter = await Promise.resolve(searchParams.from);
  const toFilter = await Promise.resolve(searchParams.to);

  const filters = {
    fromDate: fromFilter ? new Date(fromFilter) : undefined,
    toDate: toFilter ? new Date(toFilter) : undefined,
  };

  const dashboardData = await DashboardService.getUnifiedDashboardData(filters);
  const {
    isDbConnected,
    kpis,
    trends,
    recentTransactions,
    taxPosition
  } = dashboardData;

  const { outputGST, inputGST, netGST, tdsReceivable, tdsPayable } = taxPosition;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-7">
      {!isDbConnected && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4.5 rounded-2xl shadow-xs border border-amber-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-amber-900">Database Connection Notice — MongoDB Atlas IP Whitelist Required</h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Your database queries timed out because MongoDB Atlas is rejecting TLS connections from your current network IP. Data entered while disconnected was not saved to the cloud database.
              </p>
              <div className="mt-2 bg-white/80 border border-amber-300/80 p-2.5 rounded-xl text-xs font-medium text-amber-950 font-mono">
                📍 <strong>Your Current Public IP:</strong> <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900 font-bold">103.182.167.158</code>
                <br />
                👉 <strong>Fix:</strong> Log in to <span className="font-bold">MongoDB Atlas</span> → <span className="font-bold">Network Access</span> → Click <span className="font-bold">"Add IP Address"</span> → Add <code className="bg-amber-100 px-1.5 py-0.5 rounded font-bold text-amber-900">103.182.167.158</code> (or <code className="bg-amber-100 px-1.5 py-0.5 rounded font-bold text-amber-900">0.0.0.0/0</code> for everywhere access).
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-theme-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-extrabold text-emerald-800 tracking-widest uppercase">
              FINANCIAL MANAGEMENT • INDIA
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-theme-text mt-1 tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-theme-text-muted text-xs sm:text-sm mt-0.5 font-normal">
            Real-time financial performance, revenue trends, and tax position.
          </p>
        </div>

        {/* Right Financial Year Selector */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              defaultValue="FY 2026–27"
              className="appearance-none border border-theme-border rounded-xl pl-3.5 pr-8 py-2 text-xs font-bold bg-theme-surface-hover text-theme-text shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
            >
              <option value="FY 2026–27">FY 2026–27</option>
              <option value="FY 2025–26">FY 2025–26</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-theme-text-muted">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Row 1: Primary Financial KPIs (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Invoice Revenue */}
        <div className="bg-gradient-to-br from-emerald-50/70 via-white to-white p-5 rounded-2xl border border-emerald-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Invoice Revenue</span>
            <div className="p-2.5 rounded-xl bg-emerald-100/80 text-emerald-700 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="my-3">
            <strong className="text-2xl sm:text-3xl font-extrabold text-emerald-900 tracking-tight block">
              {formatCurrency(kpis.totalRevenue)}
            </strong>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-emerald-100 text-[11px]">
            <span className="text-emerald-700/80 font-medium">Tax Invoices</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
              Confirmed
            </span>
          </div>
        </div>

        {/* 2. Expenses */}
        <div className="bg-gradient-to-br from-amber-50/70 via-white to-white p-5 rounded-2xl border border-amber-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Expenses</span>
            <div className="p-2.5 rounded-xl bg-amber-100/80 text-amber-700 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="my-3">
            <strong className="text-2xl sm:text-3xl font-extrabold text-amber-900 tracking-tight block">
              {formatCurrency(kpis.totalExpenses)}
            </strong>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-amber-100 text-[11px]">
            <span className="text-amber-700/80 font-medium">Categorised</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
              Outflows
            </span>
          </div>
        </div>

        {/* 3. Net Profit */}
        <div className="bg-gradient-to-br from-indigo-50/70 via-white to-white p-5 rounded-2xl border border-indigo-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Net Profit</span>
            <div className="p-2.5 rounded-xl bg-indigo-100/80 text-indigo-700 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="my-3">
            <strong className={`text-2xl sm:text-3xl font-extrabold tracking-tight block ${kpis.operatingResult >= 0 ? 'text-indigo-900' : 'text-rose-700'}`}>
              {formatCurrency(kpis.operatingResult)}
            </strong>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-indigo-100 text-[11px]">
            <span className="text-indigo-700/80 font-medium">Income − Expenses</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px]">
              {kpis.profitMargin.toFixed(0)}% Margin
            </span>
          </div>
        </div>

        {/* 4. Receivables */}
        <div className="bg-gradient-to-br from-purple-50/70 via-white to-white p-5 rounded-2xl border border-purple-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">Receivables</span>
            <div className="p-2.5 rounded-xl bg-purple-100/80 text-purple-700 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="my-3">
            <strong className="text-2xl sm:text-3xl font-extrabold text-purple-900 tracking-tight block">
              {formatCurrency(kpis.outstandingReceivables)}
            </strong>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-purple-100 text-[11px]">
            <span className="text-purple-700/80 font-medium">Unpaid Balances</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px]">
              Pending
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Secondary Pipeline KPIs (3 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 5. Profit Margin */}
        <div className="bg-white p-4.5 rounded-2xl border border-theme-border shadow-xs hover:border-emerald-300 transition-colors flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider block">Profit Margin</span>
              <strong className="text-xl font-extrabold text-emerald-700 mt-0.5 block">
                {kpis.profitMargin.toFixed(1)}%
              </strong>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full">
            Net Profit Rate
          </span>
        </div>

        {/* 6. Active Proformas Count */}
        <div className="bg-white p-4.5 rounded-2xl border border-theme-border shadow-xs hover:border-teal-300 transition-colors flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider block">Active Proformas</span>
              <strong className="text-xl font-extrabold text-teal-800 mt-0.5 block">
                {kpis.activeProformaCount} Quotes
              </strong>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 border border-teal-200/60 px-2.5 py-1 rounded-full">
            Pending Conversion
          </span>
        </div>

        {/* 7. Active Proformas Value */}
        <div className="bg-white p-4.5 rounded-2xl border border-theme-border shadow-xs hover:border-sky-300 transition-colors flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-sky-50 text-sky-700 border border-sky-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider block">Proforma Value</span>
              <strong className="text-xl font-extrabold text-sky-800 mt-0.5 block">
                {formatCurrency(kpis.activeProformaValue)}
              </strong>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 border border-sky-200/60 px-2.5 py-1 rounded-full">
            Pipeline Total
          </span>
        </div>
      </div>

      {/* Row 3: Monthly Revenue vs Expense + Tax Position */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Monthly Chart */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-theme-border shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-theme-border pb-3">
            <div>
              <h2 className="text-base font-bold text-theme-text">Monthly Revenue vs Expense</h2>
              <p className="text-xs text-theme-text-muted mt-0.5">Clustered column chart · FY 2026–27</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-theme-surface-hover border border-theme-border text-theme-text-muted">
              Monthly Trend
            </span>
          </div>
          <RevenueVsExpenseChart data={trends} />
        </div>

        {/* Right Column: Tax Position */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-theme-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-theme-border pb-3">
            <div>
              <h2 className="text-base font-bold text-theme-text">Tax Position</h2>
              <p className="text-xs text-theme-text-muted mt-0.5">Current financial-year GST & TDS breakdown</p>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Live Position
            </span>
          </div>

          <div className="space-y-3">
            {/* GST Payable */}
            <div className="bg-gradient-to-r from-amber-50/80 to-white border border-amber-200/90 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">GST Payable</span>
                <strong className="text-lg font-extrabold text-amber-900 mt-0.5 block">
                  {formatCurrency(outputGST)}
                </strong>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">
                Output GST
              </span>
            </div>

            {/* GST Receivable / ITC */}
            <div className="bg-gradient-to-r from-emerald-50/80 to-white border border-emerald-200/90 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">GST Receivable / ITC</span>
                <strong className="text-lg font-extrabold text-emerald-900 mt-0.5 block">
                  {formatCurrency(inputGST)}
                </strong>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs">
                Input Credit
              </span>
            </div>

            {/* Net GST */}
            <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-300 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">Net GST Position</span>
                <strong className="text-lg font-extrabold text-slate-900 mt-0.5 block">
                  {netGST >= 0 ? `${formatCurrency(netGST)}` : `${formatCurrency(Math.abs(netGST))}`}
                </strong>
              </div>
              <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${netGST >= 0 ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'}`}>
                {netGST >= 0 ? 'Payable' : 'ITC Credit'}
              </span>
            </div>

            {/* TDS Receivable */}
            <div className="bg-gradient-to-r from-sky-50/80 to-white border border-sky-200/90 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider block">TDS Receivable</span>
                <strong className="text-lg font-extrabold text-sky-900 mt-0.5 block">
                  {formatCurrency(tdsReceivable)}
                </strong>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 font-bold text-xs">
                Form 26AS
              </span>
            </div>

            {/* TDS Payable */}
            <div className="bg-gradient-to-r from-orange-50/80 to-white border border-orange-200/90 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-orange-900 uppercase tracking-wider block">TDS Payable</span>
                <strong className="text-lg font-extrabold text-orange-900 mt-0.5 block">
                  {formatCurrency(tdsPayable)}
                </strong>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-900 font-bold text-xs">
                Expense TDS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Recent Transactions */}
      <div className="bg-white p-6 rounded-2xl border border-theme-border shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-theme-border">
          <div>
            <h2 className="text-base font-bold text-theme-text">Recent Transactions</h2>
            <p className="text-xs text-theme-text-muted mt-0.5">Latest income, expenses and asset movements</p>
          </div>
          <Link
            href="/reports"
            className="px-4 py-1.5 text-xs font-bold border border-theme-border text-theme-text rounded-lg hover:bg-theme-surface-hover transition-colors shadow-xs"
          >
            View All Reports
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-theme-border text-[11px] uppercase text-theme-text-muted font-bold tracking-wider bg-theme-surface-hover/50">
                <th className="py-3 px-3 rounded-l-lg">Date</th>
                <th className="py-3 px-4">Transaction</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-3 text-right rounded-r-lg">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border text-xs">
              {(!recentTransactions || recentTransactions.length === 0) ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-theme-text-muted">
                    No recent transactions found. Create invoices or record expenses to see them here.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((t) => {
                  const formattedDate = new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  return (
                    <tr key={t.id} className="hover:bg-theme-surface-hover/60 transition-colors">
                      <td className="py-3.5 px-3 text-theme-text-muted whitespace-nowrap font-medium">
                        {formattedDate}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-theme-text">
                        {t.transaction}
                      </td>
                      <td className="py-3.5 px-4 text-theme-text-muted">
                        {t.category}
                      </td>
                      <td className="py-3.5 px-3 text-right whitespace-nowrap font-bold">
                        {t.type === 'REVENUE' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                            + {formatCurrency(t.amount)}
                          </span>
                        ) : t.type === 'ASSET' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-bold">
                            Asset {formatCurrency(t.amount)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold">
                            − {formatCurrency(t.amount)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
