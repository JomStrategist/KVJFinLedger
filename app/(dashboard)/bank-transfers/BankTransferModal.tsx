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

  // Dynamic account list from Bank Accounts Master (Settings)
  const bankOptions = useMemo(() => {
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

    if (list.length === 0) {
      list.push("Primary Bank Account (Current)");
    }

    return list;
  }, [bankAccounts]);

  // Transaction Mode: Bank-to-Bank Transfer, Owner Drawings, Cash Withdrawal (Contra)
  const [transferType, setTransferType] = useState<"TRANSFER" | "DRAWINGS" | "CASH_WITHDRAWAL">(
    transfer?.toAccount?.includes("Drawings")
      ? "DRAWINGS"
      : transfer?.toAccount === "Cash in Hand"
      ? "CASH_WITHDRAWAL"
      : "TRANSFER"
  );

  const [date, setDate] = useState(
    transfer?.date
      ? new Date(transfer.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  
  const [fromAccount, setFromAccount] = useState(
    transfer?.fromAccount || bankOptions[0] || "Primary Bank Account"
  );
  
  const [toAccountCustom, setToAccountCustom] = useState(
    transfer?.toAccount || bankOptions[1] || "Savings Bank Account"
  );

  const [ownerName, setOwnerName] = useState(
    transfer?.toAccount?.replace("Owner Drawings (", "").replace(")", "") || "Director / Proprietor"
  );

  const [amount, setAmount] = useState<string>(transfer?.amount ? String(transfer.amount) : "25000");
  const [reference, setReference] = useState(transfer?.reference || "");
  const [description, setDescription] = useState(transfer?.description || "");

  const finalToAccount = transferType === "DRAWINGS"
    ? `Owner Drawings (${ownerName})`
    : transferType === "CASH_WITHDRAWAL"
    ? "Cash in Hand (Petty Cash)"
    : toAccountCustom;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      date,
      fromAccount,
      toAccount: finalToAccount,
      amount: parseFloat(amount) || 0,
      reference: reference || (transferType === "DRAWINGS" ? "Drawings Voucher" : transferType === "CASH_WITHDRAWAL" ? "ATM / Self Cheque" : "NEFT/RTGS"),
      description: description || (transferType === "DRAWINGS" ? `Capital withdrawal by ${ownerName}` : transferType === "CASH_WITHDRAWAL" ? "Cash withdrawal for office expenses" : "Inter-bank fund transfer"),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-2.5 sm:p-4 backdrop-blur-md">
      <div className="bg-white/95 backdrop-blur-2xl w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-slate-200/70 flex justify-between items-center bg-white/70 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold text-sm sm:text-base shrink-0">
              🏦
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {isEdit ? "Edit Bank Transfer / Withdrawal" : "Record Bank Transfer / Withdrawal"}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Inter-bank transfers, owner capital drawings &amp; office cash withdrawals</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 sm:p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Transfer Type Selection Pills */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Transfer &amp; Withdrawal Category *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTransferType("TRANSFER")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                  transferType === "TRANSFER"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-500 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                🔄 Inter-Bank Transfer
              </button>
              <button
                type="button"
                onClick={() => setTransferType("DRAWINGS")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                  transferType === "DRAWINGS"
                    ? "bg-purple-50 text-purple-800 border-purple-500 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                👤 Owner Drawings
              </button>
              <button
                type="button"
                onClick={() => setTransferType("CASH_WITHDRAWAL")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                  transferType === "CASH_WITHDRAWAL"
                    ? "bg-blue-50 text-blue-800 border-blue-500 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                💵 Office Cash Withdrawal
              </button>
            </div>
          </div>

          {/* CA Accounting Note */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
            {transferType === "DRAWINGS" && (
              <span>💡 <b>CA Note:</b> Owner Drawings directly reduce Owner Capital on the Schedule III Balance Sheet and do not impact P&amp;L taxable profit.</span>
            )}
            {transferType === "CASH_WITHDRAWAL" && (
              <span>💡 <b>CA Note:</b> Recorded as a <b>Contra Voucher (F4)</b>. Money transfers from Bank to Office Cash in Hand with 0 tax impact.</span>
            )}
            {transferType === "TRANSFER" && (
              <span>💡 <b>CA Note:</b> Recorded as an internal <b>Bank Contra Transfer</b> between company accounts.</span>
            )}
          </div>

          {/* Row 1: Date & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                placeholder="e.g. 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-xl px-3.5 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 font-mono font-tabular"
              />
            </div>
          </div>

          {/* Row 2: From Bank & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                From Account (Bank) *
              </label>
              <select
                value={fromAccount}
                onChange={(e) => setFromAccount(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-800"
              >
                {bankOptions.map((opt) => (
                  <option key={`from-${opt}`} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              {transferType === "DRAWINGS" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Beneficiary Owner / Director *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jomon Joseph (Director)"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full h-10 border border-purple-200 rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-semibold text-purple-900"
                  />
                </div>
              ) : transferType === "CASH_WITHDRAWAL" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Destination Ledger
                  </label>
                  <div className="w-full h-10 border border-slate-200 rounded-xl px-3.5 flex items-center bg-slate-50 text-slate-700 text-xs font-bold">
                    💵 Cash in Hand (Petty Cash Ledger)
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    To Account (Destination Bank) *
                  </label>
                  <select
                    value={toAccountCustom}
                    onChange={(e) => setToAccountCustom(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-800"
                  >
                    {bankOptions.map((opt) => (
                      <option key={`to-${opt}`} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Reference & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Reference / Cheque / UTR No.
              </label>
              <input
                type="text"
                placeholder="e.g. UTR12345678 or Cheque #0045"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Narration / Purpose
              </label>
              <input
                type="text"
                placeholder="e.g. Personal drawings / Office petty replenishment"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-200/70 flex justify-end items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? "Saving..." : isEdit ? "Update Entry" : "Save Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

