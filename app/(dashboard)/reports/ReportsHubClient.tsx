'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FinancialStatementsClient } from '../financial-statements/FinancialStatementsClient';
import { formatCurrency } from '@/lib/utils/currency';

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

  return (
    <div className="space-y-6">
      <CategoryRibbon tabs={tabs} activeTab={currentTab} onTabChange={setActiveTab} />

      <div className="p-6 bg-[#FAFBF9] border border-[#D9E3DC] rounded-xl text-center space-y-3">
        <div className="text-4xl">🏢</div>
        <h3 className="font-bold text-[#17211B] text-sm">Fixed Assets Schedule</h3>
        <p className="text-xs text-[#68756C] max-w-md mx-auto">
          Capitalized asset costs incorporate non-eligible GST. Annual depreciation is recognized strictly per ICAI standards.
        </p>
        <div className="pt-2">
          <Link
            href="/reports?category=statements&tab=balance-sheet"
            className="px-4 py-2 bg-[#177B55] text-white rounded-xl text-xs font-bold hover:bg-[#0B5F46] transition"
          >
            View in Balance Sheet →
          </Link>
        </div>
      </div>
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
    { id: 'register', label: 'Employee Register' },
    { id: 'salary', label: 'Direct Salary Postings' },
    { id: 'claims', label: 'Reimbursement Claims' },
  ];
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'register';

  return (
    <div className="space-y-6">
      <CategoryRibbon tabs={tabs} activeTab={currentTab} onTabChange={setActiveTab} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 border border-[#D9E3DC] rounded-xl bg-[#FAFBF9]">
          <h3 className="font-bold text-[#17211B] text-sm">Direct Salary Accounting</h3>
          <p className="text-xs text-[#68756C] mt-2">
            Salary disbursements post directly to Salary Expense (P&L Dr) and Bank (Cr) with optional TDS under Section 192.
            Employees do not pass through Sundry Creditors.
          </p>
        </div>
        <div className="p-5 border border-[#D9E3DC] rounded-xl bg-[#FAFBF9]">
          <h3 className="font-bold text-[#17211B] text-sm">Employee-Paid Expense Claims</h3>
          <p className="text-xs text-[#68756C] mt-2">
            Business expenses incurred by employees create an Employee Payable liability without bank movement until reimbursement.
          </p>
        </div>
      </div>
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
