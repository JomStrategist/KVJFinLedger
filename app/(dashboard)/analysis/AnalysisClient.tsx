"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Props {
  initialData: any;
  initialFilters: any;
  customers: Array<{ id: string; legalName: string }>;
  vendors: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; financialType: string }>;
}

export default function AnalysisClient({
  initialData,
  initialFilters,
  customers,
  vendors,
  categories,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<
    "overview" | "pnl" | "balance_sheet" | "cash_flow" | "revenue" | "expense" | "ageing" | "gst_tds" | "ratios" | "insights" | "tables"
  >("overview");

  const [filters, setFilters] = useState({
    financialYear: initialFilters.financialYear || "FY 2026–27",
    period: initialFilters.period || "ALL",
    fromDate: initialFilters.fromDate || "",
    toDate: initialFilters.toDate || "",
    comparisonType: initialFilters.comparisonType || "PREV_FY",
    comparisonFromDate: initialFilters.comparisonFromDate || "",
    comparisonToDate: initialFilters.comparisonToDate || "",
    customerId: initialFilters.customerId || "",
    vendorId: initialFilters.vendorId || "",
    categoryId: initialFilters.categoryId || "",
    financialType: initialFilters.financialType || "",
    paymentStatus: initialFilters.paymentStatus || "",
  });

  useEffect(() => {
    setFilters({
      financialYear: initialFilters.financialYear || "FY 2026–27",
      period: initialFilters.period || "ALL",
      fromDate: initialFilters.fromDate || "",
      toDate: initialFilters.toDate || "",
      comparisonType: initialFilters.comparisonType || "PREV_FY",
      comparisonFromDate: initialFilters.comparisonFromDate || "",
      comparisonToDate: initialFilters.comparisonToDate || "",
      customerId: initialFilters.customerId || "",
      vendorId: initialFilters.vendorId || "",
      categoryId: initialFilters.categoryId || "",
      financialType: initialFilters.financialType || "",
      paymentStatus: initialFilters.paymentStatus || "",
    });
  }, [initialFilters]);

  // Drilldown modal state
  const [drilldownTitle, setDrilldownTitle] = useState<string | null>(null);
  const [drilldownItems, setDrilldownItems] = useState<any[]>([]);

  const handleFilterChange = (key: string, value: string) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);

    const query = new URLSearchParams();
    Object.entries(updated).forEach(([k, v]) => {
      if (v) query.set(k, v);
    });
    const queryString = query.toString();
    const newUrl = queryString ? `/analysis?${queryString}` : "/analysis";
    startTransition(() => {
      router.push(newUrl);
    });
  };

  const handleClearFilters = () => {
    const reset = {
      financialYear: "FY 2026–27",
      period: "ALL",
      fromDate: "",
      toDate: "",
      comparisonType: "PREV_FY",
      comparisonFromDate: "",
      comparisonToDate: "",
      customerId: "",
      vendorId: "",
      categoryId: "",
      financialType: "",
      paymentStatus: "",
    };
    setFilters(reset);
    startTransition(() => {
      router.push("/analysis");
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderVarianceBadge = (metric: any) => {
    if (!metric) return null;
    const isFavourable = metric.isFavourable;
    const isPositive = metric.varianceAmount >= 0;

    return (
      <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full w-fit ${
        isFavourable ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-rose-100 text-rose-800 border border-rose-300"
      }`}>
        <span>{isPositive ? "↑" : "↓"} {formatCurrency(Math.abs(metric.varianceAmount))}</span>
        {metric.variancePercent !== null && (
          <span>({isPositive ? "+" : ""}{metric.variancePercent}%)</span>
        )}
      </div>
    );
  };

  const openDrilldown = (title: string, items: any[]) => {
    setDrilldownTitle(title);
    setDrilldownItems(items || []);
  };

  const {
    dates,
    kpis,
    currentData,
    compData,
    horizontalAnalysis,
    verticalAnalysis,
    monthlyTrends,
    expenseCategories,
    revenueCategories,
    topCustomers,
    topVendors,
    receivablesAgeing,
    payablesAgeing,
    cashFlow,
    ratios,
    balanceCheck,
    insights,
  } = initialData;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 rounded-2xl shadow-lg border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financial Analysis & Business Intelligence</h1>
            <span className="bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30 shadow-xs">
              CA / BI Standard
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Real-time, dynamic accounting analytics directly computed from FinLedger database models.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Comparison Period Indicator */}
          <div className="bg-slate-900/5 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-200/80 text-xs shadow-xs">
            <div className="font-bold text-slate-800 flex items-center gap-2 font-tabular">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-emerald-500/50 shadow-sm animate-pulse"></span>
              CURRENT: {new Date(dates.current.fromDate).toLocaleDateString("en-IN")} – {new Date(dates.current.toDate).toLocaleDateString("en-IN")}
            </div>
            {dates.comparison ? (
              <div className="font-bold text-slate-500 flex items-center gap-2 mt-1 font-tabular">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-amber-500/50 shadow-sm"></span>
                VS ({dates.comparisonType}): {new Date(dates.comparison.fromDate).toLocaleDateString("en-IN")} – {new Date(dates.comparison.toDate).toLocaleDateString("en-IN")}
              </div>
            ) : (
              <div className="text-slate-400 mt-1 font-medium">No comparison period selected</div>
            )}
          </div>
        </div>
      </div>

      {/* Global Slicers Panel */}
      <div className="glass-card p-5 rounded-2xl shadow-md border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-black text-xs text-slate-800 uppercase tracking-wider">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            Global Filter & Slicer Bar
          </div>
          <button
            onClick={handleClearFilters}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-1.5 rounded-xl border border-rose-300/30 transition-all shadow-xs"
          >
            Clear All Filters
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Financial Year */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-1">Financial Year</label>
            <select
              value={filters.financialYear}
              onChange={(e) => handleFilterChange("financialYear", e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-bold px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
            >
              <option value="FY 2026–27">FY 2026–27 (Current)</option>
              <option value="FY 2025–26">FY 2025–26 (Previous)</option>
              <option value="FY 2024–25">FY 2024–25</option>
              <option value="ALL">All Financial Years</option>
            </select>
          </div>

          {/* Period */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-1">Period Quarter</label>
            <select
              value={filters.period}
              onChange={(e) => handleFilterChange("period", e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-bold px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
            >
              <option value="ALL">Entire Year (Full)</option>
              <option value="Q1">Q1 (Apr – Jun)</option>
              <option value="Q2">Q2 (Jul – Sep)</option>
              <option value="Q3">Q3 (Oct – Dec)</option>
              <option value="Q4">Q4 (Jan – Mar)</option>
            </select>
          </div>

          {/* Comparison Type */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-1">Comparison Methodology</label>
            <select
              value={filters.comparisonType}
              onChange={(e) => handleFilterChange("comparisonType", e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-bold px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
            >
              <option value="NONE">No Comparison</option>
              <option value="PREV_FY">Previous Financial Year</option>
              <option value="SAME_PERIOD_PREV_YEAR">Same Period Prev Year</option>
              <option value="PREV_PERIOD">Previous Period</option>
              <option value="PREV_MONTH">Previous Month</option>
              <option value="PREV_QUARTER">Previous Quarter</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          {/* Customer */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-1">Customer Filter</label>
            <select
              value={filters.customerId}
              onChange={(e) => handleFilterChange("customerId", e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-bold px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.legalName}</option>
              ))}
            </select>
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-1">Vendor Filter</label>
            <select
              value={filters.vendorId}
              onChange={(e) => handleFilterChange("vendorId", e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-bold px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
            >
              <option value="">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom date range row if CUSTOM selected */}
        {filters.comparisonType === "CUSTOM" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">From Date</label>
              <input type="date" value={filters.fromDate} onChange={(e) => handleFilterChange("fromDate", e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">To Date</label>
              <input type="date" value={filters.toDate} onChange={(e) => handleFilterChange("toDate", e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Comp From Date</label>
              <input type="date" value={filters.comparisonFromDate} onChange={(e) => handleFilterChange("comparisonFromDate", e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Comp To Date</label>
              <input type="date" value={filters.comparisonToDate} onChange={(e) => handleFilterChange("comparisonToDate", e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-lg" />
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs Bar — Segmented Pill Control */}
      <div className="bg-slate-900/5 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 shadow-inner overflow-x-auto flex items-center gap-1">
        {[
          { id: "overview", label: "Executive Overview" },
          { id: "pnl", label: "P&L Analysis" },
          { id: "balance_sheet", label: "Balance Sheet" },
          { id: "cash_flow", label: "Cash Flow" },
          { id: "revenue", label: "Revenue Analysis" },
          { id: "expense", label: "Expense Analysis" },
          { id: "ageing", label: "Ageing Analysis" },
          { id: "gst_tds", label: "GST & TDS" },
          { id: "ratios", label: "Financial Ratios" },
          { id: "insights", label: "Business Insights" },
          { id: "tables", label: "Horizontal & Vertical Tables" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black shadow-md shadow-emerald-600/20 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SECTION A: EXECUTIVE OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Executive KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue */}
            <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Revenue</div>
              <div className="text-2xl font-black font-tabular text-slate-900 tracking-tight">{formatCurrency(currentData.totalRevenue)}</div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100/80">
                <span className="font-tabular font-semibold">Comp: {formatCurrency(compData?.totalRevenue || 0)}</span>
                {renderVarianceBadge(kpis.totalRevenue)}
              </div>
            </div>

            {/* Expenses */}
            <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Expenses</div>
              <div className="text-2xl font-black font-tabular text-slate-900 tracking-tight">{formatCurrency(currentData.totalExpenses)}</div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100/80">
                <span className="font-tabular font-semibold">Comp: {formatCurrency(compData?.totalExpenses || 0)}</span>
                {renderVarianceBadge(kpis.totalExpenses)}
              </div>
            </div>

            {/* Gross Profit */}
            <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Gross Profit</div>
              <div className="text-2xl font-black font-tabular text-emerald-600 tracking-tight">{formatCurrency(currentData.grossProfit)}</div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100/80">
                <span className="font-tabular font-semibold">Comp: {formatCurrency(compData?.grossProfit || 0)}</span>
                {renderVarianceBadge(kpis.grossProfit)}
              </div>
            </div>

            {/* Net Profit */}
            <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Net Profit</div>
              <div className={`text-2xl font-black font-tabular tracking-tight ${currentData.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {formatCurrency(currentData.netProfit)}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100/80">
                <span className="font-tabular font-semibold">Margin: {currentData.profitMargin}%</span>
                {renderVarianceBadge(kpis.netProfit)}
              </div>
            </div>

            {/* Assets */}
            <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Assets</div>
              <div className="text-2xl font-black font-tabular text-slate-900 tracking-tight">{formatCurrency(currentData.totalAssets)}</div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100/80">
                <span className="font-tabular font-semibold">Comp: {formatCurrency(compData?.totalAssets || 0)}</span>
                {renderVarianceBadge(kpis.totalAssets)}
              </div>
            </div>

            {/* Liabilities */}
            <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Liabilities</div>
              <div className="text-2xl font-black font-tabular text-slate-900 tracking-tight">{formatCurrency(currentData.totalLiabilities)}</div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100/80">
                <span className="font-tabular font-semibold">Comp: {formatCurrency(compData?.totalLiabilities || 0)}</span>
                {renderVarianceBadge(kpis.totalLiabilities)}
              </div>
            </div>

            {/* Cash & Bank */}
            <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Cash & Bank Balance</div>
              <div className="text-2xl font-black font-tabular text-emerald-600 tracking-tight">{formatCurrency(currentData.cashBankBalance)}</div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100/80">
                <span className="font-tabular font-semibold">Comp: {formatCurrency(compData?.cashBankBalance || 0)}</span>
                {renderVarianceBadge(kpis.cashBankBalance)}
              </div>
            </div>

            {/* Accounts Receivable */}
            <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Accounts Receivable</div>
              <div className="text-2xl font-black font-tabular text-amber-600 tracking-tight">{formatCurrency(currentData.outstandingReceivables)}</div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100/80">
                <span className="font-tabular font-semibold">Comp: {formatCurrency(compData?.outstandingReceivables || 0)}</span>
                {renderVarianceBadge(kpis.outstandingReceivables)}
              </div>
            </div>
          </div>

          {/* Quick Business Health Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card-emerald text-white p-6 rounded-2xl space-y-3 shadow-xl">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-200">Balance Sheet Status</div>
              <div className="flex items-center gap-3.5">
                <div className={`h-11 w-11 rounded-full flex items-center justify-center font-black text-xl shadow-md ${balanceCheck.isBalanced ? "bg-emerald-400 text-emerald-950" : "bg-rose-500 text-white"}`}>
                  {balanceCheck.isBalanced ? "✓" : "⚠"}
                </div>
                <div>
                  <div className="font-extrabold text-lg tracking-tight">{balanceCheck.isBalanced ? "Balanced Position" : "Discrepancy Detected"}</div>
                  <div className="text-xs text-emerald-100/80 font-medium">
                    {balanceCheck.isBalanced ? "Total Assets = Liabilities + Equity" : `Difference: ${formatCurrency(balanceCheck.difference)}`}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card-dark text-white p-6 rounded-2xl space-y-3 shadow-xl">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Current Ratio (Liquidity)</div>
              <div className="text-3xl font-black font-tabular text-white tracking-tight">
                {ratios.currentRatio ? `${ratios.currentRatio.toFixed(2)} x` : "N/A"}
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {ratios.currentRatio && ratios.currentRatio >= 1.5 ? "✓ Healthy liquidity position" : "⚠ Monitor short-term working capital"}
              </div>
            </div>

            <div className="glass-card-dark text-white p-6 rounded-2xl space-y-3 shadow-xl">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Net GST Position</div>
              <div className="text-3xl font-black font-tabular text-emerald-400 tracking-tight">
                {formatCurrency(currentData.netGstLiability)}
              </div>
              <div className="text-xs text-slate-400 font-medium font-tabular">
                Output GST ({formatCurrency(currentData.totalOutputGST)}) – Input ITC ({formatCurrency(currentData.totalInputGST)})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION B: PROFIT & LOSS ANALYSIS */}
      {activeTab === "pnl" && (
        <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Profit & Loss Analysis Statement</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-700 text-xs font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">P&L Line Item</th>
                  <th className="px-4 py-3 text-right">Current Period (₹)</th>
                  <th className="px-4 py-3 text-right">% of Revenue</th>
                  <th className="px-4 py-3 text-right">Comparison Period (₹)</th>
                  <th className="px-4 py-3 text-right">Variance (₹)</th>
                  <th className="px-4 py-3 text-center">Movement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {verticalAnalysis.pnl.map((row: any, idx: number) => {
                  const compVal = compData ? (compData as any)[row.item.toLowerCase().replace(/[^a-z]/g, "")] || 0 : 0;
                  const diff = row.amount - compVal;
                  return (
                    <tr key={idx} className={`hover:bg-slate-50/80 ${row.item.includes("Gross") || row.item.includes("Net") || row.item.includes("Revenue") ? "font-bold bg-slate-50/50" : ""}`}>
                      <td className="px-4 py-3 font-semibold text-slate-800">{row.item}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(row.amount)}</td>
                      <td className="px-4 py-3 text-right text-slate-500 font-mono">{row.percentOfBase !== null ? `${row.percentOfBase}%` : "N/A"}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500">{formatCurrency(compVal)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(diff)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diff >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                          {diff >= 0 ? "↑" : "↓"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION C: BALANCE SHEET ANALYSIS WORKSTATION */}
      {activeTab === "balance_sheet" && (
        <div className="space-y-8">
          {/* Header Card & Verification Status */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900">Comprehensive Balance Sheet Analytical Workstation</h2>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  CA Audit Grade
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Unified Vertical Analysis (% of Base), Horizontal Comparative Analysis (Absolute & % Change), Solvency & Liquidity Ratios, and Working Capital Metrics.
              </p>
            </div>

            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border font-bold text-xs ${
              balanceCheck.isBalanced ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-rose-50 border-rose-300 text-rose-900"
            }`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-base ${
                balanceCheck.isBalanced ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
              }`}>
                {balanceCheck.isBalanced ? "✓" : "⚠"}
              </div>
              <div>
                <div className="font-extrabold text-sm">{balanceCheck.isBalanced ? "Balance Sheet Fully Balanced" : "Discrepancy Detected"}</div>
                <div className="text-[11px] font-semibold opacity-80">
                  {balanceCheck.isBalanced
                    ? `Total Assets (${formatCurrency(currentData.totalAssets)}) = Liabilities + Equity (${formatCurrency(currentData.totalLiabilities + currentData.totalEquity)})`
                    : `Difference: ${formatCurrency(balanceCheck.difference)}`}
                </div>
              </div>
            </div>
          </div>

          {/* Balance Sheet Specific Ratio Analytics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Current Ratio */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Ratio (Liquidity)</div>
              <div className="text-2xl font-extrabold text-emerald-700">
                {ratios.currentRatio !== null ? `${ratios.currentRatio.toFixed(2)} x` : "N/A"}
              </div>
              <div className="text-xs text-slate-500 flex justify-between">
                <span>Benchmark: 1.5x - 2.0x</span>
                <span className="font-semibold text-slate-700">
                  {ratios.currentRatio && ratios.currentRatio >= 1.5 ? "✓ Healthy" : "⚠ Monitor"}
                </span>
              </div>
            </div>

            {/* Quick Ratio */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Ratio (Acid Test)</div>
              <div className="text-2xl font-extrabold text-emerald-700">
                {ratios.quickRatio !== null ? `${ratios.quickRatio.toFixed(2)} x` : "N/A"}
              </div>
              <div className="text-xs text-slate-500 flex justify-between">
                <span>Benchmark: ≥ 1.0x</span>
                <span className="font-semibold text-slate-700">
                  {ratios.quickRatio && ratios.quickRatio >= 1.0 ? "✓ Strong" : "⚠ Tight"}
                </span>
              </div>
            </div>

            {/* Debt-to-Equity */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Debt-to-Equity (Solvency)</div>
              <div className="text-2xl font-extrabold text-slate-900">
                {ratios.debtToEquity !== null ? `${ratios.debtToEquity.toFixed(2)} x` : "N/A"}
              </div>
              <div className="text-xs text-slate-500 flex justify-between">
                <span>Liabilities / Equity</span>
                <span className="font-semibold text-emerald-700">
                  {ratios.debtToEquity && ratios.debtToEquity <= 1.5 ? "✓ Low Risk" : "⚠ High Debt"}
                </span>
              </div>
            </div>

            {/* Net Working Capital */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Working Capital</div>
              <div className="text-2xl font-extrabold text-slate-900">
                {formatCurrency(currentData.totalCurrentAssets - currentData.totalCurrentLiabilities)}
              </div>
              <div className="text-xs text-slate-500 flex justify-between">
                <span>Current Assets – Liabilities</span>
                <span className="font-semibold text-emerald-700">
                  {currentData.totalCurrentAssets - currentData.totalCurrentLiabilities >= 0 ? "✓ Positive" : "⚠ Deficit"}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Comparative Balance Sheet (Combined Vertical & Horizontal Analysis Table) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Comparative Balance Sheet Statement</h3>
                <p className="text-xs text-slate-500">Horizontal Analysis (Current vs Comp) & Vertical Analysis (% of Total Assets or Liabilities)</p>
              </div>
              <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                Showing Vertical % and Horizontal Absolute (₹) & % Change
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-y border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Balance Sheet Line Item</th>
                    <th className="px-4 py-3 text-right">Current Period (₹)</th>
                    <th className="px-4 py-3 text-right bg-emerald-50/50 text-emerald-900">Vertical %</th>
                    <th className="px-4 py-3 text-right">Comparison Period (₹)</th>
                    <th className="px-4 py-3 text-right">Absolute Change (₹)</th>
                    <th className="px-4 py-3 text-right">Change %</th>
                    <th className="px-4 py-3 text-center">Movement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    // ASSETS
                    { type: "HEADER", label: "I. ASSETS" },
                    { type: "SUBHEADER", label: "A. Non-Current Assets" },
                    { label: "Fixed Assets (Gross Block)", current: currentData.fixedAssetsGross, comp: compData?.fixedAssetsGross || 0, verticalPct: (currentData.fixedAssetsGross / (currentData.totalAssets || 1)) * 100, higherIsBetter: true },
                    { label: "Less: Accumulated Depreciation", current: currentData.accumulatedDepreciation, comp: compData?.accumulatedDepreciation || 0, verticalPct: (currentData.accumulatedDepreciation / (currentData.totalAssets || 1)) * 100, higherIsBetter: false },
                    { label: "Fixed Assets (Net Book Value)", current: currentData.fixedAssetsNetBlock, comp: compData?.fixedAssetsNetBlock || 0, verticalPct: (currentData.fixedAssetsNetBlock / (currentData.totalAssets || 1)) * 100, isBold: true, higherIsBetter: true },

                    { type: "SUBHEADER", label: "B. Current Assets" },
                    { label: "Cash & Bank Balances", current: currentData.cashBankBalance, comp: compData?.cashBankBalance || 0, verticalPct: (currentData.cashBankBalance / (currentData.totalAssets || 1)) * 100, higherIsBetter: true },
                    { label: "Trade Receivables (Sundry Debtors)", current: currentData.outstandingReceivables, comp: compData?.outstandingReceivables || 0, verticalPct: (currentData.outstandingReceivables / (currentData.totalAssets || 1)) * 100, higherIsBetter: false },
                    { label: "GST Input Tax Credit (ITC Available)", current: Math.max(0, currentData.totalInputGST - currentData.totalOutputGST), comp: compData ? Math.max(0, compData.totalInputGST - compData.totalOutputGST) : 0, verticalPct: (Math.max(0, currentData.totalInputGST - currentData.totalOutputGST) / (currentData.totalAssets || 1)) * 100, higherIsBetter: true },
                    { label: "Total Current Assets", current: currentData.totalCurrentAssets, comp: compData?.totalCurrentAssets || 0, verticalPct: (currentData.totalCurrentAssets / (currentData.totalAssets || 1)) * 100, isBold: true, isSectionTotal: true, higherIsBetter: true },

                    { label: "TOTAL ASSETS", current: currentData.totalAssets, comp: compData?.totalAssets || 0, verticalPct: 100, isGrandTotal: true, higherIsBetter: true },

                    // LIABILITIES & EQUITY
                    { type: "HEADER", label: "II. LIABILITIES & EQUITY" },
                    { type: "SUBHEADER", label: "A. Current Liabilities" },
                    { label: "Trade Payables (Sundry Creditors)", current: currentData.outstandingPayables, comp: compData?.outstandingPayables || 0, verticalPct: (currentData.outstandingPayables / ((currentData.totalLiabilities + currentData.totalEquity) || 1)) * 100, higherIsBetter: false },
                    { label: "Net GST Payable to Government", current: currentData.netGstLiability, comp: compData?.netGstLiability || 0, verticalPct: (currentData.netGstLiability / ((currentData.totalLiabilities + currentData.totalEquity) || 1)) * 100, higherIsBetter: false },
                    { label: "TDS Payable", current: currentData.tdsPayable, comp: compData?.tdsPayable || 0, verticalPct: (currentData.tdsPayable / ((currentData.totalLiabilities + currentData.totalEquity) || 1)) * 100, higherIsBetter: false },
                    { label: "Total Current Liabilities", current: currentData.totalCurrentLiabilities, comp: compData?.totalCurrentLiabilities || 0, verticalPct: (currentData.totalCurrentLiabilities / ((currentData.totalLiabilities + currentData.totalEquity) || 1)) * 100, isBold: true, isSectionTotal: true, higherIsBetter: false },
                    { label: "TOTAL LIABILITIES", current: currentData.totalLiabilities, comp: compData?.totalLiabilities || 0, verticalPct: (currentData.totalLiabilities / ((currentData.totalLiabilities + currentData.totalEquity) || 1)) * 100, isBold: true, higherIsBetter: false },

                    { type: "SUBHEADER", label: "B. Shareholders' Capital & Equity" },
                    { label: "Owner Capital Account", current: currentData.capitalEquity, comp: compData?.capitalEquity || 0, verticalPct: (currentData.capitalEquity / ((currentData.totalLiabilities + currentData.totalEquity) || 1)) * 100, higherIsBetter: true },
                    { label: "Retained Earnings & Accumulated Surplus", current: currentData.retainedEarnings, comp: compData?.retainedEarnings || 0, verticalPct: (currentData.retainedEarnings / ((currentData.totalLiabilities + currentData.totalEquity) || 1)) * 100, higherIsBetter: true },
                    { label: "TOTAL EQUITY", current: currentData.totalEquity, comp: compData?.totalEquity || 0, verticalPct: (currentData.totalEquity / ((currentData.totalLiabilities + currentData.totalEquity) || 1)) * 100, isBold: true, isSectionTotal: true, higherIsBetter: true },

                    { label: "TOTAL LIABILITIES + EQUITY", current: currentData.totalLiabilities + currentData.totalEquity, comp: (compData?.totalLiabilities || 0) + (compData?.totalEquity || 0), verticalPct: 100, isGrandTotal: true, higherIsBetter: true },
                  ].map((row: any, idx: number) => {
                    if (row.type === "HEADER") {
                      return (
                        <tr key={idx} className="bg-slate-900 text-white font-extrabold uppercase tracking-wider text-xs">
                          <td colSpan={7} className="px-4 py-2.5">{row.label}</td>
                        </tr>
                      );
                    }
                    if (row.type === "SUBHEADER") {
                      return (
                        <tr key={idx} className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                          <td colSpan={7} className="px-4 py-2">{row.label}</td>
                        </tr>
                      );
                    }

                    const absChange = row.current - (row.comp || 0);
                    const pctChange = row.comp && row.comp !== 0 ? (absChange / Math.abs(row.comp)) * 100 : null;
                    const isFavourable = row.higherIsBetter ? absChange >= 0 : absChange <= 0;

                    let rowStyle = "hover:bg-slate-50";
                    if (row.isGrandTotal) rowStyle = "bg-emerald-50/80 font-extrabold border-y-2 border-emerald-600 text-slate-900 text-xs";
                    else if (row.isSectionTotal) rowStyle = "bg-slate-50 font-bold text-slate-900";
                    else if (row.isBold) rowStyle = "font-semibold text-slate-900";

                    return (
                      <tr key={idx} className={rowStyle}>
                        <td className={`px-4 py-2.5 ${row.isGrandTotal ? "text-slate-900 text-xs font-bold" : "text-slate-700"}`}>
                          {row.label}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold">{formatCurrency(row.current)}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
                          {row.verticalPct !== undefined ? `${row.verticalPct.toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-500">{formatCurrency(row.comp)}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold">{formatCurrency(absChange)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {pctChange !== null ? `${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(2)}%` : "N/A"}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                            isFavourable ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}>
                            {isFavourable ? "FAVOURABLE" : "UNFAVOURABLE"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visual Asset & Liability Composition Progress Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            {/* Asset Distribution */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                Asset Structure Breakdown (% of Total Assets)
              </h3>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Cash & Bank Balances</span>
                    <span className="font-mono">{formatCurrency(currentData.cashBankBalance)} ({((currentData.cashBankBalance / (currentData.totalAssets || 1)) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, (currentData.cashBankBalance / (currentData.totalAssets || 1)) * 100))}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Fixed Assets (Net Block)</span>
                    <span className="font-mono">{formatCurrency(currentData.fixedAssetsNetBlock)} ({((currentData.fixedAssetsNetBlock / (currentData.totalAssets || 1)) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, (currentData.fixedAssetsNetBlock / (currentData.totalAssets || 1)) * 100))}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Trade Receivables (Debtors)</span>
                    <span className="font-mono">{formatCurrency(currentData.outstandingReceivables)} ({((currentData.outstandingReceivables / (currentData.totalAssets || 1)) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, (currentData.outstandingReceivables / (currentData.totalAssets || 1)) * 100))}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Capital & Liabilities Structure */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                Capital & Liabilities Breakdown (% of Total Capital)
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Shareholders' Capital & Retained Equity</span>
                    <span className="font-mono">{formatCurrency(currentData.totalEquity)} ({((currentData.totalEquity / ((currentData.totalLiabilities + currentData.totalEquity) || 1)) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-600 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, (currentData.totalEquity / ((currentData.totalLiabilities + currentData.totalEquity) || 1)) * 100))}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Trade Payables (Creditors)</span>
                    <span className="font-mono">{formatCurrency(currentData.outstandingPayables)} ({((currentData.outstandingPayables / ((currentData.totalLiabilities + currentData.totalEquity) || 1)) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, (currentData.outstandingPayables / ((currentData.totalLiabilities + currentData.totalEquity) || 1)) * 100))}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Statutory Tax Liabilities (GST/TDS)</span>
                    <span className="font-mono">{formatCurrency(currentData.netGstLiability + currentData.tdsPayable)} ({(((currentData.netGstLiability + currentData.tdsPayable) / ((currentData.totalLiabilities + currentData.totalEquity) || 1)) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-600 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, ((currentData.netGstLiability + currentData.tdsPayable) / ((currentData.totalLiabilities + currentData.totalEquity) || 1)) * 100))}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION D: CASH FLOW ANALYTICAL WORKSTATION */}
      {activeTab === "cash_flow" && (
        <div className="space-y-8">
          {/* Header Card & Summary */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900">Cash Flow & Liquidity Intelligence Workstation</h2>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  AS-3 / Ind AS 7 Compliant
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Detailed Classification into Operating (CFO), Investing (CFI), and Financing (CFF) Cash Flows, Accounting Profit Reconciliation, and Monthly Cash Trends.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Closing Cash & Bank Position</div>
                <div className="text-lg font-extrabold text-emerald-700 font-mono">{formatCurrency(cashFlow.closingCash)}</div>
              </div>
            </div>
          </div>

          {/* Executive Cash Movement & Reconciliation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Opening Cash */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Opening Cash Balance</div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">{formatCurrency(cashFlow.openingCash)}</div>
              <div className="text-xs text-slate-400">At start of selected period</div>
            </div>

            {/* Operating Cash Flow (CFO) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Operating Cash Flow (CFO)</div>
              <div className="text-2xl font-extrabold text-emerald-700 font-mono">{formatCurrency(cashFlow.operating)}</div>
              <div className="text-xs text-emerald-600 font-medium">Cash from core business</div>
            </div>

            {/* Investing Cash Flow (CFI) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Investing Cash Flow (CFI)</div>
              <div className={`text-2xl font-extrabold font-mono ${cashFlow.investing < 0 ? "text-rose-700" : "text-slate-900"}`}>
                {formatCurrency(cashFlow.investing)}
              </div>
              <div className="text-xs text-slate-400">Capital expenditure / assets</div>
            </div>

            {/* Net Cash Movement */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Cash Surplus / Deficit</div>
              <div className={`text-2xl font-extrabold font-mono ${cashFlow.netMovement >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                {formatCurrency(cashFlow.netMovement)}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {cashFlow.netMovement >= 0 ? "↑ Positive cash accumulation" : "↓ Net cash outflow"}
              </div>
            </div>
          </div>

          {/* Profit vs Cash Reconciliation & Cash Ratios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Reconciliation Card */}
            <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Profit vs Cash Flow Reconciliation</h3>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">Why Profit ≠ Cash</span>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="flex justify-between py-2 font-semibold">
                  <span className="text-slate-700">Net Accounting Profit (P&L Bottom Line)</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(currentData.netProfit)}</span>
                </div>
                <div className="flex justify-between py-2 text-slate-600">
                  <span>Add: Non-Cash Depreciation & Amortisation</span>
                  <span className="font-mono text-emerald-700">+{formatCurrency(currentData.depreciation)}</span>
                </div>
                <div className="flex justify-between py-2 text-slate-600">
                  <span>Less: Fixed Asset Capital Outflows</span>
                  <span className="font-mono text-rose-600">-{formatCurrency(currentData.fixedAssetAdditions)}</span>
                </div>
                <div className="flex justify-between py-2 font-extrabold bg-slate-50 px-2 rounded text-sm text-slate-900">
                  <span>Net Operating Cash Flow Generated</span>
                  <span className="font-mono text-emerald-700">{formatCurrency(cashFlow.operating)}</span>
                </div>
              </div>
            </div>

            {/* Cash Ratios */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cash Quality Metrics</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] text-slate-400 uppercase">Cash Flow Margin %</div>
                  <div className="text-xl font-bold text-emerald-400 font-mono">
                    {currentData.totalRevenue > 0 ? `${((cashFlow.operating / currentData.totalRevenue) * 100).toFixed(1)}%` : "N/A"}
                  </div>
                  <div className="text-[10px] text-slate-400">Cash generated per ₹100 revenue</div>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase">Operating Cash Coverage</div>
                  <div className="text-xl font-bold text-white font-mono">
                    {currentData.totalCurrentLiabilities > 0 ? `${(cashFlow.operating / currentData.totalCurrentLiabilities).toFixed(2)} x` : "N/A"}
                  </div>
                  <div className="text-[10px] text-slate-400">Ability to cover current debts</div>
                </div>
              </div>
            </div>
          </div>

          {/* AS-3 Cash Flow Statement Table */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-3">Standard Cash Flow Statement (AS-3 / Ind AS 7)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-y border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Cash Flow Activity & Particulars</th>
                    <th className="px-4 py-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr className="bg-slate-900 text-white font-extrabold uppercase text-xs">
                    <td colSpan={2} className="px-4 py-2.5">I. CASH FLOW FROM OPERATING ACTIVITIES</td>
                  </tr>
                  <tr className="hover:bg-slate-50 font-sans">
                    <td className="px-4 py-2 text-slate-700">Cash Inflows from Sales / Customer Collections</td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-emerald-700">{formatCurrency(currentData.totalRevenue)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50 font-sans">
                    <td className="px-4 py-2 text-slate-700">Less: Cash Paid for Operational Expenses & Purchases</td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-rose-700">-{formatCurrency(currentData.totalExpenses - currentData.depreciation)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50 font-sans">
                    <td className="px-4 py-2 text-slate-700">Add: Adjustment for Non-Cash Depreciation</td>
                    <td className="px-4 py-2 text-right font-mono text-emerald-700">+{formatCurrency(currentData.depreciation)}</td>
                  </tr>
                  <tr className="bg-slate-100 font-bold text-slate-900 font-sans">
                    <td className="px-4 py-2.5 font-bold">NET CASH GENERATED FROM OPERATING ACTIVITIES (A)</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-800 text-sm font-extrabold">{formatCurrency(cashFlow.operating)}</td>
                  </tr>

                  <tr className="bg-slate-900 text-white font-extrabold uppercase text-xs">
                    <td colSpan={2} className="px-4 py-2.5">II. CASH FLOW FROM INVESTING ACTIVITIES</td>
                  </tr>
                  <tr className="hover:bg-slate-50 font-sans">
                    <td className="px-4 py-2 text-slate-700">Purchase of Fixed Assets & Equipment (CAPEX)</td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-rose-700">-{formatCurrency(currentData.fixedAssetAdditions)}</td>
                  </tr>
                  <tr className="bg-slate-100 font-bold text-slate-900 font-sans">
                    <td className="px-4 py-2.5 font-bold">NET CASH USED IN INVESTING ACTIVITIES (B)</td>
                    <td className="px-4 py-2.5 text-right font-mono text-rose-800 text-sm font-extrabold">{formatCurrency(cashFlow.investing)}</td>
                  </tr>

                  <tr className="bg-slate-900 text-white font-extrabold uppercase text-xs">
                    <td colSpan={2} className="px-4 py-2.5">III. CASH FLOW FROM FINANCING ACTIVITIES</td>
                  </tr>
                  <tr className="hover:bg-slate-50 font-sans">
                    <td className="px-4 py-2 text-slate-700">Capital Contributions & Equity Movements</td>
                    <td className="px-4 py-2 text-right font-mono text-slate-500">₹0.00</td>
                  </tr>
                  <tr className="bg-slate-100 font-bold text-slate-900 font-sans">
                    <td className="px-4 py-2.5 font-bold">NET CASH FROM FINANCING ACTIVITIES (C)</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-900 text-sm font-extrabold">{formatCurrency(cashFlow.financing)}</td>
                  </tr>

                  <tr className="bg-emerald-100 text-emerald-950 font-extrabold text-sm border-t-2 border-emerald-600 font-sans">
                    <td className="px-4 py-3">NET INCREASE / DECREASE IN CASH & CASH EQUIVALENTS (A + B + C)</td>
                    <td className="px-4 py-3 text-right font-mono font-extrabold text-base">{formatCurrency(cashFlow.netMovement)}</td>
                  </tr>
                  <tr className="bg-slate-50 font-semibold text-slate-800 font-sans">
                    <td className="px-4 py-2.5">Add: Opening Cash & Bank Balance at Start of Period</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(cashFlow.openingCash)}</td>
                  </tr>
                  <tr className="bg-slate-900 text-white font-extrabold text-sm font-sans">
                    <td className="px-4 py-3">CLOSING CASH & BANK BALANCE AT END OF PERIOD</td>
                    <td className="px-4 py-3 text-right font-mono font-extrabold text-emerald-400 text-base">{formatCurrency(cashFlow.closingCash)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Cash Flow Seasonality & Trend Table */}
          {cashFlow.monthlyTrends && cashFlow.monthlyTrends.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Monthly Cash Flow Breakdown & Seasonality</h3>
                  <p className="text-xs text-slate-500">Track month-by-month cash receipts, disbursements, and running cash balances</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-y border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Month</th>
                      <th className="px-4 py-3 text-right">Cash Inflows (₹)</th>
                      <th className="px-4 py-3 text-right">Cash Outflows (₹)</th>
                      <th className="px-4 py-3 text-right">Net Cash Movement (₹)</th>
                      <th className="px-4 py-3 text-right">Opening Cash (₹)</th>
                      <th className="px-4 py-3 text-right">Closing Cash (₹)</th>
                      <th className="px-4 py-3 text-center">Cash Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {cashFlow.monthlyTrends.map((m: any, idx: number) => {
                      const isSurplus = m.netCashFlow >= 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 font-sans">
                          <td className="px-4 py-2.5 font-bold text-slate-900">{m.month}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-emerald-700 font-semibold">{formatCurrency(m.inflows)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-rose-700 font-semibold">{formatCurrency(m.outflows)}</td>
                          <td className={`px-4 py-2.5 text-right font-mono font-bold ${isSurplus ? "text-emerald-700" : "text-rose-600"}`}>
                            {formatCurrency(m.netCashFlow)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-500">{formatCurrency(m.openingCash)}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(m.closingCash)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isSurplus ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            }`}>
                              {isSurplus ? "SURPLUS" : "DEFICIT"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION E: REVENUE ANALYSIS */}
      {activeTab === "revenue" && (
        <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Top Revenue Customers & Income Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Top 10 Customers</h3>
              <div className="space-y-2">
                {topCustomers.map((c: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-lg">
                    <span className="font-semibold text-slate-800">{c.name} ({c.count} invoices)</span>
                    <span className="font-mono font-bold text-emerald-700">{formatCurrency(c.amount)} ({c.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Income Categories</h3>
              <div className="space-y-2">
                {revenueCategories.map((r: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-lg">
                    <span className="font-semibold text-slate-800">{r.category}</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(r.amount)} ({r.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION F: EXPENSE ANALYSIS */}
      {activeTab === "expense" && (
        <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Expense Category & Vendor Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Expense Categories</h3>
              <div className="space-y-2">
                {expenseCategories.map((c: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-lg">
                    <span className="font-semibold text-slate-800">{c.category}</span>
                    <span className="font-mono font-bold text-rose-700">{formatCurrency(c.amount)} ({c.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Top Vendors</h3>
              <div className="space-y-2">
                {topVendors.map((v: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-lg">
                    <span className="font-semibold text-slate-800">{v.name}</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(v.amount)} ({v.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION G: AGEING ANALYSIS */}
      {activeTab === "ageing" && (
        <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Receivables & Payables Ageing Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-bold text-amber-700 uppercase mb-3">Receivables Ageing Buckets</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 bg-slate-50 rounded"><span>Current (0 Days)</span><span className="font-mono font-bold">{formatCurrency(receivablesAgeing.current)}</span></div>
                <div className="flex justify-between p-2 bg-slate-50 rounded"><span>1 – 30 Days</span><span className="font-mono font-bold">{formatCurrency(receivablesAgeing.days1_30)}</span></div>
                <div className="flex justify-between p-2 bg-slate-50 rounded"><span>31 – 60 Days</span><span className="font-mono font-bold">{formatCurrency(receivablesAgeing.days31_60)}</span></div>
                <div className="flex justify-between p-2 bg-slate-50 rounded"><span>61 – 90 Days</span><span className="font-mono font-bold">{formatCurrency(receivablesAgeing.days61_90)}</span></div>
                <div className="flex justify-between p-2 bg-slate-50 rounded"><span>91 – 180 Days</span><span className="font-mono font-bold text-rose-600">{formatCurrency(receivablesAgeing.days91_180)}</span></div>
                <div className="flex justify-between p-2 bg-rose-50 rounded text-rose-800 font-bold"><span>180+ Days</span><span className="font-mono">{formatCurrency(receivablesAgeing.days180Plus)}</span></div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">Payables Ageing Buckets</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 bg-slate-50 rounded"><span>Current (0 Days)</span><span className="font-mono font-bold">{formatCurrency(payablesAgeing.current)}</span></div>
                <div className="flex justify-between p-2 bg-slate-50 rounded"><span>1 – 30 Days</span><span className="font-mono font-bold">{formatCurrency(payablesAgeing.days1_30)}</span></div>
                <div className="flex justify-between p-2 bg-slate-50 rounded"><span>31 – 60 Days</span><span className="font-mono font-bold">{formatCurrency(payablesAgeing.days31_60)}</span></div>
                <div className="flex justify-between p-2 bg-slate-50 rounded"><span>61 – 90 Days</span><span className="font-mono font-bold">{formatCurrency(payablesAgeing.days61_90)}</span></div>
                <div className="flex justify-between p-2 bg-slate-50 rounded"><span>91 – 180 Days</span><span className="font-mono font-bold">{formatCurrency(payablesAgeing.days91_180)}</span></div>
                <div className="flex justify-between p-2 bg-slate-100 rounded font-bold"><span>180+ Days</span><span className="font-mono">{formatCurrency(payablesAgeing.days180Plus)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION H: FINANCIAL RATIOS */}
      {activeTab === "ratios" && (
        <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Financial Ratios & Benchmark Analytics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-500">Gross Margin</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{ratios.grossMargin !== null ? `${ratios.grossMargin}%` : "N/A"}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-500">Net Profit Margin</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{ratios.netMargin !== null ? `${ratios.netMargin}%` : "N/A"}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-500">Current Ratio</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">{ratios.currentRatio !== null ? `${ratios.currentRatio.toFixed(2)} x` : "N/A"}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-500">Quick Ratio</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">{ratios.quickRatio !== null ? `${ratios.quickRatio.toFixed(2)} x` : "N/A"}</div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION I: BUSINESS INSIGHTS */}
      {activeTab === "insights" && (
        <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Dynamic CA Business Insights</h2>
          <div className="space-y-3">
            {insights.map((insight: string, idx: number) => (
              <div key={idx} className="flex items-start gap-3 p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-950">
                <span className="text-emerald-600 font-bold">💡</span>
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION J: DETAILED TABLES */}
      {activeTab === "tables" && (
        <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Horizontal Analysis Analytical Table</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Line Item</th>
                  <th className="px-4 py-3 text-right">Current Period (₹)</th>
                  <th className="px-4 py-3 text-right">Comparison Period (₹)</th>
                  <th className="px-4 py-3 text-right">Absolute Change (₹)</th>
                  <th className="px-4 py-3 text-right">Change %</th>
                  <th className="px-4 py-3 text-center">Favourable?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {horizontalAnalysis.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-bold font-sans text-slate-500">{row.category}</td>
                    <td className="px-4 py-2.5 font-bold font-sans text-slate-900">{row.lineItem}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(row.current)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{formatCurrency(row.comparison)}</td>
                    <td className="px-4 py-2.5 text-right">{formatCurrency(row.varianceAmount)}</td>
                    <td className="px-4 py-2.5 text-right">{row.variancePercent !== null ? `${row.variancePercent}%` : "N/A"}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${row.isFavourable ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                        {row.isFavourable ? "FAVOURABLE" : "UNFAVOURABLE"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drill-down Modal */}
      {drilldownTitle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">{drilldownTitle}</h3>
              <button onClick={() => setDrilldownTitle(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            <div className="overflow-y-auto flex-1 text-xs">
              <table className="w-full">
                <thead className="bg-slate-50 font-bold uppercase text-slate-600">
                  <tr>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Reference</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drilldownItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2">{new Date(item.invoiceDate || item.expenseDate).toLocaleDateString("en-IN")}</td>
                      <td className="p-2 font-mono">{item.invoiceNumber || item.expenseNumber}</td>
                      <td className="p-2">{item.customerNameSnapshot || item.vendor?.name || item.description || "—"}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatCurrency(item.netAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
