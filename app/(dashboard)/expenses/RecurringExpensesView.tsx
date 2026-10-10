"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createRecurringScheduleAction,
  updateRecurringScheduleAction,
  toggleRecurringScheduleAction,
  deleteRecurringScheduleAction,
  confirmRecurringExpenseAction,
} from "./recurring-actions";

interface RecurringExpensesViewProps {
  schedules: any[];
  dueItems: any[];
  categories: any[];
  vendors: any[];
  employees: any[];
  bankAccounts: any[];
}

export function RecurringExpensesView({
  schedules = [],
  dueItems = [],
  categories = [],
  vendors = [],
  employees = [],
  bankAccounts = [],
}: RecurringExpensesViewProps) {
  const router = useRouter();
  const [scheduleList, setScheduleList] = useState<any[]>(schedules);
  const [dueList, setDueList] = useState<any[]>(dueItems);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
  const [confirmingItem, setConfirmingItem] = useState<any | null>(null);

  // Form states for Create/Edit Schedule
  const [formData, setFormData] = useState({
    title: "",
    frequency: "MONTHLY",
    categoryId: "",
    vendorId: "",
    employeeId: "",
    expectedAmount: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    nextDueDate: new Date().toISOString().split("T")[0],
    billingCycle: "Monthly cycle",
    autoRemind: true,
    notes: "",
  });

  // Form states for Confirming Expense
  const [confirmData, setConfirmData] = useState({
    actualAmount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    billNumber: "",
    notes: "",
    paidBy: "COMPANY",
    paymentStatus: "PAID",
    paidAmount: "",
    bankAccountId: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingSchedule(null);
    setFormData({
      title: "",
      frequency: "MONTHLY",
      categoryId: categories[0]?.id || "",
      vendorId: "",
      employeeId: "",
      expectedAmount: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      nextDueDate: new Date().toISOString().split("T")[0],
      billingCycle: "Monthly cycle",
      autoRemind: true,
      notes: "",
    });
    setError(null);
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (sched: any) => {
    setEditingSchedule(sched);
    setFormData({
      title: sched.title,
      frequency: sched.frequency,
      categoryId: sched.categoryId || "",
      vendorId: sched.vendorId || "",
      employeeId: sched.employeeId || "",
      expectedAmount: sched.expectedAmount?.toString() || "",
      startDate: sched.startDate ? new Date(sched.startDate).toISOString().split("T")[0] : "",
      endDate: sched.endDate ? new Date(sched.endDate).toISOString().split("T")[0] : "",
      nextDueDate: sched.nextDueDate ? new Date(sched.nextDueDate).toISOString().split("T")[0] : "",
      billingCycle: sched.billingCycle || "",
      autoRemind: Boolean(sched.autoRemind),
      notes: sched.notes || "",
    });
    setError(null);
    setIsCreateOpen(true);
  };

  // Save Schedule Submit
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        title: formData.title,
        frequency: formData.frequency,
        categoryId: formData.categoryId || null,
        vendorId: formData.vendorId || null,
        employeeId: formData.employeeId || null,
        expectedAmount: Number(formData.expectedAmount),
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        nextDueDate: formData.nextDueDate,
        billingCycle: formData.billingCycle,
        autoRemind: formData.autoRemind,
        notes: formData.notes,
      };

      let res;
      if (editingSchedule) {
        res = await updateRecurringScheduleAction(editingSchedule.id, payload);
      } else {
        res = await createRecurringScheduleAction(payload);
      }

      if (res.success) {
        setIsCreateOpen(false);
        router.refresh();
      } else {
        setError(res.error || "Failed to save schedule.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle Schedule Active/Inactive
  const handleToggle = async (id: string, currentState: boolean) => {
    const res = await toggleRecurringScheduleAction(id, !currentState);
    if (res.success) {
      setScheduleList((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: !currentState } : s))
      );
      router.refresh();
    } else {
      alert(res.error || "Failed to toggle schedule.");
    }
  };

  // Delete Schedule
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recurring schedule? Historical transactions already generated will remain intact.")) return;
    const res = await deleteRecurringScheduleAction(id);
    if (res.success) {
      setScheduleList((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
    } else {
      alert(res.error || "Failed to delete schedule.");
    }
  };

  // Open Confirm & Generate Modal
  const handleOpenConfirm = (sched: any) => {
    setConfirmingItem(sched);
    const primaryBank = bankAccounts.find((b) => b.isPrimary) || bankAccounts[0];
    setConfirmData({
      actualAmount: sched.expectedAmount?.toString() || "",
      expenseDate: new Date().toISOString().split("T")[0],
      billNumber: "",
      notes: `Recurring obligation: ${sched.title}`,
      paidBy: "COMPANY",
      paymentStatus: "PAID",
      paidAmount: sched.expectedAmount?.toString() || "",
      bankAccountId: primaryBank?.id || "",
    });
    setError(null);
  };

  // Confirm and Generate Expense
  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingItem) return;
    setLoading(true);
    setError(null);

    try {
      const res = await confirmRecurringExpenseAction(confirmingItem.id, {
        actualAmount: Number(confirmData.actualAmount),
        expenseDate: confirmData.expenseDate,
        billNumber: confirmData.billNumber || undefined,
        notes: confirmData.notes,
        paidBy: confirmData.paidBy as any,
        paymentStatus: confirmData.paymentStatus as any,
        paidAmount: confirmData.paymentStatus === "PAID" ? Number(confirmData.actualAmount) : 0,
        bankAccountId: confirmData.bankAccountId || undefined,
      });

      if (res.success) {
        setConfirmingItem(null);
        router.refresh();
      } else {
        setError(res.error || "Failed to confirm recurring expense.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const activeSchedulesCount = scheduleList.filter((s) => s.isActive).length;
  const totalMonthlyObligation = scheduleList
    .filter((s) => s.isActive)
    .reduce((sum, s) => {
      const amt = Number(s.expectedAmount || 0);
      if (s.frequency === "WEEKLY") return sum + amt * 4.33;
      if (s.frequency === "MONTHLY") return sum + amt;
      if (s.frequency === "QUARTERLY") return sum + amt / 3;
      if (s.frequency === "ANNUALLY") return sum + amt / 12;
      return sum + amt;
    }, 0);

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#D9E3DC] shadow-xs">
          <div className="text-xs font-bold text-[#738078] uppercase tracking-wider">
            Active Recurring Schedules
          </div>
          <div className="text-2xl font-extrabold text-[#17211B] mt-1">
            {activeSchedulesCount}{" "}
            <span className="text-xs font-normal text-[#68756C]">
              of {scheduleList.length} total
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#D9E3DC] shadow-xs">
          <div className="text-xs font-bold text-[#738078] uppercase tracking-wider">
            Est. Monthly Commitment
          </div>
          <div className="text-2xl font-extrabold text-[#1b5e4b] mt-1">
            ₹{Math.round(totalMonthlyObligation).toLocaleString("en-IN")}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#D9E3DC] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#738078] uppercase tracking-wider">
              Due For Confirmation
            </div>
            <div className="text-2xl font-extrabold text-[#B27A17] mt-1">
              {dueList.length}
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-[#1b5e4b] hover:bg-[#136f58] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            + New Schedule
          </button>
        </div>
      </div>

      {/* Due Items Banner (Critical ICAI rule: does not automatically debit bank until confirmed) */}
      {dueList.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <span className="text-base">⏰</span>
              <span>Recurring Obligations Due for Review & Booking ({dueList.length})</span>
            </div>
            <span className="text-xs text-amber-700 font-medium">
              Click &quot;Confirm & Record&quot; to book the actual bill without duplicating schedules.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dueList.map((due) => (
              <div
                key={due.id}
                className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-2xs flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-xs text-[#17211B]">{due.title}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800">
                      {due.frequency}
                    </span>
                  </div>
                  <div className="text-xs text-[#68756C] mt-1">
                    {due.category?.name || "General Expense"} ·{" "}
                    {due.vendor?.name || due.employee?.name || "Standard Payee"}
                  </div>
                  <div className="text-base font-extrabold text-[#17211B] mt-2">
                    ₹{Number(due.expectedAmount || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-[#738078] mt-0.5">
                    Due Date:{" "}
                    {new Date(due.nextDueDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenConfirm(due)}
                  className="w-full py-2 bg-[#1b5e4b] hover:bg-[#136f58] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer text-center"
                >
                  ✓ Confirm & Record Expense
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedules Register Table */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E9EEE9] flex justify-between items-center">
          <h3 className="text-sm font-bold text-[#17211B]">
            All Recurring Expense Schedules ({scheduleList.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider bg-[#F9FAF8]">
                <th className="py-3 px-4">OBLIGATION / TITLE</th>
                <th className="py-3 px-3">FREQUENCY</th>
                <th className="py-3 px-3">CATEGORY</th>
                <th className="py-3 px-3">PAYEE / PARTY</th>
                <th className="py-3 px-3 text-right">EXPECTED AMOUNT</th>
                <th className="py-3 px-3">NEXT DUE DATE</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EEE9]">
              {scheduleList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#68756C]">
                    No recurring expense schedules configured. Click &quot;+ New Schedule&quot; to set up monthly salaries, rent, internet or utility obligations.
                  </td>
                </tr>
              ) : (
                scheduleList.map((sched) => {
                  const nextDateStr = new Date(sched.nextDueDate).toLocaleDateString(
                    "en-IN",
                    { day: "numeric", month: "short", year: "numeric" }
                  );
                  return (
                    <tr key={sched.id} className="hover:bg-[#F9FAF8] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#17211B]">
                        {sched.title}
                        {sched.billingCycle && (
                          <div className="text-[11px] text-[#738078] font-normal">
                            {sched.billingCycle}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#E5F3EC] text-[#0B5F46]">
                          {sched.frequency}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-[#17211B]">
                        {sched.category?.name || "General Expense"}
                      </td>
                      <td className="py-3.5 px-3 text-[#17211B]">
                        {sched.vendor?.name || sched.employee?.name || "—"}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-[#17211B]">
                        ₹{Number(sched.expectedAmount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-3 font-medium text-[#17211B]">
                        {nextDateStr}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(sched.id, sched.isActive)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold cursor-pointer transition-colors ${
                            sched.isActive
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-gray-100 text-gray-600 border border-gray-200"
                          }`}
                        >
                          {sched.isActive ? "ACTIVE" : "PAUSED"}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenConfirm(sched)}
                          className="text-[#1b5e4b] hover:underline font-bold text-[11px] cursor-pointer"
                        >
                          Book Now
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(sched)}
                          className="text-blue-600 hover:underline font-medium text-[11px] cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(sched.id)}
                          className="text-red-600 hover:underline font-medium text-[11px] cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT SCHEDULE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-[#D9E3DC] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E9EEE9] flex justify-between items-center bg-[#F9FAF8]">
              <h3 className="text-base font-bold text-[#17211B]">
                {editingSchedule ? "Edit Recurring Schedule" : "Create Recurring Schedule"}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  ⚠️ {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#17211B] mb-1">
                  Schedule Title / Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Office Internet (Airtel) or Executive Payroll"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1b5e4b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#17211B] mb-1">
                    Recurrence Interval <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1b5e4b] bg-white text-[#17211B]"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUALLY">Annually</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#17211B] mb-1">
                    Expected Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 2000"
                    value={formData.expectedAmount}
                    onChange={(e) => setFormData({ ...formData, expectedAmount: e.target.value })}
                    className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1b5e4b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#17211B] mb-1">
                    Expense Category
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1b5e4b] bg-white text-[#17211B]"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#17211B] mb-1">
                    Vendor / Service Provider
                  </label>
                  <select
                    value={formData.vendorId}
                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                    className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1b5e4b] bg-white text-[#17211B]"
                  >
                    <option value="">-- None / Select Vendor --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#17211B] mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1b5e4b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#17211B] mb-1">
                    Next Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.nextDueDate}
                    onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
                    className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1b5e4b]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17211B] mb-1">
                  Billing Cycle Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Due on 1st of every calendar month"
                  value={formData.billingCycle}
                  onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                  className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1b5e4b]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E9EEE9]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-[#68756C] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1b5e4b] hover:bg-[#136f58] rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {loading ? "Saving..." : editingSchedule ? "Update Schedule" : "Create Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM & GENERATE EXPENSE MODAL */}
      {confirmingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-[#D9E3DC] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E9EEE9] flex justify-between items-center bg-[#F9FAF8]">
              <div>
                <h3 className="text-base font-bold text-[#17211B]">
                  Confirm & Book Recurring Expense
                </h3>
                <p className="text-xs text-[#68756C]">
                  Schedule: <span className="font-semibold text-[#17211B]">{confirmingItem.title}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmingItem(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleConfirmSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  ⚠️ {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#17211B] mb-1">
                    Actual Bill Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={confirmData.actualAmount}
                    onChange={(e) =>
                      setConfirmData({
                        ...confirmData,
                        actualAmount: e.target.value,
                        paidAmount: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1b5e4b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#17211B] mb-1">
                    Expense / Bill Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={confirmData.expenseDate}
                    onChange={(e) => setConfirmData({ ...confirmData, expenseDate: e.target.value })}
                    className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1b5e4b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#17211B] mb-1">
                    Bill / Invoice Reference No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-OCT-2026-902"
                    value={confirmData.billNumber}
                    onChange={(e) => setConfirmData({ ...confirmData, billNumber: e.target.value })}
                    className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1b5e4b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#17211B] mb-1">
                    Payment Status
                  </label>
                  <select
                    value={confirmData.paymentStatus}
                    onChange={(e) => setConfirmData({ ...confirmData, paymentStatus: e.target.value })}
                    className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1b5e4b] bg-white text-[#17211B]"
                  >
                    <option value="PAID">Paid Immediately</option>
                    <option value="UNPAID">Unpaid (Record as Payable)</option>
                  </select>
                </div>
              </div>

              {confirmData.paymentStatus === "PAID" && (
                <div>
                  <label className="block text-xs font-bold text-[#17211B] mb-1">
                    Paid From Bank Account
                  </label>
                  <select
                    value={confirmData.bankAccountId}
                    onChange={(e) => setConfirmData({ ...confirmData, bankAccountId: e.target.value })}
                    className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1b5e4b] bg-white text-[#17211B]"
                  >
                    <option value="">-- Default Primary Bank --</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} ({b.accountName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#17211B] mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={confirmData.notes}
                  onChange={(e) => setConfirmData({ ...confirmData, notes: e.target.value })}
                  className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1b5e4b]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E9EEE9]">
                <button
                  type="button"
                  onClick={() => setConfirmingItem(null)}
                  className="px-4 py-2 text-xs font-bold text-[#68756C] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1b5e4b] hover:bg-[#136f58] rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {loading ? "Generating..." : "Post Expense Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
