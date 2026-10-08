"use client";

import React, { useState, useTransition } from "react";
import { formatCurrency } from "@/lib/utils/currency";
import {
  createStatementImportAction,
  confirmLineMatchAction,
  unmatchLineAction,
  deleteImportAction
} from "./actions";

interface BankAccount {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
}

interface Suggestion {
  type: "INVOICE_PAYMENT" | "EXPENSE" | "BANK_TRANSFER";
  id: string;
  reference: string;
  date: string | Date;
  amount: number;
  partyName: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

interface StatementLine {
  id: string;
  transactionDate: string | Date;
  description: string;
  referenceNo?: string | null;
  withdrawal: number;
  deposit: number;
  balance?: number | null;
  isReconciled: boolean;
  matchedType?: string | null;
  matchedId?: string | null;
  matchedNotes?: string | null;
  suggestions?: Suggestion[];
}

interface ImportData {
  id: string;
  bankAccountId: string;
  fileName: string;
  statementDate?: string | Date | null;
  totalRecords: number;
  status: string;
  lines: StatementLine[];
  reconciledCount?: number;
  unreconciledCount?: number;
}

export function BankReconciliationClient({
  bankAccounts,
  selectedAccountId,
  activeImport
}: {
  bankAccounts: BankAccount[];
  selectedAccountId?: string;
  activeImport?: ImportData | null;
}) {
  const [currentBankId, setCurrentBankId] = useState(selectedAccountId || bankAccounts[0]?.id || "");
  const [isUploading, setIsUploading] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("statement.csv");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleBankChange = (id: string) => {
    setCurrentBankId(id);
    window.location.href = `/bank-transfers/reconciliation?accountId=${id}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvText(event.target?.result as string || "");
      };
      reader.readAsText(file);
    }
  };

  const parseAndSubmit = () => {
    if (!csvText.trim()) {
      setError("Please paste CSV data or select a CSV file.");
      return;
    }

    try {
      const rows = csvText.trim().split("\n");
      if (rows.length < 2) {
        setError("CSV must contain at least a header row and one transaction row.");
        return;
      }

      const parsedLines: any[] = [];
      // Heuristic detection: skip header row if contains letters
      const startIdx = isNaN(Date.parse(rows[0].split(",")[0].trim())) ? 1 : 0;

      for (let i = startIdx; i < rows.length; i++) {
        const parts = rows[i].split(",").map(p => p.trim().replace(/^["']|["']$/g, ""));
        if (parts.length < 3) continue;

        const dateStr = parts[0];
        const desc = parts[1] || "Bank Entry";
        const ref = parts.length > 5 ? parts[2] : "";
        const withdrawal = parts.length > 5 ? parseFloat(parts[3]) || 0 : parseFloat(parts[2]) || 0;
        const deposit = parts.length > 5 ? parseFloat(parts[4]) || 0 : parseFloat(parts[3]) || 0;
        const balance = parts.length > 5 ? parseFloat(parts[5]) || 0 : parseFloat(parts[4]) || undefined;

        parsedLines.push({
          transactionDate: new Date(dateStr).toISOString(),
          description: desc,
          referenceNo: ref || undefined,
          withdrawal: isNaN(withdrawal) ? 0 : withdrawal,
          deposit: isNaN(deposit) ? 0 : deposit,
          balance: isNaN(balance as number) ? undefined : balance
        });
      }

      if (parsedLines.length === 0) {
        setError("Could not parse any valid transaction rows from the CSV.");
        return;
      }

      startTransition(async () => {
        const res = await createStatementImportAction(currentBankId, fileName, parsedLines);
        if (res.success) {
          setIsUploading(false);
          setCsvText("");
          window.location.reload();
        } else {
          setError(res.error || "Upload failed");
        }
      });
    } catch (err: any) {
      setError("Error parsing CSV: " + err.message);
    }
  };

  const handleConfirmMatch = (lineId: string, sug: Suggestion) => {
    startTransition(async () => {
      await confirmLineMatchAction(lineId, sug.type, sug.id, `Matched to ${sug.reference}`);
      window.location.reload();
    });
  };

  const handleUnmatch = (lineId: string) => {
    startTransition(async () => {
      await unmatchLineAction(lineId);
      window.location.reload();
    });
  };

  const handleDeleteImport = (importId: string) => {
    if (confirm("Are you sure you want to delete this bank statement import?")) {
      startTransition(async () => {
        await deleteImportAction(importId);
        window.location.reload();
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-theme-surface border border-theme-border rounded-xl p-6 shadow-sm">
        <div>
          <span className="text-xs font-bold text-theme-primary uppercase tracking-wider">
            INTERNAL CONTROLS & AUDIT
          </span>
          <h1 className="text-2xl font-bold text-theme-text mt-1">Bank Reconciliation (BRS)</h1>
          <p className="text-theme-text-muted text-sm mt-1">
            Reconcile imported bank statement lines with FinLedger accounting records without altering ledger dates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={currentBankId}
            onChange={(e) => handleBankChange(e.target.value)}
            className="border border-theme-border rounded-lg px-3 py-2 text-sm bg-theme-surface focus:ring-2 focus:ring-theme-primary"
          >
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bankName} — {b.accountName} ({b.accountNumber.slice(-4)})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsUploading(!isUploading)}
            className="px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:bg-theme-primary-dark transition-colors shadow-sm flex items-center gap-2"
          >
            <span>+</span> Import Statement
          </button>
        </div>
      </div>

      {/* Control Principle Alert */}
      <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 flex items-start gap-3">
        <span className="text-blue-600 dark:text-blue-400 text-lg">ℹ️</span>
        <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
          <p className="font-semibold">Frozen Accounting Rule — Bank Reconciliation Control:</p>
          <p>
            Bank reconciliation is a verification control mechanism. Matching will NOT automatically alter invoice payment statuses, expense payment statuses, or accounting dates. Unmatched items indicate missing vouchers or timing differences that must be investigated and resolved in the underlying source module.
          </p>
        </div>
      </div>

      {/* Statement Upload Modal / Panel */}
      {isUploading && (
        <div className="bg-theme-surface border border-theme-border rounded-xl p-6 space-y-4 shadow-sm animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-theme-text">Upload Bank Statement (CSV)</h3>
            <button
              onClick={() => setIsUploading(false)}
              className="text-theme-text-muted hover:text-theme-text text-sm"
            >
              ✕ Close
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-theme-text-muted mb-1">Select CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="w-full text-xs text-theme-text file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-theme-primary file:text-white hover:file:bg-theme-primary-dark cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-theme-text-muted mb-1">
                Or Paste CSV Data (Format: Date, Description, Reference, Withdrawal, Deposit, Balance)
              </label>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="2026-05-15, Client Receipt, REC-001, 0, 140220, 921450"
                className="w-full border border-theme-border rounded-lg p-3 text-xs font-mono bg-theme-surface focus:ring-2 focus:ring-theme-primary"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsUploading(false)}
                className="px-4 py-2 border border-theme-border rounded-lg text-xs font-medium text-theme-text-muted hover:text-theme-text"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={parseAndSubmit}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg text-xs font-medium hover:bg-theme-primary-dark disabled:opacity-50"
              >
                {isPending ? "Processing..." : "Import Statement & Run Matching"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Statement Reconciliation View */}
      {activeImport ? (
        <div className="bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-theme-border pb-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-theme-text">{activeImport.fileName}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  activeImport.unreconciledCount === 0
                    ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                }`}>
                  {activeImport.unreconciledCount === 0 ? "Fully Reconciled" : `${activeImport.unreconciledCount} Unmatched`}
                </span>
              </div>
              <p className="text-xs text-theme-text-muted mt-1">
                Imported {new Date(activeImport.statementDate || Date.now()).toLocaleDateString("en-IN")} • Total {activeImport.totalRecords} entries
              </p>
            </div>

            <button
              onClick={() => handleDeleteImport(activeImport.id)}
              className="text-xs text-red-600 hover:text-red-700 underline font-medium"
            >
              Delete Statement Import
            </button>
          </div>

          {/* Table of Statement Lines */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-theme-border text-theme-text-muted bg-theme-surface-hover/30 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Narration / Reference</th>
                  <th className="py-3 px-3 text-right">Withdrawal (Dr)</th>
                  <th className="py-3 px-3 text-right">Deposit (Cr)</th>
                  <th className="py-3 px-3 text-right">Balance</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Matching Suggestion / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {activeImport.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-theme-surface-hover/40 transition-colors">
                    <td className="py-3 px-3 font-mono">
                      {new Date(line.transactionDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate">
                      <div className="font-medium text-theme-text">{line.description}</div>
                      {line.referenceNo && (
                        <div className="text-[10px] text-theme-text-muted font-mono">{line.referenceNo}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-red-600 font-medium">
                      {line.withdrawal > 0 ? formatCurrency(line.withdrawal) : "—"}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-green-600 font-medium">
                      {line.deposit > 0 ? formatCurrency(line.deposit) : "—"}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-theme-text">
                      {line.balance !== null && line.balance !== undefined ? formatCurrency(line.balance) : "—"}
                    </td>
                    <td className="py-3 px-3">
                      {line.isReconciled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded">
                          ✓ Matched
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                          ● Unmatched
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {line.isReconciled ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-theme-text-muted">
                            {line.matchedNotes || "Reconciled with Ledger"}
                          </span>
                          <button
                            onClick={() => handleUnmatch(line.id)}
                            className="text-[10px] text-red-600 hover:underline font-semibold"
                          >
                            Unlink
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {line.suggestions && line.suggestions.length > 0 ? (
                            line.suggestions.map((sug, sIdx) => (
                              <div key={sIdx} className="flex items-center justify-between gap-2 p-1.5 bg-theme-surface-hover/50 rounded border border-theme-border/60">
                                <div>
                                  <div className="font-semibold text-theme-text">
                                    {sug.partyName} ({formatCurrency(sug.amount)})
                                  </div>
                                  <div className="text-[10px] text-theme-text-muted font-mono">
                                    Ref: {sug.reference} • {new Date(sug.date).toLocaleDateString("en-IN")}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleConfirmMatch(line.id, sug)}
                                  className="px-2 py-1 bg-theme-primary text-white rounded text-[10px] font-bold hover:bg-theme-primary-dark whitespace-nowrap shadow-xs"
                                >
                                  Match
                                </button>
                              </div>
                            ))
                          ) : (
                            <span className="text-[10px] text-theme-text-muted italic">
                              No automatic ledger match found
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-theme-surface border border-theme-border rounded-xl p-12 text-center space-y-3 shadow-sm">
          <div className="text-4xl">📄</div>
          <h3 className="text-lg font-bold text-theme-text">No Bank Statement Uploaded</h3>
          <p className="text-xs text-theme-text-muted max-w-md mx-auto">
            Upload your bank statement (CSV format) to compare your bank passbook directly with FinLedger ledgers and verify reconciliations.
          </p>
          <button
            onClick={() => setIsUploading(true)}
            className="px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:bg-theme-primary-dark transition-colors inline-block mt-2"
          >
            Import Bank Statement
          </button>
        </div>
      )}
    </div>
  );
}
