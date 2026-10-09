"use client";

import { useState } from "react";
import { repayEmployeeAdvanceAction } from "./payroll-actions";

export function EmployeeAdvancesView({
  advances = [],
  employees = [],
  onOpenNewAdvance,
  onRefresh,
}: {
  advances: any[];
  employees: any[];
  onOpenNewAdvance: () => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [repayingAdvance, setRepayingAdvance] = useState<any | null>(null);
  const [repayAmount, setRepayAmount] = useState<number | string>("");
  const [repayNotes, setRepayNotes] = useState("");
  const [isSubmittingRepay, setIsSubmittingRepay] = useState(false);

  const filtered = advances.filter((adv) => {
    const s = search.toLowerCase().trim();
    const empName = adv.employee?.name?.toLowerCase() || "";
    const empCode = adv.employee?.employeeCode?.toLowerCase() || "";
    const advNum = adv.advanceNumber?.toLowerCase() || "";
    const purpose = adv.purpose?.toLowerCase() || "";

    const matchesSearch = !s || empName.includes(s) || empCode.includes(s) || advNum.includes(s) || purpose.includes(s);
    const matchesStatus = statusFilter === "ALL" || adv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalDisbursed = advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const totalRepaid = advances.reduce((sum, a) => sum + (Number(a.repaidAmount) || 0), 0);
  const totalOutstanding = advances.reduce(
    (sum, a) => sum + (a.status === "ACTIVE" ? Number(a.balanceAmount || a.amount - a.repaidAmount) : 0),
    0
  );

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayingAdvance) return;
    const num = Number(repayAmount);
    if (num <= 0) return;

    setIsSubmittingRepay(true);
    try {
      const res = await repayEmployeeAdvanceAction(repayingAdvance.id, num, repayNotes);
      if (res.success) {
        setRepayingAdvance(null);
        setRepayAmount("");
        setRepayNotes("");
        onRefresh();
      } else {
        alert(res.error || "Failed to record repayment.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingRepay(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#D9E3DC] rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Advances Disbursed
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            ₹{totalDisbursed.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="p-4 bg-white border border-[#D9E3DC] rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
            Recovered / Repaid
          </span>
          <span className="text-xl font-bold text-emerald-700 mt-1 block">
            ₹{totalRepaid.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
            Outstanding Asset Balance
          </span>
          <span className="text-xl font-black text-amber-900 mt-1 block">
            ₹{totalOutstanding.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="p-4 bg-white border border-[#D9E3DC] rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Active Advance Count
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {advances.filter((a) => a.status === "ACTIVE").length} loans / advances
          </span>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#D9E3DC] bg-[#FAFBF9] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 w-full max-w-lg">
            <input
              type="text"
              placeholder="Search advances by employee, code, advance no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] h-[38px] px-3 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-[#17211B]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active (Outstanding)</option>
              <option value="REPAID">Fully Repaid / Recovered</option>
            </select>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={onOpenNewAdvance}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <span>+</span> Disburse New Advance
            </button>
          </div>
        </div>

        {/* Advances Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[800px]">
            <thead>
              <tr className="border-b border-[#D9E3DC] bg-[#FAFBF9] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                <th className="py-3 px-4">Advance No</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Date & Purpose</th>
                <th className="py-3 px-4 text-right">Original Amount (₹)</th>
                <th className="py-3 px-4 text-right">Recovered (₹)</th>
                <th className="py-3 px-4 text-right">Outstanding (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EEE9]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#68756C]">
                    No employee advances recorded yet. Click &quot;+ Disburse New Advance&quot; to issue a recoverable advance.
                  </td>
                </tr>
              ) : (
                filtered.map((adv) => {
                  const bal = adv.balanceAmount || (adv.amount - adv.repaidAmount);
                  return (
                    <tr key={adv.id} className="hover:bg-[#F9FAF8] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {adv.advanceNumber || "ADV"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{adv.employee?.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {adv.employee?.employeeCode} • {adv.employee?.designation}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div>{adv.purpose || "Salary Advance"}</div>
                        <div className="text-[10px] text-slate-400">
                          {adv.advanceDate ? new Date(adv.advanceDate).toLocaleDateString("en-IN") : "—"} • {adv.deductionMonth || "Payroll"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800">
                        ₹{Number(adv.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-semibold">
                        ₹{Number(adv.repaidAmount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-amber-900">
                        ₹{Number(bal).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            adv.status === "ACTIVE"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {adv.status === "ACTIVE" ? "Active" : "Fully Repaid"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {adv.status === "ACTIVE" && bal > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRepayingAdvance(adv);
                              setRepayAmount(bal);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 transition-colors shadow-2xs cursor-pointer"
                          >
                            Repay
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Repayment Modal */}
      {repayingAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-[#FAFBF9] flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-900">
                Record Advance Repayment
              </h3>
              <button
                onClick={() => setRepayingAdvance(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRepaySubmit} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <span className="text-slate-500 block">Employee:</span>
                <span className="font-bold text-slate-900">{repayingAdvance.employee?.name}</span>
                <span className="text-amber-700 font-semibold block text-[11px]">
                  Current Outstanding: ₹{(repayingAdvance.balanceAmount || repayingAdvance.amount - repayingAdvance.repaidAmount).toLocaleString("en-IN")}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Repayment Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  step="any"
                  min="1"
                  max={repayingAdvance.balanceAmount || repayingAdvance.amount - repayingAdvance.repaidAmount}
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Repayment Notes / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cash settlement / Direct bank refund"
                  value={repayNotes}
                  onChange={(e) => setRepayNotes(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRepayingAdvance(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRepay || Number(repayAmount) <= 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs disabled:opacity-50"
                >
                  {isSubmittingRepay ? "Recording…" : "Confirm Repayment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
