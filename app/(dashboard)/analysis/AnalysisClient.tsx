"use client";

import React, { useState } from "react";
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
    router.push(`/analysis?${query.toString()}`);
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
    router.push("/analysis");
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Analysis & Business Intelligence</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
              CA / BI Standard
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time, dynamic accounting analytics directly computed from FinLedger database models.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Comparison Period Indicator */}
          <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-xs">
            <div className="font-semibold text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              CURRENT: {new Date(dates.current.fromDate).toLocaleDateString("en-IN")} – {new Date(dates.current.toDate).toLocaleDateString("en-IN")}
            </div>
            {dates.comparison ? (
              <div className="font-semibold text-slate-500 flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                VS ({dates.comparisonType}): {new Date(dates.comparison.fromDate).toLocaleDateString("en-IN")} – {new Date(dates.comparison.toDate).toLocaleDateString("en-IN")}
              </div>
            ) : (
              <div className="text-slate-400 mt-1 font-medium">No comparison period selected</div>
            )}
          </div>
        </div>
      </div>

      {/* Global Slicers Panel */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-800 uppercase tracking-wider">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Global Filter & Slicer Bar
          </div>
          <button
            onClick={handleClearFilters}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors"
          >
            Clear All Filters
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Financial Year */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Financial Year</label>
            <select
              value={filters.financialYear}
              onChange={(e) => handleFilterChange("financialYear", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-2.5 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="FY 2026–27">FY 2026–27 (Current)</option>
              <option value="FY 2025–26">FY 2025–26 (Previous)</option>
              <option value="FY 2024–25">FY 2024–25</option>
              <option value="ALL">All Financial Years</option>
            </select>
          </div>

          {/* Period */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Period Quarter</label>
            <select
              value={filters.period}
              onChange={(e) => handleFilterChange("period", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-2.5 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500"
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
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Comparison Methodology</label>
            <select
              value={filters.comparisonType}
              onChange={(e) => handleFilterChange("comparisonType", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-2.5 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500"
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
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Customer Filter</label>
            <select
              value={filters.customerId}
              onChange={(e) => handleFilterChange("customerId", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-2.5 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.legalName}</option>
              ))}
            </select>
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Vendor Filter</label>
            <select
              value={filters.vendorId}
              onChange={(e) => handleFilterChange("vendorId", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-2.5 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500"
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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-4 rounded-xl shadow-sm overflow-x-auto">
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
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
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
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</div>
              <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(currentData.totalRevenue)}</div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <span>Comp: {formatCurrency(compData?.totalRevenue || 0)}</span>
                {renderVarianceBadge(kpis.totalRevenue)}
              </div>
            </div>

            {/* Expenses */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Expenses</div>
              <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(currentData.totalExpenses)}</div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <span>Comp: {formatCurrency(compData?.totalExpenses || 0)}</span>
                {renderVarianceBadge(kpis.totalExpenses)}
              </div>
            </div>

            {/* Gross Profit */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Profit</div>
              <div className="text-2xl font-extrabold text-emerald-700">{formatCurrency(currentData.grossProfit)}</div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <span>Comp: {formatCurrency(compData?.grossProfit || 0)}</span>
                {renderVarianceBadge(kpis.grossProfit)}
              </div>
            </div>

            {/* Net Profit */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Profit</div>
              <div className={`text-2xl font-extrabold ${currentData.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                {formatCurrency(currentData.netProfit)}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <span>Margin: {currentData.profitMargin}%</span>
                {renderVarianceBadge(kpis.netProfit)}
              </div>
            </div>

            {/* Assets */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Assets</div>
              <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(currentData.totalAssets)}</div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <span>Comp: {formatCurrency(compData?.totalAssets || 0)}</span>
                {renderVarianceBadge(kpis.totalAssets)}
              </div>
            </div>

            {/* Liabilities */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Liabilities</div>
              <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(currentData.totalLiabilities)}</div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <span>Comp: {formatCurrency(compData?.totalLiabilities || 0)}</span>
                {renderVarianceBadge(kpis.totalLiabilities)}
              </div>
            </div>

            {/* Cash & Bank */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cash & Bank Balance</div>
              <div className="text-2xl font-extrabold text-emerald-700">{formatCurrency(currentData.cashBankBalance)}</div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <span>Comp: {formatCurrency(compData?.cashBankBalance || 0)}</span>
                {renderVarianceBadge(kpis.cashBankBalance)}
              </div>
            </div>

            {/* Accounts Receivable */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Accounts Receivable</div>
              <div className="text-2xl font-extrabold text-amber-700">{formatCurrency(currentData.outstandingReceivables)}</div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <span>Comp: {formatCurrency(compData?.outstandingReceivables || 0)}</span>
                {renderVarianceBadge(kpis.outstandingReceivables)}
              </div>
            </div>
          </div>

          {/* Quick Business Health Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-900 text-white p-6 rounded-2xl space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-200">Balance Sheet Status</div>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg ${balanceCheck.isBalanced ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
                  {balanceCheck.isBalanced ? "✓" : "⚠"}
                </div>
                <div>
                  <div className="font-bold text-lg">{balanceCheck.isBalanced ? "Balanced Position" : "Discrepancy Detected"}</div>
                  <div className="text-xs text-emerald-200">
                    {balanceCheck.isBalanced ? "Total Assets = Liabilities + Equity" : `Difference: ${formatCurrency(balanceCheck.difference)}`}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Ratio (Liquidity)</div>
              <div className="text-3xl font-extrabold text-white">
                {ratios.currentRatio ? `${ratios.currentRatio.toFixed(2)} x` : "N/A"}
              </div>
              <div className="text-xs text-slate-400">
                {ratios.currentRatio && ratios.currentRatio >= 1.5 ? "✓ Healthy liquidity position" : "⚠ Monitor short-term working capital"}
              </div>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Net GST Position</div>
              <div className="text-3xl font-extrabold text-emerald-400">
                {formatCurrency(currentData.netGstLiability)}
              </div>
              <div className="text-xs text-slate-400">
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

      {/* SECTION C: BALANCE SHEET */}
      {activeTab === "balance_sheet" && (
        <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900">Balance Sheet Analytical View</h2>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${balanceCheck.isBalanced ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
              {balanceCheck.isBalanced ? "✓ Balance Sheet Balanced" : `⚠ Discrepancy: ${formatCurrency(balanceCheck.difference)}`}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assets */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider bg-slate-100 p-2.5 rounded-lg">Assets</h3>
              <div className="divide-y divide-slate-100 text-sm">
                <div className="flex justify-between py-2"><span className="text-slate-600">Fixed Assets (Net Block)</span><span className="font-mono font-semibold">{formatCurrency(currentData.fixedAssetsNetBlock)}</span></div>
                <div className="flex justify-between py-2"><span className="text-slate-600">Cash & Bank Balances</span><span className="font-mono font-semibold text-emerald-700">{formatCurrency(currentData.cashBankBalance)}</span></div>
                <div className="flex justify-between py-2"><span className="text-slate-600">Trade Receivables (Debtors)</span><span className="font-mono font-semibold text-amber-700">{formatCurrency(currentData.outstandingReceivables)}</span></div>
                <div className="flex justify-between py-2 font-bold bg-slate-50 px-2 rounded"><span className="text-slate-800">Total Assets</span><span className="font-mono text-emerald-700">{formatCurrency(currentData.totalAssets)}</span></div>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider bg-slate-100 p-2.5 rounded-lg">Liabilities & Equity</h3>
              <div className="divide-y divide-slate-100 text-sm">
                <div className="flex justify-between py-2"><span className="text-slate-600">Trade Payables (Creditors)</span><span className="font-mono font-semibold">{formatCurrency(currentData.outstandingPayables)}</span></div>
                <div className="flex justify-between py-2"><span className="text-slate-600">Statutory Tax Payable (GST/TDS)</span><span className="font-mono font-semibold">{formatCurrency(currentData.netGstLiability + currentData.tdsPayable)}</span></div>
                <div className="flex justify-between py-2"><span className="text-slate-600">Owner Capital & Retained Equity</span><span className="font-mono font-semibold text-emerald-700">{formatCurrency(currentData.totalEquity)}</span></div>
                <div className="flex justify-between py-2 font-bold bg-slate-50 px-2 rounded"><span className="text-slate-800">Total Liabilities + Equity</span><span className="font-mono text-slate-900">{formatCurrency(currentData.totalLiabilities + currentData.totalEquity)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION D: CASH FLOW ANALYSIS */}
      {activeTab === "cash_flow" && (
        <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Cash Flow Statement (Direct/Indirect Method)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase">Operating Cash Flow</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(cashFlow.operating)}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase">Investing Cash Flow</div>
              <div className="text-xl font-bold text-rose-700 mt-1">{formatCurrency(cashFlow.investing)}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase">Financing Cash Flow</div>
              <div className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(cashFlow.financing)}</div>
            </div>
          </div>
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
