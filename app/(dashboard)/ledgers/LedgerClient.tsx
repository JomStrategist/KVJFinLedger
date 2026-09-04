"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AccountDescriptor, LedgerStatement } from "@/services/ledger.service";

interface Props {
  accountList: AccountDescriptor[];
  initialStatement: LedgerStatement | null;
  selectedAccountId: string;
  initialFromDate: string;
  initialToDate: string;
}

export default function LedgerClient({
  accountList,
  initialStatement,
  selectedAccountId,
  initialFromDate,
  initialToDate,
}: Props) {
  const router = useRouter();

  const [accountId, setAccountId] = useState(selectedAccountId);
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);

  const [isPending, startTransition] = React.useTransition();

  const handleAccountChange = (newAccId: string) => {
    setAccountId(newAccId);
    navigate(newAccId, fromDate, toDate);
  };

  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(accountId, fromDate, toDate);
  };

  const navigate = (accId: string, from: string, to: string) => {
    const query = new URLSearchParams();
    if (accId) query.set("accountId", accId);
    if (from) query.set("fromDate", from);
    if (to) query.set("toDate", to);
    startTransition(() => {
      router.push(`/ledgers?${query.toString()}`);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!initialStatement) return;
    const rows = [
      ["Date", "Voucher Type", "Voucher No", "Particulars", "Debit (Dr)", "Credit (Cr)", "Running Balance", "Type"],
      ["", "Opening Balance", "", "", "", "", initialStatement.openingBalance, initialStatement.openingBalanceType],
      ...initialStatement.entries.map(e => [
        new Date(e.date).toLocaleDateString("en-IN"),
        e.voucherType,
        e.voucherNo,
        `"${e.particulars}"`,
        e.debit,
        e.credit,
        e.runningBalance,
        e.balanceType
      ]),
      ["", "Closing Balance", "", "", initialStatement.totalDebit, initialStatement.totalCredit, initialStatement.closingBalance, initialStatement.closingBalanceType]
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Ledger_${initialStatement.account.name.replace(/[^a-zA-Z0-9]/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Group account list by Account Category
  const groupedAccounts = accountList.reduce((acc, account) => {
    const grp = account.group;
    if (!acc[grp]) acc[grp] = [];
    acc[grp].push(account);
    return acc;
  }, {} as Record<string, AccountDescriptor[]>);

  const statement = initialStatement;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 rounded-2xl shadow-lg border border-slate-200/80 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Ledgers & General Ledger Statement</h1>
            <span className="bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30 shadow-xs">
              Chartered Accountant Format
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Official account ledger statement showing opening balances, chronological entries, debits, credits, and running balances.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl border border-slate-300/80 transition-all shadow-xs"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-4 py-2.5 rounded-xl shadow-md transition-all scale-[1.02]"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Ledger
          </button>
        </div>
      </div>

      {/* Account Selector & Date Filter Panel */}
      <div className="glass-card p-5 rounded-2xl shadow-md border border-slate-200/80 space-y-4 print:hidden">
        <form onSubmit={handleDateSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Account Selector */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Select Account Ledger
            </label>
            <select
              value={accountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
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
              className="w-full bg-slate-50/80 border border-slate-200/90 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none font-medium"
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
                className="w-full bg-slate-50/80 border border-slate-200/90 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none font-medium"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs shrink-0"
              >
                Apply
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Account Info & Summary Cards */}
      {statement && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
            <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Opening Balance</div>
              <div className="text-2xl font-black font-tabular text-slate-900 mt-1 tracking-tight">
                {formatCurrency(statement.openingBalance)}
                <span className="text-xs font-bold ml-1.5 text-slate-500">[{statement.openingBalanceType}]</span>
              </div>
            </div>

            <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Debit (Dr)</div>
              <div className="text-2xl font-black font-tabular text-emerald-600 mt-1 tracking-tight">
                {formatCurrency(statement.totalDebit)}
              </div>
            </div>

            <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Credit (Cr)</div>
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
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6 print:border-none print:shadow-none print:p-0">
            {/* Printable Statement Header */}
            <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{statement.account.name}</h2>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">
                  Group: <span className="text-slate-800">{statement.account.group}</span> | Normal Balance: <span className="text-slate-800">{statement.account.normalBalance}</span>
                </div>
                {(statement.account.gstin || statement.account.pan) && (
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">
                    {statement.account.gstin && <span>GSTIN: <strong className="text-slate-800 font-mono">{statement.account.gstin}</strong> </span>}
                    {statement.account.pan && <span className="ml-2">PAN: <strong className="text-slate-800 font-mono">{statement.account.pan}</strong></span>}
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="text-sm font-extrabold text-emerald-800 uppercase">Account Ledger Statement</div>
                <div className="text-xs font-medium text-slate-500">
                  Period: {new Date(statement.fromDate).toLocaleDateString("en-IN")} – {new Date(statement.toDate).toLocaleDateString("en-IN")}
                </div>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-y border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Voucher Type</th>
                    <th className="px-3 py-2.5">Voucher No.</th>
                    <th className="px-3 py-2.5">Particulars / Details</th>
                    <th className="px-3 py-2.5 text-right">Debit (Dr - ₹)</th>
                    <th className="px-3 py-2.5 text-right">Credit (Cr - ₹)</th>
                    <th className="px-3 py-2.5 text-right">Running Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {/* Opening Balance Row */}
                  <tr className="bg-slate-50 font-bold text-slate-800 font-sans">
                    <td className="px-3 py-2.5 font-mono">{new Date(statement.fromDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-3 py-2.5">Opening Entry</td>
                    <td className="px-3 py-2.5 font-mono text-slate-400">—</td>
                    <td className="px-3 py-2.5">To Opening Balance b/f</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-400">—</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-400">—</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(statement.openingBalance)} [{statement.openingBalanceType}]
                    </td>
                  </tr>

                  {/* Transaction Rows */}
                  {statement.entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-400 font-sans italic">
                        No financial transactions recorded for this account during the selected period.
                      </td>
                    </tr>
                  ) : (
                    statement.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50 font-sans">
                        <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-600">
                          {new Date(entry.date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-700 whitespace-nowrap">
                          {entry.voucherType}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
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
                        <td className="px-3 py-2.5 text-slate-800 max-w-xs truncate">
                          {entry.particulars}
                          {entry.reference && <span className="text-[11px] text-slate-400 ml-1">({entry.reference})</span>}
                        </td>
                        <td className={`px-3 py-2.5 text-right font-mono ${entry.debit > 0 ? "font-bold text-emerald-700" : "text-slate-300"}`}>
                          {entry.debit > 0 ? formatCurrency(entry.debit) : "—"}
                        </td>
                        <td className={`px-3 py-2.5 text-right font-mono ${entry.credit > 0 ? "font-bold text-rose-700" : "text-slate-300"}`}>
                          {entry.credit > 0 ? formatCurrency(entry.credit) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(entry.runningBalance)} <span className="text-[11px] font-semibold text-slate-500">[{entry.balanceType}]</span>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Closing Balance Row */}
                  <tr className="bg-slate-100 font-bold text-slate-900 font-sans border-t-2 border-slate-300">
                    <td className="px-3 py-3 font-mono">{new Date(statement.toDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-3 py-3">Closing Summary</td>
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
  );
}
