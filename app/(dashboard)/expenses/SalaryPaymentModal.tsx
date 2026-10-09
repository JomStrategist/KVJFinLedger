"use client";

import { useState, useTransition } from "react";
import { recordSalaryPayoutAction } from "./actions";

export function SalaryPaymentModal({
  employee,
  onClose,
  onSuccess,
}: {
  employee: any;
  onClose: () => void;
  onSuccess: (data?: any) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Month selector helper
  const now = new Date();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentMonthYear = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  const prevMonthIndex = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevMonthYear = `${monthNames[prevMonthIndex]} ${prevMonthIndex === 11 ? now.getFullYear() - 1 : now.getFullYear()}`;

  const defaultSalary = Number(employee.salary || 0);
  const outstandingAdv = (employee.advances || []).reduce(
    (sum: number, a: any) => sum + (a.status === "ACTIVE" ? Number(a.balanceAmount || a.amount) : 0),
    0
  );

  const [paymentDate, setPaymentDate] = useState(now.toISOString().split("T")[0]);
  const [periodMonth, setPeriodMonth] = useState(currentMonthYear);
  const [grossAmount, setGrossAmount] = useState<number | string>(defaultSalary > 0 ? defaultSalary : "");
  const [advanceDeduction, setAdvanceDeduction] = useState<number | string>(
    outstandingAdv > 0 ? Math.min(outstandingAdv, Math.round(defaultSalary * 0.2)) : ""
  );
  const [isTdsDeducted, setIsTdsDeducted] = useState(false);
  const [tdsAmount, setTdsAmount] = useState<number | string>("");
  const [paymentMode, setPaymentMode] = useState("BANK");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const numGross = Number(grossAmount) || 0;
  const numTds = isTdsDeducted ? Number(tdsAmount) || 0 : 0;
  const numAdv = Number(advanceDeduction) || 0;
  const netDisbursement = Math.max(0, numGross - numTds - numAdv);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numGross <= 0) {
      setError("Please enter a valid gross salary amount greater than zero.");
      return;
    }

    if (numTds + numAdv >= numGross) {
      setError("Deductions (TDS + Advances) cannot exceed the gross salary.");
      return;
    }

    startTransition(async () => {
      const res = await recordSalaryPayoutAction({
        employeeId: employee.id,
        paymentDate,
        periodMonth,
        grossAmount: numGross,
        tdsAmount: numTds,
        advanceDeduction: numAdv,
        paymentMode,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        onSuccess(res.data);
        onClose();
      } else {
        setError(res.error || "Failed to record salary payout.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 flex justify-between items-center bg-[#FAFBF9]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-[#177B55] flex items-center justify-center font-bold text-lg border border-emerald-100">
              ₹
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Mark Salary Payout
              </h2>
              <p className="text-xs text-slate-500">
                Direct payroll disbursement & double-entry posting
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Employee Summary Card */}
          <div className="bg-[#F8FAF9] border border-[#D9E3DC] rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#17211B]">{employee.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  {employee.employeeCode || "EMP"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {employee.designation || "Staff"} • {employee.department || "Operations"}
              </p>
            </div>
            {defaultSalary > 0 && (
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Registered Base</span>
                <span className="font-bold text-xs text-[#17211B]">₹{defaultSalary.toLocaleString("en-IN")}/mo</span>
              </div>
            )}
          </div>

          <form id="salary-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Payment Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#177B55]"
                />
              </div>

              {/* Salary Period */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Salary Month / Period <span className="text-red-500">*</span>
                </label>
                <select
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#177B55] font-semibold"
                >
                  <option value={currentMonthYear}>{currentMonthYear} (Current)</option>
                  <option value={prevMonthYear}>{prevMonthYear} (Previous)</option>
                  <option value="CUSTOM">Custom Period...</option>
                </select>
              </div>
            </div>

            {/* Gross Salary Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Gross Salary Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  required
                  step="any"
                  min="1"
                  placeholder="e.g. 50000"
                  value={grossAmount}
                  onChange={(e) => setGrossAmount(e.target.value)}
                  className="w-full h-11 pl-8 pr-4 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#177B55]"
                />
              </div>
            </div>

            {/* Section 192 TDS Toggle */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTdsDeducted}
                  onChange={(e) => {
                    setIsTdsDeducted(e.target.checked);
                    if (!e.target.checked) setTdsAmount("");
                  }}
                  className="w-4 h-4 text-[#177B55] rounded focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800">
                  Deduct TDS on Salary (Section 192)
                </span>
              </label>

              {isTdsDeducted && (
                <div className="pt-2 border-t border-slate-200/60 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    TDS Amount Deducted (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 5000"
                      value={tdsAmount}
                      onChange={(e) => setTdsAmount(e.target.value)}
                      className="w-full h-9 pl-7 pr-3 border border-slate-200 rounded-lg text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#177B55]"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Credited to TDS Payable (Salary) liability account for remittance via ITNS 281.
                  </p>
                </div>
              )}
            </div>

            {/* Advance Recovery (if employee has outstanding advances) */}
            {outstandingAdv > 0 && (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-900">
                    Recover Salary Advance
                  </span>
                  <span className="text-[11px] font-mono font-bold text-amber-800">
                    Outstanding: ₹{outstandingAdv.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={outstandingAdv}
                    placeholder="e.g. 5000"
                    value={advanceDeduction}
                    onChange={(e) => setAdvanceDeduction(e.target.value)}
                    className="w-full h-9 pl-7 pr-3 border border-amber-300 rounded-lg text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  />
                </div>
                <p className="text-[10px] text-amber-700">
                  Deducted amount directly reduces take-home pay and clears the Employee Advance asset balance.
                </p>
              </div>
            )}

            {/* Net Disbursement Box */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#177B55] uppercase tracking-wider block">
                  Net Bank Disbursement
                </span>
                <span className="text-[11px] text-slate-600">
                  Transferred to Employee Account
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-[#0B5F46]">
                  ₹{netDisbursement.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Paid From / Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#177B55] font-semibold"
                >
                  <option value="BANK">🏢 Company Bank Account (NEFT/IMPS)</option>
                  <option value="CASH">💵 Petty Cash</option>
                  <option value="CHEQUE">📝 Cheque</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  UTR / Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-202610091234"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#177B55]"
                />
              </div>
            </div>

            {/* CA Accounting Guide */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-[#78350F] space-y-1">
              <p className="font-bold">📋 Indian Accounting Standard (Double-Entry Posting):</p>
              <div className="font-mono text-[10px] space-y-0.5 text-slate-700">
                <p>• <strong>Dr.</strong> Salaries &amp; Wages (Operating Cost): ₹{numGross.toLocaleString("en-IN")}</p>
                <p>• <strong>Cr.</strong> Bank Account: ₹{netDisbursement.toLocaleString("en-IN")}</p>
                {numTds > 0 && (
                  <p>• <strong>Cr.</strong> TDS Payable (Salary Sec 192): ₹{numTds.toLocaleString("en-IN")}</p>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 flex justify-end items-center gap-2.5 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="salary-form"
            disabled={isPending || numGross <= 0}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#177B55] text-white hover:bg-[#0B5F46] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
          >
            {isPending ? "Recording…" : "✓ Confirm Salary Payout"}
          </button>
        </div>
      </div>
    </div>
  );
}
