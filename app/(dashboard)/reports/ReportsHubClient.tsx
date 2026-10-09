'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FinancialStatementsClient } from '../financial-statements/FinancialStatementsClient';
import { formatCurrency } from '@/lib/utils/currency';
import { PayslipModal } from '../expenses/PayslipModal';
import { getForm24QAction, getForm16Action } from '../expenses/payroll-actions';

export interface ReportsHubProps {
  currentCategory: string;
  financialYear: string;
  fromDate?: string;
  toDate?: string;
  tab?: string;
  reportData: any;
  accountingEquilibrium: {
    isBalanced: boolean;
    tbDiff: number;
    bsDiff: number;
    cashBalance: number;
  };
}

export const REPORT_CATEGORIES = [
  { id: 'overview', name: 'Executive Reports', icon: '🏛️', description: 'High-level financial KPIs, health scorecard, and executive summary.' },
  { id: 'statements', name: 'Financial Statements', icon: '⚖️', description: 'Standard accounting reports from the General Ledger.' },
  { id: 'sales', name: 'Sales & Receivables', icon: '📈', description: 'Customer receivables, ageing analysis, and revenue insights.' },
  { id: 'expenses', name: 'Expenses & Payables', icon: '📉', description: 'Vendor payables, ageing analysis, and expense categorization.' },
  { id: 'gst', name: 'GST & Tax', icon: '📑', description: 'GSTR-1, GSTR-3B summaries, and tax liability reports.' },
  { id: 'tds', name: 'TDS', icon: '🏷️', description: 'Tax Deducted at Source ledgers and quarterly returns.' },
  { id: 'banking', name: 'Banking & Cash', icon: '🏦', description: 'Bank balances, cash in hand, and reconciliation statements.' },
  { id: 'assets', name: 'Fixed Assets', icon: '🏢', description: 'Asset register and depreciation schedules.' },
  { id: 'employees', name: 'Employees & Salary', icon: '👥', description: 'Payroll disbursements and employee advances.' },
  { id: 'analysis', name: 'Analysis', icon: '💡', description: 'Financial ratios, variance analysis, and operational margins.' },
  { id: 'audit', name: 'Audit', icon: '🔍', description: 'Audit trail, journal vouchers, and integrity validations.' },
];

export function ReportsHubClient({
  currentCategory,
  financialYear,
  fromDate,
  toDate,
  tab,
  reportData,
  accountingEquilibrium,
}: ReportsHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedFY, setSelectedFY] = useState(financialYear || 'FY 2026–27');
  const [activeReportTab, setActiveReportTab] = useState<string>(tab || 'default');

  const currentCategoryObj =
    REPORT_CATEGORIES.find((c) => c.id === currentCategory) || REPORT_CATEGORIES[0];

  const handleFYChange = (newFY: string) => {
    setSelectedFY(newFY);
    const params = new URLSearchParams(searchParams.toString());
    params.set('financialYear', newFY);
    router.push(`/reports?${params.toString()}`);
  };

  const handleExportCSV = () => {
    if (!reportData || !reportData.data) {
      alert('No tabular data to export for this view.');
      return;
    }
    const rows = reportData.data;
    if (!Array.isArray(rows) || rows.length === 0) {
      alert('No records available to export.');
      return;
    }
    const headers = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== 'object');
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...rows.map((r) =>
          headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentCategory}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Dynamic Top Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#D9E3DC] shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#17211B] tracking-tight">
              {currentCategoryObj.name}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                accountingEquilibrium.isBalanced
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border border-rose-300'
              }`}
            >
              {accountingEquilibrium.isBalanced ? '✓ Double-Entry Balanced' : '⚠ Out of Balance'}
            </span>
          </div>
          <p className="text-xs text-[#68756C] mt-1 font-normal">
            {currentCategoryObj.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {currentCategory !== 'statements' && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[#68756C]">FY:</label>
              <select
                value={selectedFY}
                onChange={(e) => handleFYChange(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-[#D9E3DC] rounded-xl font-semibold text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#177B55]"
              >
                <option value="FY 2026–27">FY 2026–27</option>
                <option value="FY 2025–26">FY 2025–26</option>
                <option value="FY 2024–25">FY 2024–25</option>
              </select>
            </div>
          )}

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-semibold text-[#4B5563] bg-white border border-[#D9E3DC] rounded-xl hover:bg-[#F4F7F3] shadow-xs transition"
          >
            🖨️ Print
          </button>

          <Link
            href="/ledgers"
            className="px-3 py-1.5 text-xs font-semibold text-[#4B5563] bg-white border border-[#D9E3DC] rounded-xl hover:bg-[#F4F7F3] shadow-xs transition inline-flex items-center gap-1"
          >
            Trace in Ledgers →
          </Link>

          {currentCategory !== 'statements' && (
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold text-[#177B55] bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition shadow-xs flex items-center gap-1"
            >
              📥 Export CSV
            </button>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* REPORT CONTENT & RIBBON                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {currentCategory === 'statements' ? (
        <FinancialStatementsRenderer
          data={reportData}
          selectedFY={selectedFY}
          fromDate={fromDate}
          toDate={toDate}
          tab={tab}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6 space-y-6">
          {renderCategoryWithRibbon(currentCategory, reportData, activeReportTab, setActiveReportTab)}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category 2: Financial Statements (Renders the 5-item Ribbon)
// ─────────────────────────────────────────────────────────────────────────────
function FinancialStatementsRenderer({
  data,
  selectedFY,
  fromDate,
  toDate,
  tab,
}: {
  data: any;
  selectedFY: string;
  fromDate?: string;
  toDate?: string;
  tab?: string;
}) {
  if (!data || !data.trialBalance) {
    return (
      <div className="bg-white rounded-2xl border border-[#D9E3DC] p-12 text-center text-[#68756C]">
        Loading Financial Statements...
      </div>
    );
  }

  return (
    <FinancialStatementsClient
      hideTopHeader={true}
      basePath="/reports?category=statements"
      currentFilters={{
        financialYear: selectedFY,
        period: 'ALL',
        fromDate,
        toDate,
        comparisonType: 'PREV_FY',
        tab: tab || data.activeTab || 'trial-balance',
      }}
      trialBalance={data.trialBalance}
      profitAndLoss={data.profitAndLoss}
      balanceSheet={data.balanceSheet}
      cashFlow={data.cashFlow}
      comparativePnl={data.comparativePnl}
      comparativeBs={data.comparativeBs}
      comparativeCf={data.comparativeCf}
      financialRatios={data.financialRatios || {
        currentPeriodLabel: selectedFY,
        previousPeriodLabel: '',
        hasPreviousData: false,
        ratios: [],
      }}
      financialAnalysis={data.financialAnalysis || {
        managementInsights: [],
        monthlyTrends: [],
        customerConcentration: [],
        expenseBreakdown: [],
        vendorConcentration: [],
      }}
      customers={data.customers || []}
      vendors={data.vendors || []}
      categories={data.categories || []}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Dispatcher with Category-Specific Report Ribbons
// ─────────────────────────────────────────────────────────────────────────────
function renderCategoryWithRibbon(
  category: string,
  data: any,
  activeTab: string,
  setActiveTab: (t: string) => void
) {
  if (!data) {
    return <div className="text-center py-12 text-[#68756C]">Loading report data...</div>;
  }

  switch (category) {
    case 'overview':
      return <ExecutiveReportsView data={data} activeTab={activeTab} setActiveTab={setActiveTab} />;
    case 'sales':
      return <SalesReceivablesView data={data} activeTab={activeTab} setActiveTab={setActiveTab} />;
    case 'expenses':
      return <ExpensesPayablesView data={data} activeTab={activeTab} setActiveTab={setActiveTab} />;
    case 'gst':
      return <GstTaxView data={data} activeTab={activeTab} setActiveTab={setActiveTab} />;
    case 'tds':
      return <TdsView data={data} activeTab={activeTab} setActiveTab={setActiveTab} />;
    case 'banking':
      return <BankingCashView data={data} activeTab={activeTab} setActiveTab={setActiveTab} />;
    case 'assets':
      return <FixedAssetsView data={data} activeTab={activeTab} setActiveTab={setActiveTab} />;
    case 'employees':
      return <EmployeesSalaryView data={data} activeTab={activeTab} setActiveTab={setActiveTab} />;
    case 'analysis':
      return <AnalysisView data={data} activeTab={activeTab} setActiveTab={setActiveTab} />;
    case 'audit':
      return <AuditView data={data} activeTab={activeTab} setActiveTab={setActiveTab} />;
    default:
      return <ExecutiveReportsView data={data} activeTab={activeTab} setActiveTab={setActiveTab} />;
  }
}

// Helper: Horizontal Ribbon Navigation inside a Category
function CategoryRibbon({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  const current = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0].id;

  return (
    <div className="border-b border-[#D9E3DC] flex overflow-x-auto custom-scrollbar -mx-6 px-6 pb-2">
      <nav className="flex space-x-6 min-w-max" aria-label="Module Ribbon">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`whitespace-nowrap pb-2 font-bold text-xs transition-all border-b-2 cursor-pointer ${
              current === tab.id
                ? 'border-[#177B55] text-[#177B55]'
                : 'border-transparent text-[#68756C] hover:text-[#17211B] hover:border-[#D9E3DC]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Executive Reports
// ─────────────────────────────────────────────────────────────────────────────
function ExecutiveReportsView({
  data,
  activeTab,
  setActiveTab,
}: {
  data: any;
  activeTab: string;
  setActiveTab: (t: string) => void;
}) {
  const tabs = [
    { id: 'overview', label: 'Executive Overview' },
    { id: 'kpis', label: 'Operating KPIs' },
    { id: 'margins', label: 'Revenue & Margins' },
  ];
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'overview';
  const kpis = data.kpis || {};

  return (
    <div className="space-y-6">
      <CategoryRibbon tabs={tabs} activeTab={currentTab} onTabChange={setActiveTab} />

      {currentTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
              <p className="text-xs font-semibold text-[#68756C]">Total Revenue</p>
              <p className="text-2xl font-bold text-[#17211B] mt-1">₹{(kpis.revenue || 0).toLocaleString('en-IN')}</p>
              <span className="text-xs text-emerald-600 font-medium">Billed Turnover</span>
            </div>
            <div className="p-4 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
              <p className="text-xs font-semibold text-[#68756C]">Operating Expenses</p>
              <p className="text-2xl font-bold text-[#17211B] mt-1">₹{(kpis.operatingExpenses || 0).toLocaleString('en-IN')}</p>
              <span className="text-xs text-[#68756C] font-medium">Direct & Indirect Costs</span>
            </div>
            <div className="p-4 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
              <p className="text-xs font-semibold text-[#68756C]">Net Profit After Tax</p>
              <p className={`text-2xl font-bold mt-1 ${(kpis.netProfitAfterTax || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                ₹{(kpis.netProfitAfterTax || 0).toLocaleString('en-IN')}
              </p>
              <span className="text-xs text-[#68756C] font-medium">Net Margin: {kpis.netMargin || 0}%</span>
            </div>
            <div className="p-4 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
              <p className="text-xs font-semibold text-[#68756C]">Cash & Bank Liquidity</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">₹{(kpis.cashAndBank || 0).toLocaleString('en-IN')}</p>
              <span className="text-xs text-emerald-600 font-medium">Reconciled Balance</span>
            </div>
          </div>
        </div>
      )}

      {currentTab === 'kpis' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
            <p className="text-xs font-semibold text-[#68756C]">Operating Profit (EBITDA)</p>
            <p className="text-xl font-bold text-[#17211B] mt-1">₹{(kpis.operatingProfit || 0).toLocaleString('en-IN')}</p>
            <span className="text-xs text-[#68756C]">Operating Margin: {kpis.operatingMargin || 0}%</span>
          </div>
          <div className="p-4 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
            <p className="text-xs font-semibold text-[#68756C]">Debtor Days (DSO)</p>
            <p className="text-xl font-bold text-[#17211B] mt-1">{kpis.debtorDays || 0} Days</p>
            <span className="text-xs text-emerald-600">Collection cycle</span>
          </div>
          <div className="p-4 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
            <p className="text-xs font-semibold text-[#68756C]">Creditor Days (DPO)</p>
            <p className="text-xl font-bold text-[#17211B] mt-1">{kpis.creditorDays || 0} Days</p>
            <span className="text-xs text-blue-600">Payable cycle</span>
          </div>
        </div>
      )}

      {currentTab === 'margins' && (
        <div className="p-6 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl space-y-3">
          <h3 className="text-sm font-bold text-[#17211B]">Margin & Return Analysis</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-white border border-[#D9E3DC] rounded-lg">
              <span className="text-[#68756C]">Operating Margin:</span>
              <span className="font-bold text-[#17211B] ml-2">{kpis.operatingMargin || 0}%</span>
            </div>
            <div className="p-3 bg-white border border-[#D9E3DC] rounded-lg">
              <span className="text-[#68756C]">Net Profit Margin:</span>
              <span className="font-bold text-[#17211B] ml-2">{kpis.netMargin || 0}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Sales & Receivables
// ─────────────────────────────────────────────────────────────────────────────
function SalesReceivablesView({
  data,
  activeTab,
  setActiveTab,
}: {
  data: any;
  activeTab: string;
  setActiveTab: (t: string) => void;
}) {
  const tabs = [
    { id: 'register', label: 'Sales Register' },
    { id: 'ageing', label: 'Receivables Ageing' },
    { id: 'summary', label: 'Customer Summary' },
  ];
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'register';
  const summary = data.summary || {};
  const invoices = data.data || [];

  return (
    <div className="space-y-6">
      <CategoryRibbon tabs={tabs} activeTab={currentTab} onTabChange={setActiveTab} />

      {/* Summary KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
          <p className="text-xs font-semibold text-[#68756C]">Gross Sales Invoiced</p>
          <p className="text-xl font-bold text-[#17211B]">₹{(summary.totalSales || summary.totalTaxableAmount || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="p-3 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
          <p className="text-xs font-semibold text-[#68756C]">Total GST Charged</p>
          <p className="text-xl font-bold text-[#17211B]">₹{(summary.totalGST || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="p-3 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
          <p className="text-xs font-semibold text-[#68756C]">Outstanding Receivables</p>
          <p className="text-xl font-bold text-amber-600">₹{(summary.outstandingReceivables || summary.outstandingAmount || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="p-3 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
          <p className="text-xs font-semibold text-[#68756C]">Total Collected</p>
          <p className="text-xl font-bold text-emerald-600">₹{(summary.totalCollected || summary.paidAmount || 0).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {currentTab === 'register' && (
        <div className="overflow-x-auto border border-[#D9E3DC] rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFBF9] border-b border-[#D9E3DC] text-[#68756C] uppercase font-semibold">
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
            <tbody className="divide-y divide-[#E9EEE9]">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-[#68756C]">No invoice records found.</td>
                </tr>
              ) : (
                invoices.slice(0, 20).map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-[#FAFBF9]">
                    <td className="p-3 font-medium text-[#177B55]">
                      <Link href="/invoices">{inv.invoiceNumber}</Link>
                    </td>
                    <td className="p-3 text-[#68756C]">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                    <td className="p-3 text-[#17211B] font-medium">{inv.customerNameSnapshot || inv.customer?.legalName}</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {currentTab === 'ageing' && (
        <div className="p-6 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl text-center space-y-2">
          <h3 className="font-bold text-[#17211B] text-sm">Receivables Ageing Schedule</h3>
          <p className="text-xs text-[#68756C]">Ageing breakdown matching Trade Receivables ledger control account.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 max-w-2xl mx-auto">
            <div className="p-3 bg-white border border-[#D9E3DC] rounded-lg">
              <span className="text-[10px] text-[#68756C] font-semibold">0–30 Days</span>
              <p className="font-bold text-[#17211B] text-sm mt-0.5">₹{(summary.outstandingReceivables || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 bg-white border border-[#D9E3DC] rounded-lg">
              <span className="text-[10px] text-[#68756C] font-semibold">31–60 Days</span>
              <p className="font-bold text-[#17211B] text-sm mt-0.5">₹0</p>
            </div>
            <div className="p-3 bg-white border border-[#D9E3DC] rounded-lg">
              <span className="text-[10px] text-[#68756C] font-semibold">61–90 Days</span>
              <p className="font-bold text-[#17211B] text-sm mt-0.5">₹0</p>
            </div>
            <div className="p-3 bg-white border border-[#D9E3DC] rounded-lg">
              <span className="text-[10px] text-[#68756C] font-semibold">&gt; 90 Days</span>
              <p className="font-bold text-[#17211B] text-sm mt-0.5">₹0</p>
            </div>
          </div>
        </div>
      )}

      {currentTab === 'summary' && (
        <div className="p-6 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl space-y-2">
          <h3 className="font-bold text-[#17211B] text-sm">Customer Receivable Summary</h3>
          <p className="text-xs text-[#68756C]">Active client receivables balance snapshot.</p>
          <div className="text-xs text-[#17211B] pt-2">
            Total active client balances currently reconciled with General Ledger.
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Expenses & Payables
// ─────────────────────────────────────────────────────────────────────────────
function ExpensesPayablesView({
  data,
  activeTab,
  setActiveTab,
}: {
  data: any;
  activeTab: string;
  setActiveTab: (t: string) => void;
}) {
  const tabs = [
    { id: 'register', label: 'Expense Register' },
    { id: 'ageing', label: 'Payables Ageing' },
    { id: 'summary', label: 'Vendor Summary' },
  ];
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'register';
  const summary = data.summary || {};
  const expenses = data.data || [];

  return (
    <div className="space-y-6">
      <CategoryRibbon tabs={tabs} activeTab={currentTab} onTabChange={setActiveTab} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
          <p className="text-xs font-semibold text-[#68756C]">Operating Expenses</p>
          <p className="text-xl font-bold text-[#17211B]">₹{(summary.totalExpenses || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="p-3 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
          <p className="text-xs font-semibold text-[#68756C]">Capitalized Fixed Assets</p>
          <p className="text-xl font-bold text-[#17211B]">₹{(summary.totalFixedAssets || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="p-3 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
          <p className="text-xs font-semibold text-[#68756C]">Input GST (ITC)</p>
          <p className="text-xl font-bold text-blue-600">₹{(summary.totalInputGST || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="p-3 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
          <p className="text-xs font-semibold text-[#68756C]">Unpaid Payables</p>
          <p className="text-xl font-bold text-rose-600">₹{(summary.unpaidExpenses || summary.outstandingAmount || 0).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {currentTab === 'register' && (
        <div className="overflow-x-auto border border-[#D9E3DC] rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFBF9] border-b border-[#D9E3DC] text-[#68756C] uppercase font-semibold">
              <tr>
                <th className="p-3">Expense #</th>
                <th className="p-3">Date</th>
                <th className="p-3">Party / Category</th>
                <th className="p-3 text-right">Taxable</th>
                <th className="p-3 text-right">Input GST</th>
                <th className="p-3 text-right">Net Amount</th>
                <th className="p-3 text-center">ITC Eligible</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EEE9]">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-[#68756C]">No expense records found.</td>
                </tr>
              ) : (
                expenses.slice(0, 20).map((exp: any) => (
                  <tr key={exp.id} className="hover:bg-[#FAFBF9]">
                    <td className="p-3 font-medium text-[#177B55]">
                      <Link href="/expenses">{exp.expenseNumber}</Link>
                    </td>
                    <td className="p-3 text-[#68756C]">{new Date(exp.expenseDate).toLocaleDateString('en-IN')}</td>
                    <td className="p-3 text-[#17211B]">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {currentTab === 'ageing' && (
        <div className="p-6 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl text-center space-y-2">
          <h3 className="font-bold text-[#17211B] text-sm">Vendor Payables Ageing</h3>
          <p className="text-xs text-[#68756C]">Obligations matching Trade Payables / Sundry Creditors ledger.</p>
        </div>
      )}

      {currentTab === 'summary' && (
        <div className="p-6 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl space-y-2">
          <h3 className="font-bold text-[#17211B] text-sm">Vendor Liability Summary</h3>
          <p className="text-xs text-[#68756C]">Active supplier balance list and payment due dates.</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. GST & Tax
// ─────────────────────────────────────────────────────────────────────────────
function GstTaxView({
  data,
  activeTab,
  setActiveTab,
}: {
  data: any;
  activeTab: string;
  setActiveTab: (t: string) => void;
}) {
  const tabs = [
    { id: 'gstr1', label: 'GSTR-1 Outward Supplies' },
    { id: 'itc', label: 'Input Tax Credit (ITC)' },
    { id: 'settlement', label: 'Net Tax Settlement' },
  ];
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'gstr1';
  const outward = data.outward?.summary || {};
  const itc = data.itc?.summary || {};

  return (
    <div className="space-y-6">
      <CategoryRibbon tabs={tabs} activeTab={currentTab} onTabChange={setActiveTab} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
          <p className="text-xs font-semibold text-[#68756C]">Total Output GST (Liability)</p>
          <p className="text-2xl font-bold text-[#17211B] mt-1">₹{(outward.totalOutputGST || 0).toLocaleString('en-IN')}</p>
          <div className="text-[11px] text-[#68756C] mt-1">
            CGST: ₹{(outward.totalCGST || 0).toLocaleString('en-IN')} | SGST: ₹{(outward.totalSGST || 0).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-4 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
          <p className="text-xs font-semibold text-[#68756C]">Total Input GST (ITC)</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">₹{(itc.totalInputGST || 0).toLocaleString('en-IN')}</p>
          <div className="text-[11px] text-[#68756C] mt-1">
            CGST: ₹{(itc.totalInputCGST || 0).toLocaleString('en-IN')} | SGST: ₹{(itc.totalInputSGST || 0).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-4 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
          <p className="text-xs font-semibold text-[#68756C]">Net Tax Payable</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            ₹{Math.max(0, (outward.totalOutputGST || 0) - (itc.totalInputGST || 0)).toLocaleString('en-IN')}
          </p>
          <span className="text-xs text-[#68756C]">Output Tax less Eligible ITC</span>
        </div>
        <div className="p-4 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
          <p className="text-xs font-semibold text-[#68756C]">Export / Zero-Rated</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">₹0.00</p>
          <span className="text-xs text-[#68756C]">Zero-rated under approved LUT</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. TDS
// ─────────────────────────────────────────────────────────────────────────────
function TdsView({
  data,
  activeTab,
  setActiveTab,
}: {
  data: any;
  activeTab: string;
  setActiveTab: (t: string) => void;
}) {
  const tabs = [
    { id: 'summary', label: 'TDS Summary' },
    { id: 'payable', label: 'Vendor Deductions (Payable)' },
    { id: 'receivable', label: 'Customer Deductions (Receivable)' },
  ];
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'summary';
  const summary = data.summary || {};

  return (
    <div className="space-y-6">
      <CategoryRibbon tabs={tabs} activeTab={currentTab} onTabChange={setActiveTab} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
          <p className="text-xs font-semibold text-[#68756C]">TDS Payable (Vendor Deductions)</p>
          <p className="text-2xl font-bold text-[#17211B] mt-1">₹{(summary.totalTdsPayable || 0).toLocaleString('en-IN')}</p>
          <span className="text-xs text-[#68756C]">Deducted upon vendor payment settlement</span>
        </div>
        <div className="p-4 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
          <p className="text-xs font-semibold text-[#68756C]">TDS Receivable (Customer Deductions)</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">₹{(summary.totalTdsReceivable || 0).toLocaleString('en-IN')}</p>
          <span className="text-xs text-[#68756C]">Withheld by clients on invoice receipt</span>
        </div>
        <div className="p-4 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
          <p className="text-xs font-semibold text-[#68756C]">Compliance Status</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">Up to date</p>
          <span className="text-xs text-[#68756C]">Section 194C / 194J / 192</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Banking & Cash
// ─────────────────────────────────────────────────────────────────────────────
function BankingCashView({
  data,
  activeTab,
  setActiveTab,
}: {
  data: any;
  activeTab: string;
  setActiveTab: (t: string) => void;
}) {
  const tabs = [
    { id: 'accounts', label: 'Bank Accounts' },
    { id: 'cash', label: 'Cash in Hand' },
    { id: 'reconciliation', label: 'Reconciliation (BRS)' },
  ];
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'accounts';

  return (
    <div className="space-y-6">
      <CategoryRibbon tabs={tabs} activeTab={currentTab} onTabChange={setActiveTab} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/bank-transfers?tab=transfers"
          className="p-5 border border-[#D9E3DC] rounded-xl bg-[#FAFBF9] hover:bg-white hover:shadow-sm transition"
        >
          <div className="text-2xl mb-2">🔄</div>
          <h3 className="font-bold text-[#17211B] text-sm">Bank Transfers & Contra</h3>
          <p className="text-xs text-[#68756C] mt-1">Internal funds movement with zero P&L impact.</p>
        </Link>
        <Link
          href="/bank-transfers?tab=reconciliation"
          className="p-5 border border-[#D9E3DC] rounded-xl bg-[#FAFBF9] hover:bg-white hover:shadow-sm transition"
        >
          <div className="text-2xl mb-2">📑</div>
          <h3 className="font-bold text-[#17211B] text-sm">Bank Reconciliation (BRS)</h3>
          <p className="text-xs text-[#68756C] mt-1">Import bank statements and match with ledgers.</p>
        </Link>
        <Link
          href="/ledgers"
          className="p-5 border border-[#D9E3DC] rounded-xl bg-[#FAFBF9] hover:bg-white hover:shadow-sm transition"
        >
          <div className="text-2xl mb-2">💵</div>
          <h3 className="font-bold text-[#17211B] text-sm">Cash in Hand Ledger</h3>
          <p className="text-xs text-[#68756C] mt-1">Physical petty cash book and cash deposits.</p>
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Fixed Assets
// ─────────────────────────────────────────────────────────────────────────────
function FixedAssetsView({
  data,
  activeTab,
  setActiveTab,
}: {
  data: any;
  activeTab: string;
  setActiveTab: (t: string) => void;
}) {
  const tabs = [
    { id: 'register', label: 'Asset Register' },
    { id: 'depreciation', label: 'Depreciation Schedule' },
    { id: 'disposals', label: 'Disposals' },
  ];
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'register';

  const assets = data?.assets || [];
  const depreciations = data?.depreciations || [];
  const disposals = data?.disposals || [];

  const totalGross = assets.reduce((sum: number, a: any) => sum + (a.grossAmount || 0), 0);
  const totalAccDep = assets.reduce((sum: number, a: any) => {
    const acc = (a.depreciations || []).reduce((dSum: number, d: any) => dSum + (d.depreciationAmount || 0), 0);
    return sum + acc;
  }, 0);
  const totalNetBookValue = totalGross - totalAccDep;

  return (
    <div className="space-y-6">
      <CategoryRibbon tabs={tabs} activeTab={currentTab} onTabChange={setActiveTab} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#D9E3DC] rounded-2xl shadow-xs">
          <p className="text-xs font-semibold text-[#68756C]">Gross Block (Cost)</p>
          <p className="text-xl font-bold text-[#17211B] mt-1">{formatCurrency(totalGross)}</p>
        </div>
        <div className="p-4 bg-white border border-[#D9E3DC] rounded-2xl shadow-xs">
          <p className="text-xs font-semibold text-[#68756C]">Accumulated Depreciation</p>
          <p className="text-xl font-bold text-[#E5484D] mt-1">{formatCurrency(totalAccDep)}</p>
        </div>
        <div className="p-4 bg-white border border-[#D9E3DC] rounded-2xl shadow-xs">
          <p className="text-xs font-semibold text-[#68756C]">Net Book Value (WDV)</p>
          <p className="text-xl font-bold text-[#177B55] mt-1">{formatCurrency(totalNetBookValue)}</p>
        </div>
        <div className="p-4 bg-white border border-[#D9E3DC] rounded-2xl shadow-xs">
          <p className="text-xs font-semibold text-[#68756C]">Capital Assets Count</p>
          <p className="text-xl font-bold text-[#17211B] mt-1">{assets.length}</p>
        </div>
      </div>

      {/* Tab: Asset Register */}
      {currentTab === 'register' && (
        <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#D9E3DC] bg-[#FAFBF9] flex justify-between items-center">
            <div>
              <h3 className="font-bold text-[#17211B] text-sm">Fixed Asset Register</h3>
              <p className="text-xs text-[#68756C]">
                Capitalized equipment, laptops, and furniture adhering to ICAI Schedule II / AS-10.
              </p>
            </div>
            <Link
              href="/expenses/new"
              className="px-3.5 py-2 bg-[#177B55] text-white rounded-xl text-xs font-bold hover:bg-[#0B5F46] transition"
            >
              + Capitalize Asset
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D9E3DC] bg-[#FAFBF9] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                  <th className="py-3 px-4">Voucher / Asset</th>
                  <th className="py-3 px-4">Description / Notes</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Gross Cost</th>
                  <th className="py-3 px-4 text-center">Rate</th>
                  <th className="py-3 px-4 text-right">Acc. Dep.</th>
                  <th className="py-3 px-4 text-right">Net Book Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEE9]">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#68756C]">
                      <div className="text-2xl mb-1">🏢</div>
                      <p className="font-semibold text-sm text-[#17211B]">No Capitalized Assets Recorded Yet</p>
                      <p className="text-xs mt-1">
                        When recording asset purchases (e.g. laptops, servers), toggle &ldquo;Capitalize as Asset&rdquo; in the Expense form.
                      </p>
                    </td>
                  </tr>
                ) : (
                  assets.map((asset: any) => {
                    const accDep = (asset.depreciations || []).reduce(
                      (sum: number, d: any) => sum + (d.depreciationAmount || 0),
                      0
                    );
                    const nbv = (asset.grossAmount || 0) - accDep;

                    return (
                      <tr key={asset.id} className="hover:bg-[#F9FAF8] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#17211B]">
                          {asset.expenseNumber}
                        </td>
                        <td className="py-3.5 px-4 text-[#17211B]">
                          {asset.notes || asset.category?.name || 'Capital Asset'}
                        </td>
                        <td className="py-3.5 px-4 text-[#4B5563]">
                          {asset.vendor?.name || 'Direct / Bank'}
                        </td>
                        <td className="py-3.5 px-4 text-[#68756C]">
                          {asset.expenseDate ? new Date(asset.expenseDate).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-[#17211B]">
                          {formatCurrency(asset.grossAmount || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          {asset.depreciationRate ? `${asset.depreciationRate}%` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right text-[#E5484D] font-mono">
                          {formatCurrency(accDep)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#177B55]">
                          {formatCurrency(nbv)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Depreciation Schedule */}
      {currentTab === 'depreciation' && (
        <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#D9E3DC] bg-[#FAFBF9]">
            <h3 className="font-bold text-[#17211B] text-sm">Depreciation Schedule</h3>
            <p className="text-xs text-[#68756C]">
              Depreciation written off across financial years under WDV / SLM methods.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D9E3DC] bg-[#FAFBF9] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                  <th className="py-3 px-4">Financial Year</th>
                  <th className="py-3 px-4">Asset / Voucher</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-center">Rate</th>
                  <th className="py-3 px-4 text-right">Written-Off Amount</th>
                  <th className="py-3 px-4">Effective Date</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEE9]">
                {depreciations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#68756C]">
                      No depreciation entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  depreciations.map((dep: any) => (
                    <tr key={dep.id} className="hover:bg-[#F9FAF8] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#17211B]">{dep.financialYear}</td>
                      <td className="py-3.5 px-4 font-mono">{dep.expense?.expenseNumber || '—'}</td>
                      <td className="py-3.5 px-4">{dep.method}</td>
                      <td className="py-3.5 px-4 text-center">{dep.rate}%</td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#E5484D]">
                        {formatCurrency(dep.depreciationAmount || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-[#68756C]">
                        {dep.effectiveDate ? new Date(dep.effectiveDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-[#68756C]">{dep.remarks || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Disposals */}
      {currentTab === 'disposals' && (
        <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#D9E3DC] bg-[#FAFBF9]">
            <h3 className="font-bold text-[#17211B] text-sm">Asset Disposals & Write-Offs</h3>
            <p className="text-xs text-[#68756C]">
              History of retired, scrapped, or sold fixed assets and realized capital gain/loss.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D9E3DC] bg-[#FAFBF9] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                  <th className="py-3 px-4">Disposal Date</th>
                  <th className="py-3 px-4">Asset</th>
                  <th className="py-3 px-4 text-right">Gross Cost</th>
                  <th className="py-3 px-4 text-right">Acc. Dep.</th>
                  <th className="py-3 px-4 text-right">Net Book Value</th>
                  <th className="py-3 px-4 text-right">Sale Proceeds</th>
                  <th className="py-3 px-4 text-right">Gain / Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEE9]">
                {disposals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#68756C]">
                      No asset disposals or write-offs on record.
                    </td>
                  </tr>
                ) : (
                  disposals.map((disp: any) => (
                    <tr key={disp.id} className="hover:bg-[#F9FAF8] transition-colors">
                      <td className="py-3.5 px-4 text-[#68756C]">
                        {disp.disposalDate ? new Date(disp.disposalDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono">{disp.expense?.expenseNumber || '—'}</td>
                      <td className="py-3.5 px-4 text-right">{formatCurrency(disp.grossCost || 0)}</td>
                      <td className="py-3.5 px-4 text-right text-[#E5484D]">
                        {formatCurrency(disp.accumulatedDepreciation || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right">{formatCurrency(disp.netBookValue || 0)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#17211B]">
                        {formatCurrency(disp.saleProceeds || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold">
                        <span className={disp.gainOrLoss >= 0 ? 'text-[#177B55]' : 'text-[#E5484D]'}>
                          {formatCurrency(disp.gainOrLoss || 0)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Employees & Salary
// ─────────────────────────────────────────────────────────────────────────────
function EmployeesSalaryView({
  data,
  activeTab,
  setActiveTab,
}: {
  data: any;
  activeTab: string;
  setActiveTab: (t: string) => void;
}) {
  const tabs = [
    { id: 'register', label: 'Employee Register & CTC' },
    { id: 'salary', label: 'Payroll & Salary Disbursements' },
    { id: 'form24q', label: 'Form 24Q Quarterly TDS Return' },
    { id: 'form16', label: 'Form 16 Tax Certificate (Part B)' },
  ];
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'register';

  // Payslip modal state
  const [selectedPayslipExpenseId, setSelectedPayslipExpenseId] = useState<string | null>(null);

  // Form 24Q state
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q2');
  const [form24QData, setForm24QData] = useState<any>(data.form24Q || null);
  const [loading24Q, setLoading24Q] = useState(false);

  // Form 16 state
  const employees = data.employees || [];
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id || '');
  const [form16Data, setForm16Data] = useState<any>(data.initialForm16 || null);
  const [loading16, setLoading16] = useState(false);

  const handleQuarterChange = async (q: string) => {
    setSelectedQuarter(q);
    setLoading24Q(true);
    try {
      const res = await getForm24QAction(q);
      if (res.success) {
        setForm24QData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading24Q(false);
    }
  };

  const handleEmployeeChange = async (empId: string) => {
    setSelectedEmployeeId(empId);
    setLoading16(true);
    try {
      const res = await getForm16Action(empId);
      if (res.success) {
        setForm16Data(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading16(false);
    }
  };

  const exportForm24QCsv = () => {
    if (!form24QData?.deductees) return;
    const rows = [
      ['Serial No', 'Employee Code', 'Employee Name', 'PAN', 'Payment Date', 'Gross Amount', 'Rate', 'TDS Deducted', 'Net Paid', 'Section'],
      ...form24QData.deductees.map((d: any) => [
        d.serialNo,
        `"${d.employeeCode}"`,
        `"${d.employeeName}"`,
        `"${d.pan}"`,
        d.paymentDate ? new Date(d.paymentDate).toLocaleDateString('en-IN') : '',
        d.grossAmount,
        `${d.tdsRate}%`,
        d.tdsAmount,
        d.netPaid,
        '192',
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Form24Q_${selectedQuarter}_Annexure.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeEmployees = employees.filter((e: any) => e.isActive);
  const totalMonthlyCtc = activeEmployees.reduce((sum: number, e: any) => sum + (Number(e.salary) || 0), 0);
  const salaryExpenses = data.salaryExpenses || [];
  const totalGrossDisbursed = salaryExpenses.reduce((sum: number, exp: any) => sum + (Number(exp.grossAmount) || 0), 0);
  const totalTdsWithheld = salaryExpenses.reduce((sum: number, exp: any) => sum + (Number(exp.tdsAmount) || 0), 0);
  const totalNetDisbursed = salaryExpenses.reduce((sum: number, exp: any) => sum + (Number(exp.netAmount) || 0), 0);

  return (
    <div className="space-y-6">
      <CategoryRibbon tabs={tabs} activeTab={currentTab} onTabChange={setActiveTab} />

      {/* 1. Register & CTC Tab */}
      {currentTab === 'register' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-[#D9E3DC] rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Headcount</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">{employees.length} Staff</span>
            </div>
            <div className="p-4 bg-white border border-[#D9E3DC] rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Active Staff</span>
              <span className="text-xl font-bold text-emerald-700 mt-1 block">{activeEmployees.length} Active</span>
            </div>
            <div className="p-4 bg-white border border-[#D9E3DC] rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Monthly CTC Commitment</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">{formatCurrency(totalMonthlyCtc)}</span>
            </div>
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-[#177B55] uppercase tracking-wider block">Annual Payroll Run Rate</span>
              <span className="text-xl font-black text-[#0B5F46] mt-1 block">{formatCurrency(totalMonthlyCtc * 12)}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#D9E3DC] bg-[#FAFBF9] flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800">Master Employee Register</span>
              <Link href="/expenses?tab=employees" className="text-[#177B55] font-semibold hover:underline">
                Manage Staff & Run Payroll →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[760px]">
                <thead>
                  <tr className="border-b border-[#D9E3DC] bg-[#FAFBF9] text-[11px] uppercase text-[#738078] font-bold">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Department / Designation</th>
                    <th className="py-3 px-4">PAN / Bank Info</th>
                    <th className="py-3 px-4 text-right">Monthly CTC (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9EEE9]">
                  {employees.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-[#F9FAF8] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#17211B]">{emp.name}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{emp.employeeCode || '—'}</td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div>{emp.department || '—'}</div>
                        <div className="text-[11px] text-slate-500">{emp.designation || ''}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        <div>{emp.pan ? `PAN: ${emp.pan}` : 'No PAN'}</div>
                        <div className="text-[10px] text-slate-400 font-sans">{emp.bankName || 'Bank'} • {emp.bankIfsc || 'IFSC'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(Number(emp.salary || 0))}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.isActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Salary Disbursements Tab */}
      {currentTab === 'salary' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-[#D9E3DC] rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gross Salaries Incurred</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">{formatCurrency(totalGrossDisbursed)}</span>
            </div>
            <div className="p-4 bg-white border border-[#D9E3DC] rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">TDS Deducted (Sec 192)</span>
              <span className="text-xl font-bold text-rose-700 mt-1 block">{formatCurrency(totalTdsWithheld)}</span>
            </div>
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-[#177B55] uppercase tracking-wider block">Net Bank Disbursements</span>
              <span className="text-xl font-black text-[#0B5F46] mt-1 block">{formatCurrency(totalNetDisbursed)}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#D9E3DC] bg-[#FAFBF9] flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800">Historical Salary Payout Vouchers</span>
              <Link href="/expenses?tab=employees" className="text-[#177B55] font-semibold hover:underline">
                ⚡ Process New Batch Run →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[760px]">
                <thead>
                  <tr className="border-b border-[#D9E3DC] bg-[#FAFBF9] text-[11px] uppercase text-[#738078] font-bold">
                    <th className="py-3 px-4">Voucher No</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4 text-right">Gross Salary</th>
                    <th className="py-3 px-4 text-right">TDS (192)</th>
                    <th className="py-3 px-4 text-right">Net Disbursed</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9EEE9]">
                  {salaryExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No salary disbursement vouchers recorded yet.
                      </td>
                    </tr>
                  ) : (
                    salaryExpenses.map((exp: any) => (
                      <tr key={exp.id} className="hover:bg-[#F9FAF8] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{exp.expenseNumber}</td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{exp.employee?.name || 'Employee'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{exp.employee?.employeeCode}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800">
                          {formatCurrency(Number(exp.grossAmount || 0))}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-rose-600 font-semibold">
                          {formatCurrency(Number(exp.tdsAmount || 0))}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-[#0B5F46]">
                          {formatCurrency(Number(exp.netAmount || 0))}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedPayslipExpenseId(exp.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-[#0B5F46] border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                          >
                            📄 Payslip
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Form 24Q Quarterly Return Tab */}
      {currentTab === 'form24q' && (
        <div className="space-y-5">
          {/* Quarter Filter Toolbar */}
          <div className="p-4 bg-white border border-[#D9E3DC] rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Financial Quarter:</span>
              <div className="flex gap-1.5">
                {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleQuarterChange(q)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedQuarter === q
                        ? 'bg-[#177B55] text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {q} ({q === 'Q1' ? 'Apr–Jun' : q === 'Q2' ? 'Jul–Sep' : q === 'Q3' ? 'Oct–Dec' : 'Jan–Mar'})
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportForm24QCsv}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <span>📥</span> Export Annexure (CSV)
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#177B55] hover:bg-[#0B5F46] text-white transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <span>🖨️</span> Print Return
              </button>
            </div>
          </div>

          {/* Form 24Q Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-[#D9E3DC] rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Deductees</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">
                {form24QData?.totalDeductees || 0} Staff
              </span>
            </div>
            <div className="p-4 bg-white border border-[#D9E3DC] rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gross Salary Disbursed</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">
                {formatCurrency(form24QData?.totalGrossPaid || 0)}
              </span>
            </div>
            <div className="p-4 bg-white border border-[#D9E3DC] rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">TDS Deducted u/s 192</span>
              <span className="text-xl font-bold text-rose-700 mt-1 block">
                {formatCurrency(form24QData?.totalTdsDeducted || 0)}
              </span>
            </div>
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-2xs">
              <span className="text-[10px] font-bold text-[#177B55] uppercase tracking-wider block">Challan Reference (ITNS 281)</span>
              <span className="text-xs font-mono font-bold text-[#0B5F46] mt-1.5 block">
                {form24QData?.challanRef || 'CHALLAN-ITNS281'}
              </span>
            </div>
          </div>

          {/* Deductee Wise Annexure Table */}
          <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#D9E3DC] bg-[#FAFBF9] flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800">
                Form 24Q Annexure — Salary Deductees Details ({selectedQuarter})
              </span>
              <span className="text-slate-500 font-mono text-[11px]">BSR Code: {form24QData?.bsrCode || '0210045'}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[760px]">
                <thead>
                  <tr className="border-b border-[#D9E3DC] bg-[#FAFBF9] text-[11px] uppercase text-[#738078] font-bold">
                    <th className="py-3 px-4">Sl</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">PAN</th>
                    <th className="py-3 px-4">Date of Payment</th>
                    <th className="py-3 px-4 text-right">Gross Paid (₹)</th>
                    <th className="py-3 px-4 text-right">Rate</th>
                    <th className="py-3 px-4 text-right">TDS Deducted (₹)</th>
                    <th className="py-3 px-4 text-right">Net Paid (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9EEE9]">
                  {(!form24QData?.deductees || form24QData.deductees.length === 0) ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No salary deductions recorded for quarter {selectedQuarter}.
                      </td>
                    </tr>
                  ) : (
                    form24QData.deductees.map((d: any) => (
                      <tr key={d.serialNo} className="hover:bg-[#F9FAF8] transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-500">{d.serialNo}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div>{d.employeeName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{d.employeeCode}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{d.pan}</td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {d.paymentDate ? new Date(d.paymentDate).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                          {formatCurrency(d.grossAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-500 font-mono">{Number(d.tdsRate || 0).toFixed(1)}%</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                          {formatCurrency(d.tdsAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-[#0B5F46]">
                          {formatCurrency(d.netPaid)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Form 16 Tax Certificate (Part B) Tab */}
      {currentTab === 'form16' && (
        <div className="space-y-5">
          {/* Employee Selector Bar */}
          <div className="p-4 bg-white border border-[#D9E3DC] rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3 w-full max-w-md">
              <label className="text-xs font-bold text-slate-700 shrink-0">Select Employee:</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                className="w-full h-10 border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55] font-semibold text-slate-900"
              >
                {employees.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.employeeCode || 'EMP'}) — PAN: {e.pan || 'N/A'}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#177B55] hover:bg-[#0B5F46] text-white transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 self-end sm:self-auto"
            >
              <span>🖨️</span> Print Form 16 Certificate
            </button>
          </div>

          {/* Form 16 Certificate Layout */}
          {form16Data && (
            <div className="bg-white border border-[#D9E3DC] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs text-xs font-sans">
              {/* Form 16 Header */}
              <div className="text-center border-b border-slate-200 pb-5 space-y-1">
                <h2 className="text-base font-black text-slate-900 tracking-tight">FORM NO. 16 (PART B)</h2>
                <p className="text-[11px] text-slate-500">
                  [See rule 31(1)(a)] • Certificate under section 203 of the Income-tax Act, 1961
                </p>
                <p className="text-xs font-bold text-slate-800">
                  Certificate of Tax Deducted at Source from Income Chargeable under the head &apos;Salaries&apos;
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  Assessment Year: {form16Data.assessmentYear} • Financial Year: {form16Data.financialYear}
                </p>
              </div>

              {/* Employer & Employee Identity Blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
                <div className="space-y-1">
                  <span className="font-bold text-slate-900 block text-xs">Employer (Deductor)</span>
                  <p className="font-bold text-slate-800">{form16Data.employer?.name}</p>
                  <p className="text-slate-600">{form16Data.employer?.address}</p>
                  <p className="font-mono text-slate-700">PAN: {form16Data.employer?.pan} • TAN: {form16Data.employer?.tan}</p>
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-slate-900 block text-xs">Employee (Deductee)</span>
                  <p className="font-bold text-slate-800">{form16Data.employee?.name}</p>
                  <p className="text-slate-600">Designation: {form16Data.employee?.designation || 'Staff'}</p>
                  <p className="font-mono text-slate-700">PAN: {form16Data.employee?.pan} • Code: {form16Data.employee?.employeeCode}</p>
                </div>
              </div>

              {/* Computation Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-[#FAFBF9] border-b border-slate-200 font-bold text-slate-800">
                  Part B — Details of Salary Paid and any other income and tax deducted
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="p-3 flex justify-between items-center hover:bg-slate-50/50">
                    <span className="text-slate-700">1. Gross Salary u/s 17(1)</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(form16Data.salarySummary?.grossSalarySec17_1 || 0)}
                    </span>
                  </div>
                  <div className="p-3 flex justify-between items-center hover:bg-slate-50/50">
                    <span className="text-slate-700">2. Less: Standard Deduction u/s 16(ia)</span>
                    <span className="font-mono font-semibold text-rose-600">
                      - {formatCurrency(form16Data.salarySummary?.standardDeductionSec16_ia || 0)}
                    </span>
                  </div>
                  <div className="p-3 flex justify-between items-center bg-slate-50/70 font-bold">
                    <span className="text-slate-800">3. Total Income Chargeable under the head &apos;Salaries&apos;</span>
                    <span className="font-mono text-slate-900">
                      {formatCurrency(form16Data.salarySummary?.incomeChargeableUnderSalaries || 0)}
                    </span>
                  </div>
                  <div className="p-3 flex justify-between items-center hover:bg-slate-50/50">
                    <span className="text-slate-700">4. Tax on Total Income</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatCurrency(form16Data.salarySummary?.totalTaxDeductedSec192 || 0)}
                    </span>
                  </div>
                  <div className="p-3 flex justify-between items-center hover:bg-slate-50/50">
                    <span className="text-slate-700">5. Less: Rebate u/s 87A</span>
                    <span className="font-mono font-semibold text-emerald-700">
                      - {formatCurrency(form16Data.salarySummary?.rebateSec87A || 0)}
                    </span>
                  </div>
                  <div className="p-3.5 flex justify-between items-center bg-emerald-50/80 font-black text-sm">
                    <span className="text-[#177B55]">6. Total Tax Deducted at Source u/s 192</span>
                    <span className="font-mono text-[#0B5F46]">
                      {formatCurrency(form16Data.salarySummary?.totalTaxDeductedSec192 || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quarterly Deposit Breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-[#FAFBF9] border-b border-slate-200 font-bold text-slate-800">
                  Quarterly Tax Deducted and Deposited in Central Government Account
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold text-slate-600">
                      <th className="py-2.5 px-4">Quarter</th>
                      <th className="py-2.5 px-4">Period</th>
                      <th className="py-2.5 px-4 text-right">Gross Paid (₹)</th>
                      <th className="py-2.5 px-4 text-right">Tax Deducted (₹)</th>
                      <th className="py-2.5 px-4 text-right">Tax Deposited (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => {
                      const qData = form16Data.quarterlyBreakdown?.[q] || { gross: 0, tds: 0 };
                      const label = q === 'Q1' ? 'Apr–Jun' : q === 'Q2' ? 'Jul–Sep' : q === 'Q3' ? 'Oct–Dec' : 'Jan–Mar';
                      return (
                        <tr key={q} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-800">{q}</td>
                          <td className="py-2.5 px-4 text-slate-600">{label}</td>
                          <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(qData.gross)}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-rose-600">{formatCurrency(qData.tds)}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700">{formatCurrency(qData.tds)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Signatory Box */}
              <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-[11px] text-slate-500">
                <div>
                  <p>Place: Kochi, Kerala</p>
                  <p>Date: {new Date().toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right space-y-10">
                  <div className="h-8 border-b border-slate-400 w-48 ml-auto"></div>
                  <p className="font-bold text-slate-800">For {form16Data.employer?.name}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payslip Modal */}
      {selectedPayslipExpenseId && (
        <PayslipModal
          expenseId={selectedPayslipExpenseId}
          onClose={() => setSelectedPayslipExpenseId(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Analysis (Financial Intelligence & Ratios live here per Section 12)
// ─────────────────────────────────────────────────────────────────────────────
function AnalysisView({
  data,
  activeTab,
  setActiveTab,
}: {
  data: any;
  activeTab: string;
  setActiveTab: (t: string) => void;
}) {
  const tabs = [
    { id: 'intelligence', label: 'Financial Intelligence' },
    { id: 'ratios', label: 'Financial Ratios & Benchmarks' },
    { id: 'working-capital', label: 'Working Capital & Concentration' },
  ];
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'intelligence';

  const ratios = data.ratios?.ratios || [];
  const analysis = data.analysis || {};
  const kpis = analysis.kpis || {};

  return (
    <div className="space-y-6">
      <CategoryRibbon tabs={tabs} activeTab={currentTab} onTabChange={setActiveTab} />

      {currentTab === 'intelligence' && (
        <div className="space-y-4">
          <div className="p-5 border border-[#D9E3DC] rounded-xl bg-[#FAFBF9] space-y-3">
            <h3 className="font-bold text-[#17211B] text-sm">Executive Financial Analysis</h3>
            <p className="text-xs text-[#68756C]">
              Comprehensive management evaluation powered by authoritative General Ledger closing balances.
            </p>
            {analysis.executiveSummary && (
              <div className="p-4 bg-white border border-[#D9E3DC] rounded-lg text-xs text-[#17211B] leading-relaxed">
                {analysis.executiveSummary}
              </div>
            )}
            {analysis.zScore !== undefined && (
              <div className="flex items-center gap-2 pt-2 text-xs">
                <span className="font-semibold text-[#68756C]">Altman Z-Score:</span>
                <span className="font-bold text-[#17211B] font-mono">{Number(analysis.zScore).toFixed(2)}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    analysis.zScoreCategory === 'SAFE'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {analysis.zScoreCategory || 'SAFE'} ZONE
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {currentTab === 'ratios' && (
        <div className="overflow-x-auto border border-[#D9E3DC] rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFBF9] border-b border-[#D9E3DC] text-[#68756C] uppercase font-semibold">
              <tr>
                <th className="p-3">Ratio Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Formula</th>
                <th className="p-3 text-right">Current Value</th>
                <th className="p-3 text-right">Target Benchmark</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EEE9]">
              {ratios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[#68756C]">
                    No ratio data compiled for this period.
                  </td>
                </tr>
              ) : (
                ratios.map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#FAFBF9]">
                    <td className="p-3 font-semibold text-[#17211B]">{r.name}</td>
                    <td className="p-3 text-[#68756C]">{r.category}</td>
                    <td className="p-3 text-[#68756C] font-mono text-[11px]">{r.formula}</td>
                    <td className="p-3 text-right font-bold text-[#17211B]">{r.formattedCurrent || '—'}</td>
                    <td className="p-3 text-right text-[#68756C]">{r.targetBenchmark || '—'}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === 'GOOD'
                            ? 'bg-emerald-50 text-emerald-800'
                            : r.status === 'ATTENTION'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {r.status || 'NEUTRAL'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {currentTab === 'working-capital' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
            <p className="text-xs font-semibold text-[#68756C]">Net Working Capital</p>
            <p className="text-xl font-bold text-[#17211B] mt-1">₹{(kpis.workingCapital || 0).toLocaleString('en-IN')}</p>
            <span className="text-xs text-[#68756C]">Current Assets less Current Liabilities</span>
          </div>
          <div className="p-4 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
            <p className="text-xs font-semibold text-[#68756C]">Current Ratio</p>
            <p className="text-xl font-bold text-[#17211B] mt-1">{Number(kpis.currentRatio || 0).toFixed(2)}x</p>
            <span className="text-xs text-emerald-600">Standard: 1.33x – 2.0x</span>
          </div>
          <div className="p-4 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl">
            <p className="text-xs font-semibold text-[#68756C]">Quick Ratio</p>
            <p className="text-xl font-bold text-[#17211B] mt-1">{Number(kpis.quickRatio || 0).toFixed(2)}x</p>
            <span className="text-xs text-blue-600">Liquid assets ratio</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Audit & Transactions
// ─────────────────────────────────────────────────────────────────────────────
function AuditView({
  data,
  activeTab,
  setActiveTab,
}: {
  data: any;
  activeTab: string;
  setActiveTab: (t: string) => void;
}) {
  const tabs = [
    { id: 'vouchers', label: 'Daybook & Journal Vouchers' },
    { id: 'ledger', label: 'General Ledger Audit' },
    { id: 'equilibrium', label: 'Equilibrium Verification' },
  ];
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'vouchers';
  const vouchers = data.vouchers || [];

  return (
    <div className="space-y-6">
      <CategoryRibbon tabs={tabs} activeTab={currentTab} onTabChange={setActiveTab} />

      {currentTab === 'vouchers' && (
        <div className="overflow-x-auto border border-[#D9E3DC] rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFBF9] border-b border-[#D9E3DC] text-[#68756C] uppercase font-semibold">
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
            <tbody className="divide-y divide-[#E9EEE9]">
              {vouchers.slice(0, 20).map((v: any) => (
                <tr key={v.id} className="hover:bg-[#FAFBF9]">
                  <td className="p-3 font-medium text-[#177B55]">{v.voucherNumber}</td>
                  <td className="p-3 text-[#68756C]">{v.voucherType}</td>
                  <td className="p-3 text-[#68756C]">{new Date(v.date).toLocaleDateString('en-IN')}</td>
                  <td className="p-3 text-[#17211B]">{v.narration || v.reference || '—'}</td>
                  <td className="p-3 text-right font-medium">₹{Number(v.totalDebit || 0).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-medium">₹{Number(v.totalCredit || 0).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        v.isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {v.isBalanced ? 'Balanced' : 'Unbalanced'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {currentTab === 'ledger' && (
        <div className="p-6 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl text-center space-y-3">
          <h3 className="font-bold text-[#17211B] text-sm">General Ledger Audit Trail</h3>
          <p className="text-xs text-[#68756C]">Drill down into every individual ledger account transaction.</p>
          <div className="pt-2">
            <Link
              href="/ledgers"
              className="px-4 py-2 bg-[#177B55] text-white rounded-xl text-xs font-bold hover:bg-[#0B5F46] transition"
            >
              Open Ledgers →
            </Link>
          </div>
        </div>
      )}

      {currentTab === 'equilibrium' && (
        <div className="p-6 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl space-y-2">
          <h3 className="font-bold text-[#17211B] text-sm">Equilibrium Verification</h3>
          <p className="text-xs text-[#68756C]">Double-entry mathematical balance: Sum of Debits = Sum of Credits.</p>
        </div>
      )}
    </div>
  );
}
