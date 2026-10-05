"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/utils/currency";

export interface ReportsBiProps {
  analysisData: any;
  financialYear: string;
}

export function renderVarianceBadge(metric: any) {
  if (!metric) return null;
  const isFavourable = metric.isFavourable;
  const isPositive = metric.varianceAmount >= 0;

  return (
    <div
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
        isFavourable
          ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
          : "bg-rose-50 text-rose-800 border border-rose-300"
      }`}
    >
      <span>
        {isPositive ? "↑" : "↓"} {formatCurrency(Math.abs(metric.varianceAmount))}
      </span>
      {metric.variancePercent !== null && (
        <span className="opacity-90">({isPositive ? "+" : ""}{metric.variancePercent}%)</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. EXECUTIVE BI OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

export function ExecutiveOverviewView({ analysisData, financialYear }: ReportsBiProps) {
  if (!analysisData) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        Executive overview data is compiling for {financialYear}...
      </div>
    );
  }

  const { kpis, currentData, compData, balanceCheck, ratios, cashFlow } = analysisData;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-slate-900">Executive BI Overview &amp; Health Highlights</h3>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              Real-Time BI
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Key financial performance indicators, liquidity benchmarks, and solvency health for {financialYear}.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
            {financialYear} Active Period
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Revenue */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Total Revenue (Turnover)
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
            {formatCurrency(currentData.totalRevenue)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="font-mono text-[11px]">Comp: {formatCurrency(compData?.totalRevenue || 0)}</span>
            {renderVarianceBadge(kpis.totalRevenue)}
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Operating Expenses (OPEX)
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
            {formatCurrency(currentData.totalExpenses)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="font-mono text-[11px]">Comp: {formatCurrency(compData?.totalExpenses || 0)}</span>
            {renderVarianceBadge(kpis.totalExpenses)}
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Gross Margin Profit
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
            {formatCurrency(currentData.grossProfit)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="font-mono text-[11px]">Margin: {ratios.grossMargin ?? 0}%</span>
            {renderVarianceBadge(kpis.grossProfit)}
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Net Profit (PAT)
          </div>
          <div
            className={`text-2xl font-black font-mono tracking-tight ${
              currentData.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"
            }`}
          >
            {formatCurrency(currentData.netProfit)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="font-mono text-[11px]">Margin: {currentData.profitMargin}%</span>
            {renderVarianceBadge(kpis.netProfit)}
          </div>
        </div>

        {/* Total Assets */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Total Capital Assets
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
            {formatCurrency(currentData.totalAssets)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="font-mono text-[11px]">Comp: {formatCurrency(compData?.totalAssets || 0)}</span>
            {renderVarianceBadge(kpis.totalAssets)}
          </div>
        </div>

        {/* Cash & Bank */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Liquid Cash &amp; Bank
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
            {formatCurrency(currentData.cashBankBalance)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="font-mono text-[11px]">Comp: {formatCurrency(compData?.cashBankBalance || 0)}</span>
            {renderVarianceBadge(kpis.cashBankBalance)}
          </div>
        </div>

        {/* Sundry Debtors */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Sundry Debtors (Receivables)
          </div>
          <div className="text-2xl font-black font-mono text-amber-700 tracking-tight">
            {formatCurrency(currentData.outstandingReceivables)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="font-mono text-[11px]">DSO: {ratios.debtorDays ?? 0} Days</span>
            {renderVarianceBadge(kpis.outstandingReceivables)}
          </div>
        </div>

        {/* Sundry Creditors */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Sundry Creditors (Payables)
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
            {formatCurrency(currentData.outstandingPayables)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="font-mono text-[11px]">DPO: {ratios.creditorDays ?? 0} Days</span>
            <span className="text-[11px] text-slate-500 font-bold">Trade Liabilities</span>
          </div>
        </div>
      </div>

      {/* Business Health & Diagnostic Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance Sheet Equilibrium */}
        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white p-5 rounded-2xl space-y-3 shadow-sm">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-200">
            Balance Sheet Equilibrium
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xl shadow-xs ${
                balanceCheck.isBalanced ? "bg-emerald-400 text-emerald-950" : "bg-rose-500 text-white"
              }`}
            >
              {balanceCheck.isBalanced ? "✓" : "⚠"}
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight">
                {balanceCheck.isBalanced ? "100% Balanced Position" : "Discrepancy Detected"}
              </div>
              <div className="text-xs text-emerald-100/80">
                {balanceCheck.isBalanced
                  ? "Total Assets = Liabilities + Capital"
                  : `Discrepancy: ${formatCurrency(balanceCheck.difference)}`}
              </div>
            </div>
          </div>
        </div>

        {/* Liquidity Ratio */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2 shadow-sm">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            Current Ratio (Liquidity)
          </div>
          <div className="text-3xl font-black font-mono text-white tracking-tight">
            {ratios.currentRatio !== null ? `${ratios.currentRatio.toFixed(2)}x` : "N/A"}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {ratios.currentRatio && ratios.currentRatio >= 1.5
              ? "✓ Strong short-term working capital"
              : "⚠ Tight liquidity; monitor debt coverage"}
          </div>
        </div>

        {/* Operating Cash Generation */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2 shadow-sm">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            Net Operating Cash Flow (CFO)
          </div>
          <div
            className={`text-3xl font-black font-mono tracking-tight ${
              cashFlow.operating >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {formatCurrency(cashFlow.operating)}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {cashFlow.operating >= 0 ? "✓ Positive core cash accumulation" : "⚠ Net operational cash burn"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. FINANCIAL RATIOS WORKSTATION
// ─────────────────────────────────────────────────────────────────────────────

export function FinancialRatiosView({ analysisData, financialYear }: ReportsBiProps) {
  if (!analysisData?.ratios) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        Ratio analytics are computing for {financialYear}...
      </div>
    );
  }

  const { ratios, currentData } = analysisData;

  const ratioGroups = [
    {
      group: "Liquidity & Solvency Ratios",
      description: "Ability of the business to meet short-term commitments and long-term leverage obligations.",
      items: [
        {
          name: "Current Ratio",
          value: ratios.currentRatio !== null ? `${ratios.currentRatio.toFixed(2)}x` : "N/A",
          benchmark: "1.50x – 2.00x",
          formula: "Current Assets / Current Liabilities",
          status: ratios.currentRatio && ratios.currentRatio >= 1.5 ? "Healthy" : "Tight",
          statusColor: ratios.currentRatio && ratios.currentRatio >= 1.5 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200",
        },
        {
          name: "Quick Ratio (Acid-Test)",
          value: ratios.quickRatio !== null ? `${ratios.quickRatio.toFixed(2)}x` : "N/A",
          benchmark: "≥ 1.00x",
          formula: "(Cash + Debtors) / Current Liabilities",
          status: ratios.quickRatio && ratios.quickRatio >= 1.0 ? "Strong" : "Monitor",
          statusColor: ratios.quickRatio && ratios.quickRatio >= 1.0 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200",
        },
        {
          name: "Cash Ratio",
          value: ratios.cashRatio !== null ? `${ratios.cashRatio.toFixed(2)}x` : "N/A",
          benchmark: "≥ 0.50x",
          formula: "Cash & Bank / Current Liabilities",
          status: ratios.cashRatio && ratios.cashRatio >= 0.5 ? "Robust" : "Low Cash",
          statusColor: ratios.cashRatio && ratios.cashRatio >= 0.5 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200",
        },
        {
          name: "Debt-to-Equity",
          value: ratios.debtToEquity !== null ? `${ratios.debtToEquity.toFixed(2)}x` : "N/A",
          benchmark: "≤ 1.50x",
          formula: "Total Liabilities / Total Equity",
          status: ratios.debtToEquity && ratios.debtToEquity <= 1.5 ? "Low Risk" : "Leveraged",
          statusColor: ratios.debtToEquity && ratios.debtToEquity <= 1.5 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200",
        },
      ],
    },
    {
      group: "Profitability & Return Ratios",
      description: "Measurement of operational earning capacity and net bottom line margins.",
      items: [
        {
          name: "Gross Profit Margin",
          value: ratios.grossMargin !== null ? `${ratios.grossMargin}%` : "N/A",
          benchmark: "≥ 25.0%",
          formula: "Gross Profit / Turnover × 100",
          status: ratios.grossMargin && ratios.grossMargin >= 25 ? "Optimal" : "Review Margins",
          statusColor: ratios.grossMargin && ratios.grossMargin >= 25 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200",
        },
        {
          name: "Net Profit Margin (PAT)",
          value: ratios.netMargin !== null ? `${ratios.netMargin}%` : "N/A",
          benchmark: "≥ 10.0%",
          formula: "Profit After Tax / Turnover × 100",
          status: ratios.netMargin && ratios.netMargin >= 10 ? "Strong" : "Thin",
          statusColor: ratios.netMargin && ratios.netMargin >= 10 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200",
        },
        {
          name: "Operating Margin (EBIT)",
          value: ratios.operatingMargin !== null ? `${ratios.operatingMargin}%` : "N/A",
          benchmark: "≥ 15.0%",
          formula: "EBIT / Turnover × 100",
          status: ratios.operatingMargin && ratios.operatingMargin >= 15 ? "Healthy" : "Moderate",
          statusColor: ratios.operatingMargin && ratios.operatingMargin >= 15 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-slate-700 bg-slate-50 border-slate-200",
        },
        {
          name: "Working Capital",
          value: formatCurrency(currentData.totalCurrentAssets - currentData.totalCurrentLiabilities),
          benchmark: "> ₹0.00",
          formula: "Current Assets – Current Liabilities",
          status: currentData.totalCurrentAssets >= currentData.totalCurrentLiabilities ? "Surplus" : "Deficit",
          statusColor: currentData.totalCurrentAssets >= currentData.totalCurrentLiabilities ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200",
        },
      ],
    },
    {
      group: "Working Capital Efficiency & Velocity",
      description: "Speed of debt collections, vendor disbursements, and capital utilization.",
      items: [
        {
          name: "Debtor Days (DSO)",
          value: ratios.debtorDays !== null ? `${ratios.debtorDays} Days` : "N/A",
          benchmark: "≤ 45 Days",
          formula: "(Trade Debtors / Turnover) × 365",
          status: ratios.debtorDays && ratios.debtorDays <= 45 ? "Fast Collection" : "Follow-up Required",
          statusColor: ratios.debtorDays && ratios.debtorDays <= 45 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200",
        },
        {
          name: "Creditor Days (DPO)",
          value: ratios.creditorDays !== null ? `${ratios.creditorDays} Days` : "N/A",
          benchmark: "30 – 60 Days",
          formula: "(Trade Creditors / OPEX) × 365",
          status: "Normal Cycle",
          statusColor: "text-slate-700 bg-slate-50 border-slate-200",
        },
        {
          name: "Working Capital Turnover",
          value: ratios.workingCapitalTurnover !== null ? `${ratios.workingCapitalTurnover.toFixed(2)}x` : "N/A",
          benchmark: "3.00x – 6.00x",
          formula: "Turnover / Net Working Capital",
          status: "Efficient",
          statusColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <h3 className="text-lg font-black text-slate-900">Comprehensive 12+ Financial Ratio Analysis</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Diagnostic benchmarks grounded in Indian Corporate Standards &amp; Industry Practices ({financialYear}).
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {ratioGroups.map((rg, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">{rg.group}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{rg.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {rg.items.map((it, i) => (
                <div key={i} className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-xs font-bold text-slate-700">{it.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${it.statusColor}`}>
                        {it.status}
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono text-slate-900 mt-2">{it.value}</div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 space-y-0.5">
                    <div><strong>Benchmark:</strong> {it.benchmark}</div>
                    <div className="text-slate-400 truncate" title={it.formula}>{it.formula}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. COMPARATIVE TABLES (HORIZONTAL & VERTICAL ANALYSIS)
// ─────────────────────────────────────────────────────────────────────────────

export function ComparativeTablesView({ analysisData, financialYear }: ReportsBiProps) {
  if (!analysisData?.horizontalAnalysis) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        Comparative tables are compiling for {financialYear}...
      </div>
    );
  }

  const { horizontalAnalysis } = analysisData;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-slate-900">Horizontal Comparative Statement</h3>
            <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              Variance Analytics
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Absolute (₹) and percentage (%) variance between the active reporting period and benchmark comparison period.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase border-y border-slate-200">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Financial Statement Head</th>
                <th className="px-4 py-3 text-right">Current Period (₹)</th>
                <th className="px-4 py-3 text-right">Comparison Period (₹)</th>
                <th className="px-4 py-3 text-right">Absolute Variance (₹)</th>
                <th className="px-4 py-3 text-right">Variance %</th>
                <th className="px-4 py-3 text-center">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {horizontalAnalysis.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-2.5 font-bold font-sans text-slate-500">{row.category}</td>
                  <td className="px-4 py-2.5 font-bold font-sans text-slate-900">{row.lineItem}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-800">{formatCurrency(row.current)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{formatCurrency(row.comparison)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(row.varianceAmount)}</td>
                  <td className="px-4 py-2.5 text-right font-bold">
                    {row.variancePercent !== null ? `${row.variancePercent}%` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-center font-sans">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.isFavourable
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-rose-50 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {row.isFavourable ? "FAVOURABLE" : "UNFAVOURABLE"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CA DIAGNOSTIC HEALTH INSIGHTS
// ─────────────────────────────────────────────────────────────────────────────

export function CaInsightsView({ analysisData, financialYear }: ReportsBiProps) {
  if (!analysisData?.insights) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        Generating diagnostic insights for {financialYear}...
      </div>
    );
  }

  const { insights } = analysisData;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-slate-900">Dynamic CA Diagnostic Findings &amp; Health Checks</h3>
            <span className="bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              Chartered Accountant Review
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated statutory audit checks covering working capital strain, debtors aging, GST compliance, and fixed asset capitalization.
          </p>
        </div>

        <div className="space-y-3">
          {insights.map((insight: string, idx: number) => (
            <div
              key={idx}
              className="flex items-start gap-3.5 p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl text-xs sm:text-sm font-semibold text-emerald-950"
            >
              <span className="text-emerald-700 text-lg">💡</span>
              <span className="leading-relaxed">{insight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. REVENUE OPERATIONS & CONCENTRATION
// ─────────────────────────────────────────────────────────────────────────────

export function RevenueOpsView({ analysisData, financialYear }: ReportsBiProps) {
  if (!analysisData) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        Revenue operations data is compiling for {financialYear}...
      </div>
    );
  }

  const { topCustomers = [], revenueCategories = [] } = analysisData;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-lg font-black text-slate-900">Revenue Concentration &amp; Income Heads</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify top customer revenue dependencies and revenue category distribution for {financialYear}.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Customers */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Top Customer Accounts by Revenue Share
            </h4>
            <div className="space-y-2">
              {topCustomers.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 italic bg-slate-50 rounded-xl">
                  No billed customers recorded in this period.
                </div>
              ) : (
                topCustomers.map((c: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">
                        {i + 1}. {c.name} <span className="text-slate-500 font-normal">({c.count} invoices)</span>
                      </span>
                      <span className="font-mono font-extrabold text-emerald-800">
                        {formatCurrency(c.amount)} ({c.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.min(100, c.percentage)}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Revenue Categories */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Revenue Stream Breakdown by Category
            </h4>
            <div className="space-y-2">
              {revenueCategories.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 italic bg-slate-50 rounded-xl">
                  No revenue categories found.
                </div>
              ) : (
                revenueCategories.map((r: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">{r.category}</span>
                      <span className="font-mono font-extrabold text-slate-900">
                        {formatCurrency(r.amount)} ({r.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-teal-600 h-full rounded-full" style={{ width: `${Math.min(100, r.percentage)}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. EXPENSE OPERATIONS & VENDOR BREAKDOWN
// ─────────────────────────────────────────────────────────────────────────────

export function ExpenseOpsView({ analysisData, financialYear }: ReportsBiProps) {
  if (!analysisData) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        Expense operations data is compiling for {financialYear}...
      </div>
    );
  }

  const { topVendors = [], expenseCategories = [] } = analysisData;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-lg font-black text-slate-900">OPEX Structure &amp; Vendor Disbursements</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational cost driver distribution and vendor outflow concentration for {financialYear}.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Vendors */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Top Vendor Accounts by Expenditure
            </h4>
            <div className="space-y-2">
              {topVendors.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 italic bg-slate-50 rounded-xl">
                  No vendor disbursements recorded in this period.
                </div>
              ) : (
                topVendors.map((v: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">
                        {i + 1}. {v.name}
                      </span>
                      <span className="font-mono font-extrabold text-slate-900">
                        {formatCurrency(v.amount)} ({v.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, v.percentage)}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Expense Categories */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Operating Expense Categories
            </h4>
            <div className="space-y-2">
              {expenseCategories.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 italic bg-slate-50 rounded-xl">
                  No expense categories found.
                </div>
              ) : (
                expenseCategories.map((c: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50/80 border border-slate-100 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">{c.category}</span>
                      <span className="font-mono font-extrabold text-rose-700">
                        {formatCurrency(c.amount)} ({c.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-600 h-full rounded-full" style={{ width: `${Math.min(100, c.percentage)}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
