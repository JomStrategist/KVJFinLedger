import { requireAdmin } from '@/lib/auth-utils';
import { ReportsService } from '@/services/reports.service';
import { formatCurrency } from '@/lib/utils/currency';
import Link from 'next/link';
import { PrintButton } from '@/components/PrintButton';
import { ExportButton } from '@/components/ExportButton';

export default async function TdsReportPage({
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

  const { data: expenses, summary } = await ReportsService.getTdsReport(filters);

  // Flatten data for export
  const exportData = (expenses || []).map((exp: any) => ({
    "Expense Number": exp.expenseNumber,
    "Date": exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString('en-IN') : '',
    "Vendor": exp.vendor?.name || 'Unknown',
    "Vendor PAN": exp.vendor?.pan || '',
    "TDS Rate": `${exp.tdsRate || 0}%`,
    "Gross Amount": Number(exp.grossAmount),
    "TDS Amount": Number(exp.tdsAmount),
    "Net Amount": Number(exp.netAmount)
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto print:p-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 no-print">
        <h1 className="text-2xl font-bold text-theme-text">TDS Report</h1>
        
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2 items-center">
          <ExportButton data={exportData} filename="TDS_Report" />
          <PrintButton />
        </div>
      </div>

      <div className="hidden print:block mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">TDS REPORT</h1>
        <p className="text-center text-theme-text-muted">
          Period: {fromFilter ? new Date(fromFilter).toLocaleDateString() : 'Start'} to {toFilter ? new Date(toFilter).toLocaleDateString() : 'Present'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-theme-surface rounded-lg shadow p-4 border-l-4 border-theme-primary print:shadow-none print:border print:border-theme-border">
          <h3 className="text-xs font-medium text-theme-text-muted uppercase">Total Gross Amount</h3>
          <p className="mt-1 text-xl font-bold text-theme-text">{formatCurrency(summary.totalGrossAmount)}</p>
        </div>
        <div className="bg-theme-surface rounded-lg shadow p-4 border-l-4 border-purple-500 print:shadow-none print:border print:border-theme-border">
          <h3 className="text-xs font-medium text-theme-text-muted uppercase">Total TDS Deducted</h3>
          <p className="mt-1 text-xl font-bold text-theme-text">{formatCurrency(summary.totalTDSDeducted)}</p>
        </div>
        <div className="bg-theme-surface rounded-lg shadow p-4 border-l-4 border-green-500 print:shadow-none print:border print:border-theme-border">
          <h3 className="text-xs font-medium text-theme-text-muted uppercase">TDS Transactions</h3>
          <p className="mt-1 text-xl font-bold text-theme-text">{summary.numberOfTransactions}</p>
        </div>
      </div>

      <div className="bg-theme-surface rounded-lg shadow border border-theme-border overflow-hidden print:shadow-none print:border-0">
        <div className="p-4 border-b border-theme-border bg-theme-surface-hover no-print">
          <form className="flex flex-col md:flex-row gap-3">
            <input type="date" name="from" defaultValue={fromFilter || ""} className="border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary" title="From Date" />
            <input type="date" name="to" defaultValue={toFilter || ""} className="border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary" title="To Date" />
            <button type="submit" className="bg-theme-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-theme-primary-dark">Filter</button>
            {(fromFilter || toFilter) && (
              <Link href="/reports/tds" className="bg-theme-surface text-theme-text-muted px-4 py-2 rounded-lg text-sm font-medium hover:text-theme-text border border-theme-border flex items-center justify-center">Clear</Link>
            )}
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-theme-border">
            <thead className="bg-theme-surface-hover print:bg-theme-surface print:border-b-2 print:border-theme-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider">Expense</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wider">Vendor / PAN</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-theme-text-muted uppercase tracking-wider">Rate</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-theme-text-muted uppercase tracking-wider">Gross Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-theme-text-muted uppercase tracking-wider">TDS Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-theme-text-muted uppercase tracking-wider">Net Amount</th>
              </tr>
            </thead>
            <tbody className="bg-theme-surface divide-y divide-theme-border">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-theme-text-muted">No TDS deductions found for the selected criteria.</td>
                </tr>
              ) : (
                (expenses || []).map((exp: any) => (
                  <tr key={exp.id} className="hover:bg-theme-surface-hover">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-theme-primary">
                      <Link href={`/expenses/${exp.id}`}>{exp.expenseNumber}</Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-theme-text-muted">{exp.expenseDate.toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-sm text-theme-text max-w-[200px] truncate">
                      {exp.vendor?.name || 'Unknown'}
                      <div className="text-xs text-theme-text-muted font-mono">{exp.vendor?.pan || 'No PAN'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-theme-text-muted">{Number(exp.tdsRate) || 0}%</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-theme-text-muted">{formatCurrency(Number(exp.grossAmount))}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-purple-600">{formatCurrency(Number(exp.tdsAmount))}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-theme-text">{formatCurrency(Number(exp.netAmount))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
