import { requireAdmin } from '@/lib/auth-utils';
import { AccountingEngine } from '@/services/accounting-engine.service';
import { formatCurrency } from '@/lib/utils/currency';
import Link from 'next/link';
import { PrintButton } from '@/components/PrintButton';

export const dynamic = "force-dynamic";

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  
  const asOfFilter = typeof params.asOf === "string" ? params.asOf : "";
  const asOfDate = asOfFilter ? new Date(asOfFilter) : undefined;
  if (asOfDate) {
    asOfDate.setHours(23, 59, 59, 999);
  }

  const bs = await AccountingEngine.getBalanceSheet({ toDate: asOfDate });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 print:p-0 print:space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-theme-text">Balance Sheet</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                bs.isBalanced
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {bs.isBalanced ? '✓ Schedule III Balanced' : `⚠ Variance: ${formatCurrency(Math.abs(bs.difference))}`}
            </span>
          </div>
          <p className="text-theme-text-muted text-sm mt-1">
            Authoritative statement of Assets, Liabilities, and Equity derived from double-entry ledgers.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <PrintButton />
          <Link 
            href="/reports" 
            className="px-4 py-2 bg-theme-surface text-theme-text border border-theme-border rounded-lg text-sm font-medium hover:bg-theme-surface-hover transition-colors"
          >
            All Reports
          </Link>
        </div>
      </div>

      <div className="bg-theme-surface p-4 rounded-xl shadow-sm border border-theme-border flex items-end gap-4 no-print">
        <form className="flex-1 max-w-xs flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-theme-text mb-1">As Of Date</label>
            <input
              type="date"
              name="asOf"
              defaultValue={asOfFilter}
              className="w-full border border-theme-border rounded-lg px-3 py-1.5 text-sm bg-theme-surface text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-primary"
            />
          </div>
          <button
            type="submit"
            className="bg-theme-primary text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-theme-primary-dark transition-colors"
          >
            Apply
          </button>
          {asOfFilter && (
            <Link
              href="/reports/balance-sheet"
              className="px-3 py-1.5 border border-theme-border text-theme-text-muted rounded-lg text-sm hover:text-theme-text"
            >
              Reset
            </Link>
          )}
        </form>
      </div>

      <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border overflow-hidden">
        <div className="p-6 border-b border-theme-border bg-theme-surface-hover flex justify-between items-center">
          <h2 className="text-lg font-bold text-theme-text">
            As of {asOfDate ? asOfDate.toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
          </h2>
          <span className="text-sm font-medium text-theme-text-muted">Indian Rupees (INR ₹)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-theme-border">
          {/* LIABILITIES & EQUITY */}
          <div className="p-6 space-y-6">
            <h3 className="text-base font-bold text-theme-text uppercase tracking-wider border-b border-theme-border pb-2">
              I. Equity & Liabilities
            </h3>

            {/* Equity */}
            <div>
              <h4 className="font-bold text-xs uppercase text-slate-500 mb-2">1. Shareholder / Owner Equity</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-theme-text-muted">Owner Capital Account</span>
                  <span className="font-mono font-medium">{formatCurrency(bs.equity.capital)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-theme-text-muted">Current Period Net Profit (P&L)</span>
                  <span className="font-mono font-medium text-emerald-600">{formatCurrency(bs.equity.reservesAndSurplus)}</span>
                </div>
                <div className="flex justify-between py-1 font-semibold border-t border-dashed border-theme-border pt-1">
                  <span className="text-theme-text">Total Equity</span>
                  <span className="font-mono">{formatCurrency(bs.equity.totalShareholdersFunds)}</span>
                </div>
              </div>
            </div>

            {/* Current Liabilities */}
            <div>
              <h4 className="font-bold text-xs uppercase text-slate-500 mb-2">2. Current Liabilities</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-theme-text-muted">Trade Payables (Sundry Creditors)</span>
                  <span className="font-mono font-medium">{formatCurrency(bs.currentLiabilities.tradePayables)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-theme-text-muted">Employee Payables</span>
                  <span className="font-mono font-medium">{formatCurrency(bs.currentLiabilities.employeePayables)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-theme-text-muted">Statutory GST Payable</span>
                  <span className="font-mono font-medium">{formatCurrency(bs.currentLiabilities.statutoryGstPayable)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-theme-text-muted">Statutory TDS Payable</span>
                  <span className="font-mono font-medium">{formatCurrency(bs.currentLiabilities.statutoryTdsPayable)}</span>
                </div>
                {bs.currentLiabilities.otherCurrentLiabilities > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-theme-text-muted">Other Current Liabilities / Advances</span>
                    <span className="font-mono font-medium">{formatCurrency(bs.currentLiabilities.otherCurrentLiabilities)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 font-semibold border-t border-dashed border-theme-border pt-1">
                  <span className="text-theme-text">Total Current Liabilities</span>
                  <span className="font-mono">{formatCurrency(bs.currentLiabilities.total)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t-2 border-slate-800 flex justify-between items-center">
              <span className="font-bold text-theme-text text-base">Total Equity & Liabilities</span>
              <span className="font-bold font-mono text-theme-text text-lg">
                {formatCurrency(bs.totalEquityAndLiabilities)}
              </span>
            </div>
          </div>

          {/* ASSETS */}
          <div className="p-6 space-y-6">
            <h3 className="text-base font-bold text-theme-text uppercase tracking-wider border-b border-theme-border pb-2">
              II. Assets
            </h3>

            {/* Non-Current Assets */}
            <div>
              <h4 className="font-bold text-xs uppercase text-slate-500 mb-2">1. Non-Current Assets</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-theme-text-muted">Fixed Assets (Gross Block)</span>
                  <span className="font-mono font-medium">{formatCurrency(bs.nonCurrentAssets.fixedAssetsGross)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-theme-text-muted">Less: Accumulated Depreciation</span>
                  <span className="font-mono font-medium text-rose-600">
                    {bs.nonCurrentAssets.accumulatedDepreciation > 0
                      ? `- ${formatCurrency(bs.nonCurrentAssets.accumulatedDepreciation)}`
                      : '₹0.00'}
                  </span>
                </div>
                <div className="flex justify-between py-1 font-semibold border-t border-dashed border-theme-border pt-1">
                  <span className="text-theme-text">Net Fixed Assets (Net Block)</span>
                  <span className="font-mono">{formatCurrency(bs.nonCurrentAssets.fixedAssetsNet)}</span>
                </div>
              </div>
            </div>

            {/* Current Assets */}
            <div>
              <h4 className="font-bold text-xs uppercase text-slate-500 mb-2">2. Current Assets</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-theme-text-muted">Trade Receivables (Sundry Debtors)</span>
                  <span className="font-mono font-medium">{formatCurrency(bs.currentAssets.tradeReceivables)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-theme-text-muted">Cash & Bank Balances</span>
                  <span className="font-mono font-medium">{formatCurrency(bs.currentAssets.cashAndBank)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-theme-text-muted">TDS Receivable (Direct Tax Asset)</span>
                  <span className="font-mono font-medium">{formatCurrency(bs.currentAssets.tdsReceivable)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-theme-text-muted">GST Input Tax Credit (ITC)</span>
                  <span className="font-mono font-medium">{formatCurrency(bs.currentAssets.gstInputCredit)}</span>
                </div>
                {bs.currentAssets.otherCurrentAssets > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-theme-text-muted">Other Current Assets</span>
                    <span className="font-mono font-medium">{formatCurrency(bs.currentAssets.otherCurrentAssets)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 font-semibold border-t border-dashed border-theme-border pt-1">
                  <span className="text-theme-text">Total Current Assets</span>
                  <span className="font-mono">{formatCurrency(bs.currentAssets.total)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t-2 border-slate-800 flex justify-between items-center">
              <span className="font-bold text-theme-text text-base">Total Assets</span>
              <span className="font-bold font-mono text-theme-text text-lg">
                {formatCurrency(bs.totalAssets)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
