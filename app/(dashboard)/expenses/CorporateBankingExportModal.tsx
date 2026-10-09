"use client";

import { useState } from "react";
import { BankPortalType, BANK_PORTALS, generateCorporateBankBatchFile, BankingPayoutRecord } from "@/lib/banking-export";

export function CorporateBankingExportModal({
  employees = [],
  onClose,
}: {
  employees: any[];
  onClose: () => void;
}) {
  const [selectedPortal, setSelectedPortal] = useState<BankPortalType>("HDFC");
  const [debitAccount, setDebitAccount] = useState("000123456789");
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const activeStaff = employees.filter((e) => e.isActive && Number(e.salary || 0) > 0);

  const handleDownload = () => {
    const today = new Date().toISOString().split("T")[0];
    const records: BankingPayoutRecord[] = activeStaff.map((emp) => ({
      employeeCode: emp.employeeCode || "EMP",
      employeeName: emp.name,
      accountNumber: emp.bankAccountNo || "000000000000",
      ifscCode: emp.bankIfsc || "HDFC0001234",
      bankName: emp.bankName || "Bank",
      amount: Number(emp.salary || 0),
      paymentDate: today,
      remarks: `Salary Payout ${emp.employeeCode || ""}`,
      email: emp.email || undefined,
      phone: emp.phone || undefined,
    }));

    const file = generateCorporateBankBatchFile(records, selectedPortal, debitAccount);
    const blob = new Blob([file.content], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-[#FAFBF9]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg border border-blue-200">
              🏦
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Corporate Banking Batch Payout Export
              </h2>
              <p className="text-xs text-slate-500">
                Download formatted bulk upload files for corporate net banking portals
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
        <div className="p-6 space-y-5">
          {downloadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl text-center animate-in fade-in">
              ✓ Batch file generated and downloaded successfully!
            </div>
          )}

          {/* Debit Bank Account */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Corporate Debit Account Number
            </label>
            <input
              type="text"
              value={debitAccount}
              onChange={(e) => setDebitAccount(e.target.value)}
              placeholder="e.g. 50200012345678"
              className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Your company primary account number registered on the net banking CMS portal.
            </p>
          </div>

          {/* Select Bank Portal */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-700">
              Target Corporate Bank Portal
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BANK_PORTALS.map((portal) => (
                <label
                  key={portal.id}
                  className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                    selectedPortal === portal.id
                      ? "border-blue-600 bg-blue-50/50 shadow-2xs"
                      : "border-slate-200 hover:bg-slate-50/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="bankPortal"
                    checked={selectedPortal === portal.id}
                    onChange={() => setSelectedPortal(portal.id)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">{portal.name}</span>
                    <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                      {portal.description}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Staff Summary */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
            <span className="text-slate-600">Active Staff with Configured Salaries:</span>
            <span className="font-bold text-slate-900 font-mono">{activeStaff.length} employees</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 bg-[#FAFBF9]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={activeStaff.length === 0}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            <span>📥</span> Download Batch File
          </button>
        </div>
      </div>
    </div>
  );
}
