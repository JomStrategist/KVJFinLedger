"use client";

import { useState, useTransition } from "react";
import { recordEmployeeAdvanceAction } from "./payroll-actions";

export function RecordAdvanceModal({
  employees,
  defaultEmployeeId,
  onClose,
  onSuccess,
}: {
  employees: any[];
  defaultEmployeeId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState(defaultEmployeeId || (employees[0]?.id || ""));
  const [amount, setAmount] = useState<number | string>("");
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [purpose, setPurpose] = useState("Salary Advance");
  const [deductionMonth, setDeductionMonth] = useState("Next Monthly Payroll");
  const [paymentMode, setPaymentMode] = useState("BANK");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const numAmount = Number(amount) || 0;
  const selectedEmp = employees.find((e) => e.id === employeeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId) {
      setError("Please select an employee.");
      return;
    }

    if (numAmount <= 0) {
      setError("Advance amount must be greater than zero.");
      return;
    }

    startTransition(async () => {
      const res = await recordEmployeeAdvanceAction({
        employeeId,
        amount: numAmount,
        advanceDate,
        purpose: purpose.trim() || undefined,
        deductionMonth: deductionMonth.trim() || undefined,
        paymentMode,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Failed to record employee advance.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-[#FAFBF9]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-lg border border-amber-200">
              💸
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Disburse Employee Advance
              </h2>
              <p className="text-xs text-slate-500">
                Short-term loan & recoverable prepayment sub-ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form id="advance-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Employee Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Employee <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold text-slate-800"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.employeeCode || "EMP"}) — Base CTC: ₹{Number(e.salary || 0).toLocaleString("en-IN")}/mo
                  </option>
                ))}
              </select>
            </div>

            {/* Advance Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Advance Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  required
                  step="any"
                  min="1"
                  placeholder="e.g. 15000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-11 pl-8 pr-4 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Date & Deduction Month */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Disbursement Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={advanceDate}
                  onChange={(e) => setAdvanceDate(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Recovery Schedule
                </label>
                <select
                  value={deductionMonth}
                  onChange={(e) => setDeductionMonth(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                >
                  <option value="Next Monthly Payroll">Deduct from next payroll run</option>
                  <option value="November 2026">November 2026</option>
                  <option value="December 2026">December 2026</option>
                  <option value="Split 2 Months">Split across 2 monthly runs</option>
                  <option value="Manual Recovery">Manual repayment</option>
                </select>
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Purpose / Reason
              </label>
              <input
                type="text"
                placeholder="e.g. Festival advance, Medical emergency, Relocation"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            {/* Mode & UTR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Disbursed Via
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                >
                  <option value="BANK">🏢 Corporate Bank (NEFT/IMPS)</option>
                  <option value="CASH">💵 Petty Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Reference / UTR
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-982138129"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Accounting Guide Note */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-[#78350F] space-y-1">
              <p className="font-bold">📋 Balance Sheet Sub-Ledger Posting:</p>
              <div className="font-mono text-[10px] space-y-0.5 text-slate-700">
                <p>• <strong>Dr.</strong> Employee Advances (Current Asset): ₹{numAmount.toLocaleString("en-IN")}</p>
                <p>• <strong>Cr.</strong> Bank Account: ₹{numAmount.toLocaleString("en-IN")}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Advances are automatically deducted during monthly payroll, reducing take-home pay and clearing the asset.
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 bg-[#FAFBF9]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="advance-form"
            disabled={isPending || numAmount <= 0}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
          >
            {isPending ? "Disbursing…" : "✓ Confirm Advance Payout"}
          </button>
        </div>
      </div>
    </div>
  );
}
