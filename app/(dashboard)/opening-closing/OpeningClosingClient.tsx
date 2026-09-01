"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils/currency";

interface OpeningItem {
  id: string;
  position: string;
  amount: number;
  type: "Asset" | "Liability";
}

export function OpeningClosingClient({
  initialClosing = {},
}: {
  initialClosing?: any;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Default opening components matching the specification
  const [openingItems, setOpeningItems] = useState<OpeningItem[]>([
    { id: "1", position: "Bank Balance", amount: 1000000, type: "Asset" },
    { id: "2", position: "Accounts Receivable", amount: 200000, type: "Asset" },
    { id: "3", position: "GST Receivable", amount: 20000, type: "Asset" },
    { id: "4", position: "GST Payable", amount: 40000, type: "Liability" },
    { id: "5", position: "TDS Receivable", amount: 15000, type: "Asset" },
    { id: "6", position: "Other Liabilities", amount: 60000, type: "Liability" },
  ]);

  // Modal Form State
  const [newPosition, setNewPosition] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<"Asset" | "Liability">("Asset");

  const handleAddOpeningBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosition || !newAmount) return;

    const newItem: OpeningItem = {
      id: String(Date.now()),
      position: newPosition,
      amount: parseFloat(newAmount) || 0,
      type: newType,
    };

    setOpeningItems((prev) => [...prev, newItem]);
    setNewPosition("");
    setNewAmount("");
    setIsModalOpen(false);
  };

  // KPI Calculations
  const fyOpening = 1000000;
  const currentClosing = 2055000;
  const nextFyOpening = 2055000;

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#17211B] tracking-tight">Opening / Closing</h1>
          <p className="text-[#68756C] text-sm mt-0.5 font-normal">
            Maintain continuity across financial years.
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
          <span className="text-xs font-semibold text-[#68756C]">FY 2026–27 Opening</span>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EEE9] text-xs">
              {openingItems.map((item) => (
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
                </tr>
              ))}
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
                  className="px-6 py-2 bg-[#1b5e4b] hover:bg-[#136f58] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
