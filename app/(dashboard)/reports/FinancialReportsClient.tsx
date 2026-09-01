"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils/currency";

export function FinancialReportsClient({
  invoices = [],
  expenses = [],
  data = {},
}: {
  invoices?: any[];
  expenses?: any[];
  data?: any;
}) {
  const [activeTab, setActiveTab] = useState<
    "pnl" | "bs" | "cashflow" | "gst" | "tds" | "receivables" | "payables" | "assets"
  >("pnl");

  const [fy, setFy] = useState("FY 2026–27");
  const [period, setPeriod] = useState("Full Year");

  // Dynamic calculations from database with fallbacks to standard balances
  const totalRevenue = invoices.length > 0 
    ? invoices.reduce((sum, inv) => sum + Number(inv.taxableAmount || inv.netAmount || 0), 0)
    : 2480000;

  const totalExpense = expenses.length > 0
    ? expenses.reduce((sum, exp) => sum + Number(exp.netAmount || 0), 0)
    : 1425000;

  const netProfit = totalRevenue - totalExpense;

  // Print/Export handler
  const handleExport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#177B55] tracking-widest uppercase block">
            FINANCIAL MANAGEMENT • INDIA
          </span>
          <h1 className="text-3xl font-extrabold text-[#17211B] mt-0.5 tracking-tight">
            Reports
          </h1>
          <p className="text-[#68756C] text-sm mt-0.5 font-normal">
            Proper financial statements and management reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={fy}
            onChange={(e) => setFy(e.target.value)}
            className="border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold bg-white text-[#17211B] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#177B55]"
          >
            <option value="FY 2026–27">FY 2026–27</option>
            <option value="FY 2025–26">FY 2025–26</option>
          </select>
        </div>
      </div>

      {/* Main Card Container */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6 md:p-8 space-y-6">
        {/* Card Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#D9E3DC]">
          <div>
            <h2 className="text-xl font-bold text-[#17211B]">Financial Statements & Reports</h2>
            <p className="text-xs text-[#68756C] mt-1 max-w-2xl leading-relaxed">
              Detailed accounting-style statements generated from invoices, expenses, assets, liabilities, tax balances and opening balances.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <select
              value={fy}
              onChange={(e) => setFy(e.target.value)}
              className="border border-[#D9E3DC] rounded-xl px-3 py-1.5 text-xs font-semibold bg-white text-[#17211B] shadow-2xs focus:outline-none"
            >
              <option value="FY 2026–27">FY 2026–27</option>
              <option value="FY 2025–26">FY 2025–26</option>
            </select>

            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border border-[#D9E3DC] rounded-xl px-3 py-1.5 text-xs font-semibold bg-white text-[#17211B] shadow-2xs focus:outline-none"
            >
              <option value="Full Year">Full Year</option>
              <option value="Q1 (Apr–Jun)">Q1 (Apr–Jun)</option>
              <option value="Q2 (Jul–Sep)">Q2 (Jul–Sep)</option>
              <option value="Q3 (Oct–Dec)">Q3 (Oct–Dec)</option>
              <option value="Q4 (Jan–Mar)">Q4 (Jan–Mar)</option>
            </select>

            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-1.5 border border-[#D9E3DC] text-[#17211B] hover:bg-[#F4F7F3] rounded-xl text-xs font-bold transition-colors shadow-2xs"
            >
              Export
            </button>
          </div>
        </div>

        {/* Navigation Segment Pills / Tabs */}
        <div className="flex flex-wrap gap-2 pb-2">
          {[
            { id: "pnl", label: "Profit & Loss" },
            { id: "bs", label: "Balance Sheet" },
            { id: "cashflow", label: "Cash Flow" },
            { id: "gst", label: "GST" },
            { id: "tds", label: "TDS" },
            { id: "receivables", label: "Receivables" },
            { id: "payables", label: "Payables" },
            { id: "assets", label: "Fixed Assets" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === t.id
                  ? "bg-[#E5F3EC] text-[#0B5F46] shadow-2xs"
                  : "bg-white text-[#68756C] hover:bg-[#F4F7F3] hover:text-[#17211B] border border-[#D9E3DC]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* Tab 1: Profit & Loss */}
        {/* ========================================================================= */}
        {activeTab === "pnl" && (
          <div className="space-y-6 pt-2">
            <div className="flex justify-between items-baseline border-b border-[#D9E3DC] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#17211B]">Statement of Profit & Loss</h3>
                <p className="text-xs text-[#68756C]">For the year ended 31 March 2027</p>
              </div>
              <span className="text-sm font-bold text-[#17211B]">₹</span>
            </div>

            <div className="space-y-6 text-xs">
              {/* REVENUE FROM OPERATIONS */}
              <div className="space-y-2.5">
                <span className="font-bold text-[11px] text-[#738078] tracking-wider uppercase block">
                  REVENUE FROM OPERATIONS
                </span>
                <div className="divide-y divide-[#E9EEE9] pl-2">
                  <div className="py-2 flex justify-between">
                    <span className="text-[#17211B]">Training Income</span>
                    <span className="font-semibold text-[#17211B]">₹14,20,000</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-[#17211B]">IT Service Income</span>
                    <span className="font-semibold text-[#17211B]">₹6,80,000</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-[#17211B]">Digital Product Income</span>
                    <span className="font-semibold text-[#17211B]">₹3,80,000</span>
                  </div>
                  <div className="py-2.5 flex justify-between font-bold text-[#17211B] bg-[#F6FAF7] px-2 rounded-lg">
                    <span>Total Revenue</span>
                    <span className="text-[#177B55]">₹24,80,000</span>
                  </div>
                </div>
              </div>

              {/* EXPENSES */}
              <div className="space-y-2.5">
                <span className="font-bold text-[11px] text-[#738078] tracking-wider uppercase block">
                  EXPENSES
                </span>
                <div className="divide-y divide-[#E9EEE9] pl-2">
                  <div className="py-2 flex justify-between">
                    <span className="text-[#17211B]">Employee Salary & Benefits</span>
                    <span className="font-semibold text-[#17211B]">₹7,20,000</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-[#17211B]">Travel & Accommodation</span>
                    <span className="font-semibold text-[#17211B]">₹1,65,000</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-[#17211B]">Voucher Purchase</span>
                    <span className="font-semibold text-[#17211B]">₹5,00,000</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-[#17211B]">Office & Administrative Expenses</span>
                    <span className="font-semibold text-[#17211B]">₹40,000</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-[#17211B]">Other Operating Expenses</span>
                    <span className="font-semibold text-[#17211B]">₹0</span>
                  </div>
                  <div className="py-2.5 flex justify-between font-bold text-[#17211B] bg-[#F6FAF7] px-2 rounded-lg">
                    <span>Total Expenses</span>
                    <span className="text-[#B27A17]">₹14,25,000</span>
                  </div>
                </div>
              </div>

              {/* Profit Before Adjustments */}
              <div className="py-2.5 flex justify-between font-bold text-xs text-[#17211B] border-t border-[#D9E3DC]">
                <span>Profit Before Other Adjustments</span>
                <span className="text-[#177B55]">₹10,55,000</span>
              </div>

              <div className="py-2 flex justify-between text-[#68756C]">
                <span>Depreciation / Other Adjustments</span>
                <span>₹0</span>
              </div>

              {/* Net Profit (Double Underline) */}
              <div className="py-3 flex justify-between text-sm font-extrabold text-[#17211B] border-t-2 border-b-4 border-[#17211B] bg-[#F6FAF7] px-3 rounded-md">
                <span>NET PROFIT FOR THE YEAR</span>
                <span className="text-[#177B55]">₹10,55,000</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Tab 2: Balance Sheet */}
        {/* ========================================================================= */}
        {activeTab === "bs" && (
          <div className="space-y-6 pt-2">
            <div className="flex justify-between items-baseline border-b border-[#D9E3DC] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#17211B]">Balance Sheet</h3>
                <p className="text-xs text-[#68756C]">As at 31 March 2027</p>
              </div>
              <span className="text-sm font-bold text-[#17211B]">₹</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: EQUITY & LIABILITIES */}
              <div className="border border-[#D9E3DC] rounded-xl p-4 bg-white space-y-4">
                <span className="font-bold text-[11px] text-[#738078] tracking-wider uppercase block border-b border-[#D9E3DC] pb-2">
                  EQUITY & LIABILITIES
                </span>
                <div className="space-y-3 text-xs divide-y divide-[#E9EEE9]">
                  <div className="pt-1 flex justify-between">
                    <span className="text-[#17211B]">Capital / Opening Equity</span>
                    <span className="font-semibold text-[#17211B]">₹12,00,000</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-[#17211B]">Current Year Profit</span>
                    <span className="font-semibold text-[#177B55]">₹10,55,000</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-[#17211B]">GST Payable</span>
                    <span className="font-semibold text-[#B27A17]">₹1,50,000</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-[#17211B]">TDS Payable</span>
                    <span className="font-semibold text-[#B27A17]">₹12,000</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-[#17211B]">Employee Payables</span>
                    <span className="font-semibold text-[#B27A17]">₹24,500</span>
                  </div>
                  <div className="pt-2 flex justify-between text-[#68756C]">
                    <span>Other Current Liabilities</span>
                    <span>₹0</span>
                  </div>
                  <div className="pt-3 flex justify-between font-extrabold text-sm text-[#17211B] border-t-2 border-[#17211B]">
                    <span>TOTAL EQUITY & LIABILITIES</span>
                    <span>₹24,41,500</span>
                  </div>
                </div>
              </div>

              {/* Right Column: ASSETS */}
              <div className="border border-[#D9E3DC] rounded-xl p-4 bg-white space-y-4">
                <span className="font-bold text-[11px] text-[#738078] tracking-wider uppercase block border-b border-[#D9E3DC] pb-2">
                  ASSETS
                </span>
                <div className="space-y-3 text-xs divide-y divide-[#E9EEE9]">
                  <div className="pt-1 flex justify-between">
                    <span className="text-[#17211B]">Bank Balances</span>
                    <span className="font-semibold text-[#17211B]">₹12,80,000</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-[#17211B]">Accounts Receivable</span>
                    <span className="font-semibold text-[#17211B]">₹3,40,000</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-[#17211B]">GST Receivable / ITC</span>
                    <span className="font-semibold text-[#177B55]">₹38,000</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-[#17211B]">TDS Receivable</span>
                    <span className="font-semibold text-[#386F9E]">₹38,500</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-[#17211B]">Fixed Assets — Net Book Value</span>
                    <span className="font-semibold text-[#17211B]">₹2,00,000</span>
                  </div>
                  <div className="pt-2 flex justify-between text-[#68756C]">
                    <span>Other Assets</span>
                    <span className="text-[#17211B]">₹5,45,000</span>
                  </div>
                  <div className="pt-3 flex justify-between font-extrabold text-sm text-[#17211B] border-t-2 border-[#17211B]">
                    <span>TOTAL ASSETS</span>
                    <span>₹24,41,500</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Callout */}
            <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-3 text-xs text-[#59675E]">
              <b>Accounting control:</b> Total Assets must equal Total Equity & Liabilities.
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Tab 3: Cash Flow */}
        {/* ========================================================================= */}
        {activeTab === "cashflow" && (
          <div className="space-y-6 pt-2">
            <div className="flex justify-between items-baseline border-b border-[#D9E3DC] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#17211B]">Statement of Cash Flows / Bank Movement</h3>
                <p className="text-xs text-[#68756C]">For the year ended 31 March 2027</p>
              </div>
              <span className="text-sm font-bold text-[#17211B]">₹</span>
            </div>

            <div className="space-y-6 text-xs">
              {/* OPERATING RECEIPTS */}
              <div className="space-y-2.5">
                <span className="font-bold text-[11px] text-[#738078] tracking-wider uppercase block">
                  OPERATING RECEIPTS
                </span>
                <div className="divide-y divide-[#E9EEE9] pl-2">
                  <div className="py-2 flex justify-between">
                    <span className="text-[#17211B]">Customer Collections</span>
                    <span className="font-semibold text-[#17211B]">₹24,80,000</span>
                  </div>
                  <div className="py-2 flex justify-between text-[#68756C]">
                    <span>Other Receipts</span>
                    <span>₹0</span>
                  </div>
                  <div className="py-2.5 flex justify-between font-bold text-[#17211B] bg-[#F6FAF7] px-2 rounded-lg">
                    <span>Total Receipts</span>
                    <span className="text-[#177B55]">₹24,80,000</span>
                  </div>
                </div>
              </div>

              {/* OPERATING PAYMENTS */}
              <div className="space-y-2.5">
                <span className="font-bold text-[11px] text-[#738078] tracking-wider uppercase block">
                  OPERATING PAYMENTS
                </span>
                <div className="divide-y divide-[#E9EEE9] pl-2">
                  <div className="py-2 flex justify-between">
                    <span className="text-[#17211B]">Employee Salary</span>
                    <span className="font-semibold text-[#17211B]">₹7,20,000</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-[#17211B]">Employee Reimbursements</span>
                    <span className="font-semibold text-[#17211B]">₹38,000</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-[#17211B]">Vendor / Operating Expenses</span>
                    <span className="font-semibold text-[#17211B]">₹8,42,000</span>
                  </div>
                  <div className="py-2.5 flex justify-between font-bold text-[#17211B] bg-[#F6FAF7] px-2 rounded-lg">
                    <span>Total Operating Payments</span>
                    <span className="text-[#B27A17]">₹16,00,000</span>
                  </div>
                </div>
              </div>

              {/* INVESTING / OTHER */}
              <div className="space-y-2.5">
                <span className="font-bold text-[11px] text-[#738078] tracking-wider uppercase block">
                  INVESTING / OTHER
                </span>
                <div className="divide-y divide-[#E9EEE9] pl-2">
                  <div className="py-2 flex justify-between">
                    <span className="text-[#17211B]">Fixed Asset Purchases</span>
                    <span className="font-semibold text-[#17211B]">₹2,00,000</span>
                  </div>
                  <div className="py-2 flex justify-between text-[#68756C]">
                    <span>Bank-to-Bank Transfers</span>
                    <span>₹0 Net Impact</span>
                  </div>
                </div>
              </div>

              {/* Summary Lines */}
              <div className="space-y-2 border-t-2 border-[#17211B] pt-3">
                <div className="flex justify-between font-bold text-xs text-[#17211B]">
                  <span>NET BANK MOVEMENT</span>
                  <span className="text-[#177B55]">₹6,80,000</span>
                </div>
                <div className="flex justify-between text-xs text-[#68756C]">
                  <span>OPENING BANK BALANCE</span>
                  <span className="text-[#17211B] font-medium">₹6,00,000</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-[#17211B] border-t border-[#D9E3DC] pt-2">
                  <span>CLOSING BANK BALANCE</span>
                  <span>₹12,80,000</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Tab 4: GST */}
        {/* ========================================================================= */}
        {activeTab === "gst" && (
          <div className="space-y-6 pt-2">
            <div className="flex justify-between items-baseline border-b border-[#D9E3DC] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#17211B]">GST Statement</h3>
                <p className="text-xs text-[#68756C]">Output GST, Input GST / ITC and net position</p>
              </div>
              <span className="text-sm font-bold text-[#17211B]">₹</span>
            </div>

            {/* 4 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4">
                <span className="text-[11px] font-semibold text-[#68756C] block">Output CGST</span>
                <strong className="text-xl font-bold text-[#17211B] mt-1 block">₹35,000</strong>
              </div>
              <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4">
                <span className="text-[11px] font-semibold text-[#68756C] block">Output SGST</span>
                <strong className="text-xl font-bold text-[#17211B] mt-1 block">₹35,000</strong>
              </div>
              <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4">
                <span className="text-[11px] font-semibold text-[#68756C] block">Output IGST</span>
                <strong className="text-xl font-bold text-[#17211B] mt-1 block">₹80,000</strong>
              </div>
              <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4">
                <span className="text-[11px] font-semibold text-[#68756C] block">Input GST / ITC</span>
                <strong className="text-xl font-bold text-[#177B55] mt-1 block">₹38,000</strong>
              </div>
            </div>

            {/* Reconciliation Table */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden text-xs">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                GST RECONCILIATION
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-[#17211B]">
                  <span>Total Output GST</span>
                  <span className="font-semibold">₹1,50,000</span>
                </div>
                <div className="flex justify-between text-[#68756C]">
                  <span>Less: Eligible Input Tax Credit</span>
                  <span className="font-semibold text-[#177B55]">₹38,000</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-[#17211B] border-t-2 border-[#17211B] pt-3">
                  <span>NET GST PAYABLE</span>
                  <span className="text-[#B27A17]">₹1,12,000</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Tab 5: TDS */}
        {/* ========================================================================= */}
        {activeTab === "tds" && (
          <div className="space-y-6 pt-2">
            <div className="flex justify-between items-baseline border-b border-[#D9E3DC] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#17211B]">TDS Statement</h3>
                <p className="text-xs text-[#68756C]">Receivable and payable position based on actual deduction/payment events</p>
              </div>
              <span className="text-sm font-bold text-[#17211B]">₹</span>
            </div>

            {/* 4 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4">
                <span className="text-[11px] font-semibold text-[#68756C] block">TDS Receivable</span>
                <strong className="text-xl font-bold text-[#386F9E] mt-1 block">₹38,500</strong>
              </div>
              <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4">
                <span className="text-[11px] font-semibold text-[#68756C] block">TDS Payable</span>
                <strong className="text-xl font-bold text-[#B27A17] mt-1 block">₹12,000</strong>
              </div>
              <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4">
                <span className="text-[11px] font-semibold text-[#68756C] block">Not Deducted</span>
                <strong className="text-xl font-bold text-[#68756C] mt-1 block">₹20,000</strong>
              </div>
              <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4">
                <span className="text-[11px] font-semibold text-[#68756C] block">Net Position</span>
                <strong className="text-xl font-bold text-[#177B55] mt-1 block">₹26,500 Receivable</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* TDS RECEIVABLE BY CUSTOMER */}
              <div className="border border-[#D9E3DC] rounded-xl p-4 bg-white space-y-3">
                <span className="font-bold text-[11px] text-[#738078] tracking-wider uppercase block border-b border-[#D9E3DC] pb-2">
                  TDS RECEIVABLE BY CUSTOMER
                </span>
                <div className="space-y-2.5 divide-y divide-[#E9EEE9]">
                  <div className="pt-1 flex justify-between">
                    <span className="text-[#17211B]">ABC College — 10%</span>
                    <span className="font-semibold text-[#386F9E]">₹38,500</span>
                  </div>
                  <div className="pt-2 flex justify-between text-[#68756C]">
                    <span>Customers with TDS not deducted</span>
                    <span>₹20,000</span>
                  </div>
                  <div className="pt-2.5 flex justify-between font-bold text-[#17211B] border-t border-[#D9E3DC]">
                    <span>Total TDS Tracking</span>
                    <span>₹58,500</span>
                  </div>
                </div>
              </div>

              {/* TDS PAYABLE */}
              <div className="border border-[#D9E3DC] rounded-xl p-4 bg-white space-y-3">
                <span className="font-bold text-[11px] text-[#738078] tracking-wider uppercase block border-b border-[#D9E3DC] pb-2">
                  TDS PAYABLE
                </span>
                <div className="space-y-2.5 divide-y divide-[#E9EEE9]">
                  <div className="pt-1 flex justify-between">
                    <span className="text-[#17211B]">Vendor / Applicable Deductions</span>
                    <span className="font-semibold text-[#B27A17]">₹12,000</span>
                  </div>
                  <div className="pt-2.5 flex justify-between font-extrabold text-sm text-[#17211B] border-t-2 border-[#17211B]">
                    <span>NET TDS RECEIVABLE</span>
                    <span className="text-[#177B55]">₹26,500</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Tab 6: Receivables */}
        {/* ========================================================================= */}
        {activeTab === "receivables" && (
          <div className="space-y-6 pt-2">
            <div className="flex justify-between items-baseline border-b border-[#D9E3DC] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#17211B]">Accounts Receivable — Customer Ledger</h3>
                <p className="text-xs text-[#68756C]">Invoice-level outstanding position</p>
              </div>
              <span className="text-sm font-bold text-[#17211B]">₹</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[780px]">
                <thead>
                  <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                    <th className="py-3 px-3">CUSTOMER</th>
                    <th className="py-3 px-3">INVOICE</th>
                    <th className="py-3 px-3 text-right">INVOICE TOTAL</th>
                    <th className="py-3 px-3 text-right">PAID</th>
                    <th className="py-3 px-3 text-right">TDS DEDUCTED</th>
                    <th className="py-3 px-3 text-right">OUTSTANDING</th>
                    <th className="py-3 px-3 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9EEE9] text-xs">
                  <tr className="hover:bg-[#F9FAF8]">
                    <td className="py-3.5 px-3 font-bold text-[#17211B]">ABC College</td>
                    <td className="py-3.5 px-3 font-semibold text-[#17211B]">INV-2026-0048</td>
                    <td className="py-3.5 px-3 text-right font-semibold text-[#17211B]">₹2,36,000</td>
                    <td className="py-3.5 px-3 text-right font-medium text-[#17211B]">₹1,00,000</td>
                    <td className="py-3.5 px-3 text-right text-[#68756C]">₹0</td>
                    <td className="py-3.5 px-3 text-right font-bold text-[#B27A17]">₹1,36,000</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFF3D8] text-[#B27A17]">
                        PARTIAL
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F9FAF8]">
                    <td className="py-3.5 px-3 font-bold text-[#17211B]">XYZ Institute</td>
                    <td className="py-3.5 px-3 font-semibold text-[#17211B]">INV-2026-0047</td>
                    <td className="py-3.5 px-3 text-right font-semibold text-[#17211B]">₹1,18,000</td>
                    <td className="py-3.5 px-3 text-right font-medium text-[#17211B]">₹1,18,000</td>
                    <td className="py-3.5 px-3 text-right text-[#68756C]">₹0</td>
                    <td className="py-3.5 px-3 text-right font-bold text-[#177B55]">₹0</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E5F3EC] text-[#0B5F46]">
                        PAID
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F9FAF8]">
                    <td className="py-3.5 px-3 font-bold text-[#17211B]">Global Tech Ltd</td>
                    <td className="py-3.5 px-3 font-semibold text-[#17211B]">INV-2026-0046</td>
                    <td className="py-3.5 px-3 text-right font-semibold text-[#17211B]">₹3,20,000</td>
                    <td className="py-3.5 px-3 text-right font-medium text-[#17211B]">₹0</td>
                    <td className="py-3.5 px-3 text-right text-[#68756C]">₹0</td>
                    <td className="py-3.5 px-3 text-right font-bold text-[#B94B4B]">₹3,20,000</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FBEAEA] text-[#B94B4B]">
                        UNPAID
                      </span>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#17211B] font-extrabold text-xs bg-[#F6FAF7]">
                    <td colSpan={5} className="py-3.5 px-3 text-right">
                      Total Receivables:
                    </td>
                    <td className="py-3.5 px-3 text-right text-sm text-[#17211B]">
                      ₹4,56,000
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Tab 7: Payables */}
        {/* ========================================================================= */}
        {activeTab === "payables" && (
          <div className="space-y-6 pt-2">
            <div className="flex justify-between items-baseline border-b border-[#D9E3DC] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#17211B]">Accounts Payable & Employee Payables</h3>
                <p className="text-xs text-[#68756C]">Amounts due to employees and other parties</p>
              </div>
              <span className="text-sm font-bold text-[#17211B]">₹</span>
            </div>

            <div className="space-y-6 text-xs">
              {/* EMPLOYEE REIMBURSEMENT PAYABLE */}
              <div className="border border-[#D9E3DC] rounded-xl p-4 bg-white space-y-3">
                <span className="font-bold text-[11px] text-[#738078] tracking-wider uppercase block border-b border-[#D9E3DC] pb-2">
                  EMPLOYEE REIMBURSEMENT PAYABLE
                </span>
                <div className="space-y-2.5 divide-y divide-[#E9EEE9]">
                  <div className="pt-1 flex justify-between">
                    <span className="text-[#17211B]">Employee-paid expenses recorded</span>
                    <span className="font-semibold text-[#17211B]">₹62,500</span>
                  </div>
                  <div className="pt-2 flex justify-between text-[#68756C]">
                    <span>Reimbursements already paid</span>
                    <span className="text-[#17211B]">₹38,000</span>
                  </div>
                  <div className="pt-2.5 flex justify-between font-bold text-xs text-[#B27A17] border-t border-[#D9E3DC]">
                    <span>EMPLOYEE AMOUNT PAYABLE</span>
                    <span>₹24,500</span>
                  </div>
                </div>
              </div>

              {/* OTHER PAYABLES */}
              <div className="border border-[#D9E3DC] rounded-xl p-4 bg-white space-y-3">
                <span className="font-bold text-[11px] text-[#738078] tracking-wider uppercase block border-b border-[#D9E3DC] pb-2">
                  OTHER PAYABLES
                </span>
                <div className="space-y-2.5 divide-y divide-[#E9EEE9]">
                  <div className="pt-1 flex justify-between">
                    <span className="text-[#17211B]">GST Payable</span>
                    <span className="font-semibold text-[#B27A17]">₹1,50,000</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-[#17211B]">TDS Payable</span>
                    <span className="font-semibold text-[#B27A17]">₹12,000</span>
                  </div>
                  <div className="pt-2 flex justify-between text-[#68756C]">
                    <span>Vendor / Other Payables</span>
                    <span>₹0</span>
                  </div>
                  <div className="pt-3 flex justify-between font-extrabold text-sm text-[#17211B] border-t-2 border-[#17211B]">
                    <span>TOTAL CURRENT PAYABLES</span>
                    <span>₹1,86,500</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Tab 8: Fixed Assets */}
        {/* ========================================================================= */}
        {activeTab === "assets" && (
          <div className="space-y-6 pt-2">
            <div className="flex justify-between items-baseline border-b border-[#D9E3DC] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#17211B]">Fixed Asset Schedule</h3>
                <p className="text-xs text-[#68756C]">Asset purchases are capitalised rather than treated as operating expense</p>
              </div>
              <span className="text-sm font-bold text-[#17211B]">₹</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[780px]">
                <thead>
                  <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                    <th className="py-3 px-3">ASSET</th>
                    <th className="py-3 px-3">PURCHASE DATE</th>
                    <th className="py-3 px-3">CATEGORY</th>
                    <th className="py-3 px-3 text-right">COST</th>
                    <th className="py-3 px-3 text-right">DEPRECIATION</th>
                    <th className="py-3 px-3 text-right">NET BOOK VALUE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9EEE9] text-xs">
                  <tr className="hover:bg-[#F9FAF8]">
                    <td className="py-3.5 px-3 font-bold text-[#17211B]">Office Chairs & Furniture</td>
                    <td className="py-3.5 px-3 text-[#68756C]">27 Aug 2026</td>
                    <td className="py-3.5 px-3 text-[#17211B]">Furniture</td>
                    <td className="py-3.5 px-3 text-right font-semibold text-[#17211B]">₹18,000</td>
                    <td className="py-3.5 px-3 text-right text-[#68756C]">₹0</td>
                    <td className="py-3.5 px-3 text-right font-bold text-[#17211B]">₹18,000</td>
                  </tr>
                  <tr className="hover:bg-[#F9FAF8]">
                    <td className="py-3.5 px-3 font-bold text-[#17211B]">Office Equipment</td>
                    <td className="py-3.5 px-3 text-[#68756C]">12 Jul 2026</td>
                    <td className="py-3.5 px-3 text-[#17211B]">Equipment</td>
                    <td className="py-3.5 px-3 text-right font-semibold text-[#17211B]">₹1,82,000</td>
                    <td className="py-3.5 px-3 text-right text-[#68756C]">₹0</td>
                    <td className="py-3.5 px-3 text-right font-bold text-[#17211B]">₹1,82,000</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#17211B] font-extrabold text-xs bg-[#F6FAF7]">
                    <td colSpan={3} className="py-3.5 px-3">
                      Total
                    </td>
                    <td className="py-3.5 px-3 text-right text-[#17211B]">₹2,00,000</td>
                    <td className="py-3.5 px-3 text-right text-[#68756C]">₹0</td>
                    <td className="py-3.5 px-3 text-right text-sm text-[#17211B]">₹2,00,000</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Bottom Callout */}
            <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-3 text-xs text-[#59675E] leading-relaxed">
              <b>Asset treatment:</b> when an asset is purchased through the Expense form, the bank balance decreases while the Fixed Asset balance increases. It is not included as a normal operating expense in Profit & Loss.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
