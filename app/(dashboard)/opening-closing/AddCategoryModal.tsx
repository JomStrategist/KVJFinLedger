"use client";

import { useState, useTransition } from "react";
import { createCategoryForOpeningAction } from "./actions";


// Only Balance Sheet financial types are valid for opening balances.
// Income & Expense are P&L items that reset each FY — never carried forward.
const BALANCE_SHEET_FINANCIAL_TYPES = [
  { code: "ASSET",     name: "Asset",     hint: "e.g. Fixed Assets, Cash & Bank, Trade Receivables" },
  { code: "LIABILITY", name: "Liability", hint: "e.g. Trade Payables, Borrowings, Statutory Liabilities" },
  { code: "EQUITY",   name: "Equity",   hint: "e.g. Capital, Retained Earnings, Reserves" },
];

const DEFAULT_STATEMENT_GROUPS_MAP: Record<string, string[]> = {
  EXPENSE: ["Administrative Expenses", "Employee Costs", "Professional & Consultancy", "Selling & Marketing Expenses", "Finance Costs", "Depreciation & Amortisation", "Other Expenses"],
  INCOME: ["Revenue from Operations", "Other Income"],
  ASSET: ["Fixed Assets", "Current Assets", "Cash & Cash Equivalents", "Trade Receivables", "Other Current Assets"],
  LIABILITY: ["Current Liabilities", "Trade Payables", "Statutory Liabilities", "Other Current Liabilities", "Borrowings"],
  EQUITY: ["Capital", "Retained Earnings", "Reserves"],
};

const DEFAULT_ACCOUNT_NATURES_MAP: Record<string, string[]> = {
  EXPENSE: ["Operating Expense", "Finance Cost", "Depreciation", "Other Expense"],
  INCOME: ["Operating Income", "Other Income"],
  ASSET: ["Current Asset", "Non-Current Asset", "Fixed Asset", "Cash & Bank", "Trade Receivable", "Other Asset"],
  LIABILITY: ["Current Liability", "Non-Current Liability", "Trade Payable", "Statutory Liability", "Borrowing", "Other Liability"],
  EQUITY: ["Capital", "Retained Earnings", "Reserve"],
};

interface AddCategoryModalProps {
  onClose: () => void;
  onSuccess: (newCategory: { id: string; name: string; financialType: string }) => void;
}

export function AddCategoryModal({ onClose, onSuccess }: AddCategoryModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [financialType, setFinancialType] = useState("ASSET");
  const [categoryName, setCategoryName] = useState("");
  const [statementGroup, setStatementGroup] = useState(DEFAULT_STATEMENT_GROUPS_MAP["ASSET"][0]);
  const [accountNature, setAccountNature] = useState(DEFAULT_ACCOUNT_NATURES_MAP["ASSET"][0]);

  const selectedTypeObj = BALANCE_SHEET_FINANCIAL_TYPES.find((t) => t.code === financialType);

  const handleFinancialTypeChange = (newType: string) => {
    setFinancialType(newType);
    setStatementGroup((DEFAULT_STATEMENT_GROUPS_MAP[newType] || [])[0] || "");
    setAccountNature((DEFAULT_ACCOUNT_NATURES_MAP[newType] || [])[0] || "");
  };

  const derivedStatement = "Balance Sheet"; // all BS types
  const derivedNormalBalance =
    financialType === "ASSET" ? "Debit" : "Credit"; // Liability & Equity = Credit

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setError(null);

    startTransition(async () => {
      const res = await createCategoryForOpeningAction({
        name: categoryName.trim(),
        financialType,
        statementGroup: statementGroup || undefined,
        accountNature: accountNature || undefined,
      });

      if (res.success && res.data) {
        onSuccess({ id: res.data.id, name: res.data.name, financialType: res.data.financialType });
      } else {
        setError(res.error || "Failed to create category.");
      }
    });
  };

  return (
    /* z-60 so it layers above the Opening Balance modal (z-50) */
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#D9E3DC] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D9E3DC] flex justify-between items-center bg-[#F6FAF7]">
          <div>
            <h2 className="text-lg font-bold text-[#17211B]">Add Balance Sheet Category</h2>
            <p className="text-xs text-[#68756C] mt-0.5">
              Opening balances only apply to Balance Sheet items — Assets, Liabilities &amp; Equity.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#68756C] hover:text-[#17211B] p-2 rounded-lg hover:bg-[#E8EFE8] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Category Name */}
          <div>
            <label className="block text-xs font-semibold text-[#68756C] mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Fixed Assets, Trade Payables…"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
            />
          </div>

          {/* Financial Type — Balance Sheet only */}
          <div>
            <label className="block text-xs font-semibold text-[#68756C] mb-1">
              Financial Type *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BALANCE_SHEET_FINANCIAL_TYPES.map((ft) => (
                <button
                  key={ft.code}
                  type="button"
                  onClick={() => handleFinancialTypeChange(ft.code)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    financialType === ft.code
                      ? "bg-[#1b5e4b] text-white border-[#1b5e4b] shadow-sm"
                      : "border-[#D9E3DC] text-[#68756C] hover:border-[#177B55] hover:text-[#177B55]"
                  }`}
                >
                  {ft.name}
                </button>
              ))}
            </div>
            {selectedTypeObj && (
              <p className="text-[10px] text-[#9aaa9e] mt-1.5">{selectedTypeObj.hint}</p>
            )}
          </div>

          {/* Accounting derived info bar */}
          <div className="p-3 bg-[#F4F7F3] border border-[#D9E3DC] rounded-xl flex items-center justify-between text-xs text-[#68756C]">
            <div>
              <span className="font-bold">Financial Statement: </span>
              <span className="font-semibold text-[#177B55]">{derivedStatement}</span>
            </div>
            <div>
              <span className="font-bold">Normal Balance: </span>
              <span className="font-semibold text-[#177B55]">{derivedNormalBalance}</span>
            </div>
          </div>

          {/* Statement Group */}
          {(DEFAULT_STATEMENT_GROUPS_MAP[financialType] || []).length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-[#68756C] mb-1">Statement Group</label>
              <select
                value={statementGroup}
                onChange={(e) => setStatementGroup(e.target.value)}
                className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
              >
                {(DEFAULT_STATEMENT_GROUPS_MAP[financialType] || []).map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          )}

          {/* Account Nature */}
          {(DEFAULT_ACCOUNT_NATURES_MAP[financialType] || []).length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-[#68756C] mb-1">Account Nature</label>
              <select
                value={accountNature}
                onChange={(e) => setAccountNature(e.target.value)}
                className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
              >
                {(DEFAULT_ACCOUNT_NATURES_MAP[financialType] || []).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          )}

          {/* Footer */}
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
              disabled={isPending || !categoryName.trim()}
              className="px-6 py-2 bg-[#1b5e4b] hover:bg-[#136f58] text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
            >
              {isPending ? "Creating…" : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
