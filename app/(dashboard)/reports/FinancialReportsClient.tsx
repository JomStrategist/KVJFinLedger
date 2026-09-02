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

  // =========================================================================
  // DYNAMIC COMPUTATIONS FROM REAL DATABASE INVOICES & EXPENSES
  // =========================================================================

  // 1. Sales & Revenue
  const validInvoices = invoices.filter((inv) => inv.status !== "CANCELLED");
  const totalRevenue = validInvoices.reduce(
    (sum, inv) => sum + Number(inv.taxableAmount || inv.subtotal || inv.netAmount || 0),
    0
  );

  // Group revenue by category/product if items exist
  const revenueByCategoryMap: Record<string, number> = {};
  for (const inv of validInvoices) {
    if (inv.items && inv.items.length > 0) {
      for (const item of inv.items) {
        const cat = item.name || "Services & Products";
        revenueByCategoryMap[cat] = (revenueByCategoryMap[cat] || 0) + Number(item.taxableAmount || item.totalAmount || 0);
      }
    } else {
      const cat = "Service & Sales Income";
      revenueByCategoryMap[cat] = (revenueByCategoryMap[cat] || 0) + Number(inv.taxableAmount || inv.subtotal || inv.netAmount || 0);
    }
  }
  const revenueCategories = Object.entries(revenueByCategoryMap);

  // 2. Expenses
  const validExpenses = expenses.filter((exp) => exp.status !== "CANCELLED" && exp.status !== "REJECTED");
  const totalExpense = validExpenses.reduce((sum, exp) => sum + Number(exp.netAmount || 0), 0);

  // Group expenses by category
  const expenseByCategoryMap: Record<string, number> = {};
  for (const exp of validExpenses) {
    const catName = exp.category?.name || "Operating Expenses";
    expenseByCategoryMap[catName] = (expenseByCategoryMap[catName] || 0) + Number(exp.netAmount || 0);
  }
  const expenseCategories = Object.entries(expenseByCategoryMap);

  // 3. Profit
  const netProfit = totalRevenue - totalExpense;

  // 4. Taxes
  const outputCGST = validInvoices.reduce((sum, inv) => sum + Number(inv.totalCGST || 0), 0);
  const outputSGST = validInvoices.reduce((sum, inv) => sum + Number(inv.totalSGST || 0), 0);
  const outputIGST = validInvoices.reduce((sum, inv) => sum + Number(inv.totalIGST || 0), 0);
  const totalOutputGST = validInvoices.reduce((sum, inv) => sum + Number(inv.totalGST || 0), 0);

  const inputCGST = validExpenses.reduce((sum, exp) => sum + Number(exp.inputCGST || 0), 0);
  const inputSGST = validExpenses.reduce((sum, exp) => sum + Number(exp.inputSGST || 0), 0);
  const inputIGST = validExpenses.reduce((sum, exp) => sum + Number(exp.inputIGST || 0), 0);
  const totalInputGST = validExpenses.reduce((sum, exp) => sum + Number(exp.totalInputGST || 0), 0);

  const netGSTPayable = totalOutputGST - totalInputGST;

  // 5. TDS
  const tdsReceivable = validInvoices.reduce((sum, inv) => sum + Number(inv.tdsAmount || 0), 0);
  const tdsPayable = validExpenses.reduce((sum, exp) => sum + Number(exp.tdsAmount || 0), 0);
  const netTDS = tdsReceivable - tdsPayable;

  // 6. Receivables & Payables lists
  const receivablesList = validInvoices.filter((inv) => inv.status !== "PAID");
  const totalReceivables = receivablesList.reduce((sum, inv) => sum + Number(inv.netAmount || 0), 0);

  const payablesList = validExpenses.filter((exp) => exp.paymentStatus !== "PAID");
  const totalPayables = payablesList.reduce((sum, exp) => sum + Number(exp.netAmount || 0), 0);

  // Employee payables
  const employeePayablesList = validExpenses.filter(
    (exp) => exp.paidBy === "EMPLOYEE" && exp.paymentStatus !== "PAID"
  );
  const employeePayablesTotal = employeePayablesList.reduce((sum, exp) => sum + Number(exp.netAmount || 0), 0);

  // 7. Fixed Assets
  const assetExpenses = validExpenses.filter((exp) => {
    const catName = (exp.category?.name || "").toLowerCase();
    return catName.includes("asset") || catName.includes("equipment") || catName.includes("furniture") || catName.includes("computer");
  });
  const totalAssetsValue = assetExpenses.reduce((sum, exp) => sum + Number(exp.netAmount || 0), 0);

  // 8. Bank Balances & Cash Flow
  const paidInvoicesTotal = validInvoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + Number(inv.netAmount || 0), 0);

  const paidExpensesTotal = validExpenses
    .filter((exp) => exp.paymentStatus === "PAID")
    .reduce((sum, exp) => sum + Number(exp.netAmount || 0), 0);

  const bankBalance = paidInvoicesTotal - paidExpensesTotal;

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
            Financial statements dynamically generated from recorded transactions.
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
              Accounting-style statements computed from confirmed tax invoices, expenses, assets, tax liabilities, and customer/vendor ledgers.
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
                <p className="text-xs text-[#68756C]">For the selected financial period ({fy})</p>
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
                  {revenueCategories.length === 0 ? (
                    <div className="py-2 text-[#68756C] italic">No revenue transactions recorded.</div>
                  ) : (
                    revenueCategories.map(([cat, amt]) => (
                      <div key={cat} className="py-2 flex justify-between">
                        <span className="text-[#17211B]">{cat}</span>
                        <span className="font-semibold text-[#17211B]">{formatCurrency(amt)}</span>
                      </div>
                    ))
                  )}
                  <div className="py-2.5 flex justify-between font-bold text-[#17211B] bg-[#F6FAF7] px-2 rounded-lg">
                    <span>Total Revenue</span>
                    <span className="text-[#177B55]">{formatCurrency(totalRevenue)}</span>
                  </div>
                </div>
              </div>

              {/* EXPENSES */}
              <div className="space-y-2.5">
                <span className="font-bold text-[11px] text-[#738078] tracking-wider uppercase block">
                  OPERATING EXPENSES
                </span>
                <div className="divide-y divide-[#E9EEE9] pl-2">
                  {expenseCategories.length === 0 ? (
                    <div className="py-2 text-[#68756C] italic">No expense transactions recorded.</div>
                  ) : (
                    expenseCategories.map(([cat, amt]) => (
                      <div key={cat} className="py-2 flex justify-between">
                        <span className="text-[#17211B]">{cat}</span>
                        <span className="font-semibold text-[#17211B]">{formatCurrency(amt)}</span>
                      </div>
                    ))
                  )}
                  <div className="py-2.5 flex justify-between font-bold text-[#17211B] bg-[#F6FAF7] px-2 rounded-lg">
                    <span>Total Expenses</span>
                    <span className="text-[#B27A17]">{formatCurrency(totalExpense)}</span>
                  </div>
                </div>
              </div>

              {/* Net Profit */}
              <div className="py-3 flex justify-between text-sm font-extrabold text-[#17211B] border-t-2 border-b-4 border-[#17211B] bg-[#F6FAF7] px-3 rounded-md">
                <span>NET PROFIT FOR THE PERIOD</span>
                <span className={netProfit >= 0 ? "text-[#177B55]" : "text-[#B94B4B]"}>
                  {formatCurrency(netProfit)}
                </span>
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
                <p className="text-xs text-[#68756C]">Financial position statement ({fy})</p>
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
                    <span className="text-[#17211B]">Current Period Profit</span>
                    <span className={`font-semibold ${netProfit >= 0 ? "text-[#177B55]" : "text-[#B94B4B]"}`}>
                      {formatCurrency(netProfit)}
                    </span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-[#17211B]">GST Payable</span>
                    <span className="font-semibold text-[#B27A17]">{formatCurrency(totalOutputGST)}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-[#17211B]">TDS Payable</span>
                    <span className="font-semibold text-[#B27A17]">{formatCurrency(tdsPayable)}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-[#17211B]">Employee Payables</span>
                    <span className="font-semibold text-[#B27A17]">{formatCurrency(employeePayablesTotal)}</span>
                  </div>
                  <div className="pt-3 flex justify-between font-extrabold text-sm text-[#17211B] border-t-2 border-[#17211B]">
                    <span>TOTAL EQUITY & LIABILITIES</span>
                    <span>{formatCurrency(netProfit + totalOutputGST + tdsPayable + employeePayablesTotal)}</span>
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
                    <span className="text-[#17211B]">Bank / Cash Balances</span>
                    <span className="font-semibold text-[#17211B]">{formatCurrency(bankBalance)}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-[#17211B]">Accounts Receivable</span>
                    <span className="font-semibold text-[#17211B]">{formatCurrency(totalReceivables)}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-[#17211B]">GST Input Tax Credit</span>
                    <span className="font-semibold text-[#177B55]">{formatCurrency(totalInputGST)}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-[#17211B]">TDS Receivable</span>
                    <span className="font-semibold text-[#386F9E]">{formatCurrency(tdsReceivable)}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-[#17211B]">Fixed Assets Value</span>
                    <span className="font-semibold text-[#17211B]">{formatCurrency(totalAssetsValue)}</span>
                  </div>
                  <div className="pt-3 flex justify-between font-extrabold text-sm text-[#17211B] border-t-2 border-[#17211B]">
                    <span>TOTAL ASSETS</span>
                    <span>{formatCurrency(bankBalance + totalReceivables + totalInputGST + tdsReceivable + totalAssetsValue)}</span>
                  </div>
                </div>
              </div>
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
                <h3 className="text-base font-bold text-[#17211B]">Statement of Cash Flows</h3>
                <p className="text-xs text-[#68756C]">Operating receipts and cash movements</p>
              </div>
              <span className="text-sm font-bold text-[#17211B]">₹</span>
            </div>

            <div className="space-y-6 text-xs">
              <div className="space-y-2.5">
                <span className="font-bold text-[11px] text-[#738078] tracking-wider uppercase block">
                  OPERATING CASH RECEIPTS
                </span>
                <div className="divide-y divide-[#E9EEE9] pl-2">
                  <div className="py-2 flex justify-between">
                    <span className="text-[#17211B]">Customer Collections (Paid Invoices)</span>
                    <span className="font-semibold text-[#177B55]">{formatCurrency(paidInvoicesTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="font-bold text-[11px] text-[#738078] tracking-wider uppercase block">
                  OPERATING CASH PAYMENTS
                </span>
                <div className="divide-y divide-[#E9EEE9] pl-2">
                  <div className="py-2 flex justify-between">
                    <span className="text-[#17211B]">Operating Expense Disbursements (Paid Expenses)</span>
                    <span className="font-semibold text-[#B27A17]">{formatCurrency(paidExpensesTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t-2 border-[#17211B] pt-3">
                <div className="flex justify-between font-bold text-xs text-[#17211B]">
                  <span>NET CASH MOVEMENT</span>
                  <span className={bankBalance >= 0 ? "text-[#177B55]" : "text-[#B94B4B]"}>
                    {formatCurrency(bankBalance)}
                  </span>
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
                <p className="text-xs text-[#68756C]">Output GST, Input Tax Credit and Net Liability</p>
              </div>
              <span className="text-sm font-bold text-[#17211B]">₹</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4">
                <span className="text-[11px] font-semibold text-[#68756C] block">Output CGST</span>
                <strong className="text-xl font-bold text-[#17211B] mt-1 block">{formatCurrency(outputCGST)}</strong>
              </div>
              <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4">
                <span className="text-[11px] font-semibold text-[#68756C] block">Output SGST</span>
                <strong className="text-xl font-bold text-[#17211B] mt-1 block">{formatCurrency(outputSGST)}</strong>
              </div>
              <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4">
                <span className="text-[11px] font-semibold text-[#68756C] block">Output IGST</span>
                <strong className="text-xl font-bold text-[#17211B] mt-1 block">{formatCurrency(outputIGST)}</strong>
              </div>
              <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4">
                <span className="text-[11px] font-semibold text-[#68756C] block">Input GST / ITC</span>
                <strong className="text-xl font-bold text-[#177B55] mt-1 block">{formatCurrency(totalInputGST)}</strong>
              </div>
            </div>

            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden text-xs">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                GST RECONCILIATION SUMMARY
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-[#17211B]">
                  <span>Total Output GST (Invoices)</span>
                  <span className="font-semibold">{formatCurrency(totalOutputGST)}</span>
                </div>
                <div className="flex justify-between text-[#68756C]">
                  <span>Less: Input Tax Credit (Expenses)</span>
                  <span className="font-semibold text-[#177B55]">{formatCurrency(totalInputGST)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-[#17211B] border-t-2 border-[#17211B] pt-3">
                  <span>NET GST {netGSTPayable >= 0 ? "PAYABLE" : "CREDIT BALANCE"}</span>
                  <span className={netGSTPayable >= 0 ? "text-[#B27A17]" : "text-[#177B55]"}>
                    {formatCurrency(Math.abs(netGSTPayable))}
                  </span>
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
                <p className="text-xs text-[#68756C]">TDS Receivable vs Payable summary</p>
              </div>
              <span className="text-sm font-bold text-[#17211B]">₹</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4">
                <span className="text-[11px] font-semibold text-[#68756C] block">TDS Receivable</span>
                <strong className="text-xl font-bold text-[#386F9E] mt-1 block">{formatCurrency(tdsReceivable)}</strong>
              </div>
              <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4">
                <span className="text-[11px] font-semibold text-[#68756C] block">TDS Payable</span>
                <strong className="text-xl font-bold text-[#B27A17] mt-1 block">{formatCurrency(tdsPayable)}</strong>
              </div>
              <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4">
                <span className="text-[11px] font-semibold text-[#68756C] block">Net TDS Position</span>
                <strong className={`text-xl font-bold mt-1 block ${netTDS >= 0 ? "text-[#177B55]" : "text-[#B27A17]"}`}>
                  {netTDS >= 0 ? `${formatCurrency(netTDS)} Receivable` : `${formatCurrency(Math.abs(netTDS))} Payable`}
                </strong>
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
                <p className="text-xs text-[#68756C]">Invoice-level outstanding receivables</p>
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
                    <th className="py-3 px-3 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9EEE9] text-xs">
                  {receivablesList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#68756C]">
                        No outstanding receivables found.
                      </td>
                    </tr>
                  ) : (
                    receivablesList.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#F9FAF8]">
                        <td className="py-3.5 px-3 font-bold text-[#17211B]">
                          {inv.customerNameSnapshot || inv.customer?.legalName || "Customer"}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-[#17211B]">{inv.invoiceNumber}</td>
                        <td className="py-3.5 px-3 text-right font-bold text-[#B27A17]">
                          {formatCurrency(Number(inv.netAmount || 0))}
                        </td>
                        <td className="py-3.5 px-3 text-right font-semibold text-[#68756C]">{inv.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#17211B] font-extrabold text-xs bg-[#F6FAF7]">
                    <td colSpan={2} className="py-3.5 px-3">Total Receivables:</td>
                    <td className="py-3.5 px-3 text-right text-sm text-[#17211B]">{formatCurrency(totalReceivables)}</td>
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
                <h3 className="text-base font-bold text-[#17211B]">Accounts Payable</h3>
                <p className="text-xs text-[#68756C]">Vendor and employee outstanding payables</p>
              </div>
              <span className="text-sm font-bold text-[#17211B]">₹</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[780px]">
                <thead>
                  <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                    <th className="py-3 px-3">PAYEE / VENDOR</th>
                    <th className="py-3 px-3">EXPENSE NO</th>
                    <th className="py-3 px-3">CATEGORY</th>
                    <th className="py-3 px-3 text-right">AMOUNT DUE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9EEE9] text-xs">
                  {payablesList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#68756C]">
                        No outstanding payables found.
                      </td>
                    </tr>
                  ) : (
                    payablesList.map((exp) => (
                      <tr key={exp.id} className="hover:bg-[#F9FAF8]">
                        <td className="py-3.5 px-3 font-bold text-[#17211B]">
                          {exp.vendor?.name || exp.notes || "Vendor / Payee"}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-[#17211B]">{exp.expenseNumber}</td>
                        <td className="py-3.5 px-3 text-[#68756C]">{exp.category?.name || "Operating"}</td>
                        <td className="py-3.5 px-3 text-right font-bold text-[#B27A17]">
                          {formatCurrency(Number(exp.netAmount || 0))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#17211B] font-extrabold text-xs bg-[#F6FAF7]">
                    <td colSpan={3} className="py-3.5 px-3">Total Outstanding Payables:</td>
                    <td className="py-3.5 px-3 text-right text-sm text-[#17211B]">{formatCurrency(totalPayables)}</td>
                  </tr>
                </tfoot>
              </table>
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
                <p className="text-xs text-[#68756C]">Capitalised asset acquisitions</p>
              </div>
              <span className="text-sm font-bold text-[#17211B]">₹</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[780px]">
                <thead>
                  <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                    <th className="py-3 px-3">ASSET DESCRIPTION</th>
                    <th className="py-3 px-3">PURCHASE DATE</th>
                    <th className="py-3 px-3">CATEGORY</th>
                    <th className="py-3 px-3 text-right">NET BOOK VALUE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9EEE9] text-xs">
                  {assetExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#68756C]">
                        No fixed assets recorded.
                      </td>
                    </tr>
                  ) : (
                    assetExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-[#F9FAF8]">
                        <td className="py-3.5 px-3 font-bold text-[#17211B]">
                          {exp.notes || exp.vendor?.name || "Fixed Asset"}
                        </td>
                        <td className="py-3.5 px-3 text-[#68756C]">
                          {new Date(exp.expenseDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-3.5 px-3 text-[#17211B]">{exp.category?.name || "Asset"}</td>
                        <td className="py-3.5 px-3 text-right font-bold text-[#17211B]">
                          {formatCurrency(Number(exp.netAmount || 0))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#17211B] font-extrabold text-xs bg-[#F6FAF7]">
                    <td colSpan={3} className="py-3.5 px-3">Total Fixed Assets:</td>
                    <td className="py-3.5 px-3 text-right text-sm text-[#17211B]">{formatCurrency(totalAssetsValue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
