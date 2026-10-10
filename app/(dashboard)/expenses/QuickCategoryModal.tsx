"use client";

import { useState, useTransition, useEffect } from "react";
import { 
  createExpenseCategoryAction, 
  updateExpenseCategoryAction,
  toggleExpenseCategoryStatusAction
} from "./category-actions";

export interface QuickCategoryModalProps {
  isOpen: boolean;
  categoryToEdit?: any | null;
  categories: any[];
  onClose: () => void;
  onSuccess: (savedCategory: any) => void;
}

export function QuickCategoryModal({
  isOpen,
  categoryToEdit,
  categories = [],
  onClose,
  onSuccess,
}: QuickCategoryModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(categoryToEdit?.id);

  // Form states
  const [name, setName] = useState(categoryToEdit?.name || "");
  const [code, setCode] = useState(categoryToEdit?.code || "");
  const [isCodeManual, setIsCodeManual] = useState(Boolean(categoryToEdit?.code));
  const [parentId, setParentId] = useState(categoryToEdit?.parentId || "");
  
  // Classification
  const [accountingClassification, setAccountingClassification] = useState<
    "OPERATING_EXPENSE" | "EMPLOYEE_EXPENSE" | "FIXED_ASSET" | "BUSINESS_LOSS" | "FINANCE_COST" | "OTHER"
  >(
    categoryToEdit?.isCapitalAsset || categoryToEdit?.accountingClassification === "FIXED_ASSET" || categoryToEdit?.financialType === "ASSET"
      ? "FIXED_ASSET"
      : categoryToEdit?.isLossCategory || categoryToEdit?.accountingClassification === "BUSINESS_LOSS"
      ? "BUSINESS_LOSS"
      : categoryToEdit?.accountingClassification === "EMPLOYEE_EXPENSE" || categoryToEdit?.statementGroup === "Employee Costs"
      ? "EMPLOYEE_EXPENSE"
      : categoryToEdit?.statementGroup === "Finance Costs"
      ? "FINANCE_COST"
      : "OPERATING_EXPENSE"
  );

  const [statementGroup, setStatementGroup] = useState(categoryToEdit?.statementGroup || "Administrative Expenses");
  const [isTaxApplicable, setIsTaxApplicable] = useState(categoryToEdit?.isTaxApplicable ?? true);
  const [defaultGstRate, setDefaultGstRate] = useState<number>(Number(categoryToEdit?.defaultGstRate ?? 18));
  const [isRecurringDefault, setIsRecurringDefault] = useState(Boolean(categoryToEdit?.isRecurringDefault));
  const [description, setDescription] = useState(categoryToEdit?.description || "");
  const [isActive, setIsActive] = useState<boolean>(categoryToEdit?.isActive ?? true);

  // Sync when categoryToEdit changes
  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name || "");
      setCode(categoryToEdit.code || "");
      setIsCodeManual(Boolean(categoryToEdit.code));
      setParentId(categoryToEdit.parentId || "");
      
      const isAsset = categoryToEdit.isCapitalAsset || categoryToEdit.accountingClassification === "FIXED_ASSET" || categoryToEdit.financialType === "ASSET";
      const isLoss = categoryToEdit.isLossCategory || categoryToEdit.accountingClassification === "BUSINESS_LOSS";
      const isEmp = categoryToEdit.accountingClassification === "EMPLOYEE_EXPENSE" || categoryToEdit.statementGroup === "Employee Costs";
      const isFin = categoryToEdit.statementGroup === "Finance Costs";
      
      if (isAsset) setAccountingClassification("FIXED_ASSET");
      else if (isLoss) setAccountingClassification("BUSINESS_LOSS");
      else if (isEmp) setAccountingClassification("EMPLOYEE_EXPENSE");
      else if (isFin) setAccountingClassification("FINANCE_COST");
      else setAccountingClassification("OPERATING_EXPENSE");

      setStatementGroup(categoryToEdit.statementGroup || "Administrative Expenses");
      setIsTaxApplicable(categoryToEdit.isTaxApplicable ?? true);
      setDefaultGstRate(Number(categoryToEdit.defaultGstRate ?? 18));
      setIsRecurringDefault(Boolean(categoryToEdit.isRecurringDefault));
      setDescription(categoryToEdit.description || "");
      setIsActive(categoryToEdit.isActive ?? true);
    } else {
      setName("");
      setCode("");
      setIsCodeManual(false);
      setParentId("");
      setAccountingClassification("OPERATING_EXPENSE");
      setStatementGroup("Administrative Expenses");
      setIsTaxApplicable(true);
      setDefaultGstRate(18);
      setIsRecurringDefault(false);
      setDescription("");
      setIsActive(true);
    }
    setError(null);
  }, [categoryToEdit, isOpen]);

  // Auto-generate code if not manually edited
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isCodeManual) {
      const prefix = 
        accountingClassification === "FIXED_ASSET" ? "AST" :
        accountingClassification === "BUSINESS_LOSS" ? "LOS" :
        accountingClassification === "EMPLOYEE_EXPENSE" ? "EMP" : "EXP";
      const slug = val
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
        .slice(0, 8);
      setCode(slug ? `${prefix}_${slug}` : "");
    }
  };

  const handleClassificationChange = (val: any) => {
    setAccountingClassification(val);
    if (val === "FIXED_ASSET") {
      setStatementGroup("Fixed Assets");
      setIsTaxApplicable(true);
      setDefaultGstRate(18);
    } else if (val === "EMPLOYEE_EXPENSE") {
      setStatementGroup("Employee Costs");
      setIsTaxApplicable(false);
      setDefaultGstRate(0);
      setIsRecurringDefault(true);
    } else if (val === "BUSINESS_LOSS") {
      setStatementGroup("Other Expenses");
      setIsTaxApplicable(false);
      setDefaultGstRate(0);
    } else if (val === "FINANCE_COST") {
      setStatementGroup("Finance Costs");
      setIsTaxApplicable(true);
      setDefaultGstRate(18);
    } else {
      setStatementGroup("Administrative Expenses");
      setIsTaxApplicable(true);
      setDefaultGstRate(18);
    }
  };

  if (!isOpen) return null;

  // Filter candidates for parent categories (level 1 or top-level, excluding self)
  const parentCandidates = categories.filter(
    (c) => (!c.parentId || c.hierarchyLevel === 1) && (!categoryToEdit || c.id !== categoryToEdit.id)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Category Name is required.");
      return;
    }

    setError(null);

    const isCapital = accountingClassification === "FIXED_ASSET";
    const isLoss = accountingClassification === "BUSINESS_LOSS";
    const finType = isCapital ? "ASSET" : "EXPENSE";

    const payload: any = {
      name: name.trim(),
      code: code.trim() || undefined,
      description: description.trim() || undefined,
      parentId: parentId || null,
      financialType: finType,
      statementGroup: statementGroup || (isCapital ? "Fixed Assets" : isLoss ? "Other Expenses" : "Administrative Expenses"),
      isCapitalAsset: isCapital,
      isLossCategory: isLoss,
      accountingClassification,
      isTaxApplicable,
      defaultGstRate: isTaxApplicable ? Number(defaultGstRate) : 0,
      isRecurringDefault,
      isActive,
    };

    startTransition(async () => {
      let res;
      if (isEdit) {
        res = await updateExpenseCategoryAction(categoryToEdit.id, payload);
      } else {
        res = await createExpenseCategoryAction(payload);
      }

      if (res.success && res.data) {
        onSuccess(res.data);
        onClose();
      } else {
        setError(res.error || "Failed to save category.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
              🏷️
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {isEdit ? "Edit Expense Category" : "Add New Expense Category"}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Direct category master creation &amp; accounting configuration
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form id="quick-category-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Category Name & Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Internet Bill / Electricity Bill"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category Code
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated (e.g. EXP_INT)"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setIsCodeManual(true);
                  }}
                  className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono font-bold text-slate-800"
                />
              </div>
            </div>

            {/* Parent Category / Subcategory Nesting */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Parent Category <span className="text-[10px] text-slate-400 font-normal">(Optional subcategory grouping)</span>
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium text-slate-800"
              >
                <option value="">— None (Top-Level Category Head) —</option>
                {parentCandidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    📁 {p.name} ({p.statementGroup || "Category"})
                  </option>
                ))}
              </select>
            </div>

            {/* Accounting Classification */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Accounting Classification *
              </label>
              <select
                value={accountingClassification}
                onChange={(e) => handleClassificationChange(e.target.value)}
                className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-900"
              >
                <option value="OPERATING_EXPENSE">🏢 Operating Expense (P&L OPEX Overhead)</option>
                <option value="EMPLOYEE_EXPENSE">👥 Employee Cost (Salaries, Bonus, Welfare)</option>
                <option value="FIXED_ASSET">🏛️ Fixed Asset / Capex (Balance Sheet Capitalized)</option>
                <option value="BUSINESS_LOSS">📉 Business Loss (ICAI Loss Treatment in Other Expenses)</option>
                <option value="FINANCE_COST">💳 Finance &amp; Bank Charges (Finance Costs)</option>
                <option value="OTHER">📦 Other Legitimate Business Expense</option>
              </select>
            </div>

            {/* Tax Configuration */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800">GST Applicability</span>
                  <p className="text-[10px] text-slate-500">Enable if vendor bills carry GST for this category</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTaxApplicable}
                    onChange={(e) => {
                      setIsTaxApplicable(e.target.checked);
                      if (!e.target.checked) setDefaultGstRate(0);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {isTaxApplicable && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-700">Default GST Rate:</span>
                  <select
                    value={defaultGstRate}
                    onChange={(e) => setDefaultGstRate(Number(e.target.value))}
                    className="h-8 border border-slate-200 rounded-lg px-2 text-xs bg-white font-bold text-slate-800"
                  >
                    <option value="0">0% (Nil / Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18% (Standard)</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              )}
            </div>

            {/* Recurring Default & Active Status */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 text-xs font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={isRecurringDefault}
                  onChange={(e) => setIsRecurringDefault(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span>🔁 Recurring Schedule Default</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 text-xs font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span>{isActive ? "🟢 Active Category" : "⚪ Inactive"}</span>
              </label>
            </div>

            {/* Description / Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description / Accounting Notes <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Broadband, leased lines and SIM connections"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium text-slate-800 resize-none"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200/80 flex justify-between items-center bg-slate-50/70 shrink-0">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to ${isActive ? "deactivate" : "activate"} this category? Historical transactions will remain preserved.`)) {
                    startTransition(async () => {
                      const res = await toggleExpenseCategoryStatusAction(categoryToEdit.id, !isActive);
                      if (res.success) {
                        setIsActive(!isActive);
                        onSuccess({ ...categoryToEdit, isActive: !isActive });
                        onClose();
                      } else {
                        setError(res.error || "Failed to toggle status.");
                      }
                    });
                  }
                }}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                  isActive 
                    ? "text-rose-700 border-rose-200 hover:bg-rose-50" 
                    : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                {isActive ? "Deactivate Category" : "Re-activate Category"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="quick-category-form"
              disabled={isPending}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isPending ? "Saving..." : isEdit ? "Update Category" : "Save Category"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
