"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { createBankTransferAction, updateBankTransferAction } from "./actions";

export function BankTransferModal({
  transfer,
  bankAccounts = [],
  onClose,
  onSuccess,
}: {
  transfer?: any;
  bankAccounts?: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(transfer?.id);

  // Dynamic account list from Bank Accounts Master (Settings) + Cash in Hand
  const accountOptions = useMemo(() => {
    const list: string[] = [];

    if (bankAccounts && bankAccounts.length > 0) {
      bankAccounts
        .filter((acc) => acc.isActive !== false)
        .forEach((acc) => {
          const formatted = acc.bankName
            ? `${acc.bankName} (${acc.accountName || acc.accountNumber || "Current"})`
            : acc.accountName || acc.accountNumber || "Bank Account";
          if (!list.includes(formatted)) {
            list.push(formatted);
          }
        });
    }

    // Default fallback if no active bank accounts found in Master
    if (list.length === 0) {
      list.push("Federal Bank (KVJ Analytics)");
    }

    // Always include Cash in Hand
    if (!list.includes("Cash in Hand")) {
      list.push("Cash in Hand");
    }

    return list;
  }, [bankAccounts]);

  const [date, setDate] = useState(
    transfer?.date
      ? new Date(transfer.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [fromAccount, setFromAccount] = useState(
    transfer?.fromAccount && accountOptions.includes(transfer.fromAccount)
      ? transfer.fromAccount
      : accountOptions[0] || "Federal Bank (KVJ Analytics)"
  );
  const [toAccount, setToAccount] = useState(
    transfer?.toAccount && accountOptions.includes(transfer.toAccount)
      ? transfer.toAccount
      : accountOptions[1] || accountOptions[0] || "Cash in Hand"
  );
  const [amount, setAmount] = useState<string>(transfer?.amount ? String(transfer.amount) : "50000");
  const [reference, setReference] = useState(transfer?.reference || "");
  const [description, setDescription] = useState(transfer?.description || "");

  useEffect(() => {
    if (!transfer?.fromAccount && accountOptions.length > 0 && !accountOptions.includes(fromAccount)) {
      setFromAccount(accountOptions[0]);
    }
    if (!transfer?.toAccount && accountOptions.length > 0 && !accountOptions.includes(toAccount)) {
      setToAccount(accountOptions[1] || accountOptions[0]);
    }
  }, [accountOptions, transfer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      date,
      fromAccount,
      toAccount,
      amount: parseFloat(amount) || 0,
      reference,
      description,
    };

    startTransition(async () => {
      let res;
      if (isEdit) {
        res = await updateBankTransferAction(transfer.id, payload);
      } else {
        res = await createBankTransferAction(payload);
      }

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-[#D9E3DC] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#D9E3DC] flex justify-between items-center bg-white">
          <h2 className="text-xl font-bold text-[#17211B]">
            {isEdit ? "Edit Bank Transfer" : "Add Bank Transfer"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#68756C] hover:text-[#17211B] p-2 rounded-lg hover:bg-[#F4F7F3] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Row 1: 4 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#68756C] mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#68756C] mb-1">
                From Account
              </label>
              <select
                value={fromAccount}
                onChange={(e) => setFromAccount(e.target.value)}
                className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
              >
                {accountOptions.map((opt) => (
                  <option key={`from-${opt}`} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#68756C] mb-1">
                To Account
              </label>
              <select
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
              >
                {accountOptions.map((opt) => (
                  <option key={`to-${opt}`} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#68756C] mb-1">
                Amount
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
              />
            </div>
          </div>

          {/* Row 2: Reference */}
          <div>
            <label className="block text-xs font-semibold text-[#68756C] mb-1">
              Reference
            </label>
            <input
              type="text"
              placeholder="e.g. UTR001"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full sm:w-1/2 h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
            />
          </div>

          {/* Row 3: Description */}
          <div>
            <label className="block text-xs font-semibold text-[#68756C] mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Operating funds"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-[#D9E3DC] rounded-xl p-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-[#D9E3DC] flex justify-end items-center gap-3">
            <button
              type="button"
              onClick={onClose}
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
  );
}
