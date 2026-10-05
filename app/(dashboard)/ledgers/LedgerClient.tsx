"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { AccountDescriptor, LedgerStatement } from "@/services/ledger.service";
import { formatCurrency } from "@/lib/utils/currency";

interface Props {
  accountList: AccountDescriptor[];
  initialStatement: LedgerStatement | null;
  selectedAccountId: string;
  initialFromDate: string;
  initialToDate: string;
}

type ViewMode = "CARDS" | "STATEMENT";
type CategoryFilter = "ALL" | "BANK_CASH" | "DEBTORS" | "CREDITORS" | "TAXES" | "CAPITAL" | "INCOME" | "EXPENSE";

export default function LedgerClient({
  accountList,
  initialStatement,
  selectedAccountId,
  initialFromDate,
  initialToDate,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("STATEMENT");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [accountId, setAccountId] = useState(selectedAccountId);
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);

  const [statement, setStatement] = useState<LedgerStatement | null>(initialStatement);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatement = async (accId: string, from: string, to: string) => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (accId) query.set("accountId", accId);
      if (from) query.set("fromDate", from);
      if (to) query.set("toDate", to);

      window.history.replaceState(null, "", `/ledgers?${query.toString()}`);

      const res = await fetch(`/api/ledgers/statement?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStatement(data);
      }
    } catch (err) {
      console.error("Failed to fetch ledger statement:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountSelect = (newAccId: string) => {
    setAccountId(newAccId);
    setViewMode("STATEMENT");
    fetchStatement(newAccId, fromDate, toDate);
  };

  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStatement(accountId, fromDate, toDate);
  };

  const handleQuickPeriod = (preset: "CURRENT_MONTH" | "LAST_MONTH" | "THIS_FY" | "ALL") => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    let start = "";
    let end = "";

    if (preset === "CURRENT_MONTH") {
      start = fmt(new Date(year, month, 1));
      end = fmt(new Date(year, month + 1, 0));
    } else if (preset === "LAST_MONTH") {
      start = fmt(new Date(year, month - 1, 1));
      end = fmt(new Date(year, month, 0));
    } else if (preset === "THIS_FY") {
      const fyStartYear = month >= 3 ? year : year - 1;
      start = fmt(new Date(fyStartYear, 3, 1));
      end = fmt(new Date(fyStartYear + 1, 2, 31));
    } else if (preset === "ALL") {
      start = "";
      end = "";
    }

    setFromDate(start);
    setToDate(end);
    fetchStatement(accountId, start, end);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!statement) return;
    const rows = [
      ["Date", "Voucher No", "Particulars", "Debit (Dr)", "Credit (Cr)", "Running Balance", "Type"],
      ["", "", "To Opening Balance b/f", "", "", statement.openingBalance, statement.openingBalanceType],
      ...statement.entries.map((e) => [
        new Date(e.date).toLocaleDateString("en-IN"),
        e.voucherNo,
        `"${e.particulars}"`,
        e.debit,
        e.credit,
        e.runningBalance,
        e.balanceType,
      ]),
      ["", "", "Closing Balance c/d", statement.totalDebit, statement.totalCredit, statement.closingBalance, statement.closingBalanceType],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Ledger_${statement.account.name.replace(/[^a-zA-Z0-9]/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group accounts by category
  const groupedAccounts = useMemo(() => {
    return accountList.reduce((acc, account) => {
      const grp = account.group;
      if (!acc[grp]) acc[grp] = [];
      acc[grp].push(account);
      return acc;
    }, {} as Record<string, AccountDescriptor[]>);
  }, [accountList]);

  // Filtered accounts for Card View
  const filteredAccounts = useMemo(() => {
    return accountList.filter((acc) => {
      const matchesSearch =
        acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.group.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (acc.gstin && acc.gstin.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (acc.pan && acc.pan.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedCategory === "ALL") return true;
      if (selectedCategory === "BANK_CASH") return acc.type === "BANK" || acc.type === "CASH";
      if (selectedCategory === "DEBTORS") return acc.type === "CUSTOMER";
      if (selectedCategory === "CREDITORS") return acc.type === "VENDOR";
      if (selectedCategory === "TAXES") return acc.type === "STATUTORY_GST" || acc.type === "STATUTORY_TDS";
      if (selectedCategory === "CAPITAL") return acc.type === "CAPITAL" || acc.type === "FIXED_ASSET";
      if (selectedCategory === "INCOME") return acc.type === "INCOME_CATEGORY";
      if (selectedCategory === "EXPENSE") return acc.type === "EXPENSE_CATEGORY";
      return true;
    });
  }, [accountList, searchQuery, selectedCategory]);

  // Quick summary numbers
  const totalDebtors = useMemo(() => {
    return accountList
      .filter((a) => a.type === "CUSTOMER")
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  }, [accountList]);

  const totalCreditors = useMemo(() => {
    return accountList
      .filter((a) => a.type === "VENDOR")
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  }, [accountList]);

  const totalDrawings = useMemo(() => {
    const d = accountList.find((a) => a.id === "eq_drawings");
    return d?.currentBalance || 0;
  }, [accountList]);

  const totalLiquidCash = useMemo(() => {
    return accountList
      .filter((a) => a.type === "BANK" || a.type === "CASH")
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  }, [accountList]);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Account Ledgers & Statements</h1>
            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
              Double-Entry Compliant
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Schedule III statement view, running balances, and Dr / Cr ledger transactions.
          </p>
        </div>

        {/* View Mode Toggle Pill & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode("STATEMENT")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "STATEMENT"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Statement View
            </button>
            <button
              onClick={() => setViewMode("CARDS")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "CARDS"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Accounts Grid
            </button>
          </div>

          {viewMode === "STATEMENT" && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
              >
                CSV
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#0D7A53] hover:bg-[#09593C] px-3.5 py-1.5 rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                Print
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CARD GRID VIEW MODE */}
      {/* ========================================================================= */}
      {viewMode === "CARDS" && (
        <div className="space-y-6">
          {/* Quick Summary KPI Cards - Only in Grid Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
            <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Sundry Debtors (Receivables)</div>
              <div className="text-2xl font-black font-tabular text-emerald-600 mt-1 tracking-tight">
                {formatCurrency(totalDebtors)}
                <span className="text-xs font-bold ml-1.5 text-slate-500">[Dr]</span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Sundry Creditors (Payables)</div>
              <div className="text-2xl font-black font-tabular text-rose-600 mt-1 tracking-tight">
                {formatCurrency(totalCreditors)}
                <span className="text-xs font-bold ml-1.5 text-slate-500">[Cr]</span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Liquid Cash & Bank</div>
              <div className="text-2xl font-black font-tabular text-slate-900 mt-1 tracking-tight">
                {formatCurrency(totalLiquidCash)}
                <span className="text-xs font-bold ml-1.5 text-slate-500">[Dr]</span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Owner Drawings / Withdrawals</div>
              <div className="text-2xl font-black font-tabular text-amber-600 mt-1 tracking-tight">
                {formatCurrency(totalDrawings)}
                <span className="text-xs font-bold ml-1.5 text-slate-500">[Dr]</span>
              </div>
            </div>
          </div>

          {/* Filter Pills & Search Bar */}
          <div className="glass-card p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              {[
                { id: "ALL", label: "All Accounts" },
                { id: "BANK_CASH", label: "Cash & Bank" },
                { id: "DEBTORS", label: "Customers (Debtors)" },
                { id: "CREDITORS", label: "Vendors (Creditors)" },
                { id: "TAXES", label: "Duties & Taxes" },
                { id: "CAPITAL", label: "Capital & Assets" },
                { id: "INCOME", label: "Incomes" },
                { id: "EXPENSE", label: "Expenses" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id as CategoryFilter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedCategory === tab.id
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Quick Search */}
            <div className="w-full md:w-64 relative">
              <input
                type="text"
                placeholder="Search account name, GSTIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50/90 border border-slate-200 rounded-xl px-3.5 py-2 pl-9 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAccounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-white hover:bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {acc.group}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        acc.currentBalanceType === "Dr"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {acc.currentBalanceType === "Dr" ? "Debit (Dr)" : "Credit (Cr)"}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mt-2.5 line-clamp-2 group-hover:text-emerald-700 transition-colors leading-snug">
                    {acc.name}
                  </h3>

                  {(acc.gstin || acc.pan) && (
                    <div className="text-[11px] font-mono text-slate-500 mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      {acc.gstin && <span>GSTIN: <strong className="text-slate-700">{acc.gstin}</strong></span>}
                      {acc.pan && <span>PAN: <strong className="text-slate-700">{acc.pan}</strong></span>}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Current Balance</div>
                    <div className="text-lg font-black font-tabular text-slate-900">
                      {formatCurrency(acc.currentBalance || 0)}
                      <span className="text-xs font-bold text-slate-500 ml-1">[{acc.currentBalanceType}]</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAccountSelect(acc.id)}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl transition-all"
                  >
                    View Statement
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATEMENT VIEW MODE */}
      {/* ========================================================================= */}
      {viewMode === "STATEMENT" && (
        <div className="space-y-6">
          {/* Account Selector & Date Filter Panel */}
          <div className="bg-white p-5 rounded-2xl shadow-2xs border border-slate-200/90 space-y-4 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700">Quick Period Presets:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: "This Month", key: "CURRENT_MONTH" as const },
                  { label: "Last Month", key: "LAST_MONTH" as const },
                  { label: "Current FY", key: "THIS_FY" as const },
                  { label: "All Records", key: "ALL" as const },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handleQuickPeriod(preset.key)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-[#0D7A53] hover:text-white transition-all cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleDateSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Account Selector */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Select Account Ledger
                </label>
                <select
                  value={accountId}
                  onChange={(e) => {
                    setAccountId(e.target.value);
                    fetchStatement(e.target.value, fromDate, toDate);
                  }}
                  className="w-full bg-slate-50/80 border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#0D7A53] focus:bg-white transition-all outline-none"
                >
                  {Object.entries(groupedAccounts).map(([groupName, accs]) => (
                    <optgroup key={groupName} label={`── ${groupName.toUpperCase()} ──`}>
                      {accs.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.normalBalance === "DEBIT" ? "Dr" : "Cr"})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* From Date */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200/90 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#0D7A53] focus:bg-white transition-all outline-none font-medium"
                />
              </div>

              {/* To Date & Filter Action */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  To Date
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200/90 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#0D7A53] focus:bg-white transition-all outline-none font-medium"
                  />
                  <button
                    type="submit"
                    className="bg-[#0D7A53] hover:bg-[#09593C] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Statement Sheet */}
          {statement && (
            <div className={`space-y-6 transition-opacity duration-200 ${isLoading ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
              {/* Account Statement Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Opening Balance</div>
                  <div className="text-2xl font-black font-tabular text-slate-900 mt-1 tracking-tight">
                    {formatCurrency(statement.openingBalance)}
                    <span className="text-xs font-bold ml-1.5 text-slate-500">[{statement.openingBalanceType}]</span>
                  </div>
                </div>

                <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Period Debit (Dr)</div>
                  <div className="text-2xl font-black font-tabular text-emerald-600 mt-1 tracking-tight">
                    {formatCurrency(statement.totalDebit)}
                  </div>
                </div>

                <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Period Credit (Cr)</div>
                  <div className="text-2xl font-black font-tabular text-rose-600 mt-1 tracking-tight">
                    {formatCurrency(statement.totalCredit)}
                  </div>
                </div>

                <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Closing Net Balance</div>
                  <div className="text-2xl font-black font-tabular text-slate-900 mt-1 tracking-tight">
                    {formatCurrency(statement.closingBalance)}
                    <span className="text-xs font-bold ml-1.5 text-slate-600">[{statement.closingBalanceType}]</span>
                  </div>
                </div>
              </div>

              {/* CA-Standard Account Ledger Statement Sheet */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6 print:border-none print:shadow-none print:p-0">
                {/* Printable Statement Header */}
                <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{statement.account.name}</h2>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">
                      Group: <span className="text-slate-800">{statement.account.group}</span> | Normal Balance:{" "}
                      <span className="text-slate-800">{statement.account.normalBalance}</span>
                    </div>
                    {(statement.account.gstin || statement.account.pan) && (
                      <div className="text-xs font-semibold text-slate-500 mt-0.5">
                        {statement.account.gstin && (
                          <span>
                            GSTIN: <strong className="text-slate-800 font-mono">{statement.account.gstin}</strong>{" "}
                          </span>
                        )}
                        {statement.account.pan && (
                          <span className="ml-2">
                            PAN: <strong className="text-slate-800 font-mono">{statement.account.pan}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-extrabold text-emerald-800 uppercase tracking-tight">Account Ledger Statement</div>
                    <div className="text-xs font-medium text-slate-500">
                      Period: {new Date(statement.fromDate).toLocaleDateString("en-IN")} –{" "}
                      {new Date(statement.toDate).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                </div>

                {/* Ledger Transactions Table (VOUCHER TYPE REMOVED AS REQUESTED) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-y border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Voucher / Ref No.</th>
                        <th className="px-3 py-2.5">Particulars / Transaction Details</th>
                        <th className="px-3 py-2.5 text-right">Debit (Dr - ₹)</th>
                        <th className="px-3 py-2.5 text-right">Credit (Cr - ₹)</th>
                        <th className="px-3 py-2.5 text-right">Running Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {/* Opening Balance Row */}
                      <tr className="bg-slate-50/80 font-bold text-slate-800 font-sans">
                        <td className="px-3 py-2.5 font-mono text-slate-600">{new Date(statement.fromDate).toLocaleDateString("en-IN")}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-400">—</td>
                        <td className="px-3 py-2.5 text-slate-700">To Opening Balance b/f</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-400">—</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-400">—</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(statement.openingBalance)} [{statement.openingBalanceType}]
                        </td>
                      </tr>

                      {/* Transaction Rows */}
                      {statement.entries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-slate-400 font-sans italic">
                            No financial transactions recorded for this account during the selected period.
                          </td>
                        </tr>
                      ) : (
                        statement.entries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50 font-sans transition-colors">
                            <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-600">
                              {new Date(entry.date).toLocaleDateString("en-IN")}
                            </td>
                            <td className="px-3 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                              <Link
                                href={
                                  entry.sourceType === "TAX_INVOICE"
                                    ? `/invoices/${entry.sourceId}`
                                    : entry.sourceType === "EXPENSE"
                                    ? `/expenses/${entry.sourceId}`
                                    : "#"
                                }
                                className="text-emerald-700 hover:underline"
                              >
                                {entry.voucherNo}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5 text-slate-800">
                              <div className="font-medium text-slate-900">{entry.particulars}</div>
                              {entry.reference && (
                                <span className="text-[11px] text-slate-400 font-mono">Ref: {entry.reference}</span>
                              )}
                            </td>
                            <td className={`px-3 py-2.5 text-right font-mono ${entry.debit > 0 ? "font-bold text-emerald-700" : "text-slate-300"}`}>
                              {entry.debit > 0 ? formatCurrency(entry.debit) : "—"}
                            </td>
                            <td className={`px-3 py-2.5 text-right font-mono ${entry.credit > 0 ? "font-bold text-rose-700" : "text-slate-300"}`}>
                              {entry.credit > 0 ? formatCurrency(entry.credit) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              {formatCurrency(entry.runningBalance)}{" "}
                              <span className="text-[11px] font-semibold text-slate-500">[{entry.balanceType}]</span>
                            </td>
                          </tr>
                        ))
                      )}

                      {/* Closing Balance Row */}
                      <tr className="bg-slate-100/90 font-bold text-slate-900 font-sans border-t-2 border-slate-300">
                        <td className="px-3 py-3 font-mono">{new Date(statement.toDate).toLocaleDateString("en-IN")}</td>
                        <td className="px-3 py-3 font-mono text-slate-400">—</td>
                        <td className="px-3 py-3 font-bold">Total Period Movement & Closing Balance c/d</td>
                        <td className="px-3 py-3 text-right font-mono text-emerald-800">{formatCurrency(statement.totalDebit)}</td>
                        <td className="px-3 py-3 text-right font-mono text-rose-800">{formatCurrency(statement.totalCredit)}</td>
                        <td className="px-3 py-3 text-right font-mono text-base font-extrabold text-slate-900">
                          {formatCurrency(statement.closingBalance)} [{statement.closingBalanceType}]
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
