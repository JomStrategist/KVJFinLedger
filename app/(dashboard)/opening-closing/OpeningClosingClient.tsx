"use client";

import { useState, useTransition } from "react";
import { formatCurrency } from "@/lib/utils/currency";
import { saveOpeningBalanceAction, deleteOpeningBalanceAction } from "./actions";

interface OpeningItem {
  id: string;
  position: string;
  amount: number;
  type: "Asset" | "Liability";
}

export function OpeningClosingClient({
  initialBalances = [],
}: {
  initialBalances?: any[];
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [financialYear, setFinancialYear] = useState("FY 2026–27");
  const [newPosition, setNewPosition] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<"Asset" | "Liability">("Asset");

  const formattedInitialBalances: OpeningItem[] = initialBalances.map((b) => ({
    id: b.id,
    position: b.position,
    amount: Number(b.amount || 0),
    type: (b.type as "Asset" | "Liability") || "Asset",
  }));

  const handleAddOpeningBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosition || !newAmount) return;

    setError(null);
    startTransition(async () => {
      const res = await saveOpeningBalanceAction({
        financialYear,
        position: newPosition,
        amount: parseFloat(newAmount) || 0,
        type: newType,
      });

      if (res.success) {
        setNewPosition("");
        setNewAmount("");
        setIsModalOpen(false);
      } else {
        setError(res.error || "Failed to save opening balance.");
      }
    });
  };

  const handleDeleteItem = (id: string) => {
    startTransition(async () => {
      await deleteOpeningBalanceAction(id);
    });
  };

  // Dynamic KPI Calculations from recorded items
  const totalAssets = formattedInitialBalances
    .filter((item) => item.type === "Asset")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalLiabilities = formattedInitialBalances
    .filter((item) => item.type === "Liability")
    .reduce((sum, item) => sum + item.amount, 0);

  const fyOpening = totalAssets - totalLiabilities;
  const currentClosing = fyOpening;
  const nextFyOpening = currentClosing;

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#17211B] tracking-tight">Opening / Closing</h1>
          <p className="text-[#68756C] text-sm mt-0.5 font-normal">
            Maintain continuity across financial years with database persistence.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#1b5e4b] hover:bg-[#136f58] shadow-xs transition-colors gap-1.5 shrink-0"
        >
          <span>+</span> Add Opening Balance
        </button>
      </div>

      {/* 2. KPI Summary Cards (Top Row - 3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: FY Opening */}
        <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6 flex flex-col justify-between">
          <span className="text-xs font-semibold text-[#68756C]">{financialYear} Opening</span>
          <strong className="text-2xl font-bold text-[#17211B] mt-2 block">
            {formatCurrency(fyOpening)}
          </strong>
        </div>

        {/* Card 2: Current Closing */}
        <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6 flex flex-col justify-between">
          <span className="text-xs font-semibold text-[#68756C]">Current Closing</span>
          <strong className="text-2xl font-bold text-[#136f58] mt-2 block">
            {formatCurrency(currentClosing)}
          </strong>
        </div>

        {/* Card 3: Next FY Opening */}
        <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6 flex flex-col justify-between">
          <span className="text-xs font-semibold text-[#68756C]">Next FY Opening</span>
          <strong className="text-2xl font-bold text-[#136f58] mt-2 block">
            {formatCurrency(nextFyOpening)}
          </strong>
        </div>
      </div>

      {/* 3. Opening Balance Components Data Card */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6 md:p-8 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-[#17211B]">Opening Balance Components</h2>
          <p className="text-xs text-[#68756C] mt-0.5">
            Previous year closing becomes current year opening.
          </p>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                <th className="py-3 px-3">POSITION</th>
                <th className="py-3 px-4 text-right">OPENING AMOUNT</th>
                <th className="py-3 px-4">TYPE</th>
                <th className="py-3 px-2 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EEE9] text-xs">
              {formattedInitialBalances.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[#68756C]">
                    No opening balance components recorded. Click &quot;+ Add Opening Balance&quot; to create one.
                  </td>
                </tr>
              ) : (
                formattedInitialBalances.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F9FAF8] transition-colors">
                    <td className="py-4 px-3 font-semibold text-[#17211B]">
                      {item.position}
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-[#17211B]">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="py-4 px-4 text-[#17211B] font-medium">
                      {item.type}
                    </td>
                    <td className="py-4 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={isPending}
                        className="text-red-500 hover:text-red-700 font-bold px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Opening Balance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#D9E3DC] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#D9E3DC] flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-[#17211B]">Add Opening Balance</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#68756C] hover:text-[#17211B] p-2 rounded-lg hover:bg-[#F4F7F3] transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddOpeningBalance} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1">
                  Financial Year
                </label>
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                >
                  <option value="FY 2026–27">FY 2026–27</option>
                  <option value="FY 2025–26">FY 2025–26</option>
                  <option value="FY 2024–25">FY 2024–25</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1">
                  Position / Component Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fixed Assets"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1">
                  Opening Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="e.g. 50000"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1">
                  Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                >
                  <option value="Asset">Asset</option>
                  <option value="Liability">Liability</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#D9E3DC] flex justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#D9E3DC] rounded-xl text-xs font-bold hover:bg-[#F4F7F3] text-[#17211B] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2 bg-[#1b5e4b] hover:bg-[#136f58] text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
