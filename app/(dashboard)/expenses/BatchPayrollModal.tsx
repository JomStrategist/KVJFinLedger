"use client";

import { useState, useTransition } from "react";
import { runBatchPayrollAction } from "./payroll-actions";
import { generateCorporateBankBatchFile, BankPortalType, BANK_PORTALS } from "@/lib/banking-export";

export function BatchPayrollModal({
  employees,
  onClose,
  onSuccess,
  onOpenPayslip,
}: {
  employees: any[];
  onClose: () => void;
  onSuccess: () => void;
  onOpenPayslip?: (expenseId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<any | null>(null);

  // Date and month defaults
  const now = new Date();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentMonthYear = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  const prevMonthIndex = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevMonthYear = `${monthNames[prevMonthIndex]} ${prevMonthIndex === 11 ? now.getFullYear() - 1 : now.getFullYear()}`;

  const [periodMonth, setPeriodMonth] = useState(currentMonthYear);
  const [paymentDate, setPaymentDate] = useState(now.toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState("BANK");
  const [reference, setReference] = useState("");
  const [selectedBankPortal, setSelectedBankPortal] = useState<BankPortalType>("HDFC");

  // Determine days in selected month
  const daysInMonth = 30; // standard commercial 30-day payroll

  // State for employee rows
  const [rows, setRows] = useState(() => {
    return employees
      .filter((e) => e.isActive)
      .map((e) => {
        const base = Number(e.salary || 0);
        const outstandingAdv = (e.advances || []).reduce(
          (sum: number, a: any) => sum + (a.status === "ACTIVE" ? Number(a.balanceAmount || a.amount) : 0),
          0
        );

        return {
          employeeId: e.id,
          employeeCode: e.employeeCode || "EMP",
          name: e.name,
          designation: e.designation || "Staff",
          department: e.department || "Operations",
          bankAccountNo: e.bankAccountNo || "",
          bankIfsc: e.bankIfsc || "",
          bankName: e.bankName || "",
          pan: e.pan || "",
          email: e.email || "",
          phone: e.phone || "",
          selected: true,
          baseSalary: base,
          totalDays: daysInMonth,
          lopDays: 0,
          grossAmount: base,
          advanceBalance: outstandingAdv,
          advanceDeduction: outstandingAdv > 0 ? Math.min(outstandingAdv, Math.round(base * 0.2)) : 0,
          tdsAmount: 0,
        };
      });
  });

  const handleRowChange = (index: number, field: string, val: any) => {
    setRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: val };

      if (field === "baseSalary" || field === "lopDays" || field === "totalDays") {
        const base = Number(row.baseSalary) || 0;
        const tot = Number(row.totalDays) || 30;
        const lop = Number(row.lopDays) || 0;
        const workedDays = Math.max(0, tot - lop);
        row.grossAmount = Math.round((base * workedDays) / tot);
      }

      updated[index] = row;
      return updated;
    });
  };

  const handleToggleAll = (select: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: select })));
  };

  // Calculations for summary
  const selectedRows = rows.filter((r) => r.selected);
  const totalGross = selectedRows.reduce((sum, r) => sum + (Number(r.grossAmount) || 0), 0);
  const totalAdvancesDeducted = selectedRows.reduce((sum, r) => sum + (Number(r.advanceDeduction) || 0), 0);
  const totalTds = selectedRows.reduce((sum, r) => sum + (Number(r.tdsAmount) || 0), 0);
  const totalNet = Math.max(0, totalGross - totalAdvancesDeducted - totalTds);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedRows.length === 0) {
      setError("Please select at least one employee for the payroll batch.");
      return;
    }

    startTransition(async () => {
      const items = selectedRows.map((r) => ({
        employeeId: r.employeeId,
        baseSalary: Number(r.baseSalary) || 0,
        totalDays: Number(r.totalDays) || 30,
        lopDays: Number(r.lopDays) || 0,
        grossAmount: Number(r.grossAmount) || 0,
        advanceDeduction: Number(r.advanceDeduction) || 0,
        tdsAmount: Number(r.tdsAmount) || 0,
        netAmount: Math.max(0, (Number(r.grossAmount) || 0) - (Number(r.advanceDeduction) || 0) - (Number(r.tdsAmount) || 0)),
        bankAccountNo: r.bankAccountNo,
        bankIfsc: r.bankIfsc,
        bankName: r.bankName,
      }));

      const res = await runBatchPayrollAction({
        periodMonth,
        paymentDate,
        paymentMode,
        reference: reference.trim() || undefined,
        items,
      });

      if (res.success) {
        setBatchResult(res.data);
        onSuccess();
      } else {
        setError(res.error || "Failed to execute batch payroll.");
      }
    });
  };

  // Download Bank Payout File
  const handleDownloadBankFile = (portalType: BankPortalType) => {
    if (!batchResult) return;
    const records = (batchResult.bankingRecords || []).map((r: any) => ({
      ...r,
      paymentDate,
    }));

    const file = generateCorporateBankBatchFile(records, portalType);
    const blob = new Blob([file.content], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-[#FAFBF9]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-[#177B55] flex items-center justify-center font-bold text-lg border border-emerald-100">
              ⚡
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Run Monthly Payroll Batch
              </h2>
              <p className="text-xs text-slate-500">
                Automated monthly salary calculation, pro-rata loss of pay, advance deduction & double-entry posting
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

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Success Result View */}
          {batchResult ? (
            <div className="space-y-6 py-4 animate-in fade-in">
              <div className="p-6 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-center space-y-2">
                <span className="text-4xl block">🎉</span>
                <h3 className="text-lg font-black text-[#0B5F46]">
                  Payroll Batch Processed Successfully!
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Processed salary disbursements for <strong>{batchResult.employeeCount} active employees</strong> for period <strong>{batchResult.periodMonth}</strong>.
                </p>

                {/* Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 max-w-2xl mx-auto text-left">
                  <div className="p-3 bg-white rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Total Gross</span>
                    <span className="text-sm font-bold text-slate-900">₹{batchResult.totalGross?.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Advances Recovered</span>
                    <span className="text-sm font-bold text-slate-700">₹{batchResult.totalAdvancesDeducted?.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">TDS Withheld (192)</span>
                    <span className="text-sm font-bold text-rose-600">₹{batchResult.totalTds?.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-[#177B55] font-bold block uppercase">Net Bank Payout</span>
                    <span className="text-sm font-black text-[#177B55]">₹{batchResult.totalNet?.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Corporate Banking Batch File Download Section */}
              <div className="p-5 border border-slate-200 rounded-2xl bg-white space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏦</span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Download Corporate Banking Batch File</h4>
                    <p className="text-xs text-slate-500">
                      Export pre-formatted batch upload file ready to upload directly to your corporate internet banking portal.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {BANK_PORTALS.map((portal) => (
                    <button
                      key={portal.id}
                      type="button"
                      onClick={() => handleDownloadBankFile(portal.id)}
                      className="p-3.5 border border-slate-200 rounded-xl hover:border-[#177B55] hover:bg-[#FAFBF9] text-left transition-all group cursor-pointer"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs text-slate-800 group-hover:text-[#177B55]">
                          {portal.name}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          .{portal.extension}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">{portal.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generated Expenses & Payslips */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Generated Salary Payout Vouchers ({batchResult.expenses?.length})
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {batchResult.expenses?.map((exp: any) => (
                    <div key={exp.id} className="p-3.5 flex justify-between items-center text-xs hover:bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-900">{exp.employee?.name}</span>
                        <span className="text-slate-400 font-mono ml-2">[{exp.employee?.employeeCode}]</span>
                        <span className="text-slate-500 block text-[11px] mt-0.5 font-mono">{exp.expenseNumber}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">
                          ₹{Number(exp.netAmount).toLocaleString("en-IN")}
                        </span>
                        {onOpenPayslip && (
                          <button
                            type="button"
                            onClick={() => onOpenPayslip(exp.id)}
                            className="px-2.5 py-1 bg-emerald-50 text-[#0B5F46] hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            📄 View Payslip
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <form id="batch-payroll-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Batch Configuration Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-[#FAFBF9] border border-slate-200 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Payroll Month / Period <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={periodMonth}
                    onChange={(e) => setPeriodMonth(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#177B55] font-semibold"
                  >
                    <option value={currentMonthYear}>{currentMonthYear} (Current)</option>
                    <option value={prevMonthYear}>{prevMonthYear} (Previous)</option>
                    <option value="November 2026">November 2026</option>
                    <option value="December 2026">December 2026</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Disbursement Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#177B55]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Disbursement Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#177B55] font-semibold"
                  >
                    <option value="BANK">🏢 Corporate Bank Transfer (NEFT/RTGS)</option>
                    <option value="CASH">💵 Petty Cash</option>
                    <option value="CHEQUE">📝 Corporate Cheque</option>
                  </select>
                </div>
              </div>

              {/* Live KPI Summary Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Selected</span>
                  <span className="text-base font-bold text-slate-900">{selectedRows.length} Staff</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Total Gross</span>
                  <span className="text-base font-bold text-slate-900">₹{totalGross.toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Advance Recoveries</span>
                  <span className="text-base font-bold text-slate-700">₹{totalAdvancesDeducted.toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">TDS u/s 192</span>
                  <span className="text-base font-bold text-rose-600">₹{totalTds.toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#177B55] font-bold block uppercase">Total Net Payout</span>
                  <span className="text-lg font-black text-[#0B5F46]">₹{totalNet.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Employee Breakdown Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="p-3 bg-[#FAFBF9] border-b border-slate-200 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === rows.length && rows.length > 0}
                        onChange={(e) => handleToggleAll(e.target.checked)}
                        className="rounded text-[#177B55] focus:ring-emerald-500"
                      />
                      <span>Select All ({rows.length})</span>
                    </label>
                  </div>
                  <span className="text-slate-500 text-[11px]">
                    Pro-rata LOP calculation is active based on 30 working days.
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[780px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold text-slate-600 uppercase">
                        <th className="py-2.5 px-3 w-8"></th>
                        <th className="py-2.5 px-3">Employee</th>
                        <th className="py-2.5 px-3 text-right">Base CTC (₹)</th>
                        <th className="py-2.5 px-3 text-center">LOP (Days)</th>
                        <th className="py-2.5 px-3 text-right">Gross Pay (₹)</th>
                        <th className="py-2.5 px-3 text-right">Less: Advance (₹)</th>
                        <th className="py-2.5 px-3 text-right">Less: TDS (₹)</th>
                        <th className="py-2.5 px-3 text-right">Net Payout (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row, idx) => {
                        const net = Math.max(0, (Number(row.grossAmount) || 0) - (Number(row.advanceDeduction) || 0) - (Number(row.tdsAmount) || 0));
                        return (
                          <tr
                            key={row.employeeId}
                            className={`hover:bg-slate-50/60 transition-colors ${
                              !row.selected ? "opacity-50 bg-slate-50/30" : ""
                            }`}
                          >
                            <td className="py-3 px-3">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={(e) => handleRowChange(idx, "selected", e.target.checked)}
                                className="rounded text-[#177B55] focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-900">
                              <div>{row.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {row.employeeCode} • {row.designation}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                value={row.baseSalary}
                                onChange={(e) => handleRowChange(idx, "baseSalary", e.target.value)}
                                className="w-24 h-8 px-2 border border-slate-200 rounded-lg text-right font-mono text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max="30"
                                value={row.lopDays}
                                onChange={(e) => handleRowChange(idx, "lopDays", e.target.value)}
                                className="w-14 h-8 px-1.5 border border-slate-200 rounded-lg text-center font-mono text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-3 px-3 text-right font-bold font-mono text-slate-900">
                              ₹{Number(row.grossAmount).toLocaleString("en-IN")}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="inline-flex flex-col items-end">
                                <input
                                  type="number"
                                  min="0"
                                  max={row.advanceBalance}
                                  value={row.advanceDeduction}
                                  onChange={(e) => handleRowChange(idx, "advanceDeduction", e.target.value)}
                                  className="w-20 h-8 px-2 border border-slate-200 rounded-lg text-right font-mono text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                {row.advanceBalance > 0 && (
                                  <span className="text-[9px] text-amber-600 font-semibold mt-0.5">
                                    Bal: ₹{row.advanceBalance}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                value={row.tdsAmount}
                                onChange={(e) => handleRowChange(idx, "tdsAmount", e.target.value)}
                                className="w-20 h-8 px-2 border border-slate-200 rounded-lg text-right font-mono text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-rose-600"
                              />
                            </td>
                            <td className="py-3 px-3 text-right font-black font-mono text-[#0B5F46] text-xs">
                              ₹{net.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-[#FAFBF9]">
          {batchResult ? (
            <div className="flex justify-between w-full">
              <button
                type="button"
                onClick={() => setBatchResult(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ← Back to Batch Form
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#177B55] text-white hover:bg-[#0B5F46] transition-colors shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="batch-payroll-form"
                disabled={isPending || selectedRows.length === 0}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#177B55] hover:bg-[#0B5F46] text-white transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {isPending ? "Executing Payroll Batch…" : `⚡ Process Payroll (${selectedRows.length} Staff)`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
