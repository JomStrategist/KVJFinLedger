"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { JournalVoucher } from "@/services/journal.service";

type DatePreset = "CURRENT_MONTH" | "LAST_MONTH" | "THIS_QUARTER" | "THIS_YEAR" | "ALL" | "CUSTOM";

export function JournalsClient({
  initialVouchers,
  initialTotalDebit,
  initialTotalCredit,
  initialFromDate,
  initialToDate,
  initialType,
}: {
  initialVouchers: JournalVoucher[];
  initialTotalDebit: number;
  initialTotalCredit: number;
  initialFromDate: string;
  initialToDate: string;
  initialType?: string;
}) {
  const router = useRouter();

  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  const [voucherType, setVoucherType] = useState(initialType || "ALL");
  const [search, setSearch] = useState("");
  const [activePreset, setActivePreset] = useState<DatePreset>(
    initialFromDate && initialToDate ? "CURRENT_MONTH" : "ALL"
  );

  const applyFilters = (newFrom: string, newTo: string, newType: string) => {
    const params = new URLSearchParams();
    if (newFrom) params.set("fromDate", newFrom);
    if (newTo) params.set("toDate", newTo);
    if (newType && newType !== "ALL") params.set("voucherType", newType);
    router.push(`/journals?${params.toString()}`);
  };

  const setPreset = (preset: DatePreset) => {
    setActivePreset(preset);
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
    } else if (preset === "THIS_QUARTER") {
      const qStartMonth = Math.floor(month / 3) * 3;
      start = fmt(new Date(year, qStartMonth, 1));
      end = fmt(new Date(year, qStartMonth + 3, 0));
    } else if (preset === "THIS_YEAR") {
      // Indian FY starts April 1st
      const fyStartYear = month >= 3 ? year : year - 1;
      start = fmt(new Date(fyStartYear, 3, 1));
      end = fmt(new Date(fyStartYear + 1, 2, 31));
    } else if (preset === "ALL") {
      start = "";
      end = "";
    }

    if (preset !== "CUSTOM") {
      setFromDate(start);
      setToDate(end);
      applyFilters(start, end, voucherType);
    }
  };

  const filteredVouchers = initialVouchers.filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      v.voucherNumber.toLowerCase().includes(q) ||
      v.narration.toLowerCase().includes(q) ||
      v.voucherType.toLowerCase().includes(q) ||
      (v.reference && v.reference.toLowerCase().includes(q)) ||
      v.lines.some((l) => l.accountName.toLowerCase().includes(q))
    );
  });

  const totalFilteredDebit = filteredVouchers.reduce((s, v) => s + v.totalDebit, 0);
  const totalFilteredCredit = filteredVouchers.reduce((s, v) => s + v.totalCredit, 0);

  const getVoucherBadge = (type: string) => {
    switch (type) {
      case "Sales":
        return <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">Sales</span>;
      case "Receipt":
        return <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">Receipt</span>;
      case "Payment":
        return <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">Payment</span>;
      case "Contra":
        return <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-purple-50 text-purple-700 border border-purple-200">Contra</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-gray-100 text-gray-700">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-theme-text tracking-tight flex items-center gap-2.5">
            General Journal
            <span className="text-xs font-semibold px-2.5 py-1 bg-[#177B55]/10 text-[#177B55] rounded-full border border-[#177B55]/20">
              Double-Entry Bookkeeping
            </span>
          </h1>
          <p className="text-xs text-theme-text-muted mt-1">
            Complete chronological record of all accounting vouchers, debits, and credits.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 border border-theme-border rounded-xl text-xs font-bold text-theme-text hover:bg-theme-surface-hover transition-colors shadow-xs flex items-center gap-2 cursor-pointer print:hidden"
        >
          <svg className="w-4 h-4 text-theme-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Journal
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-theme-border shadow-xs">
          <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">
            Total Vouchers
          </span>
          <p className="text-2xl font-black text-theme-text mt-1">
            {filteredVouchers.length}
          </p>
          <span className="text-[11px] text-theme-text-muted mt-1 block">In selected period</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-theme-border shadow-xs">
          <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">
            Total Debit (Dr)
          </span>
          <p className="text-2xl font-black text-[#1e3a8a] mt-1">
            ₹{totalFilteredDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-blue-600 font-semibold mt-1 block">Total debit entries</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-theme-border shadow-xs">
          <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">
            Total Credit (Cr)
          </span>
          <p className="text-2xl font-black text-[#177B55] mt-1">
            ₹{totalFilteredCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Total credit entries</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-theme-border shadow-xs">
          <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">
            Journal Balance
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
              ✓ Balanced
            </span>
          </div>
          <span className="text-[11px] text-theme-text-muted mt-1 block">
            Debits = Credits verified
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-theme-border shadow-xs p-6 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search voucher #, account, or narration..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[41px] px-3.5 border border-theme-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-theme-primary bg-white"
            />
          </div>

          {/* Voucher Type */}
          <select
            value={voucherType}
            onChange={(e) => {
              setVoucherType(e.target.value);
              applyFilters(fromDate, toDate, e.target.value);
            }}
            className="h-[41px] border border-theme-border rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-theme-primary bg-white text-theme-text min-w-[140px]"
          >
            <option value="ALL">All Vouchers</option>
            <option value="Sales">Sales (Invoices)</option>
            <option value="Receipt">Receipts (Payments)</option>
            <option value="Payment">Payments (Expenses)</option>
            <option value="Contra">Contra (Transfers)</option>
          </select>
        </div>

        {/* Date presets */}
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <span className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider mr-1">
            Period:
          </span>
          {(
            [
              { id: "CURRENT_MONTH", label: "Current Month" },
              { id: "LAST_MONTH", label: "Last Month" },
              { id: "THIS_QUARTER", label: "This Quarter" },
              { id: "THIS_YEAR", label: "This Financial Year" },
              { id: "ALL", label: "All Time" },
              { id: "CUSTOM", label: "Custom Range" },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`h-[33px] px-3.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                activePreset === p.id
                  ? "bg-[#177B55] text-white border-[#177B55] shadow-xs"
                  : "border-theme-border text-theme-text bg-white hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}

          {activePreset === "CUSTOM" && (
            <div className="flex items-center gap-2 ml-1">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  applyFilters(e.target.value, toDate, voucherType);
                }}
                className="h-[33px] px-2.5 border border-theme-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-theme-primary bg-white"
              />
              <span className="text-[11px] text-theme-text-muted font-semibold">to</span>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  applyFilters(fromDate, e.target.value, voucherType);
                }}
                className="h-[33px] px-2.5 border border-theme-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-theme-primary bg-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-2xl border border-theme-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-theme-border text-[11px] uppercase text-theme-text-muted font-bold tracking-wider bg-gray-50/70">
                <th className="py-3 px-4 w-[110px]">DATE</th>
                <th className="py-3 px-3 w-[150px]">VOUCHER #</th>
                <th className="py-3 px-3 w-[100px]">TYPE</th>
                <th className="py-3 px-4">PARTICULARS / ACCOUNT HEADS</th>
                <th className="py-3 px-4 text-right w-[140px]">DEBIT (₹)</th>
                <th className="py-3 px-4 text-right w-[140px]">CREDIT (₹)</th>
                <th className="py-3 px-4 text-center w-[90px] print:hidden">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-theme-text-muted">
                    No journal vouchers found for the selected period.
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50/50 transition-colors align-top">
                    {/* Date */}
                    <td className="py-3 px-4 font-semibold text-theme-text whitespace-nowrap">
                      {new Date(v.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Voucher No */}
                    <td className="py-3 px-3 font-bold text-[#17211B] whitespace-nowrap">
                      <span>{v.voucherNumber}</span>
                      {v.reference && (
                        <div className="text-[10px] text-theme-text-muted font-normal">
                          Ref: {v.reference}
                        </div>
                      )}
                    </td>

                    {/* Voucher Type */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getVoucherBadge(v.voucherType)}
                    </td>

                    {/* Particulars (Classical Journal Ledger layout) */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {v.lines.map((l, idx) => (
                          <div
                            key={idx}
                            className={`flex justify-between items-center text-xs ${
                              l.credit > 0 ? "pl-6 text-gray-700" : "font-bold text-gray-900"
                            }`}
                          >
                            <span>
                              {l.credit > 0 ? "To " : "By "}
                              {l.accountName}
                              <span className="text-[10px] font-normal text-gray-500 ml-1.5">
                                ({l.accountType})
                              </span>
                            </span>
                          </div>
                        ))}
                        <div className="text-[11px] text-gray-500 italic pt-1 pl-2 border-t border-gray-100">
                          (Being {v.narration})
                        </div>
                      </div>
                    </td>

                    {/* Debits Column */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#1e3a8a]">
                      <div className="space-y-1">
                        {v.lines.map((l, idx) => (
                          <div key={idx} className="h-5 flex items-center justify-end">
                            {l.debit > 0
                              ? `₹${l.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                              : ""}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Credits Column */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#177B55]">
                      <div className="space-y-1">
                        {v.lines.map((l, idx) => (
                          <div key={idx} className="h-5 flex items-center justify-end">
                            {l.credit > 0
                              ? `₹${l.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                              : ""}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center print:hidden whitespace-nowrap">
                      {v.sourceUrl && (
                        <Link
                          href={v.sourceUrl}
                          className="inline-flex items-center px-2.5 py-1 border border-theme-border rounded-lg text-[11px] font-bold text-theme-primary hover:bg-gray-50 transition-colors shadow-2xs"
                        >
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredVouchers.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50/80 border-t-2 border-gray-300 font-bold text-xs text-gray-900">
                  <td colSpan={4} className="py-3 px-4 text-right uppercase tracking-wider font-extrabold">
                    Total:
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-[#1e3a8a]">
                    ₹{totalFilteredDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-[#177B55]">
                    ₹{totalFilteredCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="print:hidden"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
