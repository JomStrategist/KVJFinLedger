"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  createExpenseCategoryAction,
  updateExpenseCategoryAction, 
  toggleExpenseCategoryStatusAction,
  deleteExpenseCategoryAction,
  seedCategoriesAction
} from "./category-actions";

export function CategoryClient({ 
  initialCategories = [], 
  categories,
  query = "" 
}: { 
  initialCategories?: any[]; 
  categories?: any[];
  query?: string;
}) {
  const allCategories = categories || initialCategories || [];

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState(query);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formParentId, setFormParentId] = useState("");
  const [formFinType, setFormFinType] = useState("EXPENSE");
  const [formStatementGroup, setFormStatementGroup] = useState("Administrative Expenses");
  const [formIsTax, setFormIsTax] = useState(true);
  const [formDefaultGst, setFormDefaultGst] = useState(18);
  const [formIsCapital, setFormIsCapital] = useState(false);
  const [formIsLoss, setFormIsLoss] = useState(false);
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formDesc, setFormDesc] = useState("");

  const parentCandidates = allCategories.filter(
    (c: any) => (!c.parentId || c.hierarchyLevel === 1) && (!editingCategory || c.id !== editingCategory.id)
  );

  const handleToggle = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await toggleExpenseCategoryStatusAction(id, !currentStatus);
      if (res.success) {
        setSuccessMsg(`Category status updated to ${!currentStatus ? 'Active' : 'Inactive'}.`);
        router.refresh();
      } else {
        alert(res.error || "Failed to toggle category status.");
      }
    });
  };

  const handleDelete = (cat: any) => {
    if (confirm(`Are you sure you want to delete category "${cat.name}"? If historical records reference it, deletion will be blocked.`)) {
      startTransition(async () => {
        const res = await deleteExpenseCategoryAction(cat.id);
        if (res.success) {
          setSuccessMsg(`Category "${cat.name}" deleted successfully.`);
          router.refresh();
        } else {
          alert(res.error || "Failed to delete category.");
        }
      });
    }
  };

  const handleSeed = () => {
    if (confirm("Seed or update standard approved business expense categories and subcategories?")) {
      startTransition(async () => {
        const res = await seedCategoriesAction();
        if (res.success) {
          setSuccessMsg(`Standard expense categories successfully seeded/verified (${res.data} new added).`);
          router.refresh();
        } else {
          alert(res.error || "Failed to seed categories.");
        }
      });
    }
  };

  const openNew = (defaultParentId: string = "") => {
    setEditingCategory(null);
    setFormName("");
    setFormCode("");
    setFormParentId(defaultParentId);
    setFormFinType("EXPENSE");
    setFormStatementGroup("Administrative Expenses");
    setFormIsTax(true);
    setFormDefaultGst(18);
    setFormIsCapital(false);
    setFormIsLoss(false);
    setFormIsRecurring(false);
    setFormDesc("");
    setError(null);
    setShowModal(true);
  };

  const openEdit = (cat: any) => {
    setEditingCategory(cat);
    setFormName(cat.name || "");
    setFormCode(cat.code || "");
    setFormParentId(cat.parentId || "");
    setFormFinType(cat.financialType || "EXPENSE");
    setFormStatementGroup(cat.statementGroup || "Administrative Expenses");
    setFormIsTax(cat.isTaxApplicable !== false);
    setFormDefaultGst(Number(cat.defaultGstRate || 0));
    setFormIsCapital(Boolean(cat.isCapitalAsset || cat.financialType === "ASSET"));
    setFormIsLoss(Boolean(cat.isLossCategory));
    setFormIsRecurring(Boolean(cat.isRecurringDefault));
    setFormDesc(cat.description || "");
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formName.trim()) {
      setError("Category name is required.");
      return;
    }

    const payload = {
      name: formName.trim(),
      code: formCode.trim() || undefined,
      description: formDesc.trim() || null,
      parentId: formParentId || null,
      financialType: formFinType,
      statementGroup: formStatementGroup,
      isTaxApplicable: formIsTax,
      defaultGstRate: formIsTax ? Number(formDefaultGst || 0) : 0,
      isCapitalAsset: formIsCapital || formFinType === "ASSET",
      isLossCategory: formIsLoss,
      isRecurringDefault: formIsRecurring,
    };

    startTransition(async () => {
      let res;
      if (editingCategory) {
        res = await updateExpenseCategoryAction(editingCategory.id, payload);
      } else {
        res = await createExpenseCategoryAction(payload);
      }

      if (res.success) {
        setShowModal(false);
        setEditingCategory(null);
        setSuccessMsg(editingCategory ? "Category updated successfully." : "Category created successfully.");
        router.refresh();
      } else {
        setError(res.error || "Failed to save category.");
      }
    });
  };

  // Filter list
  const filtered = allCategories.filter((cat: any) => {
    const s = search.toLowerCase().trim();
    const matchesSearch =
      !s ||
      cat.name?.toLowerCase().includes(s) ||
      cat.code?.toLowerCase().includes(s) ||
      cat.statementGroup?.toLowerCase().includes(s) ||
      cat.description?.toLowerCase().includes(s);

    const matchesType = typeFilter === "ALL" || cat.financialType === typeFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" ? cat.isActive : !cat.isActive);

    return matchesSearch && matchesType && matchesStatus;
  });

  // Group top-level categories and subcategories
  const topLevelCategories = filtered.filter((c) => !c.parentId);
  const subCategories = filtered.filter((c) => c.parentId);

  return (
    <div className="space-y-5">
      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex justify-between items-center">
          <span>✅ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* Toolbar Card */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Expense Category Master</h2>
            <p className="text-xs text-slate-500">
              Manage parent categories, subcategories, GST relevance, and financial classifications.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSeed}
              disabled={isPending}
              className="px-3.5 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>🌱</span> Seed Standard Heads
            </button>
            <button
              type="button"
              onClick={() => openNew()}
              className="px-4 py-2 bg-[#177B55] hover:bg-[#0B5F46] text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>+</span> Add Category
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search category by name, code, group..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 px-3 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white placeholder-slate-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 px-3 border border-[#D9E3DC] rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#177B55]"
            >
              <option value="ALL">All Account Types</option>
              <option value="EXPENSE">Operating Expense</option>
              <option value="ASSET">Fixed Asset / Capex</option>
              <option value="LIABILITY">Liability</option>
              <option value="INCOME">Income</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 border border-[#D9E3DC] rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#177B55]"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Categories Table View */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAFBF9] border-b border-[#D9E3DC] text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-5 py-3.5">Category & Subcategories</th>
                <th className="px-4 py-3.5">Code</th>
                <th className="px-4 py-3.5">Accounting Classification</th>
                <th className="px-4 py-3.5">Tax / GST</th>
                <th className="px-4 py-3.5 text-center">Txns</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBF1ED]">
              {topLevelCategories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No categories found. Click "Seed Standard Heads" to populate approved Indian ERP categories.
                  </td>
                </tr>
              ) : (
                topLevelCategories.map((cat) => {
                  const children = subCategories.filter((sc) => sc.parentId === cat.id);
                  return (
                    <div key={cat.id} style={{ display: "contents" }}>
                      {/* Top-Level Category Row */}
                      <tr className={`hover:bg-slate-50/70 transition-colors ${!cat.isActive ? 'bg-slate-50/40 opacity-60' : ''}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{cat.name}</span>
                            {cat.isCapitalAsset && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                                Capex / Asset
                              </span>
                            )}
                            {cat.isLossCategory && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 font-bold border border-rose-200">
                                Loss
                              </span>
                            )}
                            {cat.isRecurringDefault && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 font-bold border border-amber-200">
                                Recurring
                              </span>
                            )}
                          </div>
                          {cat.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{cat.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-600 font-medium">
                          {cat.code || "-"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-medium text-slate-800">{cat.statementGroup || "Operating"}</span>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">{cat.financialType}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          {cat.isTaxApplicable ? (
                            <span className="text-emerald-700 font-medium">GST Applicable ({cat.defaultGstRate || 18}%)</span>
                          ) : (
                            <span className="text-slate-400 font-medium">Exempt / Non-GST</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-700">
                          {cat._count?.expenses || 0}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggle(cat.id, cat.isActive)}
                            disabled={isPending}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                              cat.isActive
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                            title="Click to toggle active status"
                          >
                            {cat.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => openNew(cat.id)}
                            className="text-[#177B55] hover:text-[#0B5F46] font-semibold text-xs"
                            title="Add a subcategory under this head"
                          >
                            + Sub
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(cat)}
                            className="text-slate-600 hover:text-slate-900 font-medium text-xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat)}
                            className="text-rose-600 hover:text-rose-800 font-medium text-xs ml-1"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>

                      {/* Nested Subcategories */}
                      {children.map((sub) => (
                        <tr key={sub.id} className={`bg-slate-50/50 hover:bg-slate-100/60 transition-colors ${!sub.isActive ? 'opacity-60' : ''}`}>
                          <td className="px-5 py-2.5 pl-10 border-l-2 border-[#177B55]/30">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 text-xs">↳</span>
                              <span className="font-semibold text-slate-800">{sub.name}</span>
                              {sub.isRecurringDefault && (
                                <span className="px-1 py-0.2 rounded text-[9px] bg-amber-50 text-amber-700 font-bold border border-amber-200">
                                  Recurring
                                </span>
                              )}
                            </div>
                            {sub.description && (
                              <p className="text-[10px] text-slate-400 ml-4">{sub.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                            {sub.code || "-"}
                          </td>
                          <td className="px-4 py-2.5 text-[11px] text-slate-600">
                            Subcategory of <span className="font-medium text-slate-800">{cat.name}</span>
                          </td>
                          <td className="px-4 py-2.5 text-[11px]">
                            {sub.isTaxApplicable ? `GST (${sub.defaultGstRate || 18}%)` : 'Non-GST'}
                          </td>
                          <td className="px-4 py-2.5 text-center text-slate-600">
                            {sub._count?.expenses || 0}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggle(sub.id, sub.isActive)}
                              disabled={isPending}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                                sub.isActive
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {sub.isActive ? "Active" : "Inactive"}
                            </button>
                          </td>
                          <td className="px-5 py-2.5 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => openEdit(sub)}
                              className="text-slate-600 hover:text-slate-900 font-medium text-xs"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(sub)}
                              className="text-rose-600 hover:text-rose-800 font-medium text-xs ml-1"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </div>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {editingCategory ? "Edit Expense Category" : "Add New Expense Category"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                  ⚠️ {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Internet Expenses, Office Rent..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EXP-COMM-INT"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Parent Category (For Subcategories)
                  </label>
                  <select
                    value={formParentId}
                    onChange={(e) => setFormParentId(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    <option value="">None (Top-Level Head)</option>
                    {parentCandidates.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.statementGroup || p.financialType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Financial Classification
                  </label>
                  <select
                    value={formFinType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormFinType(val);
                      if (val === "ASSET") setFormIsCapital(true);
                      else setFormIsCapital(false);
                    }}
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    <option value="EXPENSE">Operating Expense (P&L)</option>
                    <option value="ASSET">Fixed Asset / Capex (Balance Sheet)</option>
                    <option value="LIABILITY">Liability / Payable (Balance Sheet)</option>
                    <option value="INCOME">Income / Revenue (P&L)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Statement Group
                  </label>
                  <select
                    value={formStatementGroup}
                    onChange={(e) => setFormStatementGroup(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    <option value="Administrative Expenses">Administrative Expenses</option>
                    <option value="Employee Costs">Employee Costs / Personnel</option>
                    <option value="Selling & Marketing Expenses">Selling & Marketing</option>
                    <option value="Professional & Consultancy">Professional & Consultancy</option>
                    <option value="Finance Costs">Finance Costs / Bank Charges</option>
                    <option value="Fixed Assets">Fixed Assets (Balance Sheet)</option>
                    <option value="Other Expenses">Other Expenses / Losses</option>
                  </select>
                </div>
              </div>

              {/* Accounting & Tax Treatment Configuration */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Accounting & Tax Rules
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={formIsTax}
                      onChange={(e) => setFormIsTax(e.target.checked)}
                      className="rounded text-[#177B55] focus:ring-[#177B55]"
                    />
                    <span>GST Relevant for this Category</span>
                  </label>

                  {formIsTax && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-medium">Default GST:</span>
                      <select
                        value={formDefaultGst}
                        onChange={(e) => setFormDefaultGst(Number(e.target.value))}
                        className="h-7 px-2 border border-slate-200 rounded text-xs bg-white"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={formIsCapital}
                      onChange={(e) => {
                        setFormIsCapital(e.target.checked);
                        if (e.target.checked) setFormFinType("ASSET");
                      }}
                      className="rounded text-[#177B55] focus:ring-[#177B55]"
                    />
                    <span>Capitalise as Fixed Asset (Capex)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={formIsLoss}
                      onChange={(e) => setFormIsLoss(e.target.checked)}
                      className="rounded text-[#177B55] focus:ring-[#177B55]"
                    />
                    <span>Classify as Business Loss / Disposal</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={formIsRecurring}
                      onChange={(e) => setFormIsRecurring(e.target.checked)}
                      className="rounded text-[#177B55] focus:ring-[#177B55]"
                    />
                    <span>Common Recurring Obligation (Monthly Bills / Subscriptions / Salary)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Additional context or statutory notes..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-[#177B55] hover:bg-[#0B5F46] text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
