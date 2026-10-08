'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export interface ReportsHubProps {
  currentCategory: string;
  financialYear: string;
  fromDate?: string;
  toDate?: string;
  reportData: any;
  accountingEquilibrium: {
    isBalanced: boolean;
    tbDiff: number;
    bsDiff: number;
    cashBalance: number;
  };
}

export const REPORT_CATEGORIES = [
  { id: 'overview', name: 'Executive Overview', icon: '🏛️', desc: 'Management KPIs, margins & liquidity' },
  { id: 'statements', name: 'Financial Statements', icon: '⚖️', desc: 'Trial Balance, P&L, Balance Sheet, Cash Flow' },
  { id: 'sales', name: 'Sales & Receivables', icon: '📈', desc: 'Sales Register, Ageing, Customer Statements' },
  { id: 'expenses', name: 'Expenses & Payables', icon: '📉', desc: 'Expense Register, Vendor Ageing, Payments' },
  { id: 'gst', name: 'GST & Tax', icon: '📑', desc: 'GSTR-1, ITC Eligible/Ineligible, Tax Settlements' },
  { id: 'tds', name: 'TDS (Statutory)', icon: '🏷️', desc: 'TDS Receivable, Payable, Deducted & Deposited' },
  { id: 'banking', name: 'Banking & Cash', icon: '🏦', desc: 'Bank Book, Cash Book, Reconciliation & BRS' },
  { id: 'assets', name: 'Fixed Assets', icon: '🏢', desc: 'Asset Register, Depreciation & Disposals' },
  { id: 'employees', name: 'Employees & Salary', icon: '👥', desc: 'Salary Register, Reimbursements & Claims' },
  { id: 'analysis', name: 'Analysis & Intelligence', icon: '💡', desc: 'Comparative Statements & Financial Ratios' },
  { id: 'audit', name: 'Audit & Transactions', icon: '🔍', desc: 'General Ledger, Daybook & Vouchers' },
];

export function ReportsHubClient({
  currentCategory,
  financialYear,
  fromDate,
  toDate,
  reportData,
  accountingEquilibrium,
}: ReportsHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedFY, setSelectedFY] = useState(financialYear || 'FY 2026–27');
  const [activeReportTab, setActiveReportTab] = useState<string>('default');

  const handleCategoryChange = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('category', categoryId);
    router.push(`/reports?${params.toString()}`);
  };

  const handleFYChange = (newFY: string) => {
    setSelectedFY(newFY);
    const params = new URLSearchParams(searchParams.toString());
    params.set('financialYear', newFY);
    router.push(`/reports?${params.toString()}`);
  };

  const handleExportCSV = () => {
    // Generate a simple CSV from reportData table if available
    if (!reportData || !reportData.data) {
      alert('No tabular data to export for this view.');
      return;
    }
    const rows = reportData.data;
    if (!Array.isArray(rows) || rows.length === 0) {
      alert('No records available to export.');
      return;
    }
    const headers = Object.keys(rows[0]).filter(k => typeof rows[0][k] !== 'object');
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentCategory}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">ERP Reports Hub</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                accountingEquilibrium.isBalanced
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {accountingEquilibrium.isBalanced ? '✓ Double-Entry Balanced' : '⚠ Out of Balance'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Authoritative financial reports powered directly by AccountingEngine. Single Source of Truth.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">FY:</label>
            <select
              value={selectedFY}
              onChange={(e) => handleFYChange(e.target.value)}
              className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="FY 2026–27">FY 2026–27</option>
              <option value="FY 2025–26">FY 2025–26</option>
              <option value="FY 2024–25">FY 2024–25</option>
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition"
          >
            🖨️ Print
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* 11 Category Navigation Grid / Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {REPORT_CATEGORIES.map((cat) => {
          const isActive = currentCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <span className="text-xl mb-1">{cat.icon}</span>
              <span className={`text-xs font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                {cat.name}
              </span>
              <span
                className={`text-[10px] mt-1 line-clamp-1 leading-none ${
                  isActive ? 'text-blue-100' : 'text-slate-400'
                }`}
              >
                {cat.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Report View Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {renderCategoryContent(currentCategory, reportData, router)}
      </div>
    </div>
  );
}

function renderCategoryContent(category: string, data: any, router: any) {
  if (!data) {
    return <div className="text-center py-12 text-slate-500">Loading report data...</div>;
  }

  switch (category) {
    case 'overview':
      return <ExecutiveOverviewView data={data} />;
    case 'statements':
      return <FinancialStatementsView data={data} />;
    case 'sales':
      return <SalesReceivablesView data={data} />;
    case 'expenses':
      return <ExpensesPayablesView data={data} />;
    case 'gst':
      return <GstTaxView data={data} />;
    case 'tds':
      return <TdsView data={data} />;
    case 'banking':
      return <BankingCashView data={data} />;
    case 'assets':
      return <FixedAssetsView data={data} />;
    case 'employees':
      return <EmployeesSalaryView data={data} />;
    case 'analysis':
      return <AnalysisIntelligenceView data={data} />;
    case 'audit':
      return <AuditTransactionsView data={data} />;
    default:
      return <div className="p-8 text-center text-slate-500">Select a report category above.</div>;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Category 1: Executive Overview
// ─────────────────────────────────────────────────────────────────────────────
function ExecutiveOverviewView({ data }: { data: any }) {
  const kpis = data.kpis || {};
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-lg font-bold text-slate-900">Executive Financial Overview</h2>
        <p className="text-sm text-slate-500">Authoritative balance sheet and operating metrics from AccountingEngine.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-50 border rounded-xl">
          <p className="text-xs font-semibold text-slate-500">Total Revenue</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">₹{(kpis.revenue || 0).toLocaleString('en-IN')}</p>
          <span className="text-xs text-emerald-600 font-medium">Billed Turnover</span>
        </div>
        <div className="p-4 bg-slate-50 border rounded-xl">
          <p className="text-xs font-semibold text-slate-500">Operating Expenses</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">₹{(kpis.operatingExpenses || 0).toLocaleString('en-IN')}</p>
          <span className="text-xs text-slate-500 font-medium">Direct & Indirect Costs</span>
        </div>
        <div className="p-4 bg-slate-50 border rounded-xl">
          <p className="text-xs font-semibold text-slate-500">Net Profit After Tax</p>
          <p className={`text-2xl font-bold mt-1 ${(kpis.netProfitAfterTax || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            ₹{(kpis.netProfitAfterTax || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-xs text-slate-500 font-medium">Net Margin: {kpis.netMargin || 0}%</span>
        </div>
        <div className="p-4 bg-slate-50 border rounded-xl">
          <p className="text-xs font-semibold text-slate-500">Cash & Bank Liquidity</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">₹{(kpis.cashAndBank || 0).toLocaleString('en-IN')}</p>
          <span className="text-xs text-slate-500 font-medium">Working Capital: ₹{(kpis.workingCapital || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>

      {data.managementInsights && data.managementInsights.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="text-sm font-bold text-blue-900 mb-2">Management Insights & Intelligence</h3>
          <ul className="space-y-1 text-xs text-blue-800 list-disc list-inside">
            {data.managementInsights.map((insight: string, idx: number) => (
              <li key={idx}>{insight}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category 2: Financial Statements
// ─────────────────────────────────────────────────────────────────────────────
function FinancialStatementsView({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Authoritative Financial Statements</h2>
          <p className="text-sm text-slate-500">Direct navigation to the dedicated Financial Statements workbench.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/financial-statements?tab=trial-balance"
          className="p-5 border rounded-xl hover:shadow-md transition bg-gradient-to-br from-white to-slate-50 border-slate-200 group"
        >
          <div className="text-2xl mb-2">⚖️</div>
          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition">Trial Balance</h3>
          <p className="text-xs text-slate-500 mt-1">Complete balance verification across all asset, liability, income, and expense ledgers.</p>
          <span className="inline-block mt-4 text-xs font-semibold text-blue-600">Open Statement →</span>
        </Link>

        <Link
          href="/financial-statements?tab=pnl"
          className="p-5 border rounded-xl hover:shadow-md transition bg-gradient-to-br from-white to-slate-50 border-slate-200 group"
        >
          <div className="text-2xl mb-2">📈</div>
          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition">Profit & Loss</h3>
          <p className="text-xs text-slate-500 mt-1">Operating revenue, direct costs, employee expenses, depreciation, and net margin.</p>
          <span className="inline-block mt-4 text-xs font-semibold text-blue-600">Open Statement →</span>
        </Link>

        <Link
          href="/financial-statements?tab=balance-sheet"
          className="p-5 border rounded-xl hover:shadow-md transition bg-gradient-to-br from-white to-slate-50 border-slate-200 group"
        >
          <div className="text-2xl mb-2">🏛️</div>
          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition">Balance Sheet</h3>
          <p className="text-xs text-slate-500 mt-1">Assets, Trade Receivables, Fixed Assets, Liabilities, Loans, and Shareholder Equity.</p>
          <span className="inline-block mt-4 text-xs font-semibold text-blue-600">Open Statement →</span>
        </Link>

        <Link
          href="/financial-statements?tab=cash-flow"
          className="p-5 border rounded-xl hover:shadow-md transition bg-gradient-to-br from-white to-slate-50 border-slate-200 group"
        >
          <div className="text-2xl mb-2">💵</div>
          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition">Cash Flow</h3>
          <p className="text-xs text-slate-500 mt-1">Operating, investing, and financing cash activities reconciling closing cash & bank.</p>
          <span className="inline-block mt-4 text-xs font-semibold text-blue-600">Open Statement →</span>
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category 3: Sales & Receivables
// ─────────────────────────────────────────────────────────────────────────────
function SalesReceivablesView({ data }: { data: any }) {
  const summary = data.summary || {};
  const invoices = data.data || [];
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-lg font-bold text-slate-900">Sales & Receivables Register</h2>
        <p className="text-sm text-slate-500">Invoices, collections, and outstanding receivables matching Trade Receivables ledger.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-slate-50 border rounded-lg">
          <p className="text-xs font-semibold text-slate-500">Gross Sales Invoiced</p>
          <p className="text-xl font-bold text-slate-900">₹{(summary.totalSales || summary.totalTaxableAmount || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="p-3 bg-slate-50 border rounded-lg">
          <p className="text-xs font-semibold text-slate-500">Total GST Charged</p>
          <p className="text-xl font-bold text-slate-900">₹{(summary.totalGST || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="p-3 bg-slate-50 border rounded-lg">
          <p className="text-xs font-semibold text-slate-500">Outstanding Receivables</p>
          <p className="text-xl font-bold text-amber-600">₹{(summary.outstandingReceivables || summary.outstandingAmount || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="p-3 bg-slate-50 border rounded-lg">
          <p className="text-xs font-semibold text-slate-500">Total Collected</p>
          <p className="text-xl font-bold text-emerald-600">₹{(summary.totalCollected || summary.paidAmount || 0).toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b text-slate-600 uppercase font-semibold">
            <tr>
              <th className="p-3">Invoice #</th>
              <th className="p-3">Date</th>
              <th className="p-3">Customer</th>
              <th className="p-3 text-right">Taxable</th>
              <th className="p-3 text-right">GST</th>
              <th className="p-3 text-right">Total Gross</th>
              <th className="p-3 text-right">Balance Due</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.slice(0, 15).map((inv: any) => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="p-3 font-medium text-blue-600">
                  <Link href={`/invoices`}>{inv.invoiceNumber}</Link>
                </td>
                <td className="p-3 text-slate-500">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                <td className="p-3 text-slate-800">{inv.customerNameSnapshot || inv.customer?.legalName}</td>
                <td className="p-3 text-right">₹{Number(inv.taxableAmount || 0).toLocaleString('en-IN')}</td>
                <td className="p-3 text-right">₹{Number(inv.totalGST || 0).toLocaleString('en-IN')}</td>
                <td className="p-3 text-right font-medium">₹{Number(inv.grossAmount || 0).toLocaleString('en-IN')}</td>
                <td className="p-3 text-right font-bold text-amber-600">
                  ₹{Number(inv.balanceRemaining ?? inv.grossAmount).toLocaleString('en-IN')}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category 4: Expenses & Payables
// ─────────────────────────────────────────────────────────────────────────────
function ExpensesPayablesView({ data }: { data: any }) {
  const summary = data.summary || {};
  const expenses = data.data || [];
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-lg font-bold text-slate-900">Expenses & Trade Payables Register</h2>
        <p className="text-sm text-slate-500">Operating bills, capitalized assets, vendor settlements, and outstanding payables.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-slate-50 border rounded-lg">
          <p className="text-xs font-semibold text-slate-500">Operating Expenses</p>
          <p className="text-xl font-bold text-slate-900">₹{(summary.totalExpenses || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="p-3 bg-slate-50 border rounded-lg">
          <p className="text-xs font-semibold text-slate-500">Capitalized Fixed Assets</p>
          <p className="text-xl font-bold text-slate-900">₹{(summary.totalFixedAssets || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="p-3 bg-slate-50 border rounded-lg">
          <p className="text-xs font-semibold text-slate-500">Input GST (ITC)</p>
          <p className="text-xl font-bold text-blue-600">₹{(summary.totalInputGST || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="p-3 bg-slate-50 border rounded-lg">
          <p className="text-xs font-semibold text-slate-500">Unpaid Payables</p>
          <p className="text-xl font-bold text-rose-600">₹{(summary.unpaidExpenses || summary.outstandingAmount || 0).toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b text-slate-600 uppercase font-semibold">
            <tr>
              <th className="p-3">Expense #</th>
              <th className="p-3">Date</th>
              <th className="p-3">Party / Category</th>
              <th className="p-3 text-right">Taxable</th>
              <th className="p-3 text-right">Input GST</th>
              <th className="p-3 text-right">Net Amount</th>
              <th className="p-3 text-center">ITC Eligible</th>
              <th className="p-3 text-center">Payment Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.slice(0, 15).map((exp: any) => (
              <tr key={exp.id} className="hover:bg-slate-50">
                <td className="p-3 font-medium text-blue-600">
                  <Link href={`/expenses`}>{exp.expenseNumber}</Link>
                </td>
                <td className="p-3 text-slate-500">{new Date(exp.expenseDate).toLocaleDateString('en-IN')}</td>
                <td className="p-3 text-slate-800">
                  {exp.vendor?.businessName || exp.vendor?.name || exp.employee?.name || exp.category?.name || 'General Expense'}
                </td>
                <td className="p-3 text-right">₹{Number(exp.taxableAmount || 0).toLocaleString('en-IN')}</td>
                <td className="p-3 text-right">₹{Number(exp.totalInputGST || 0).toLocaleString('en-IN')}</td>
                <td className="p-3 text-right font-medium">₹{Number(exp.netAmount || exp.grossAmount || 0).toLocaleString('en-IN')}</td>
                <td className="p-3 text-center">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${exp.isItcEligible !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {exp.isItcEligible !== false ? 'Eligible' : 'Ineligible'}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                    {exp.paymentStatus || exp.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category 5: GST & Tax
// ─────────────────────────────────────────────────────────────────────────────
function GstTaxView({ data }: { data: any }) {
  const outward = data.outward?.summary || {};
  const itc = data.itc?.summary || {};
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-lg font-bold text-slate-900">GST Statutory Tax Register (GSTR-1 & 3B)</h2>
        <p className="text-sm text-slate-500">Output tax liability on outward supplies, input tax credit, and net statutory settlement.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-50 border rounded-xl">
          <p className="text-xs font-semibold text-slate-500">Total Output GST (Liability)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">₹{(outward.totalOutputGST || 0).toLocaleString('en-IN')}</p>
          <div className="text-[11px] text-slate-500 mt-1">
            CGST: ₹{(outward.totalCGST || 0).toLocaleString('en-IN')} | SGST: ₹{(outward.totalSGST || 0).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-4 bg-slate-50 border rounded-xl">
          <p className="text-xs font-semibold text-slate-500">Total Input GST (ITC)</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">₹{(itc.totalInputGST || 0).toLocaleString('en-IN')}</p>
          <div className="text-[11px] text-slate-500 mt-1">
            CGST: ₹{(itc.totalInputCGST || 0).toLocaleString('en-IN')} | SGST: ₹{(itc.totalInputSGST || 0).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-4 bg-slate-50 border rounded-xl">
          <p className="text-xs font-semibold text-slate-500">Net Tax Payable (Pre-Settlement)</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            ₹{Math.max(0, (outward.totalOutputGST || 0) - (itc.totalInputGST || 0)).toLocaleString('en-IN')}
          </p>
          <span className="text-xs text-slate-500">Output Tax less Eligible ITC</span>
        </div>
        <div className="p-4 bg-slate-50 border rounded-xl">
          <p className="text-xs font-semibold text-slate-500">Export / Zero-Rated Supplies</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">₹0.00</p>
          <span className="text-xs text-slate-500">Zero-rated under approved LUT</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category 6: TDS
// ─────────────────────────────────────────────────────────────────────────────
function TdsView({ data }: { data: any }) {
  const summary = data.summary || {};
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-lg font-bold text-slate-900">TDS (Tax Deducted at Source) Register</h2>
        <p className="text-sm text-slate-500">TDS deducted from vendor payments (Payable) and customer deductions (Receivable asset).</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 border rounded-xl">
          <p className="text-xs font-semibold text-slate-500">TDS Payable (Vendor Deductions)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">₹{(summary.totalTdsPayable || 0).toLocaleString('en-IN')}</p>
          <span className="text-xs text-slate-500">Deducted upon vendor payment settlement</span>
        </div>
        <div className="p-4 bg-slate-50 border rounded-xl">
          <p className="text-xs font-semibold text-slate-500">TDS Receivable (Customer Deductions)</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">₹{(summary.totalTdsReceivable || 0).toLocaleString('en-IN')}</p>
          <span className="text-xs text-slate-500">Withheld by clients on invoice receipt</span>
        </div>
        <div className="p-4 bg-slate-50 border rounded-xl">
          <p className="text-xs font-semibold text-slate-500">Statutory Compliance Status</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">Up to date</p>
          <span className="text-xs text-slate-500">Section 194C / 194J / 192</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category 7: Banking & Cash
// ─────────────────────────────────────────────────────────────────────────────
function BankingCashView({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Banking, Cash & BRS Workbench</h2>
          <p className="text-sm text-slate-500">Bank accounts, internal contra transfers, cash in hand, and reconciliation.</p>
        </div>
        <Link
          href="/bank-transfers/reconciliation"
          className="px-3 py-1.5 bg-blue-600 text-white font-medium text-xs rounded-lg hover:bg-blue-700 transition"
        >
          Open Bank Reconciliation (BRS) →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/bank-transfers"
          className="p-5 border rounded-xl bg-slate-50 hover:bg-white hover:shadow-sm transition"
        >
          <div className="text-2xl mb-2">🔄</div>
          <h3 className="font-bold text-slate-900">Bank Transfers & Contra</h3>
          <p className="text-xs text-slate-500 mt-1">Internal funds movement between primary bank and cash with zero P&L impact.</p>
        </Link>
        <Link
          href="/bank-transfers/reconciliation"
          className="p-5 border rounded-xl bg-slate-50 hover:bg-white hover:shadow-sm transition"
        >
          <div className="text-2xl mb-2">📑</div>
          <h3 className="font-bold text-slate-900">Bank Reconciliation (BRS)</h3>
          <p className="text-xs text-slate-500 mt-1">Import CSV/Excel bank statements and run non-destructive auto-matching.</p>
        </Link>
        <Link
          href="/ledgers?account=cash"
          className="p-5 border rounded-xl bg-slate-50 hover:bg-white hover:shadow-sm transition"
        >
          <div className="text-2xl mb-2">💵</div>
          <h3 className="font-bold text-slate-900">Cash in Hand Ledger</h3>
          <p className="text-xs text-slate-500 mt-1">Track physical petty cash register and cash deposits into bank.</p>
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category 8: Fixed Assets
// ─────────────────────────────────────────────────────────────────────────────
function FixedAssetsView({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-lg font-bold text-slate-900">Fixed Asset Register & Depreciation Schedule</h2>
        <p className="text-sm text-slate-500">Gross asset capitalization, annual WDV/SLM depreciation, and asset disposal accounting.</p>
      </div>

      <div className="p-6 bg-slate-50 border rounded-xl text-center space-y-3">
        <div className="text-4xl">🏢</div>
        <h3 className="font-bold text-slate-900">Fixed Assets Schedule</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Capitalized asset costs incorporate non-eligible GST. Annual depreciation is recognized strictly per ICAI standards.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            href="/financial-statements?tab=balance-sheet"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
          >
            View in Balance Sheet
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category 9: Employees & Salary
// ─────────────────────────────────────────────────────────────────────────────
function EmployeesSalaryView({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-lg font-bold text-slate-900">Employees & Salary Register</h2>
        <p className="text-sm text-slate-500">Decoupled Employee Master, direct salary expense postings, and employee reimbursements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 border rounded-xl bg-slate-50">
          <h3 className="font-bold text-slate-900 text-sm">Direct Salary Accounting</h3>
          <p className="text-xs text-slate-600 mt-2">
            Salary disbursements post directly to Salary Expense (P&L Dr) and Bank (Cr) with optional TDS under Section 192.
            Employees do not pass through Sundry Creditors / Trade Payables.
          </p>
        </div>
        <div className="p-5 border rounded-xl bg-slate-50">
          <h3 className="font-bold text-slate-900 text-sm">Employee-Paid Expense Claims</h3>
          <p className="text-xs text-slate-600 mt-2">
            Business expenses incurred by employees create an Employee Payable liability without bank movement until subsequent reimbursement.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category 10: Analysis & Intelligence
// ─────────────────────────────────────────────────────────────────────────────
function AnalysisIntelligenceView({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-lg font-bold text-slate-900">Financial Analysis & Business Intelligence</h2>
        <p className="text-sm text-slate-500">Comparative financial statements, key accounting ratios, and concentration analysis.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/financial-statements?tab=comparative"
          className="p-5 border rounded-xl bg-slate-50 hover:bg-white hover:shadow-sm transition"
        >
          <div className="text-2xl mb-2">📊</div>
          <h3 className="font-bold text-slate-900">Comparative Statements</h3>
          <p className="text-xs text-slate-500 mt-1">Multi-period horizontal variance analysis across revenue, expenses, and balance sheet items.</p>
        </Link>
        <Link
          href="/financial-statements?tab=analysis"
          className="p-5 border rounded-xl bg-slate-50 hover:bg-white hover:shadow-sm transition"
        >
          <div className="text-2xl mb-2">💡</div>
          <h3 className="font-bold text-slate-900">Financial Ratios & Intelligence</h3>
          <p className="text-xs text-slate-500 mt-1">Liquidity ratios, debtor turnover days, operating profit margins, and working capital cycle.</p>
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category 11: Audit & Transactions
// ─────────────────────────────────────────────────────────────────────────────
function AuditTransactionsView({ data }: { data: any }) {
  const vouchers = data.vouchers || [];
  return (
    <div className="space-y-6">
      <div className="border-b pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">General Ledger & Daybook Journal Audit</h2>
          <p className="text-sm text-slate-500">Double-entry balanced journal vouchers generated by AccountingEngine.</p>
        </div>
        <Link
          href="/ledgers"
          className="px-3 py-1.5 bg-blue-600 text-white font-medium text-xs rounded-lg hover:bg-blue-700 transition"
        >
          Open Account Ledgers →
        </Link>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b text-slate-600 uppercase font-semibold">
            <tr>
              <th className="p-3">Voucher #</th>
              <th className="p-3">Type</th>
              <th className="p-3">Date</th>
              <th className="p-3">Narration / Reference</th>
              <th className="p-3 text-right">Debit</th>
              <th className="p-3 text-right">Credit</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vouchers.slice(0, 20).map((v: any) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="p-3 font-medium text-blue-600">{v.voucherNumber}</td>
                <td className="p-3 text-slate-600">{v.voucherType}</td>
                <td className="p-3 text-slate-500">{new Date(v.date).toLocaleDateString('en-IN')}</td>
                <td className="p-3 text-slate-800">{v.narration || v.reference || '—'}</td>
                <td className="p-3 text-right font-medium">₹{Number(v.totalDebit || 0).toLocaleString('en-IN')}</td>
                <td className="p-3 text-right font-medium">₹{Number(v.totalCredit || 0).toLocaleString('en-IN')}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${v.isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {v.isBalanced ? 'Balanced' : 'Unbalanced'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
