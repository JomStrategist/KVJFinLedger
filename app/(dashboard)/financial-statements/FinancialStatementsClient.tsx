"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils/currency";

export interface ComparativeItem {
  id: string;
  name: string;
  group?: string;
  currentAmount: number;
  previousAmount: number;
  varianceAmount: number;
  variancePercent: number | null;
  currentCommonSizePercent: number;
  previousCommonSizePercent: number;
}

export interface RatioItem {
  category: string;
  name: string;
  formula: string;
  currentValue: number | null;
  previousValue: number | null;
  formattedCurrent: string;
  formattedPrevious: string;
  targetBenchmark: string;
  status: "GOOD" | "ATTENTION" | "CRITICAL" | "NEUTRAL";
  variance: number | null;
  interpretation: string;
}

export interface FinancialStatementsClientProps {
  currentFilters: {
    financialYear: string;
    period: string;
    fromDate?: string;
    toDate?: string;
    comparisonType: string;
    customerId?: string;
    vendorId?: string;
    categoryId?: string;
    tab?: string;
  };
  trialBalance: {
    asOfDate: string;
    totalDebit: number;
    totalCredit: number;
    difference: number;
    isBalanced: boolean;
    items: Array<{
      accountId: string;
      accountName: string;
      accountGroup: string;
      financialType: string;
      financialStatement: string;
      openingDebit: number;
      openingCredit: number;
      periodDebit: number;
      periodCredit: number;
      closingDebit: number;
      closingCredit: number;
    }>;
  };
  profitAndLoss: {
    fromDate: string;
    toDate: string;
    totalRevenue: number;
    totalExpenses: number;
    operatingProfit: number;
    profitBeforeTax: number;
    taxExpense: number;
    netProfitAfterTax: number;
    revenueFromOperations: Array<{ name: string; amount: number }>;
    otherIncome: Array<{ name: string; amount: number }>;
    operatingExpenses: Array<{ name: string; amount: number }>;
    employeeCosts: Array<{ name: string; amount: number }>;
    depreciationAmortization: Array<{ name: string; amount: number }>;
    financeCosts: Array<{ name: string; amount: number }>;
    otherExpenses: Array<{ name: string; amount: number }>;
  };
  balanceSheet: {
    asOfDate: string;
    totalAssets: number;
    totalEquityAndLiabilities: number;
    difference: number;
    isBalanced: boolean;
    equity: {
      capital: number;
      reservesAndSurplus: number;
      drawings: number;
      totalShareholdersFunds: number;
    };
    currentLiabilities: {
      tradePayables: number;
      employeePayables: number;
      statutoryGstPayable: number;
      statutoryTdsPayable: number;
      otherCurrentLiabilities: number;
      total: number;
    };
    nonCurrentAssets: {
      fixedAssetsGross: number;
      accumulatedDepreciation: number;
      fixedAssetsNet: number;
      total: number;
    };
    currentAssets: {
      tradeReceivables: number;
      cashAndBank: number;
      tdsReceivable: number;
      gstInputCredit: number;
      otherCurrentAssets: number;
      total: number;
    };
  };
  cashFlow: {
    fromDate: string;
    toDate: string;
    openingCashAndBank: number;
    closingCashAndBank: number;
    netCashFlow: number;
    operatingCashFlow: {
      customerReceipts: number;
      vendorDisbursements: number;
      employeeDisbursements: number;
      gstPaid: number;
      tdsPaid: number;
      netOperating: number;
    };
    investingCashFlow: {
      capitalExpenditure: number;
      netInvesting: number;
    };
    financingCashFlow: {
      capitalIntroduced: number;
      drawingsWithdrawn: number;
      netFinancing: number;
    };
  };
  comparativePnl: {
    currentPeriodLabel: string;
    previousPeriodLabel: string;
    hasPreviousData: boolean;
    revenueItems: ComparativeItem[];
    expenseItems: ComparativeItem[];
    totals: {
      totalRevenue: ComparativeItem;
      totalExpenses: ComparativeItem;
      operatingProfit: ComparativeItem;
      profitBeforeTax: ComparativeItem;
      netProfitAfterTax: ComparativeItem;
      operatingMargin: { current: number; previous: number; variance: number };
      netMargin: { current: number; previous: number; variance: number };
    };
  };
  comparativeBs: {
    currentPeriodLabel: string;
    previousPeriodLabel: string;
    hasPreviousData: boolean;
    items: ComparativeItem[];
    totals: {
      totalAssets: ComparativeItem;
      totalLiabilities: ComparativeItem;
      totalEquity: ComparativeItem;
      totalEquityAndLiabilities: ComparativeItem;
      netWorkingCapital: ComparativeItem;
    };
  };
  comparativeCf: {
    currentPeriodLabel: string;
    previousPeriodLabel: string;
    hasPreviousData: boolean;
    items: ComparativeItem[];
    openingCash: ComparativeItem;
    closingCash: ComparativeItem;
  };
  financialRatios: {
    currentPeriodLabel: string;
    previousPeriodLabel: string;
    hasPreviousData: boolean;
    ratios: RatioItem[];
  };
  financialAnalysis: {
    financialYear: string;
    kpis: {
      revenue: number;
      operatingExpenses: number;
      operatingProfit: number;
      operatingMargin: number;
      netProfitAfterTax: number;
      netMargin: number;
      workingCapital: number;
      cashAndBank: number;
      currentRatio: number;
      quickRatio: number;
      debtorDays: number;
      creditorDays: number;
    };
    monthlyTrends: Array<{
      month: string;
      revenue: number;
      expenses: number;
      operatingProfit: number;
      netProfit: number;
      operatingMargin: number;
    }>;
    customerConcentration: Array<{
      customerId: string;
      customerName: string;
      amount: number;
      percentage: number;
    }>;
    expenseBreakdown: Array<{
      categoryId: string;
      categoryName: string;
      amount: number;
      percentage: number;
    }>;
    vendorConcentration: Array<{
      vendorId: string;
      vendorName: string;
      amount: number;
      percentage: number;
    }>;
    b2bVsB2c: {
      b2bRevenue: number;
      b2cRevenue: number;
      exportRevenue: number;
    };
    managementInsights: string[];
  };
  customers: Array<{ id: string; legalName: string }>;
  vendors: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
}

export function FinancialStatementsClient(props: FinancialStatementsClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<
    "trial-balance" | "pnl" | "balance-sheet" | "cash-flow" | "comparative" | "analysis"
  >(
    (props.currentFilters.tab as any) || "trial-balance"
  );

  const [showVerticalAnalysis, setShowVerticalAnalysis] = useState<boolean>(false);
  const [selectedFy, setSelectedFy] = useState(props.currentFilters.financialYear || "FY 2026–27");
  const [selectedPeriod, setSelectedPeriod] = useState(props.currentFilters.period || "ALL");
  const [selectedCustomer, setSelectedCustomer] = useState(props.currentFilters.customerId || "");
  const [selectedVendor, setSelectedVendor] = useState(props.currentFilters.vendorId || "");
  const [selectedCategory, setSelectedCategory] = useState(props.currentFilters.categoryId || "");
  const [tbGroupFilter, setTbGroupFilter] = useState("ALL");
  const [tbSearch, setTbSearch] = useState("");

  const applyFilters = (overrides?: Partial<typeof props.currentFilters> & { tab?: string }) => {
    const params = new URLSearchParams();
    params.set("financialYear", overrides?.financialYear || selectedFy);
    if ((overrides?.period || selectedPeriod) !== "ALL") {
      params.set("period", overrides?.period || selectedPeriod);
    }
    if (overrides?.customerId !== undefined ? overrides.customerId : selectedCustomer) {
      params.set("customerId", overrides?.customerId !== undefined ? overrides.customerId : selectedCustomer);
    }
    if (overrides?.vendorId !== undefined ? overrides.vendorId : selectedVendor) {
      params.set("vendorId", overrides?.vendorId !== undefined ? overrides.vendorId : selectedVendor);
    }
    if (overrides?.categoryId !== undefined ? overrides.categoryId : selectedCategory) {
      params.set("categoryId", overrides?.categoryId !== undefined ? overrides.categoryId : selectedCategory);
    }
    const tabToUse = overrides?.tab || activeTab;
    params.set("tab", tabToUse);

    startTransition(() => {
      router.push(`/financial-statements?${params.toString()}`);
    });
  };

  const handleTabChange = (newTab: typeof activeTab) => {
    setActiveTab(newTab);
    applyFilters({ tab: newTab });
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const exportCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${selectedFy.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered TB rows
  const filteredTbItems = props.trialBalance.items.filter(it => {
    if (tbGroupFilter !== "ALL" && it.accountGroup !== tbGroupFilter) return false;
    if (tbSearch.trim() && !it.accountName.toLowerCase().includes(tbSearch.toLowerCase()) && !it.accountGroup.toLowerCase().includes(tbSearch.toLowerCase())) {
      return false;
    }
    return true;
  });

  const tbGroups = Array.from(new Set(props.trialBalance.items.map(i => i.accountGroup))).sort();

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header & Context */}
      <div className="no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Financial Statements & Intelligence
            </h1>
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              KVJ FinLedger Engine
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Authoritative double-entry financial reporting backed directly by the General Ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Statement
          </button>

          {(activeTab === "pnl" || activeTab === "balance-sheet" || activeTab === "comparative") && (
            <button
              onClick={() => setShowVerticalAnalysis(!showVerticalAnalysis)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl border transition ${
                showVerticalAnalysis
                  ? "bg-teal-600 border-teal-600 text-white shadow"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {showVerticalAnalysis ? "Vertical Analysis Active (%)" : "Toggle Vertical (%)"}
            </button>
          )}

          <Link
            href="/ledgers"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition"
          >
            Trace in Ledgers →
          </Link>
        </div>
      </div>

      {/* Universal Report Filter Bar */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* FY Slicer */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Financial Year:</label>
              <select
                value={selectedFy}
                onChange={e => {
                  setSelectedFy(e.target.value);
                  applyFilters({ financialYear: e.target.value });
                }}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="FY 2026–27">FY 2026–27 (Current)</option>
                <option value="FY 2025–26">FY 2025–26 (Previous)</option>
                <option value="FY 2024–25">FY 2024–25</option>
              </select>
            </div>

            {/* Period Slicer */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Period:</label>
              <select
                value={selectedPeriod}
                onChange={e => {
                  setSelectedPeriod(e.target.value);
                  applyFilters({ period: e.target.value });
                }}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="ALL">Full Financial Year (1 Apr - 31 Mar)</option>
                <option value="Q1">Q1 (Apr - Jun)</option>
                <option value="Q2">Q2 (Jul - Sep)</option>
                <option value="Q3">Q3 (Oct - Dec)</option>
                <option value="Q4">Q4 (Jan - Mar)</option>
                <option value="YTD">Year to Date (YTD)</option>
              </select>
            </div>

            {/* Slicers for Analysis */}
            {activeTab === "analysis" && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer:</label>
                  <select
                    value={selectedCustomer}
                    onChange={e => {
                      setSelectedCustomer(e.target.value);
                      applyFilters({ customerId: e.target.value });
                    }}
                    className="max-w-[160px] truncate px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">All Accounts</option>
                    {props.customers.map(c => (
                      <option key={c.id} value={c.id}>{c.legalName}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendor:</label>
                  <select
                    value={selectedVendor}
                    onChange={e => {
                      setSelectedVendor(e.target.value);
                      applyFilters({ vendorId: e.target.value });
                    }}
                    className="max-w-[160px] truncate px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">All Vendors</option>
                    {props.vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Quick Equilibrium Status */}
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              props.trialBalance.isBalanced
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}>
              <span className={`w-2 h-2 rounded-full ${props.trialBalance.isBalanced ? "bg-emerald-500" : "bg-rose-500"}`} />
              TB: {props.trialBalance.isBalanced ? "Balanced (₹0.00)" : `Diff ₹${props.trialBalance.difference}`}
            </div>

            <div className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              props.balanceSheet.isBalanced
                ? "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}>
              <span className={`w-2 h-2 rounded-full ${props.balanceSheet.isBalanced ? "bg-teal-500" : "bg-rose-500"}`} />
              BS: {props.balanceSheet.isBalanced ? "Assets = Liab + Eq (₹0.00)" : `Diff ₹${props.balanceSheet.difference}`}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Statement Navigation Tabs */}
      <div className="no-print border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Tabs">
          {[
            { id: "trial-balance", label: "Trial Balance", icon: "⚖️" },
            { id: "pnl", label: "Profit & Loss Account", icon: "📈" },
            { id: "balance-sheet", label: "Balance Sheet", icon: "🏛️" },
            { id: "cash-flow", label: "Cash Flow Statement", icon: "💵" },
            { id: "comparative", label: "Comparative Analysis", icon: "📊" },
            { id: "analysis", label: "Financial Intelligence & Ratios", icon: "💡" },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`whitespace-nowrap pb-3 px-3.5 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
                  isActive
                    ? "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-300 font-semibold"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 1. TRIAL BALANCE TAB */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "trial-balance" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest text-teal-600 uppercase">Statement 1</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-medium">As of {new Date(props.trialBalance.asOfDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                Trial Balance (Double Entry Equilibrium)
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Authoritative summation of all General Ledger debit and credit balances. Total debits must equal total credits exactly.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => exportCsv("trial_balance", ["Account", "Group", "Statement", "Debit", "Credit"], filteredTbItems.map(i => [
                  i.accountName,
                  i.accountGroup,
                  i.financialStatement,
                  i.closingDebit,
                  i.closingCredit
                ]))}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
              >
                Export CSV
              </button>

              <div className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${
                props.trialBalance.isBalanced
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300"
                  : "bg-rose-50 text-rose-800 border border-rose-300"
              }`}>
                {props.trialBalance.isBalanced ? "✓ Balanced (₹0.00 Variance)" : `⚠ Difference: ₹${props.trialBalance.difference}`}
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="no-print flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search ledger account or group..."
                value={tbSearch}
                onChange={e => setTbSearch(e.target.value)}
                className="w-full px-3.5 py-1.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Group:</label>
              <select
                value={tbGroupFilter}
                onChange={e => setTbGroupFilter(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">All Account Groups</option>
                {tbGroups.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Trial Balance Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Account Particulars</th>
                    <th className="py-3.5 px-4">Account Group</th>
                    <th className="py-3.5 px-4">Statement Classification</th>
                    <th className="py-3.5 px-4 text-right">Debit (Dr) ₹</th>
                    <th className="py-3.5 px-4 text-right">Credit (Cr) ₹</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-slate-700 dark:text-slate-300">
                  {filteredTbItems.map((item) => (
                    <tr
                      key={item.accountId}
                      className="hover:bg-teal-50/40 dark:hover:bg-slate-800/40 transition group"
                    >
                      <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-white">
                        <Link
                          href={`/ledgers?accountId=${encodeURIComponent(item.accountId)}`}
                          className="hover:text-teal-600 dark:hover:text-teal-400 hover:underline flex items-center gap-1.5"
                        >
                          <span>{item.accountName}</span>
                          <span className="opacity-0 group-hover:opacity-100 text-xs text-teal-500 font-sans">↗</span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-sans text-xs text-slate-500 dark:text-slate-400">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                          {item.accountGroup}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-xs text-slate-500 dark:text-slate-400">
                        {item.financialStatement === "PROFIT_LOSS" ? "Profit & Loss" : "Balance Sheet"}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800 dark:text-slate-200">
                        {item.closingDebit > 0 ? formatCurrency(item.closingDebit) : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800 dark:text-slate-200">
                        {item.closingCredit > 0 ? formatCurrency(item.closingCredit) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono">
                    <td colSpan={3} className="py-4 px-4 font-sans text-right uppercase tracking-wider text-xs">
                      Grand Totals & Equilibrium Check:
                    </td>
                    <td className="py-4 px-4 text-right text-base text-teal-700 dark:text-teal-300">
                      {formatCurrency(props.trialBalance.totalDebit)}
                    </td>
                    <td className="py-4 px-4 text-right text-base text-teal-700 dark:text-teal-300">
                      {formatCurrency(props.trialBalance.totalCredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 2. PROFIT & LOSS ACCOUNT TAB */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "pnl" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest text-teal-600 uppercase">Statement 2</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-medium">Schedule III Statement of Profit and Loss</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                Profit & Loss Account ({props.comparativePnl.currentPeriodLabel})
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Operational income and expenditure recognized according to ICAI and GST double-entry guidelines.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => exportCsv("pnl_statement", ["Particulars", "Group", "Current (₹)", "Previous (₹)", "Variance (₹)", "Common Size %"], [
                  ...props.comparativePnl.revenueItems.map(r => [r.name, r.group || "Revenue", r.currentAmount, r.previousAmount, r.varianceAmount, `${r.currentCommonSizePercent}%`]),
                  ...props.comparativePnl.expenseItems.map(e => [e.name, e.group || "Expense", e.currentAmount, e.previousAmount, e.varianceAmount, `${e.currentCommonSizePercent}%`]),
                ])}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
              >
                Export CSV
              </button>

              <div className="px-4 py-2 rounded-xl text-sm font-bold bg-teal-50 text-teal-800 border border-teal-300 dark:bg-teal-950/30 dark:text-teal-300">
                PAT: {formatCurrency(props.profitAndLoss.netProfitAfterTax)}
              </div>
            </div>
          </div>

          {/* Schedule III P&L Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Particulars (Income / Expense)</th>
                    <th className="py-3.5 px-4 text-right">{props.comparativePnl.currentPeriodLabel} (₹)</th>
                    {showVerticalAnalysis && <th className="py-3.5 px-4 text-right">Vertical %</th>}
                    <th className="py-3.5 px-4 text-right">{props.comparativePnl.previousPeriodLabel} (₹)</th>
                    <th className="py-3.5 px-4 text-right">Variance (₹)</th>
                    <th className="py-3.5 px-4 text-right">YoY %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-slate-700 dark:text-slate-300">
                  {/* I. REVENUE FROM OPERATIONS */}
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40 font-sans font-bold text-slate-900 dark:text-white">
                    <td colSpan={showVerticalAnalysis ? 6 : 5} className="py-2.5 px-6 uppercase text-xs tracking-wider text-teal-700 dark:text-teal-400">
                      I. Revenue from Operations
                    </td>
                  </tr>
                  {props.comparativePnl.revenueItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-6 pl-10 font-sans text-slate-900 dark:text-white">
                        <Link href={`/ledgers?search=${encodeURIComponent(item.name)}`} className="hover:text-teal-600 hover:underline">
                          {item.name}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">{formatCurrency(item.currentAmount)}</td>
                      {showVerticalAnalysis && <td className="py-2.5 px-4 text-right text-xs text-teal-600">{item.currentCommonSizePercent}%</td>}
                      <td className="py-2.5 px-4 text-right text-slate-500">{props.comparativePnl.hasPreviousData ? formatCurrency(item.previousAmount) : "No Prior Data"}</td>
                      <td className="py-2.5 px-4 text-right">{props.comparativePnl.hasPreviousData ? formatCurrency(item.varianceAmount) : "—"}</td>
                      <td className="py-2.5 px-4 text-right font-sans text-xs">{item.variancePercent !== null ? `${item.variancePercent}%` : "—"}</td>
                    </tr>
                  ))}
                  {/* Total Revenue */}
                  <tr className="bg-teal-50/50 dark:bg-teal-950/20 font-bold border-y border-teal-200 dark:border-teal-900 text-teal-900 dark:text-teal-200 font-sans">
                    <td className="py-3 px-6 uppercase text-xs tracking-wider">Total Revenue from Operations (A)</td>
                    <td className="py-3 px-4 text-right font-mono text-base">{formatCurrency(props.comparativePnl.totals.totalRevenue.currentAmount)}</td>
                    {showVerticalAnalysis && <td className="py-3 px-4 text-right text-xs">100.0%</td>}
                    <td className="py-3 px-4 text-right font-mono text-slate-500">{props.comparativePnl.hasPreviousData ? formatCurrency(props.comparativePnl.totals.totalRevenue.previousAmount) : "No Prior Data"}</td>
                    <td className="py-3 px-4 text-right font-mono">{props.comparativePnl.hasPreviousData ? formatCurrency(props.comparativePnl.totals.totalRevenue.varianceAmount) : "—"}</td>
                    <td className="py-3 px-4 text-right text-xs">{props.comparativePnl.totals.totalRevenue.variancePercent !== null ? `${props.comparativePnl.totals.totalRevenue.variancePercent}%` : "—"}</td>
                  </tr>

                  {/* II. EXPENSES */}
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40 font-sans font-bold text-slate-900 dark:text-white">
                    <td colSpan={showVerticalAnalysis ? 6 : 5} className="py-2.5 px-6 uppercase text-xs tracking-wider text-rose-700 dark:text-rose-400">
                      II. Operating & Indirect Expenses
                    </td>
                  </tr>
                  {props.comparativePnl.expenseItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-6 pl-10 font-sans text-slate-900 dark:text-white">
                        <Link href={`/ledgers?search=${encodeURIComponent(item.name)}`} className="hover:text-teal-600 hover:underline">
                          {item.name}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">{formatCurrency(item.currentAmount)}</td>
                      {showVerticalAnalysis && <td className="py-2.5 px-4 text-right text-xs text-slate-500">{item.currentCommonSizePercent}%</td>}
                      <td className="py-2.5 px-4 text-right text-slate-500">{props.comparativePnl.hasPreviousData ? formatCurrency(item.previousAmount) : "No Prior Data"}</td>
                      <td className="py-2.5 px-4 text-right">{props.comparativePnl.hasPreviousData ? formatCurrency(item.varianceAmount) : "—"}</td>
                      <td className="py-2.5 px-4 text-right font-sans text-xs">{item.variancePercent !== null ? `${item.variancePercent}%` : "—"}</td>
                    </tr>
                  ))}
                  {/* Total Expenses */}
                  <tr className="bg-rose-50/40 dark:bg-rose-950/20 font-bold border-y border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 font-sans">
                    <td className="py-3 px-6 uppercase text-xs tracking-wider">Total Operating Expenditure (B)</td>
                    <td className="py-3 px-4 text-right font-mono text-base">{formatCurrency(props.comparativePnl.totals.totalExpenses.currentAmount)}</td>
                    {showVerticalAnalysis && <td className="py-3 px-4 text-right text-xs">{props.comparativePnl.totals.totalExpenses.currentCommonSizePercent}%</td>}
                    <td className="py-3 px-4 text-right font-mono text-slate-500">{props.comparativePnl.hasPreviousData ? formatCurrency(props.comparativePnl.totals.totalExpenses.previousAmount) : "No Prior Data"}</td>
                    <td className="py-3 px-4 text-right font-mono">{props.comparativePnl.hasPreviousData ? formatCurrency(props.comparativePnl.totals.totalExpenses.varianceAmount) : "—"}</td>
                    <td className="py-3 px-4 text-right text-xs">{props.comparativePnl.totals.totalExpenses.variancePercent !== null ? `${props.comparativePnl.totals.totalExpenses.variancePercent}%` : "—"}</td>
                  </tr>

                  {/* Operating Profit */}
                  <tr className="bg-slate-50 font-bold text-slate-900 dark:text-white font-sans">
                    <td className="py-3 px-6 uppercase text-xs tracking-wider">Operating Profit / EBIT (A - B)</td>
                    <td className="py-3 px-4 text-right font-mono text-base">{formatCurrency(props.comparativePnl.totals.operatingProfit.currentAmount)}</td>
                    {showVerticalAnalysis && <td className="py-3 px-4 text-right text-xs">{props.comparativePnl.totals.operatingProfit.currentCommonSizePercent}%</td>}
                    <td className="py-3 px-4 text-right font-mono text-slate-500">{props.comparativePnl.hasPreviousData ? formatCurrency(props.comparativePnl.totals.operatingProfit.previousAmount) : "No Prior Data"}</td>
                    <td className="py-3 px-4 text-right font-mono">{props.comparativePnl.hasPreviousData ? formatCurrency(props.comparativePnl.totals.operatingProfit.varianceAmount) : "—"}</td>
                    <td className="py-3 px-4 text-right text-xs">{props.comparativePnl.totals.operatingProfit.variancePercent !== null ? `${props.comparativePnl.totals.operatingProfit.variancePercent}%` : "—"}</td>
                  </tr>

                  {/* Tax Provision */}
                  <tr className="hover:bg-slate-50 transition font-sans">
                    <td className="py-2.5 px-6 pl-10 text-slate-600 dark:text-slate-400">
                      Less: Tax Expense / Provision (Standard 25% Corporate Tax)
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(props.profitAndLoss.taxExpense)}</td>
                    {showVerticalAnalysis && <td className="py-2.5 px-4 text-right text-xs font-mono">{(props.comparativePnl.totals.totalRevenue.currentAmount > 0 ? (props.profitAndLoss.taxExpense / props.comparativePnl.totals.totalRevenue.currentAmount * 100).toFixed(1) : "0.0")}%</td>}
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">—</td>
                    <td className="py-2.5 px-4 text-right font-mono">—</td>
                    <td className="py-2.5 px-4 text-right text-xs">—</td>
                  </tr>

                  {/* Net Profit After Tax */}
                  <tr className="bg-emerald-100 dark:bg-emerald-950/40 font-bold border-t-2 border-emerald-400 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 font-sans">
                    <td className="py-4 px-6 uppercase text-sm tracking-wider">
                      Net Profit After Tax (Transferred to Reserves & Surplus)
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-lg text-emerald-800 dark:text-emerald-300">
                      {formatCurrency(props.comparativePnl.totals.netProfitAfterTax.currentAmount)}
                    </td>
                    {showVerticalAnalysis && <td className="py-4 px-4 text-right text-xs font-mono">{props.comparativePnl.totals.netProfitAfterTax.currentCommonSizePercent}%</td>}
                    <td className="py-4 px-4 text-right font-mono text-slate-500">{props.comparativePnl.hasPreviousData ? formatCurrency(props.comparativePnl.totals.netProfitAfterTax.previousAmount) : "No Prior Data"}</td>
                    <td className="py-4 px-4 text-right font-mono">{props.comparativePnl.hasPreviousData ? formatCurrency(props.comparativePnl.totals.netProfitAfterTax.varianceAmount) : "—"}</td>
                    <td className="py-4 px-4 text-right text-xs">{props.comparativePnl.totals.netProfitAfterTax.variancePercent !== null ? `${props.comparativePnl.totals.netProfitAfterTax.variancePercent}%` : "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 3. BALANCE SHEET TAB */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "balance-sheet" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest text-teal-600 uppercase">Statement 3</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-medium">Schedule III Horizontal & Vertical Statement of Financial Position</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                Balance Sheet ({props.comparativeBs.currentPeriodLabel})
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Shareholders’ Equity, Liabilities, and Assets verified to an exact ₹0.00 mathematical equilibrium.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => exportCsv("balance_sheet", ["Particulars", "Group", "Current (₹)", "Previous (₹)", "Variance (₹)", "Common Size %"], props.comparativeBs.items.map(i => [
                  i.name,
                  i.group || "Balance Sheet",
                  i.currentAmount,
                  i.previousAmount,
                  i.varianceAmount,
                  `${i.currentCommonSizePercent}%`
                ]))}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
              >
                Export CSV
              </button>

              <div className="px-4 py-2 rounded-xl text-sm font-bold bg-teal-50 text-teal-800 border border-teal-300 dark:bg-teal-950/30 dark:text-teal-300">
                ✓ Total Assets = Total Equity + Liab ({formatCurrency(props.balanceSheet.totalAssets)})
              </div>
            </div>
          </div>

          {/* Schedule III Balance Sheet Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Equity and Liabilities</th>
                    <th className="py-3.5 px-4 text-right">{props.comparativeBs.currentPeriodLabel} (₹)</th>
                    {showVerticalAnalysis && <th className="py-3.5 px-4 text-right">Common Size %</th>}
                    <th className="py-3.5 px-4 text-right">{props.comparativeBs.previousPeriodLabel} (₹)</th>
                    <th className="py-3.5 px-4 text-right">Variance (₹)</th>
                    <th className="py-3.5 px-4 text-right">YoY %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-slate-700 dark:text-slate-300">
                  {/* 1. EQUITY & LIABILITIES ITEMS */}
                  {props.comparativeBs.items.filter(i => i.group?.includes("Equity") || i.group?.includes("Liabilities")).map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-6 pl-10 font-sans text-slate-900 dark:text-white">
                        <Link href={`/ledgers?search=${encodeURIComponent(item.name)}`} className="hover:text-teal-600 hover:underline">
                          {item.name}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">{formatCurrency(item.currentAmount)}</td>
                      {showVerticalAnalysis && <td className="py-2.5 px-4 text-right text-xs text-teal-600">{item.currentCommonSizePercent}%</td>}
                      <td className="py-2.5 px-4 text-right text-slate-500">{props.comparativeBs.hasPreviousData ? formatCurrency(item.previousAmount) : "No Prior Data"}</td>
                      <td className="py-2.5 px-4 text-right">{props.comparativeBs.hasPreviousData ? formatCurrency(item.varianceAmount) : "—"}</td>
                      <td className="py-2.5 px-4 text-right font-sans text-xs">{item.variancePercent !== null ? `${item.variancePercent}%` : "—"}</td>
                    </tr>
                  ))}
                  {/* Total Equity & Liabilities */}
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-y-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-sans">
                    <td className="py-3.5 px-6 uppercase text-xs tracking-wider">TOTAL EQUITY AND LIABILITIES</td>
                    <td className="py-3.5 px-4 text-right font-mono text-base text-teal-700 dark:text-teal-300">
                      {formatCurrency(props.comparativeBs.totals.totalEquityAndLiabilities.currentAmount)}
                    </td>
                    {showVerticalAnalysis && <td className="py-3.5 px-4 text-right text-xs font-mono">100.0%</td>}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-500">{props.comparativeBs.hasPreviousData ? formatCurrency(props.comparativeBs.totals.totalEquityAndLiabilities.previousAmount) : "No Prior Data"}</td>
                    <td className="py-3.5 px-4 text-right font-mono">{props.comparativeBs.hasPreviousData ? formatCurrency(props.comparativeBs.totals.totalEquityAndLiabilities.varianceAmount) : "—"}</td>
                    <td className="py-3.5 px-4 text-right text-xs">{props.comparativeBs.totals.totalEquityAndLiabilities.variancePercent !== null ? `${props.comparativeBs.totals.totalEquityAndLiabilities.variancePercent}%` : "—"}</td>
                  </tr>

                  {/* 2. ASSETS */}
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40 font-sans font-bold text-slate-900 dark:text-white">
                    <td colSpan={showVerticalAnalysis ? 6 : 5} className="py-2.5 px-6 uppercase text-xs tracking-wider text-teal-700 dark:text-teal-400">
                      ASSETS (Non-Current & Current Assets)
                    </td>
                  </tr>
                  {props.comparativeBs.items.filter(i => i.group?.includes("Assets")).map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-6 pl-10 font-sans text-slate-900 dark:text-white">
                        <Link href={`/ledgers?search=${encodeURIComponent(item.name)}`} className="hover:text-teal-600 hover:underline">
                          {item.name}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">{formatCurrency(item.currentAmount)}</td>
                      {showVerticalAnalysis && <td className="py-2.5 px-4 text-right text-xs text-teal-600">{item.currentCommonSizePercent}%</td>}
                      <td className="py-2.5 px-4 text-right text-slate-500">{props.comparativeBs.hasPreviousData ? formatCurrency(item.previousAmount) : "No Prior Data"}</td>
                      <td className="py-2.5 px-4 text-right">{props.comparativeBs.hasPreviousData ? formatCurrency(item.varianceAmount) : "—"}</td>
                      <td className="py-2.5 px-4 text-right font-sans text-xs">{item.variancePercent !== null ? `${item.variancePercent}%` : "—"}</td>
                    </tr>
                  ))}
                  {/* Total Assets */}
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-sans">
                    <td className="py-3.5 px-6 uppercase text-xs tracking-wider">TOTAL ASSETS</td>
                    <td className="py-3.5 px-4 text-right font-mono text-base text-teal-700 dark:text-teal-300">
                      {formatCurrency(props.comparativeBs.totals.totalAssets.currentAmount)}
                    </td>
                    {showVerticalAnalysis && <td className="py-3.5 px-4 text-right text-xs font-mono">100.0%</td>}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-500">{props.comparativeBs.hasPreviousData ? formatCurrency(props.comparativeBs.totals.totalAssets.previousAmount) : "No Prior Data"}</td>
                    <td className="py-3.5 px-4 text-right font-mono">{props.comparativeBs.hasPreviousData ? formatCurrency(props.comparativeBs.totals.totalAssets.varianceAmount) : "—"}</td>
                    <td className="py-3.5 px-4 text-right text-xs">{props.comparativeBs.totals.totalAssets.variancePercent !== null ? `${props.comparativeBs.totals.totalAssets.variancePercent}%` : "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 4. CASH FLOW STATEMENT TAB */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "cash-flow" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest text-teal-600 uppercase">Statement 4</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-medium">AS-3 Cash Flow Statement</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                Cash Flow Statement ({props.comparativeCf.currentPeriodLabel})
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Direct accounting cash flow classified across Operating, Investing, and Financing activities.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => exportCsv("cash_flow_statement", ["Activity Item", "Group", "Current (₹)", "Previous (₹)", "Variance (₹)"], props.comparativeCf.items.map(i => [
                  i.name,
                  i.group || "Cash Flow",
                  i.currentAmount,
                  i.previousAmount,
                  i.varianceAmount
                ]))}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
              >
                Export CSV
              </button>

              <div className="px-4 py-2 rounded-xl text-sm font-bold bg-teal-50 text-teal-800 border border-teal-300 dark:bg-teal-950/30 dark:text-teal-300">
                Closing Cash: {formatCurrency(props.cashFlow.closingCashAndBank)}
              </div>
            </div>
          </div>

          {/* Cash Flow Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Cash Flow Activity</th>
                    <th className="py-3.5 px-4 text-right">{props.comparativeCf.currentPeriodLabel} (₹)</th>
                    <th className="py-3.5 px-4 text-right">{props.comparativeCf.previousPeriodLabel} (₹)</th>
                    <th className="py-3.5 px-4 text-right">Variance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-slate-700 dark:text-slate-300">
                  {props.comparativeCf.items.map(item => {
                    const isGroupTotal = item.id.startsWith("cf_net_");
                    return (
                      <tr
                        key={item.id}
                        className={`transition ${
                          isGroupTotal
                            ? "bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-900 dark:text-white"
                            : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                        }`}
                      >
                        <td className={`py-3 px-6 font-sans ${isGroupTotal ? "font-bold text-teal-800 dark:text-teal-300" : "pl-10 text-slate-800 dark:text-slate-200"}`}>
                          {item.name}
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${item.currentAmount < 0 ? "text-rose-600 dark:text-rose-400" : ""}`}>
                          {formatCurrency(item.currentAmount)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          {props.comparativeCf.hasPreviousData ? formatCurrency(item.previousAmount) : "No Prior Data"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {props.comparativeCf.hasPreviousData ? formatCurrency(item.varianceAmount) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Opening and Closing Cash */}
                  <tr className="bg-slate-100 dark:bg-slate-800 font-sans font-medium text-slate-700 dark:text-slate-300">
                    <td className="py-3 px-6">Cash & Cash Equivalents at Inception / Opening Date</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(props.comparativeCf.openingCash.currentAmount)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">{props.comparativeCf.hasPreviousData ? formatCurrency(props.comparativeCf.openingCash.previousAmount) : "No Prior Data"}</td>
                    <td className="py-3 px-4 text-right font-mono">—</td>
                  </tr>
                  <tr className="bg-teal-100 dark:bg-teal-950/40 font-bold border-t-2 border-teal-400 dark:border-teal-700 text-teal-950 dark:text-teal-100 font-sans">
                    <td className="py-4 px-6 uppercase text-sm tracking-wider">
                      Cash & Cash Equivalents at Period End (Matches Balance Sheet Cash & Bank)
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-lg text-teal-800 dark:text-teal-300">
                      {formatCurrency(props.comparativeCf.closingCash.currentAmount)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-500">{props.comparativeCf.hasPreviousData ? formatCurrency(props.comparativeCf.closingCash.previousAmount) : "No Prior Data"}</td>
                    <td className="py-4 px-4 text-right font-mono">{props.comparativeCf.hasPreviousData ? formatCurrency(props.comparativeCf.closingCash.varianceAmount) : "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 5. COMPARATIVE ANALYSIS TAB */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "comparative" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest text-teal-600 uppercase">Comparative Intelligence</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-medium">YoY Horizontal & Vertical Variance Analysis</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                Comparative Financial Statements ({props.comparativePnl.currentPeriodLabel} vs {props.comparativePnl.previousPeriodLabel})
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Rigorous financial variance calculation handling zero/missing historical benchmarks cleanly.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue Growth</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(props.comparativePnl.totals.totalRevenue.currentAmount)}
              </p>
              <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                {props.comparativePnl.totals.totalRevenue.variancePercent !== null ? `${props.comparativePnl.totals.totalRevenue.variancePercent}% YoY` : "Baseline Inception Year"}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operating Margin Spread</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {props.comparativePnl.totals.operatingMargin.current}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Operating EBIT: {formatCurrency(props.comparativePnl.totals.operatingProfit.currentAmount)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Working Capital</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(props.comparativeBs.totals.netWorkingCapital.currentAmount)}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                Current Assets exceed Current Liab
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Free Cash Position</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(props.cashFlow.closingCashAndBank)}
              </p>
              <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                Bank & liquid equivalents on deposit
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 6. FINANCIAL INTELLIGENCE & RATIOS TAB */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "analysis" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest text-teal-600 uppercase">Management Intelligence</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-medium">Financial Health & Diagnostic Ratios</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                Financial Intelligence & Key Ratios ({props.financialRatios.currentPeriodLabel})
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Key Indian financial ratios evaluated against standard commercial ICAI & banking benchmarks.
              </p>
            </div>
          </div>

          {/* Data-Driven Management Observations */}
          <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-md space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">💡</span>
              <h3 className="text-base font-bold text-teal-200 uppercase tracking-wider">
                Audited Management Observations & Controller Insights
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {props.financialAnalysis.managementInsights.map((insight, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10 text-sm text-slate-100 flex items-start gap-2.5">
                  <span className="text-teal-400 font-bold mt-0.5">•</span>
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ratios Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {props.financialRatios.ratios.map((ratio, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {ratio.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        ratio.status === "GOOD"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : ratio.status === "ATTENTION"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {ratio.status}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {ratio.name}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {ratio.formula}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-extrabold text-teal-700 dark:text-teal-300">
                      {ratio.formattedCurrent}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Benchmark: {ratio.targetBenchmark}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic leading-relaxed">
                    {ratio.interpretation}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Monthly Trends Table */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              12-Month Performance Trend (Revenue vs Expenses vs Net Profit)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4 text-right">Revenue (₹)</th>
                    <th className="py-3 px-4 text-right">Expenses (₹)</th>
                    <th className="py-3 px-4 text-right">Operating Profit (₹)</th>
                    <th className="py-3 px-4 text-right">Operating Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {props.financialAnalysis.monthlyTrends.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-900 dark:text-white">{m.month}</td>
                      <td className="py-2.5 px-4 text-right font-medium">{formatCurrency(m.revenue)}</td>
                      <td className="py-2.5 px-4 text-right">{formatCurrency(m.expenses)}</td>
                      <td className="py-2.5 px-4 text-right text-teal-600 dark:text-teal-400 font-bold">{formatCurrency(m.operatingProfit)}</td>
                      <td className="py-2.5 px-4 text-right font-sans text-xs">{m.operatingMargin}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Concentration & OPEX Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Customer Revenue Concentration (Pareto Distribution)
              </h3>
              <div className="space-y-3">
                {props.financialAnalysis.customerConcentration.map(c => (
                  <div key={c.customerId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-900 dark:text-white">{c.customerName}</span>
                      <span className="font-mono font-bold">{formatCurrency(c.amount)} ({c.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-teal-600 h-full rounded-full" style={{ width: `${Math.min(100, c.percentage)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Operating Expense Category Distribution
              </h3>
              <div className="space-y-3">
                {props.financialAnalysis.expenseBreakdown.map(e => (
                  <div key={e.categoryId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-900 dark:text-white">{e.categoryName}</span>
                      <span className="font-mono font-bold">{formatCurrency(e.amount)} ({e.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, e.percentage)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
