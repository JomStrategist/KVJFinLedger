"use client";

import { useState } from "react";
import { BankTransferModal } from "./BankTransferModal";
import { useRouter } from "next/navigation";

export function BankTransfersClient({
  initialTransfers = [],
  bankAccounts = [],
}: {
  initialTransfers: any[];
  bankAccounts?: any[];
}) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "TRANSFER" | "DRAWINGS" | "CASH">("ALL");

  const handleOpenAdd = () => {
    setSelectedTransfer(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (transfer: any) => {
    setSelectedTransfer(transfer);
    setIsModalOpen(true);
  };

  const filteredTransfers = initialTransfers.filter((item) => {
    const isDrawing = item.toAccount?.includes("Drawings");
    const isCash = item.toAccount?.includes("Cash in Hand");
    
    if (filterType === "DRAWINGS" && !isDrawing) return false;
    if (filterType === "CASH" && !isCash) return false;
    if (filterType === "TRANSFER" && (isDrawing || isCash)) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.fromAccount?.toLowerCase().includes(q) ||
      item.toAccount?.toLowerCase().includes(q) ||
      item.reference?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q)
    );
  });

  const totalTransferred = initialTransfers.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const totalDrawings = initialTransfers.filter(it => it.toAccount?.includes("Drawings")).reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Banking &amp; Withdrawals
            <span className="text-xs font-bold bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              CA Double-Entry
            </span>
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">
            Manage inter-bank fund movements, owner capital drawings, and petty cash withdrawals.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm transition-all gap-1.5 shrink-0"
        >
          <span>+</span> Record Transfer / Withdrawal
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4.5 space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Fund Movement</span>
          <p className="text-xl font-black text-slate-900 font-mono font-tabular">
            ₹{totalTransferred.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">Recorded movements</span>
        </div>

        <div className="glass-card p-4.5 space-y-1 border-purple-200 bg-purple-50/20">
          <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Owner / Director Drawings</span>
          <p className="text-xl font-black text-purple-900 font-mono font-tabular">
            ₹{totalDrawings.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-purple-700 font-medium">Deducted from Owner Equity</span>
        </div>

        <div className="glass-card p-4.5 space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Bank Accounts</span>
          <p className="text-xl font-black text-slate-900 font-mono font-tabular">
            {bankAccounts.length || 1} Accounts
          </p>
          <span className="text-[10px] text-emerald-700 font-medium">● Connected &amp; Reconciled</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: "ALL", label: "All Movements" },
            { id: "TRANSFER", label: "🔄 Inter-Bank" },
            { id: "DRAWINGS", label: "👤 Owner Drawings" },
            { id: "CASH", label: "💵 Petty Cash (ATM)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterType === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64 relative">
          <input
            type="text"
            placeholder="Search accounts, ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8.5 bg-white border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
          />
        </div>
      </div>

      {/* Main Table Container */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] uppercase text-slate-500 font-bold tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">From Account</th>
                <th className="py-3 px-4">To / Beneficiary</th>
                <th className="py-3 px-4 text-center">Type</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Narration</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    No transactions found. Click &quot;+ Record Transfer / Withdrawal&quot; to add.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((item) => {
                  const dateStr = new Date(item.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const amt = Number(item.amount);
                  const isDrawing = item.toAccount?.includes("Drawings");
                  const isCash = item.toAccount?.includes("Cash in Hand");

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 text-slate-800 font-semibold whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {item.fromAccount}
                      </td>
                      <td className="py-3.5 px-4 text-slate-900 font-bold">
                        {item.toAccount}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isDrawing ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-800 border border-purple-200">
                            Drawings
                          </span>
                        ) : isCash ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                            Cash Contra
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Transfer
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 font-mono font-tabular text-sm">
                        ₹{amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {item.reference || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {item.description || "—"}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <BankTransferModal
          transfer={selectedTransfer}
          bankAccounts={bankAccounts}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}

