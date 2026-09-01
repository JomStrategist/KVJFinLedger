"use client";

import { useState } from "react";
import { BankTransferModal } from "./BankTransferModal";
import { useRouter } from "next/navigation";

export function BankTransfersClient({
  initialTransfers = [],
}: {
  initialTransfers: any[];
}) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);

  const handleOpenAdd = () => {
    setSelectedTransfer(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (transfer: any) => {
    setSelectedTransfer(transfer);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#17211B] tracking-tight">Bank Transfers</h1>
          <p className="text-[#68756C] text-sm mt-0.5 font-normal">
            Simple bank-to-bank movement tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#1b5e4b] hover:bg-[#136f58] shadow-xs transition-colors gap-1.5 shrink-0"
        >
          <span>+</span> Add Transfer
        </button>
      </div>

      {/* Main Card Container */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead>
              <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                <th className="py-3 px-3">DATE</th>
                <th className="py-3 px-3">FROM</th>
                <th className="py-3 px-3">TO</th>
                <th className="py-3 px-3 text-right">AMOUNT</th>
                <th className="py-3 px-3">REFERENCE</th>
                <th className="py-3 px-3">DESCRIPTION</th>
                <th className="py-3 px-2 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EEE9] text-xs">
              {initialTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#68756C]">
                    No bank transfers recorded yet. Click &quot;+ Add Transfer&quot; to create one.
                  </td>
                </tr>
              ) : (
                initialTransfers.map((item) => {
                  const dateStr = new Date(item.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const amt = Number(item.amount);

                  return (
                    <tr key={item.id} className="hover:bg-[#F9FAF8] transition-colors">
                      <td className="py-4 px-3 text-[#17211B] font-medium whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-4 px-3 text-[#17211B] font-semibold">
                        {item.fromAccount}
                      </td>
                      <td className="py-4 px-3 text-[#17211B] font-semibold">
                        {item.toAccount}
                      </td>
                      <td className="py-4 px-3 text-right font-bold text-[#17211B]">
                        ₹{amt.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-4 px-3 text-[#17211B] font-medium">
                        {item.reference || "—"}
                      </td>
                      <td className="py-4 px-3 text-[#68756C]">
                        {item.description || "—"}
                      </td>
                      <td className="py-4 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
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

      {/* Add / Edit Bank Transfer Modal */}
      {isModalOpen && (
        <BankTransferModal
          transfer={selectedTransfer}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
