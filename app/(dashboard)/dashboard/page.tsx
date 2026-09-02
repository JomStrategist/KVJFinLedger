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
    kpis,
    trends,
    recentTransactions,
    taxPosition
  } = dashboardData;

  const { outputGST, inputGST, netGST, tdsReceivable, tdsPayable } = taxPosition;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-7">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#177B55] tracking-widest uppercase block">
            FINANCIAL MANAGEMENT • INDIA
          </span>
          <h1 className="text-3xl font-extrabold text-[#17211B] mt-0.5 tracking-tight">
            Dashboard
          </h1>
          <p className="text-[#68756C] text-sm mt-0.5 font-normal">
            A financial overview for the current financial year.
          </p>
        </div>

        {/* Right Financial Year Selector */}
        <div className="flex items-center gap-3">
          <select
            defaultValue="FY 2026–27"
            className="border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold bg-white text-[#17211B] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#177B55]"
          >
            <option value="FY 2026–27">FY 2026–27</option>
            <option value="FY 2025–26">FY 2025–26</option>
          </select>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {/* 1. Invoice Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-[#68756C]">Invoice Revenue</span>
          <strong className="text-xl font-bold text-[#177B55] my-1.5">
            {formatCurrency(kpis.totalRevenue)}
          </strong>
          <span className="text-[10px] text-[#68756C]">Confirmed Tax Invoices</span>
        </div>

        {/* 2. Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-[#68756C]">Expenses</span>
          <strong className="text-xl font-bold text-[#B27A17] my-1.5">
            {formatCurrency(kpis.totalExpenses)}
          </strong>
          <span className="text-[10px] text-[#68756C]">Categorised expenses</span>
        </div>

        {/* 3. Net Profit */}
        <div className="bg-white p-4 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-[#68756C]">Net Profit</span>
          <strong className={`text-xl font-bold my-1.5 ${kpis.operatingResult >= 0 ? 'text-[#177B55]' : 'text-[#B94B4B]'}`}>
            {formatCurrency(kpis.operatingResult)}
          </strong>
          <span className="text-[10px] text-[#68756C]">Income − expenses</span>
        </div>

        {/* 4. Profit Margin */}
        <div className="bg-white p-4 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-[#68756C]">Profit Margin</span>
          <strong className="text-xl font-bold text-[#177B55] my-1.5">
            {kpis.profitMargin.toFixed(1)}%
          </strong>
          <span className="text-[10px] text-[#68756C]">Net profit ÷ revenue</span>
        </div>

        {/* 5. Receivables */}
        <div className="bg-white p-4 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-[#68756C]">Receivables</span>
          <strong className="text-xl font-bold text-[#17211B] my-1.5">
            {formatCurrency(kpis.outstandingReceivables)}
          </strong>
          <span className="text-[10px] text-[#68756C]">Unpaid balances</span>
        </div>

        {/* 6. Active Proformas Count (MA-007) */}
        <div className="bg-white p-4 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-[#68756C]">Active Proformas</span>
          <strong className="text-xl font-bold text-[#0F766E] my-1.5">
            {kpis.activeProformaCount}
          </strong>
          <span className="text-[10px] text-[#68756C]">Pending conversion</span>
        </div>

        {/* 7. Active Proformas Value (MA-007) */}
        <div className="bg-white p-4 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-[#68756C]">Proforma Value</span>
          <strong className="text-xl font-bold text-[#0F766E] my-1.5">
            {formatCurrency(kpis.activeProformaValue)}
          </strong>
          <span className="text-[10px] text-[#68756C]">Active pipeline total</span>
        </div>
      </div>

      {/* Row 2: Monthly Revenue vs Expense + Tax Position */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Monthly Chart */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#17211B]">Monthly Revenue vs Expense</h2>
            <p className="text-xs text-[#68756C] mt-0.5">Clustered column chart · FY 2026–27</p>
          </div>
          <RevenueVsExpenseChart data={trends} />
        </div>

        {/* Right Column: Tax Position */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-[#D9E3DC] shadow-xs space-y-3.5">
          <div>
            <h2 className="text-lg font-bold text-[#17211B]">Tax Position</h2>
            <p className="text-xs text-[#68756C] mt-0.5">Current financial-year position</p>
          </div>

          <div className="space-y-2.5 pt-1">
            {/* GST Payable */}
            <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-[#17211B] block">GST Payable</span>
              <strong className="text-xl font-bold text-[#B27A17] mt-0.5 block">
                {formatCurrency(outputGST)}
              </strong>
            </div>

            {/* GST Receivable / ITC */}
            <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-[#17211B] block">GST Receivable / ITC</span>
              <strong className="text-xl font-bold text-[#177B55] mt-0.5 block">
                {formatCurrency(inputGST)}
              </strong>
            </div>

            {/* Net GST */}
            <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-[#17211B] block">Net GST</span>
              <strong className="text-xl font-bold text-[#17211B] mt-0.5 block">
                {netGST >= 0 ? `${formatCurrency(netGST)} Payable` : `${formatCurrency(Math.abs(netGST))} ITC Credit`}
              </strong>
            </div>

            {/* TDS Receivable */}
            <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-[#17211B] block">TDS Receivable</span>
              <strong className="text-xl font-bold text-[#386F9E] mt-0.5 block">
                {formatCurrency(tdsReceivable)}
              </strong>
            </div>

            {/* TDS Payable */}
            <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-[#17211B] block">TDS Payable</span>
              <strong className="text-xl font-bold text-[#B27A17] mt-0.5 block">
                {formatCurrency(tdsPayable)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Transactions */}
      <div className="bg-white p-6 rounded-2xl border border-[#D9E3DC] shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-2">
          <div>
            <h2 className="text-lg font-bold text-[#17211B]">Recent Transactions</h2>
            <p className="text-xs text-[#68756C] mt-0.5">Latest income, expenses and asset movements</p>
          </div>
          <Link
            href="/reports"
            className="px-4 py-1.5 text-xs font-bold border border-[#D9E3DC] text-[#17211B] rounded-lg hover:bg-[#F4F7F3] transition-colors shadow-xs"
          >
            Reports
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                <th className="py-3 px-2">Date</th>
                <th className="py-3 px-4">Transaction</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EEE9] text-xs">
              {(!recentTransactions || recentTransactions.length === 0) ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#68756C]">
                    No recent transactions found. Create invoices or record expenses to see them here.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((t) => {
                  const formattedDate = new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  return (
                    <tr key={t.id} className="hover:bg-[#F9FAF8] transition-colors">
                      <td className="py-3.5 px-2 text-[#68756C] whitespace-nowrap font-medium">
                        {formattedDate}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#17211B]">
                        {t.transaction}
                      </td>
                      <td className="py-3.5 px-4 text-[#68756C]">
                        {t.category}
                      </td>
                      <td className="py-3.5 px-2 text-right whitespace-nowrap font-bold">
                        {t.type === 'REVENUE' ? (
                          <span className="text-[#177B55]">+ {formatCurrency(t.amount)}</span>
                        ) : t.type === 'ASSET' ? (
                          <span className="text-[#386F9E]">Asset {formatCurrency(t.amount)}</span>
                        ) : (
                          <span className="text-[#B94B4B]">− {formatCurrency(t.amount)}</span>
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
