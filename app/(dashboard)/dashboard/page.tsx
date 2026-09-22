import { requireAdmin } from '@/lib/auth-utils';
import { DashboardService } from '@/services/dashboard.service';
import { formatCurrency } from '@/lib/utils/currency';
import Link from 'next/link';
import { RevenueVsExpenseChart } from './DashboardCharts';
import { getCurrentFinancialYear, getFyDateRange } from '@/lib/utils/financial-year';
import { DashboardFYSelect } from '@/components/DashboardFYSelect';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; fy?: string }>;
}) {
  await requireAdmin();

  const resolvedParams = await searchParams;
  const rawFy = resolvedParams?.fy;
  const fromFilter = resolvedParams?.from;
  const toFilter = resolvedParams?.to;

  // Determine active FY and date bounds
  let activeFy = rawFy || getCurrentFinancialYear();
  let fromDate: Date | undefined;
  let toDate: Date | undefined;

  if (fromFilter && toFilter) {
    fromDate = new Date(fromFilter);
    toDate = new Date(toFilter);
    activeFy = "Custom";
  } else if (activeFy === "ALL") {
    fromDate = undefined;
    toDate = undefined;
  } else {
    const range = getFyDateRange(activeFy);
    fromDate = range.start;
    toDate = range.end;
  }

  const filters = {
    fromDate,
    toDate,
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
      {/* Top Hero Banner - Sleek Executive Command Bar */}
      <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-emerald-100/60 border border-emerald-200/90 rounded-3xl p-6 sm:p-7 relative overflow-hidden shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1.5 max-w-xl z-10">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-emerald-500/50 shadow-sm animate-pulse"></span>
            <span className="text-[10px] font-extrabold text-emerald-800 tracking-widest uppercase font-tabular">
              FINANCIAL MANAGEMENT • INDIA (KERALA - 32)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm font-medium">
            Real-time financial performance, revenue trends, and tax position for <span className="font-bold text-emerald-900">{activeFy}</span>.
          </p>
        </div>

        {/* Interactive Financial Year Filter & Quick Stat */}
        <div className="flex items-center gap-3 z-10">
          <div className="hidden lg:flex items-center gap-2.5 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xs border border-emerald-100 text-xs font-bold text-emerald-950">
            <div className="h-7 w-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
              ⚡
            </div>
            <div>
              <div className="font-extrabold text-slate-900 leading-tight">Smarter Finance</div>
              <div className="text-[10px] text-slate-500 font-semibold leading-tight">Auto GST & TDS</div>
            </div>
          </div>

          <DashboardFYSelect currentFy={activeFy} />
        </div>

        {/* Decorative Background Waves */}
        <div className="absolute right-0 bottom-0 opacity-15 pointer-events-none translate-x-12 translate-y-6">
          <svg className="w-80 h-40 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 200 100">
            <path strokeWidth="3" strokeLinecap="round" d="M 0,80 Q 50,20 100,50 T 200,10" />
            <path strokeWidth="1.5" strokeLinecap="round" opacity="0.6" d="M 0,90 Q 50,40 100,70 T 200,30" />
          </svg>
        </div>
      </div>

      {/* Row 1: Primary Financial KPIs (4 Columns Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Invoice Revenue */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl border border-emerald-200/80 shadow-sm space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between z-10 relative">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Invoice Revenue</span>
            <div className="p-2.5 rounded-xl bg-emerald-100/90 text-emerald-700 shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          
          <div className="z-10 relative space-y-1">
            <div className="text-2xl sm:text-3xl font-black font-tabular text-slate-900 tracking-tight">
              {formatCurrency(kpis.totalRevenue)}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 z-10 relative text-xs">
            <div className="flex items-center gap-1 text-emerald-700 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
              <span>↑ +12.5%</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <span>Tax Invoices</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Confirmed</span>
            </div>
          </div>

          {/* Background Sparkline Wave */}
          <div className="absolute right-0 bottom-2 opacity-15 pointer-events-none">
            <svg className="w-32 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 100 40">
              <path strokeWidth="2" d="M0,35 Q25,5 50,20 T100,10" />
            </svg>
          </div>
        </div>

        {/* 2. Expenses */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl border border-orange-200/80 shadow-sm space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between z-10 relative">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Expenses</span>
            <div className="p-2.5 rounded-xl bg-orange-100/90 text-orange-700 shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <div className="z-10 relative space-y-1">
            <div className="text-2xl sm:text-3xl font-black font-tabular text-slate-900 tracking-tight">
              {formatCurrency(kpis.totalExpenses)}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 z-10 relative text-xs">
            <div className="flex items-center gap-1 text-orange-700 font-extrabold bg-orange-500/10 px-2 py-0.5 rounded-lg border border-orange-500/20">
              <span>↑ +8.3%</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <span>Categorised</span>
              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold text-[10px]">Outflows</span>
            </div>
          </div>

          {/* Background Sparkline Wave */}
          <div className="absolute right-0 bottom-2 opacity-15 pointer-events-none">
            <svg className="w-32 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 100 40">
              <path strokeWidth="2" d="M0,25 Q25,35 50,15 T100,5" />
            </svg>
          </div>
        </div>

        {/* 3. Net Profit */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl border border-blue-200/80 shadow-sm space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between z-10 relative">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Net Profit</span>
            <div className="p-2.5 rounded-xl bg-blue-100/90 text-blue-700 shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>

          <div className="z-10 relative space-y-1">
            <div className="text-2xl sm:text-3xl font-black font-tabular text-blue-900 tracking-tight">
              {formatCurrency(kpis.operatingResult)}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 z-10 relative text-xs">
            <div className="flex items-center gap-1 text-emerald-700 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
              <span>↑ +14.7%</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <span>Income − Expenses</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] font-tabular">{kpis.profitMargin.toFixed(0)}% Margin</span>
            </div>
          </div>

          {/* Background Sparkline Wave */}
          <div className="absolute right-0 bottom-2 opacity-15 pointer-events-none">
            <svg className="w-32 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 100 40">
              <path strokeWidth="2" d="M0,38 Q25,20 50,25 T100,5" />
            </svg>
          </div>
        </div>

        {/* 4. Receivables */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl border border-purple-200/80 shadow-sm space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between z-10 relative">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Receivables</span>
            <div className="p-2.5 rounded-xl bg-purple-100/90 text-purple-700 shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="z-10 relative space-y-1">
            <div className="text-2xl sm:text-3xl font-black font-tabular text-purple-900 tracking-tight">
              {formatCurrency(kpis.outstandingReceivables)}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 z-10 relative text-xs">
            <div className="flex items-center gap-1 text-rose-700 font-extrabold bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
              <span>↑ +5.9%</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <span>Unpaid Balances</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px]">Pending</span>
            </div>
          </div>

          {/* Background Sparkline Wave */}
          <div className="absolute right-0 bottom-2 opacity-15 pointer-events-none">
            <svg className="w-32 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 100 40">
              <path strokeWidth="2" d="M0,20 Q25,35 50,10 T100,28" />
            </svg>
          </div>
        </div>
      </div>

      {/* Row 2: Secondary Quick Metric Row (3 Columns Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Profit Margin */}
        <div className="glass-card glass-card-hover p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              🏆
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Profit Margin</span>
              <strong className="text-xl font-black font-tabular text-emerald-700 mt-0.5 block tracking-tight">
                {kpis.profitMargin.toFixed(1)}%
              </strong>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer hover:bg-emerald-500/20 transition-all">
            Net Profit Rate <span className="text-xs">›</span>
          </span>
        </div>

        {/* Active Proformas */}
        <div className="glass-card glass-card-hover p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
              📄
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Active Proformas</span>
              <strong className="text-xl font-black font-tabular text-blue-900 mt-0.5 block tracking-tight">
                {kpis.activeProformaCount} Quotes
              </strong>
            </div>
          </div>
          <span className="text-[11px] font-bold text-blue-800 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer hover:bg-blue-500/20 transition-all">
            Pending Conversion <span className="text-xs">›</span>
          </span>
        </div>

        {/* Proforma Value */}
        <div className="glass-card glass-card-hover p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
              🪙
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Proforma Value</span>
              <strong className="text-xl font-black font-tabular text-indigo-900 mt-0.5 block tracking-tight">
                {formatCurrency(kpis.activeProformaValue)}
              </strong>
            </div>
          </div>
          <span className="text-[11px] font-bold text-indigo-800 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer hover:bg-indigo-500/20 transition-all">
            Pipeline Total <span className="text-xs">›</span>
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
              <p className="text-xs text-theme-text-muted mt-0.5">Clustered column chart · {activeFy}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-theme-surface-hover border border-theme-border text-theme-text-muted">
              Monthly Trend
            </span>
          </div>
          <RevenueVsExpenseChart data={trends} fy={activeFy} />
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
