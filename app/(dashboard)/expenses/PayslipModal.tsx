"use client";

import { useEffect, useState } from "react";
import { getPayslipAction } from "./payroll-actions";

export function PayslipModal({
  expenseId,
  onClose,
  initialData,
}: {
  expenseId?: string;
  onClose: () => void;
  initialData?: any;
}) {
  const [data, setData] = useState<any | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData && expenseId) {
      setLoading(true);
      getPayslipAction(expenseId)
        .then((res) => {
          if (res.success) {
            setData(res.data);
          } else {
            setError(res.error || "Failed to load payslip.");
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [expenseId, initialData]);

  const handlePrint = () => {
    window.print();
  };

  const handleEmailPayslip = () => {
    if (!data?.employee?.name) return;
    setEmailStatus(`Payslip for ${data.periodMonth} sent to ${data.employee.email || "employee inbox"}`);
    setTimeout(() => setEmailStatus(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[96vh]">
        {/* Modal Controls Toolbar (Hidden in Print) */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-[#FAFBF9] print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-100 text-[#177B55] rounded-xl text-sm font-bold">📄</span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Salary Slip Preview</h2>
              <p className="text-[11px] text-slate-500">Official employee monthly payslip & tax breakdown</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEmailPayslip}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <span>✉️</span> Email Slip
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#177B55] hover:bg-[#0B5F46] text-white transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <span>🖨️</span> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-sm font-bold ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Email sent notification */}
        {emailStatus && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold text-center print:hidden animate-in fade-in">
            ✓ {emailStatus}
          </div>
        )}

        {/* Printable Payslip Body */}
        <div className="p-6 sm:p-8 overflow-y-auto print:p-0 print:overflow-visible">
          {loading && (
            <div className="py-20 text-center text-slate-400 text-sm">Loading payslip details…</div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold text-center">
              ⚠️ {error}
            </div>
          )}

          {data && (
            <div
              id="printable-payslip"
              className="border border-slate-300 rounded-xl p-6 sm:p-8 bg-white text-slate-900 font-sans print:border-0 print:p-4 text-xs space-y-6 shadow-xs"
            >
              {/* Header Letterhead */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {/* Official KVJ Logo */}
                    <img src="/kvj-logo.png" alt="KVJ Analytics" className="h-9 w-auto object-contain" />
                    <div>
                      <h1 className="text-lg font-black tracking-tight text-slate-900">
                        {data.company?.name || "KVJ ANALYTICS"}
                      </h1>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                        IT & Analytics Services
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-sm mt-1">
                    {data.company?.address || "Kerala, India"}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    GSTIN: {data.company?.gstin || "32AABCK1234F1Z5"} • PAN: {data.company?.pan || "AABCK1234F"}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <div className="inline-block bg-slate-100 border border-slate-200 rounded-lg px-3 py-1 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Pay Slip
                  </div>
                  <p className="text-xs font-bold text-slate-700 mt-1">
                    {data.periodMonth}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Slip No: {data.payslipNumber}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Disbursed: {data.paymentDate ? new Date(data.paymentDate).toLocaleDateString("en-IN") : "—"}
                  </p>
                </div>
              </div>

              {/* Employee Information Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/70 border border-slate-200 rounded-xl text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Employee Name</span>
                  <span className="font-bold text-slate-900">{data.employee?.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Employee Code</span>
                  <span className="font-mono font-bold text-slate-800">{data.employee?.employeeCode}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Designation</span>
                  <span className="font-medium text-slate-800">{data.employee?.designation}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Department</span>
                  <span className="font-medium text-slate-800">{data.employee?.department}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">PAN Card</span>
                  <span className="font-mono font-bold text-slate-800">{data.employee?.pan}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Bank Name</span>
                  <span className="font-medium text-slate-800">{data.employee?.bankName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Bank A/C No</span>
                  <span className="font-mono font-bold text-slate-800">{data.employee?.accountNo}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">IFSC Code</span>
                  <span className="font-mono font-bold text-slate-800">{data.employee?.ifsc}</span>
                </div>
              </div>

              {/* Earnings & Deductions Dual Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Earnings Column */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-emerald-50/80 px-3.5 py-2 border-b border-emerald-100 font-bold text-[#177B55] text-xs uppercase tracking-wider flex justify-between">
                    <span>Earnings</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {data.earnings?.map((item: any, i: number) => (
                      <div key={i} className="px-3.5 py-2 flex justify-between text-xs hover:bg-slate-50/50">
                        <span className="text-slate-700">{item.label}</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          ₹{Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-50 px-3.5 py-2.5 border-t border-slate-200 font-bold flex justify-between text-xs text-slate-900">
                    <span>Total Gross Earnings</span>
                    <span className="font-mono text-[#177B55]">
                      ₹{Number(data.grossEarnings).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Deductions Column */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-rose-50/80 px-3.5 py-2 border-b border-rose-100 font-bold text-rose-700 text-xs uppercase tracking-wider flex justify-between">
                    <span>Deductions</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {data.deductions?.map((item: any, i: number) => (
                      <div key={i} className="px-3.5 py-2 flex justify-between text-xs hover:bg-slate-50/50">
                        <span className="text-slate-700">{item.label}</span>
                        <span className="font-semibold text-rose-600 font-mono">
                          ₹{Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                    {(!data.deductions || data.deductions.length === 0) && (
                      <div className="px-3.5 py-4 text-center text-slate-400 text-xs">
                        No statutory deductions applied
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-50 px-3.5 py-2.5 border-t border-slate-200 font-bold flex justify-between text-xs text-slate-900">
                    <span>Total Deductions</span>
                    <span className="font-mono text-rose-600">
                      ₹{Number(data.totalDeductions || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Payable Highlight Banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <span className="text-[10px] font-bold text-[#177B55] uppercase tracking-wider block">
                    Net Take-Home Salary Disbursed
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {data.netInWords}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-black text-[#0B5F46] font-mono">
                    ₹{Number(data.netPayable).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Compliance & Signatory Footer */}
              <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-[11px] text-slate-500">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-700">Note:</p>
                  <p>• Generated electronically by FinLedger ERP system.</p>
                  <p>• Form 16 will be issued at the end of the financial year.</p>
                </div>
                <div className="text-right space-y-12">
                  <div className="h-8 border-b border-slate-400 w-44 ml-auto"></div>
                  <p className="font-bold text-slate-800">Authorized Signatory</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2 bg-[#FAFBF9] print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
