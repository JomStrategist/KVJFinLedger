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
  basePath?: string;
  hideTopHeader?: boolean;
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

    const basePath = props.basePath || "/reports?category=statements";
    const separator = basePath.includes("?") ? "&" : "?";

    startTransition(() => {
      router.push(`${basePath}${separator}${params.toString()}`);
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

  const safeTb = props.trialBalance || {
    asOfDate: new Date().toISOString(),
    totalDebit: 0,
    totalCredit: 0,
    difference: 0,
    isBalanced: true,
    items: [],
  };
  const safePnl = props.profitAndLoss || {
    fromDate: new Date().toISOString(),
    toDate: new Date().toISOString(),
    totalRevenue: 0,
    totalExpenses: 0,
    operatingProfit: 0,
    profitBeforeTax: 0,
    taxExpense: 0,
    netProfitAfterTax: 0,
    revenueFromOperations: [],
    otherIncome: [],
    operatingExpenses: [],
    employeeCosts: [],
    depreciationAmortization: [],
    financeCosts: [],
    otherExpenses: [],
  };
  const safeBs = props.balanceSheet || {
    asOfDate: new Date().toISOString(),
    totalAssets: 0,
    totalEquityAndLiabilities: 0,
    difference: 0,
    isBalanced: true,
    equity: { capital: 0, reservesAndSurplus: 0, drawings: 0, totalShareholdersFunds: 0 },
    currentLiabilities: { tradePayables: 0, employeePayables: 0, statutoryGstPayable: 0, statutoryTdsPayable: 0, otherCurrentLiabilities: 0, total: 0 },
    nonCurrentAssets: { fixedAssetsGross: 0, accumulatedDepreciation: 0, fixedAssetsNet: 0, total: 0 },
    currentAssets: { tradeReceivables: 0, cashAndBank: 0, tdsReceivable: 0, gstInputCredit: 0, otherCurrentAssets: 0, total: 0 },
  };
  const safeCf = props.cashFlow || {
    fromDate: new Date().toISOString(),
    toDate: new Date().toISOString(),
    openingCashAndBank: 0,
    closingCashAndBank: 0,
    netCashFlow: 0,
    operatingCashFlow: { customerReceipts: 0, vendorDisbursements: 0, employeeDisbursements: 0, gstPaid: 0, tdsPaid: 0, netOperating: 0 },
    investingCashFlow: { capitalExpenditure: 0, netInvesting: 0 },
    financingCashFlow: { capitalIntroduced: 0, drawingsWithdrawn: 0, netFinancing: 0 },
  };

  const safeTbItems = Array.isArray(safeTb.items) ? safeTb.items : [];
  // Filtered TB rows
  const filteredTbItems = safeTbItems.filter(it => {
    if (tbGroupFilter !== "ALL" && it.accountGroup !== tbGroupFilter) return false;
    if (tbSearch.trim() && !it.accountName.toLowerCase().includes(tbSearch.toLowerCase()) && !it.accountGroup.toLowerCase().includes(tbSearch.toLowerCase())) {
      return false;
    }
    return true;
  });

  const tbGroups = Array.from(new Set(safeTbItems.map(i => i.accountGroup))).sort();

  const safeCompPnl = React.useMemo(() => {
    const raw = props.comparativePnl;
    if (raw && typeof raw === "object" && !Array.isArray(raw) && Array.isArray(raw.revenueItems)) {
      return {
        ...raw,
        expenseItems: Array.isArray(raw.expenseItems) ? raw.expenseItems : [],
        totals: {
          totalRevenue: raw.totals?.totalRevenue || { currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
          totalExpenses: raw.totals?.totalExpenses || { currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
          operatingProfit: raw.totals?.operatingProfit || { currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
          profitBeforeTax: raw.totals?.profitBeforeTax || { currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
          netProfitAfterTax: raw.totals?.netProfitAfterTax || { currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
          operatingMargin: raw.totals?.operatingMargin || { current: 0, previous: 0, variance: 0 },
          netMargin: raw.totals?.netMargin || { current: 0, previous: 0, variance: 0 },
        }
      };
    }
    return {
      currentPeriodLabel: selectedFy,
      previousPeriodLabel: "Previous FY",
      hasPreviousData: false,
      revenueItems: [],
      expenseItems: [],
      totals: {
        totalRevenue: { id: "tot_rev", name: "Total Revenue", currentAmount: safePnl.totalRevenue || 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
        totalExpenses: { id: "tot_exp", name: "Total Expenses", currentAmount: safePnl.totalExpenses || 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
        operatingProfit: { id: "tot_ebit", name: "Operating Profit", currentAmount: safePnl.operatingProfit || 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
        profitBeforeTax: { id: "tot_pbt", name: "Profit Before Tax", currentAmount: safePnl.profitBeforeTax || 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
        netProfitAfterTax: { id: "tot_pat", name: "Net Profit After Tax", currentAmount: safePnl.netProfitAfterTax || 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
        operatingMargin: { current: 0, previous: 0, variance: 0 },
        netMargin: { current: 0, previous: 0, variance: 0 },
      }
    };
  }, [props.comparativePnl, safePnl, selectedFy]);

  const safeCompBs = React.useMemo(() => {
    const raw = props.comparativeBs;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const items = Array.isArray(raw.items) ? raw.items : [];
      return {
        ...raw,
        items,
        totals: {
          totalAssets: raw.totals?.totalAssets || { currentAmount: safeBs.totalAssets || 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
          totalLiabilities: raw.totals?.totalLiabilities || (raw.totals as any)?.totalCurrentLiabilities || { currentAmount: safeBs.currentLiabilities?.total || 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
          totalEquity: raw.totals?.totalEquity || (raw.totals as any)?.totalShareholdersFunds || { currentAmount: safeBs.equity?.totalShareholdersFunds || 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
          totalEquityAndLiabilities: raw.totals?.totalEquityAndLiabilities || { currentAmount: safeBs.totalEquityAndLiabilities || 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
          netWorkingCapital: raw.totals?.netWorkingCapital || (raw as any).workingCapital || { currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
        }
      };
    }
    return {
      currentPeriodLabel: selectedFy,
      previousPeriodLabel: "Previous FY",
      hasPreviousData: false,
      items: [],
      totals: {
        totalAssets: { id: "tot_assets", name: "Total Assets", currentAmount: safeBs.totalAssets || 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
        totalLiabilities: { id: "tot_liab", name: "Total Liabilities", currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
        totalEquity: { id: "tot_eq", name: "Total Equity", currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
        totalEquityAndLiabilities: { id: "tot_eq_liab", name: "Total Equity & Liabilities", currentAmount: safeBs.totalEquityAndLiabilities || 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
        netWorkingCapital: { id: "tot_wc", name: "Net Working Capital", currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
      }
    };
  }, [props.comparativeBs, safeBs, selectedFy]);

  const safeCompCf = React.useMemo(() => {
    const raw = props.comparativeCf;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const items = Array.isArray(raw.items) ? raw.items : [];
      const closing = raw.closingCash || items.find(i => i.id === "cf_closing") || {
        currentAmount: safeCf.closingCashAndBank || 0,
        previousAmount: 0,
        varianceAmount: 0,
        variancePercent: null,
      };
      const opening = raw.openingCash || items.find(i => i.id === "cf_opening") || {
        currentAmount: safeCf.openingCashAndBank || 0,
        previousAmount: 0,
        varianceAmount: 0,
        variancePercent: null,
      };
      return {
        ...raw,
        items,
        closingCash: closing,
        openingCash: opening,
      };
    }
    return {
      currentPeriodLabel: selectedFy,
      previousPeriodLabel: "Previous FY",
      hasPreviousData: false,
      items: [],
      closingCash: { id: "cf_closing", name: "Cash at End", currentAmount: safeCf.closingCashAndBank || 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
      openingCash: { id: "cf_opening", name: "Cash at Inception", currentAmount: safeCf.openingCashAndBank || 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
    };
  }, [props.comparativeCf, safeCf, selectedFy]);

  const safeAnalysis = props.financialAnalysis || {
    managementInsights: [],
    monthlyTrends: [],
    customerConcentration: [],
    expenseBreakdown: [],
    vendorConcentration: [],
  };

  const safeRatios = props.financialRatios || {
    currentPeriodLabel: selectedFy,
    previousPeriodLabel: "",
    hasPreviousData: false,
    ratios: [],
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
      {/* Top Header & Context - Only when not nested inside ReportsHub */}
      {!props.hideTopHeader && (
        <div className="no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Financial Statements
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                safeTb.isBalanced
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300"
                  : "bg-rose-50 text-rose-800 border border-rose-300"
              }`}>
                {safeTb.isBalanced ? "✓ Double-Entry Balanced" : `⚠ Variance: ₹${safeTb.difference}`}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Standard accounting reports from the General Ledger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs transition"
            >
              🖨️ Print
            </button>
            <Link
              href="/ledgers"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs transition"
            >
              Trace in Ledgers →
            </Link>
          </div>
        </div>
      )}

      {/* Primary Statement Navigation Ribbon */}
      <div className="no-print bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-2">
        <nav className="flex space-x-1.5 overflow-x-auto custom-scrollbar" aria-label="Statement Tabs">
          {[
            { id: "trial-balance", label: "Trial Balance", icon: "⚖️" },
            { id: "pnl", label: "Profit & Loss Account", icon: "📈" },
            { id: "balance-sheet", label: "Balance Sheet", icon: "🏛️" },
            { id: "cash-flow", label: "Cash Flow Statement", icon: "💵" },
            { id: "comparative", label: "Comparative Analysis", icon: "📊" },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`whitespace-nowrap py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#177B55] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
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
        <div className="space-y-4">
          {/* Trial Balance Table Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Integrated Toolbar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#FAFBF9] dark:bg-slate-800/40">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 text-xs">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Search account or group..."
                    value={tbSearch}
                    onChange={e => setTbSearch(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
                <select
                  value={tbGroupFilter}
                  onChange={e => setTbGroupFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                >
                  <option value="ALL">All Account Groups</option>
                  {tbGroups.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>

                <select
                  value={selectedFy}
                  onChange={e => {
                    setSelectedFy(e.target.value);
                    applyFilters({ financialYear: e.target.value });
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                >
                  <option value="FY 2026–27">FY 2026–27 (Current)</option>
                  <option value="FY 2025–26">FY 2025–26 (Previous)</option>
                  <option value="FY 2024–25">FY 2024–25</option>
                </select>

                <select
                  value={selectedPeriod}
                  onChange={e => {
                    setSelectedPeriod(e.target.value);
                    applyFilters({ period: e.target.value });
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                >
                  <option value="ALL">Full Financial Year (1 Apr - 31 Mar)</option>
                  <option value="Q1">Q1 (Apr - Jun)</option>
                  <option value="Q2">Q2 (Jul - Sep)</option>
                  <option value="Q3">Q3 (Oct - Dec)</option>
                  <option value="Q4">Q4 (Jan - Mar)</option>
                  <option value="YTD">Year to Date (YTD)</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-medium">
                  {filteredTbItems.length} Accounts
                </span>
                <span className="text-slate-300">•</span>
                <span className={`text-xs font-bold ${safeTb.isBalanced ? "text-[#15803D]" : "text-rose-700"}`}>
                  {safeTb.isBalanced ? "✓ Balanced (₹0.00)" : `⚠ Variance: ₹${safeTb.difference}`}
                </span>
                <button
                  onClick={() => exportCsv("trial_balance", ["Account Particulars", "Account Group", "Debit", "Credit"], filteredTbItems.map(i => [
                    i.accountName,
                    i.accountGroup,
                    i.closingDebit || 0,
                    i.closingCredit || 0
                  ]))}
                  className="px-3 py-1.5 text-xs font-semibold text-[#177B55] bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition shadow-xs flex items-center gap-1 cursor-pointer"
                  title="Export Trial Balance to CSV"
                >
                  📥 Export CSV
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAFBF9] dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-semibold">ACCOUNT PARTICULARS</th>
                    <th className="py-3.5 px-4 font-semibold">ACCOUNT GROUP</th>
                    <th className="py-3.5 px-4 text-right font-semibold">DEBIT (₹)</th>
                    <th className="py-3.5 px-4 text-right font-semibold">CREDIT (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
                  {filteredTbItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No ledger accounts match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTbItems.map((item) => (
                      <tr
                        key={item.accountId}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                          <Link
                            href={`/ledgers?accountId=${encodeURIComponent(item.accountId)}`}
                            className="hover:text-[#177B55] dark:hover:text-emerald-400 hover:underline"
                            title="View General Ledger Statement"
                          >
                            {item.accountName}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                          {item.accountGroup}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-900 dark:text-white">
                          {item.closingDebit > 0
                            ? Number(item.closingDebit).toLocaleString('en-IN', {
                                minimumFractionDigits: item.closingDebit % 1 !== 0 ? 2 : 0,
                                maximumFractionDigits: 2
                              })
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-900 dark:text-white">
                          {item.closingCredit > 0
                            ? Number(item.closingCredit).toLocaleString('en-IN', {
                                minimumFractionDigits: item.closingCredit % 1 !== 0 ? 2 : 0,
                                maximumFractionDigits: 2
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-[#F0FDF4] dark:bg-emerald-950/40 font-bold border-t border-emerald-200 dark:border-emerald-800/50 text-[#15803D] dark:text-emerald-300 font-mono text-xs">
                    <td className="py-3.5 px-4 font-sans font-black text-[13px]">
                      Total
                    </td>
                    <td className="py-3.5 px-4"></td>
                    <td className="py-3.5 px-4 text-right text-sm font-black">
                      {Number(safeTb.totalDebit).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right text-sm font-black">
                      {Number(safeTb.totalCredit).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
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
        <div className="space-y-4">
          {/* Schedule III P&L Table Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Integrated Toolbar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#FAFBF9] dark:bg-slate-800/40">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                <select
                  value={selectedFy}
                  onChange={e => {
                    setSelectedFy(e.target.value);
                    applyFilters({ financialYear: e.target.value });
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                >
                  <option value="FY 2026–27">FY 2026–27 (Current)</option>
                  <option value="FY 2025–26">FY 2025–26 (Previous)</option>
                  <option value="FY 2024–25">FY 2024–25</option>
                </select>

                <select
                  value={selectedPeriod}
                  onChange={e => {
                    setSelectedPeriod(e.target.value);
                    applyFilters({ period: e.target.value });
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                >
                  <option value="ALL">Full Financial Year (1 Apr - 31 Mar)</option>
                  <option value="Q1">Q1 (Apr - Jun)</option>
                  <option value="Q2">Q2 (Jul - Sep)</option>
                  <option value="Q3">Q3 (Oct - Dec)</option>
                  <option value="Q4">Q4 (Jan - Mar)</option>
                  <option value="YTD">Year to Date (YTD)</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowVerticalAnalysis(!showVerticalAnalysis)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                    showVerticalAnalysis
                      ? "bg-emerald-50 text-[#177B55] border-emerald-300"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Vertical % {showVerticalAnalysis ? "✓" : ""}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-[#15803D] border border-emerald-200">
                  PAT: {formatCurrency(safePnl.netProfitAfterTax)}
                </span>
                <button
                  onClick={() => exportCsv("pnl_statement", ["Particulars", "Group", "Current (₹)", "Previous (₹)", "Variance (₹)", "Common Size %"], [
                    ...safeCompPnl.revenueItems.map(r => [r.name, r.group || "Revenue", r.currentAmount, r.previousAmount, r.varianceAmount, `${r.currentCommonSizePercent}%`]),
                    ...safeCompPnl.expenseItems.map(e => [e.name, e.group || "Expense", e.currentAmount, e.previousAmount, e.varianceAmount, `${e.currentCommonSizePercent}%`]),
                  ])}
                  className="px-3 py-1.5 text-xs font-semibold text-[#177B55] bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition shadow-xs flex items-center gap-1 cursor-pointer"
                  title="Export P&L to CSV"
                >
                  📥 Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Particulars (Income / Expense)</th>
                    <th className="py-3.5 px-4 text-right">{safeCompPnl.currentPeriodLabel} (₹)</th>
                    {showVerticalAnalysis && <th className="py-3.5 px-4 text-right">Vertical %</th>}
                    <th className="py-3.5 px-4 text-right">{safeCompPnl.previousPeriodLabel} (₹)</th>
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
                  {safeCompPnl.revenueItems.length === 0 ? (
                    <tr>
                      <td colSpan={showVerticalAnalysis ? 6 : 5} className="py-4 px-6 text-center text-slate-400 font-sans text-xs">
                        No revenue line items recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    safeCompPnl.revenueItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-6 pl-10 font-sans text-slate-900 dark:text-white">
                          <Link href={`/ledgers?search=${encodeURIComponent(item.name)}`} className="hover:text-teal-600 hover:underline">
                            {item.name}
                          </Link>
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium">{formatCurrency(item.currentAmount)}</td>
                        {showVerticalAnalysis && <td className="py-2.5 px-4 text-right text-xs text-teal-600">{item.currentCommonSizePercent}%</td>}
                        <td className="py-2.5 px-4 text-right text-slate-500">{safeCompPnl.hasPreviousData ? formatCurrency(item.previousAmount) : "No Prior Data"}</td>
                        <td className="py-2.5 px-4 text-right">{safeCompPnl.hasPreviousData ? formatCurrency(item.varianceAmount) : "—"}</td>
                        <td className="py-2.5 px-4 text-right font-sans text-xs">{item.variancePercent !== null ? `${item.variancePercent}%` : "—"}</td>
                      </tr>
                    ))
                  )}
                  {/* Total Revenue */}
                  <tr className="bg-teal-50/50 dark:bg-teal-950/20 font-bold border-y border-teal-200 dark:border-teal-900 text-teal-900 dark:text-teal-200 font-sans">
                    <td className="py-3 px-6 uppercase text-xs tracking-wider">Total Revenue from Operations (A)</td>
                    <td className="py-3 px-4 text-right font-mono text-base">{formatCurrency(safeCompPnl.totals.totalRevenue.currentAmount)}</td>
                    {showVerticalAnalysis && <td className="py-3 px-4 text-right text-xs">100.0%</td>}
                    <td className="py-3 px-4 text-right font-mono text-slate-500">{safeCompPnl.hasPreviousData ? formatCurrency(safeCompPnl.totals.totalRevenue.previousAmount) : "No Prior Data"}</td>
                    <td className="py-3 px-4 text-right font-mono">{safeCompPnl.hasPreviousData ? formatCurrency(safeCompPnl.totals.totalRevenue.varianceAmount) : "—"}</td>
                    <td className="py-3 px-4 text-right text-xs">{safeCompPnl.totals.totalRevenue.variancePercent !== null ? `${safeCompPnl.totals.totalRevenue.variancePercent}%` : "—"}</td>
                  </tr>

                  {/* II. EXPENSES */}
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40 font-sans font-bold text-slate-900 dark:text-white">
                    <td colSpan={showVerticalAnalysis ? 6 : 5} className="py-2.5 px-6 uppercase text-xs tracking-wider text-rose-700 dark:text-rose-400">
                      II. Operating & Indirect Expenses
                    </td>
                  </tr>
                  {safeCompPnl.expenseItems.length === 0 ? (
                    <tr>
                      <td colSpan={showVerticalAnalysis ? 6 : 5} className="py-4 px-6 text-center text-slate-400 font-sans text-xs">
                        No expense line items recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    safeCompPnl.expenseItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-6 pl-10 font-sans text-slate-900 dark:text-white">
                          <Link href={`/ledgers?search=${encodeURIComponent(item.name)}`} className="hover:text-teal-600 hover:underline">
                            {item.name}
                          </Link>
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium">{formatCurrency(item.currentAmount)}</td>
                        {showVerticalAnalysis && <td className="py-2.5 px-4 text-right text-xs text-slate-500">{item.currentCommonSizePercent}%</td>}
                        <td className="py-2.5 px-4 text-right text-slate-500">{safeCompPnl.hasPreviousData ? formatCurrency(item.previousAmount) : "No Prior Data"}</td>
                        <td className="py-2.5 px-4 text-right">{safeCompPnl.hasPreviousData ? formatCurrency(item.varianceAmount) : "—"}</td>
                        <td className="py-2.5 px-4 text-right font-sans text-xs">{item.variancePercent !== null ? `${item.variancePercent}%` : "—"}</td>
                      </tr>
                    ))
                  )}
                  {/* Total Expenses */}
                  <tr className="bg-rose-50/40 dark:bg-rose-950/20 font-bold border-y border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 font-sans">
                    <td className="py-3 px-6 uppercase text-xs tracking-wider">Total Operating Expenditure (B)</td>
                    <td className="py-3 px-4 text-right font-mono text-base">{formatCurrency(safeCompPnl.totals.totalExpenses.currentAmount)}</td>
                    {showVerticalAnalysis && <td className="py-3 px-4 text-right text-xs">{safeCompPnl.totals.totalExpenses.currentCommonSizePercent}%</td>}
                    <td className="py-3 px-4 text-right font-mono text-slate-500">{safeCompPnl.hasPreviousData ? formatCurrency(safeCompPnl.totals.totalExpenses.previousAmount) : "No Prior Data"}</td>
                    <td className="py-3 px-4 text-right font-mono">{safeCompPnl.hasPreviousData ? formatCurrency(safeCompPnl.totals.totalExpenses.varianceAmount) : "—"}</td>
                    <td className="py-3 px-4 text-right text-xs">{safeCompPnl.totals.totalExpenses.variancePercent !== null ? `${safeCompPnl.totals.totalExpenses.variancePercent}%` : "—"}</td>
                  </tr>

                  {/* Operating Profit */}
                  <tr className="bg-slate-50 font-bold text-slate-900 dark:text-white font-sans">
                    <td className="py-3 px-6 uppercase text-xs tracking-wider">Operating Profit / EBIT (A - B)</td>
                    <td className="py-3 px-4 text-right font-mono text-base">{formatCurrency(safeCompPnl.totals.operatingProfit.currentAmount)}</td>
                    {showVerticalAnalysis && <td className="py-3 px-4 text-right text-xs">{safeCompPnl.totals.operatingProfit.currentCommonSizePercent}%</td>}
                    <td className="py-3 px-4 text-right font-mono text-slate-500">{safeCompPnl.hasPreviousData ? formatCurrency(safeCompPnl.totals.operatingProfit.previousAmount) : "No Prior Data"}</td>
                    <td className="py-3 px-4 text-right font-mono">{safeCompPnl.hasPreviousData ? formatCurrency(safeCompPnl.totals.operatingProfit.varianceAmount) : "—"}</td>
                    <td className="py-3 px-4 text-right text-xs">{safeCompPnl.totals.operatingProfit.variancePercent !== null ? `${safeCompPnl.totals.operatingProfit.variancePercent}%` : "—"}</td>
                  </tr>

                  {/* Tax Provision */}
                  <tr className="hover:bg-slate-50 transition font-sans">
                    <td className="py-2.5 px-6 pl-10 text-slate-600 dark:text-slate-400">
                      Less: Tax Expense / Provision (Standard 25% Corporate Tax)
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(safePnl.taxExpense)}</td>
                    {showVerticalAnalysis && <td className="py-2.5 px-4 text-right text-xs font-mono">{(safeCompPnl.totals.totalRevenue.currentAmount > 0 ? (safePnl.taxExpense / safeCompPnl.totals.totalRevenue.currentAmount * 100).toFixed(1) : "0.0")}%</td>}
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
                      {formatCurrency(safeCompPnl.totals.netProfitAfterTax.currentAmount)}
                    </td>
                    {showVerticalAnalysis && <td className="py-4 px-4 text-right text-xs font-mono">{safeCompPnl.totals.netProfitAfterTax.currentCommonSizePercent}%</td>}
                    <td className="py-4 px-4 text-right font-mono text-slate-500">{safeCompPnl.hasPreviousData ? formatCurrency(safeCompPnl.totals.netProfitAfterTax.previousAmount) : "No Prior Data"}</td>
                    <td className="py-4 px-4 text-right font-mono">{safeCompPnl.hasPreviousData ? formatCurrency(safeCompPnl.totals.netProfitAfterTax.varianceAmount) : "—"}</td>
                    <td className="py-4 px-4 text-right text-xs">{safeCompPnl.totals.netProfitAfterTax.variancePercent !== null ? `${safeCompPnl.totals.netProfitAfterTax.variancePercent}%` : "—"}</td>
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
        <div className="space-y-4">
          {/* Schedule III Balance Sheet Table Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Integrated Toolbar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#FAFBF9] dark:bg-slate-800/40">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                <select
                  value={selectedFy}
                  onChange={e => {
                    setSelectedFy(e.target.value);
                    applyFilters({ financialYear: e.target.value });
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                >
                  <option value="FY 2026–27">FY 2026–27 (Current)</option>
                  <option value="FY 2025–26">FY 2025–26 (Previous)</option>
                  <option value="FY 2024–25">FY 2024–25</option>
                </select>

                <select
                  value={selectedPeriod}
                  onChange={e => {
                    setSelectedPeriod(e.target.value);
                    applyFilters({ period: e.target.value });
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                >
                  <option value="ALL">Full Financial Year (1 Apr - 31 Mar)</option>
                  <option value="Q1">Q1 (Apr - Jun)</option>
                  <option value="Q2">Q2 (Jul - Sep)</option>
                  <option value="Q3">Q3 (Oct - Dec)</option>
                  <option value="Q4">Q4 (Jan - Mar)</option>
                  <option value="YTD">Year to Date (YTD)</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowVerticalAnalysis(!showVerticalAnalysis)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                    showVerticalAnalysis
                      ? "bg-emerald-50 text-[#177B55] border-emerald-300"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Common Size % {showVerticalAnalysis ? "✓" : ""}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-[#15803D] border border-emerald-200">
                  ✓ Equilibrium: {formatCurrency(safeBs.totalAssets)}
                </span>
                <button
                  onClick={() => exportCsv("balance_sheet", ["Particulars", "Group", "Current (₹)", "Previous (₹)", "Variance (₹)", "Common Size %"], safeCompBs.items.map(i => [
                    i.name,
                    i.group || "Balance Sheet",
                    i.currentAmount,
                    i.previousAmount,
                    i.varianceAmount,
                    `${i.currentCommonSizePercent}%`
                  ]))}
                  className="px-3 py-1.5 text-xs font-semibold text-[#177B55] bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition shadow-xs flex items-center gap-1 cursor-pointer"
                  title="Export Balance Sheet to CSV"
                >
                  📥 Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Equity and Liabilities</th>
                    <th className="py-3.5 px-4 text-right">{safeCompBs.currentPeriodLabel} (₹)</th>
                    {showVerticalAnalysis && <th className="py-3.5 px-4 text-right">Common Size %</th>}
                    <th className="py-3.5 px-4 text-right">{safeCompBs.previousPeriodLabel} (₹)</th>
                    <th className="py-3.5 px-4 text-right">Variance (₹)</th>
                    <th className="py-3.5 px-4 text-right">YoY %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-slate-700 dark:text-slate-300">
                  {/* 1. EQUITY & LIABILITIES ITEMS */}
                  {safeCompBs.items.filter(i => i.group?.includes("Equity") || i.group?.includes("Liabilities")).length === 0 ? (
                    <tr>
                      <td colSpan={showVerticalAnalysis ? 6 : 5} className="py-4 px-6 text-center text-slate-400 font-sans text-xs">
                        No equity or liabilities line items recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    safeCompBs.items.filter(i => i.group?.includes("Equity") || i.group?.includes("Liabilities")).map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-6 pl-10 font-sans text-slate-900 dark:text-white">
                          <Link href={`/ledgers?search=${encodeURIComponent(item.name)}`} className="hover:text-teal-600 hover:underline">
                            {item.name}
                          </Link>
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium">{formatCurrency(item.currentAmount)}</td>
                        {showVerticalAnalysis && <td className="py-2.5 px-4 text-right text-xs text-teal-600">{item.currentCommonSizePercent}%</td>}
                        <td className="py-2.5 px-4 text-right text-slate-500">{safeCompBs.hasPreviousData ? formatCurrency(item.previousAmount) : "No Prior Data"}</td>
                        <td className="py-2.5 px-4 text-right">{safeCompBs.hasPreviousData ? formatCurrency(item.varianceAmount) : "—"}</td>
                        <td className="py-2.5 px-4 text-right font-sans text-xs">{item.variancePercent !== null ? `${item.variancePercent}%` : "—"}</td>
                      </tr>
                    ))
                  )}
                  {/* Total Equity & Liabilities */}
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-y-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-sans">
                    <td className="py-3.5 px-6 uppercase text-xs tracking-wider">TOTAL EQUITY AND LIABILITIES</td>
                    <td className="py-3.5 px-4 text-right font-mono text-base text-teal-700 dark:text-teal-300">
                      {formatCurrency(safeCompBs.totals.totalEquityAndLiabilities.currentAmount)}
                    </td>
                    {showVerticalAnalysis && <td className="py-3.5 px-4 text-right text-xs font-mono">100.0%</td>}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-500">{safeCompBs.hasPreviousData ? formatCurrency(safeCompBs.totals.totalEquityAndLiabilities.previousAmount) : "No Prior Data"}</td>
                    <td className="py-3.5 px-4 text-right font-mono">{safeCompBs.hasPreviousData ? formatCurrency(safeCompBs.totals.totalEquityAndLiabilities.varianceAmount) : "—"}</td>
                    <td className="py-3.5 px-4 text-right text-xs">{safeCompBs.totals.totalEquityAndLiabilities.variancePercent !== null ? `${safeCompBs.totals.totalEquityAndLiabilities.variancePercent}%` : "—"}</td>
                  </tr>

                  {/* 2. ASSETS */}
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40 font-sans font-bold text-slate-900 dark:text-white">
                    <td colSpan={showVerticalAnalysis ? 6 : 5} className="py-2.5 px-6 uppercase text-xs tracking-wider text-teal-700 dark:text-teal-400">
                      ASSETS (Non-Current & Current Assets)
                    </td>
                  </tr>
                  {safeCompBs.items.filter(i => i.group?.includes("Assets")).length === 0 ? (
                    <tr>
                      <td colSpan={showVerticalAnalysis ? 6 : 5} className="py-4 px-6 text-center text-slate-400 font-sans text-xs">
                        No asset line items recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    safeCompBs.items.filter(i => i.group?.includes("Assets")).map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-6 pl-10 font-sans text-slate-900 dark:text-white">
                          <Link href={`/ledgers?search=${encodeURIComponent(item.name)}`} className="hover:text-teal-600 hover:underline">
                            {item.name}
                          </Link>
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium">{formatCurrency(item.currentAmount)}</td>
                        {showVerticalAnalysis && <td className="py-2.5 px-4 text-right text-xs text-teal-600">{item.currentCommonSizePercent}%</td>}
                        <td className="py-2.5 px-4 text-right text-slate-500">{safeCompBs.hasPreviousData ? formatCurrency(item.previousAmount) : "No Prior Data"}</td>
                        <td className="py-2.5 px-4 text-right">{safeCompBs.hasPreviousData ? formatCurrency(item.varianceAmount) : "—"}</td>
                        <td className="py-2.5 px-4 text-right font-sans text-xs">{item.variancePercent !== null ? `${item.variancePercent}%` : "—"}</td>
                      </tr>
                    ))
                  )}
                  {/* Total Assets */}
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-sans">
                    <td className="py-3.5 px-6 uppercase text-xs tracking-wider">TOTAL ASSETS</td>
                    <td className="py-3.5 px-4 text-right font-mono text-base text-teal-700 dark:text-teal-300">
                      {formatCurrency(safeCompBs.totals.totalAssets.currentAmount)}
                    </td>
                    {showVerticalAnalysis && <td className="py-3.5 px-4 text-right text-xs font-mono">100.0%</td>}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-500">{safeCompBs.hasPreviousData ? formatCurrency(safeCompBs.totals.totalAssets.previousAmount) : "No Prior Data"}</td>
                    <td className="py-3.5 px-4 text-right font-mono">{safeCompBs.hasPreviousData ? formatCurrency(safeCompBs.totals.totalAssets.varianceAmount) : "—"}</td>
                    <td className="py-3.5 px-4 text-right text-xs">{safeCompBs.totals.totalAssets.variancePercent !== null ? `${safeCompBs.totals.totalAssets.variancePercent}%` : "—"}</td>
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
        <div className="space-y-4">
          {/* Cash Flow Table Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Integrated Toolbar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#FAFBF9] dark:bg-slate-800/40">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                <select
                  value={selectedFy}
                  onChange={e => {
                    setSelectedFy(e.target.value);
                    applyFilters({ financialYear: e.target.value });
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                >
                  <option value="FY 2026–27">FY 2026–27 (Current)</option>
                  <option value="FY 2025–26">FY 2025–26 (Previous)</option>
                  <option value="FY 2024–25">FY 2024–25</option>
                </select>

                <select
                  value={selectedPeriod}
                  onChange={e => {
                    setSelectedPeriod(e.target.value);
                    applyFilters({ period: e.target.value });
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                >
                  <option value="ALL">Full Financial Year (1 Apr - 31 Mar)</option>
                  <option value="Q1">Q1 (Apr - Jun)</option>
                  <option value="Q2">Q2 (Jul - Sep)</option>
                  <option value="Q3">Q3 (Oct - Dec)</option>
                  <option value="Q4">Q4 (Jan - Mar)</option>
                  <option value="YTD">Year to Date (YTD)</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-[#15803D] border border-emerald-200">
                  Closing Cash: {formatCurrency(safeCf.closingCashAndBank)}
                </span>
                <button
                  onClick={() => exportCsv("cash_flow_statement", ["Activity Item", "Group", "Current (₹)", "Previous (₹)", "Variance (₹)"], safeCompCf.items.map(i => [
                    i.name,
                    i.group || "Cash Flow",
                    i.currentAmount,
                    i.previousAmount,
                    i.varianceAmount
                  ]))}
                  className="px-3 py-1.5 text-xs font-semibold text-[#177B55] bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition shadow-xs flex items-center gap-1 cursor-pointer"
                  title="Export Cash Flow to CSV"
                >
                  📥 Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Cash Flow Activity</th>
                    <th className="py-3.5 px-4 text-right">{safeCompCf.currentPeriodLabel} (₹)</th>
                    <th className="py-3.5 px-4 text-right">{safeCompCf.previousPeriodLabel} (₹)</th>
                    <th className="py-3.5 px-4 text-right">Variance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-slate-700 dark:text-slate-300">
                  {safeCompCf.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 px-6 text-center text-slate-400 font-sans text-xs">
                        No cash flow line items recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    safeCompCf.items.map(item => {
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
                            {safeCompCf.hasPreviousData ? formatCurrency(item.previousAmount) : "No Prior Data"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {safeCompCf.hasPreviousData ? formatCurrency(item.varianceAmount) : "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {/* Opening and Closing Cash */}
                  <tr className="bg-slate-100 dark:bg-slate-800 font-sans font-medium text-slate-700 dark:text-slate-300">
                    <td className="py-3 px-6">Cash & Cash Equivalents at Inception / Opening Date</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(safeCompCf.openingCash.currentAmount)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">{safeCompCf.hasPreviousData ? formatCurrency(safeCompCf.openingCash.previousAmount) : "No Prior Data"}</td>
                    <td className="py-3 px-4 text-right font-mono">—</td>
                  </tr>
                  <tr className="bg-teal-100 dark:bg-teal-950/40 font-bold border-t-2 border-teal-400 dark:border-teal-700 text-teal-950 dark:text-teal-100 font-sans">
                    <td className="py-4 px-6 uppercase text-sm tracking-wider">
                      Cash & Cash Equivalents at Period End (Matches Balance Sheet Cash & Bank)
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-lg text-teal-800 dark:text-teal-300">
                      {formatCurrency(safeCompCf.closingCash.currentAmount)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-500">{safeCompCf.hasPreviousData ? formatCurrency(safeCompCf.closingCash.previousAmount) : "No Prior Data"}</td>
                    <td className="py-4 px-4 text-right font-mono">{safeCompCf.hasPreviousData ? formatCurrency(safeCompCf.closingCash.varianceAmount) : "—"}</td>
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
        <div className="space-y-4">
          {/* Integrated Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={selectedFy}
                onChange={e => {
                  setSelectedFy(e.target.value);
                  applyFilters({ financialYear: e.target.value });
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#177B55]"
              >
                <option value="FY 2026–27">FY 2026–27 (Current)</option>
                <option value="FY 2025–26">FY 2025–26 (Previous)</option>
                <option value="FY 2024–25">FY 2024–25</option>
              </select>

              <select
                value={selectedPeriod}
                onChange={e => {
                  setSelectedPeriod(e.target.value);
                  applyFilters({ period: e.target.value });
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#177B55]"
              >
                <option value="ALL">Full Financial Year (1 Apr - 31 Mar)</option>
                <option value="Q1">Q1 (Apr - Jun)</option>
                <option value="Q2">Q2 (Jul - Sep)</option>
                <option value="Q3">Q3 (Oct - Dec)</option>
                <option value="Q4">Q4 (Jan - Mar)</option>
                <option value="YTD">Year to Date (YTD)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">
                Comparing {safeCompPnl.currentPeriodLabel} vs {safeCompPnl.previousPeriodLabel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue Growth</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(safeCompPnl.totals.totalRevenue.currentAmount)}
              </p>
              <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                {safeCompPnl.totals.totalRevenue.variancePercent !== null ? `${safeCompPnl.totals.totalRevenue.variancePercent}% YoY` : "Baseline Inception Year"}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operating Margin Spread</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {safeCompPnl.totals.operatingMargin.current}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Operating EBIT: {formatCurrency(safeCompPnl.totals.operatingProfit.currentAmount)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Working Capital</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(safeCompBs.totals.netWorkingCapital.currentAmount)}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                Current Assets exceed Current Liab
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Free Cash Position</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(safeCf.closingCashAndBank)}
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
                Financial Intelligence & Key Ratios ({safeRatios.currentPeriodLabel})
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
              {(safeAnalysis.managementInsights || []).map((insight, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10 text-sm text-slate-100 flex items-start gap-2.5">
                  <span className="text-teal-400 font-bold mt-0.5">•</span>
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ratios Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(safeRatios.ratios || []).map((ratio, idx) => (
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
                  {(safeAnalysis.monthlyTrends || []).map((m, idx) => (
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
                {(safeAnalysis.customerConcentration || []).map(c => (
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
                {(safeAnalysis.expenseBreakdown || []).map(e => (
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
