"use client";

import { useState, useTransition } from "react";
import { createExpenseAction, updateExpenseAction } from "./actions";

interface ExpenseItemRow {
  item: string;
  categoryId: string;
  categoryName: string;
  hsnSac: string;
  quantity: number;
  rate: number;
  gstRate: number;
  tdsRate: number;
  amount: number;
}

export function ExpenseModal({
  expense,
  vendors = [],
  categories = [],
  employees = [],
  onClose,
  onSuccess,
}: {
  expense?: any;
  vendors: any[];
  categories: any[];
  employees: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(expense?.id);

  // Section 1: Expense Details
  const [date, setDate] = useState(
    expense?.expenseDate
      ? new Date(expense.expenseDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [vendorId, setVendorId] = useState(expense?.vendorId || (vendors[0]?.id || ""));
  const [paidBy, setPaidBy] = useState<"Company" | "Employee">(expense?.employeeId ? "Employee" : "Company");
  const [employeeId, setEmployeeId] = useState(expense?.employeeId || "");

  // Section 2: Items
  const defaultCategoryId = categories[0]?.id || "";
  const defaultCategoryName = categories[0]?.name || "Operating Expense";

  const initialItems: ExpenseItemRow[] = (expense?.items && expense.items.length > 0)
    ? expense.items.map((i: any) => ({
        item: i.product?.name || i.description || "Expense Item",
        categoryId: i.categoryId || defaultCategoryId,
        categoryName: i.category?.name || defaultCategoryName,
        hsnSac: i.hsnSacCode || "9983",
        quantity: Number(i.quantity) || 1,
        rate: Number(i.unitPrice) || Number(i.taxableAmount) || 0,
        gstRate: Number(i.gstRate) || 18,
        tdsRate: Number(i.tdsRate) || 0,
        amount: Number(i.totalAmount) || 0,
      }))
    : [
        {
          item: "Laptop",
          categoryId: defaultCategoryId,
          categoryName: defaultCategoryName,
          hsnSac: "8471",
          quantity: 1,
          rate: 50000,
          gstRate: 18,
          tdsRate: 0,
          amount: 59000,
        },
      ];

  const [items, setItems] = useState<ExpenseItemRow[]>(initialItems);

  // Section 3: Accounting Treatment
  const [isGstEligible, setIsGstEligible] = useState(expense?.isGstEligible ?? true);
  const [expenseTreatment, setExpenseTreatment] = useState(expense?.expenseTreatment || "Operating Expense");
  const [isTdsApplicable, setIsTdsApplicable] = useState(Boolean(Number(expense?.tdsRate) > 0 || expense?.isTdsApplicable));
  const [globalTdsRate, setGlobalTdsRate] = useState<number>(Number(expense?.tdsRate) || 2);

  // Helper to re-calculate an item
  const updateItem = (index: number, field: keyof ExpenseItemRow, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: val };

      if (field === "categoryId") {
        const cat = categories.find((c) => c.id === val);
        if (cat) target.categoryName = cat.name;
      }

      const qty = Number(target.quantity) || 1;
      const rate = Number(target.rate) || 0;
      const gst = Number(target.gstRate) || 0;

      const taxable = qty * rate;
      const gstAmount = (taxable * gst) / 100;
      target.amount = Math.round(taxable + gstAmount);

      next[index] = target;
      return next;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        item: "Service / Item",
        categoryId: defaultCategoryId,
        categoryName: defaultCategoryName,
        hsnSac: "9983",
        quantity: 1,
        rate: 10000,
        gstRate: 18,
        tdsRate: 0,
        amount: 11800,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const totalTaxable = items.reduce((sum, it) => sum + it.quantity * it.rate, 0);
  const totalGst = items.reduce((sum, it) => sum + (it.quantity * it.rate * it.gstRate) / 100, 0);
  const calculatedTds = isTdsApplicable ? (totalTaxable * globalTdsRate) / 100 : 0;
  const netTotal = totalTaxable + totalGst - calculatedTds;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const primaryVendor = vendors.find((v) => v.id === vendorId);
    const primaryCategory = categories.find((c) => c.id === items[0]?.categoryId);

    const payload = {
      expenseDate: new Date(date),
      vendorId: vendorId || null,
      employeeId: paidBy === "Employee" && employeeId ? employeeId : null,
      categoryId: primaryCategory?.id || categories[0]?.id,
      notes: items.map((i) => i.item).join(", "),
      taxableAmount: totalTaxable,
      totalGST: totalGst,
      cgstAmount: totalGst / 2,
      sgstAmount: totalGst / 2,
      igstAmount: 0,
      tdsRate: isTdsApplicable ? globalTdsRate : 0,
      tdsAmount: calculatedTds,
      grossAmount: totalTaxable + totalGst,
      netAmount: netTotal,
      isGstEligible,
      isTdsApplicable,
      items: items.map((i) => ({
        categoryId: i.categoryId,
        description: i.item,
        hsnSacCode: i.hsnSac,
        quantity: i.quantity,
        unitPrice: i.rate,
        taxableAmount: i.quantity * i.rate,
        gstRate: i.gstRate,
        cgstRate: i.gstRate / 2,
        cgstAmount: (i.quantity * i.rate * i.gstRate) / 200,
        sgstRate: i.gstRate / 2,
        sgstAmount: (i.quantity * i.rate * i.gstRate) / 200,
        igstRate: 0,
        igstAmount: 0,
        totalGST: (i.quantity * i.rate * i.gstRate) / 100,
        totalAmount: i.amount,
      })),
    };

    startTransition(async () => {
      let res;
      if (isEdit) {
        res = await updateExpenseAction(expense.id, payload);
      } else {
        res = await createExpenseAction(payload);
      }

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-[#D9E3DC] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#D9E3DC] flex justify-between items-center bg-white">
          <h2 className="text-xl font-bold text-[#17211B]">
            {isEdit ? "Edit Expense" : "Add Expense"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#68756C] hover:text-[#17211B] p-2 rounded-lg hover:bg-[#F4F7F3] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Info Callout Banner */}
          <div className="bg-[#F6FAF7] border border-[#D9E3DC] p-3.5 rounded-xl text-xs text-[#59675E] leading-relaxed">
            <b>Simple entry:</b> record the purchase, categorise it, then the system handles GST, TDS and asset treatment.
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form id="expense-modal-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Expense Details */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[#17211B]">Expense Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    Vendor *
                  </label>
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    <option value="">— Select Vendor —</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    Paid By
                  </label>
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value as any)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    <option value="Company">Company</option>
                    <option value="Employee">Employee</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    Employee
                  </label>
                  <select
                    value={employeeId}
                    disabled={paidBy !== "Employee"}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55] disabled:bg-gray-100"
                  >
                    <option value="">—</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Expense Items */}
            <div className="space-y-3 pt-2 border-t border-[#D9E3DC]">
              <h3 className="text-sm font-bold text-[#17211B]">Expense Items</h3>

              <div className="overflow-x-auto border border-[#D9E3DC] rounded-xl">
                <table className="w-full text-left text-xs border-collapse min-w-[720px]">
                  <thead className="bg-[#F6FAF7] border-b border-[#D9E3DC] text-[#738078] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">ITEM</th>
                      <th className="py-2.5 px-3">CATEGORY</th>
                      <th className="py-2.5 px-2">HSN/SAC</th>
                      <th className="py-2.5 px-2 text-center">QTY</th>
                      <th className="py-2.5 px-2 text-right">RATE</th>
                      <th className="py-2.5 px-2 text-center">GST</th>
                      <th className="py-2.5 px-2 text-center">TDS</th>
                      <th className="py-2.5 px-3 text-right">AMOUNT</th>
                      <th className="py-2.5 px-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9EEE9]">
                    {items.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F9FAF8]">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.item}
                            onChange={(e) => updateItem(idx, "item", e.target.value)}
                            className="w-full border border-[#D9E3DC] rounded-lg px-2 py-1 text-xs bg-white"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={row.categoryId}
                            onChange={(e) => updateItem(idx, "categoryId", e.target.value)}
                            className="w-full border border-[#D9E3DC] rounded-lg px-2 py-1 text-xs bg-white"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={row.hsnSac}
                            onChange={(e) => updateItem(idx, "hsnSac", e.target.value)}
                            className="w-16 border border-[#D9E3DC] rounded-lg px-1.5 py-1 text-xs text-center bg-white"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                            className="w-12 border border-[#D9E3DC] rounded-lg px-1.5 py-1 text-xs text-center bg-white"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={row.rate}
                            onChange={(e) => updateItem(idx, "rate", Number(e.target.value))}
                            className="w-24 border border-[#D9E3DC] rounded-lg px-2 py-1 text-xs text-right bg-white"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <select
                            value={row.gstRate}
                            onChange={(e) => updateItem(idx, "gstRate", Number(e.target.value))}
                            className="border border-[#D9E3DC] rounded-lg px-1.5 py-1 text-xs bg-white"
                          >
                            <option value="18">18%</option>
                            <option value="12">12%</option>
                            <option value="5">5%</option>
                            <option value="0">0%</option>
                          </select>
                        </td>
                        <td className="py-2 px-2 text-center text-[#68756C]">
                          {isTdsApplicable ? `${globalTdsRate}%` : "No TDS"}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-[#17211B]">
                          ₹{row.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="text-red-500 hover:text-red-700 text-sm font-bold"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={addItemRow}
                className="px-3 py-1.5 border border-[#D9E3DC] text-[#177B55] hover:bg-[#F4F7F3] rounded-lg text-xs font-bold transition-colors shadow-2xs"
              >
                + Add Another Item
              </button>
            </div>

            {/* Section 3: Accounting Treatment */}
            <div className="space-y-2 pt-2 border-t border-[#D9E3DC]">
              <h3 className="text-sm font-bold text-[#17211B]">Accounting Treatment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    GST Input Credit
                  </label>
                  <select
                    value={isGstEligible ? "Eligible" : "Ineligible"}
                    onChange={(e) => setIsGstEligible(e.target.value === "Eligible")}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    <option value="Eligible">Eligible</option>
                    <option value="Ineligible">Ineligible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    Expense Treatment
                  </label>
                  <select
                    value={expenseTreatment}
                    onChange={(e) => setExpenseTreatment(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    <option value="Fixed Asset">Fixed Asset</option>
                    <option value="Operating Expense">Operating Expense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    TDS Applicable?
                  </label>
                  <select
                    value={isTdsApplicable ? "Yes" : "No"}
                    onChange={(e) => setIsTdsApplicable(e.target.value === "Yes")}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    TDS %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!isTdsApplicable}
                    value={globalTdsRate}
                    onChange={(e) => setGlobalTdsRate(Number(e.target.value))}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55] disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Calculations Summary */}
            <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4 ml-auto w-full max-w-sm space-y-2 text-xs">
              <div className="flex justify-between text-[#68756C]">
                <span>Taxable Value</span>
                <b className="text-[#17211B]">₹{totalTaxable.toLocaleString("en-IN")}</b>
              </div>
              <div className="flex justify-between text-[#68756C]">
                <span>GST (Total)</span>
                <b className="text-[#17211B]">₹{totalGst.toLocaleString("en-IN")}</b>
              </div>
              <div className="flex justify-between text-[#68756C]">
                <span>TDS</span>
                <b className="text-[#17211B]">₹{calculatedTds.toLocaleString("en-IN")}</b>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-[#D9E3DC] pt-2 text-[#17211B]">
                <span>Total</span>
                <b className="text-[#177B55]">₹{netTotal.toLocaleString("en-IN")}</b>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#D9E3DC] flex justify-end items-center gap-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#D9E3DC] rounded-xl text-xs font-bold hover:bg-[#F4F7F3] text-[#17211B] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="expense-modal-form"
            disabled={isPending}
            className="px-5 py-2 bg-[#1b5e4b] hover:bg-[#136f58] text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving Expense..." : "Save Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}
