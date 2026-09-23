"use client";

import { useState, useTransition } from "react";
import { createExpenseAction, updateExpenseAction } from "./actions";
import { AddMasterRecordModal } from "../masters/AddMasterRecordModal";

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

  // Vendor & Category list state & Add modal state
  const [vendorList, setVendorList] = useState(vendors);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);

  const [categoryList, setCategoryList] = useState<any[]>(categories);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [activeItemCategoryIndex, setActiveItemCategoryIndex] = useState<number | null>(null);

  // Nature of Payment: Expense vs Purchase (Direct COGS)
  const [paymentNature, setPaymentNature] = useState<"EXPENSE" | "PURCHASE">(
    expense?.paymentNature || (expense?.isPurchase ? "PURCHASE" : "EXPENSE")
  );

  // Section 1: Expense Details
  const [date, setDate] = useState(
    expense?.expenseDate
      ? new Date(expense.expenseDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  
  // Vendor (Optional for salaries, petty cash, bank charges)
  const [vendorId, setVendorId] = useState(expense?.vendorId || "");
  
  // Unified "Paid By" value: "COMPANY" or "EMP_<id>"
  const initialPaidBy = expense?.employeeId ? `EMP_${expense.employeeId}` : "COMPANY";
  const [paidBySelection, setPaidBySelection] = useState<string>(initialPaidBy);

  // Payment Status & Partial Payment
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "PARTIALLY_PAID" | "UNPAID">(
    expense?.paymentStatus || "PAID"
  );
  const [amountPaidNow, setAmountPaidNow] = useState<string>(
    expense?.paidAmount ? String(expense.paidAmount) : ""
  );

  // Section 2: Items
  const defaultCategoryId = categories[0]?.id || "";
  const defaultCategoryName = categories[0]?.name || "";

  const initialItems: ExpenseItemRow[] = (expense?.items && expense.items.length > 0)
    ? expense.items.map((i: any) => ({
        item: i.description || i.product?.name || "Expense Item",
        categoryId: i.categoryId || defaultCategoryId,
        categoryName: i.category?.name || defaultCategoryName,
        hsnSac: i.hsnSacCode || "9983",
        quantity: Number(i.quantity) || 1,
        rate: Number(i.unitPrice) || Number(i.taxableAmount) || 0,
        gstRate: Number(i.gstRate) || 0,
        tdsRate: Number(i.tdsRate) || 0,
        amount: Number(i.totalAmount) || (Number(i.quantity) || 1) * (Number(i.unitPrice) || 0),
      }))
    : expense
    ? [
        {
          item: expense.notes || "Expense Item",
          categoryId: expense.categoryId || defaultCategoryId,
          categoryName: expense.category?.name || defaultCategoryName,
          hsnSac: "9983",
          quantity: 1,
          rate: Number(expense.taxableAmount) || Number(expense.netAmount) || 0,
          gstRate: 0,
          tdsRate: 0,
          amount: Number(expense.netAmount) || 0,
        },
      ]
    : [
        {
          item: "",
          categoryId: defaultCategoryId,
          categoryName: defaultCategoryName,
          hsnSac: "",
          quantity: 1,
          rate: 0,
          gstRate: 0,
          tdsRate: 0,
          amount: 0,
        },
      ];

  const [items, setItems] = useState<ExpenseItemRow[]>(initialItems);

  // Section 3: Accounting Treatment
  const [isGstEligible, setIsGstEligible] = useState(expense?.isGstEligible ?? true);
  const [expenseTreatment, setExpenseTreatment] = useState(
    expense?.isAsset || expense?.expenseTreatment === "Fixed Asset" ? "Fixed Asset" : "Operating Expense"
  );
  const [assetType, setAssetType] = useState<string>(
    expense?.assetType || "Computers & IT Equipment (40%)"
  );
  const [depreciationRate, setDepreciationRate] = useState<number>(
    Number(expense?.depreciationRate) > 0 ? Number(expense.depreciationRate) : 40
  );
  const [isTdsApplicable, setIsTdsApplicable] = useState(Boolean(Number(expense?.tdsRate) > 0 || expense?.isTdsApplicable));
  const [globalTdsRate, setGlobalTdsRate] = useState<number>(Number(expense?.tdsRate) || 2);

  // Helper to re-calculate an item
  const updateItem = (index: number, field: keyof ExpenseItemRow, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: val };

      if (field === "categoryId") {
        const cat = categoryList.find((c) => c.id === val);
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
        item: "",
        categoryId: defaultCategoryId,
        categoryName: defaultCategoryName,
        hsnSac: "9983",
        quantity: 1,
        rate: 0,
        gstRate: 0,
        tdsRate: 0,
        amount: 0,
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

  const actualPaidAmount = paymentStatus === "PAID"
    ? netTotal
    : paymentStatus === "PARTIALLY_PAID"
    ? Math.min(netTotal, Math.max(0, parseFloat(amountPaidNow) || 0))
    : 0;

  const pendingPayableBalance = Math.max(0, netTotal - actualPaidAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const primaryVendor = vendorList.find((v) => v.id === vendorId);
    const primaryCategory = categories.find((c) => c.id === items[0]?.categoryId);

    const isInterstate = Boolean(
      primaryVendor?.state &&
      primaryVendor.state.trim().toLowerCase() !== "kerala" &&
      primaryVendor.state.trim() !== "32"
    );

    const inputCGST = isInterstate ? 0 : totalGst / 2;
    const inputSGST = isInterstate ? 0 : totalGst / 2;
    const inputIGST = isInterstate ? totalGst : 0;

    const isEmployeePaid = paidBySelection.startsWith("EMP_");
    const selectedEmployeeId = isEmployeePaid ? paidBySelection.replace("EMP_", "") : null;

    const payload = {
      expenseDate: new Date(date),
      vendorId: vendorId || null,
      paidBy: isEmployeePaid ? "EMPLOYEE" : "COMPANY",
      employeeId: selectedEmployeeId,
      paymentNature,
      categoryId: primaryCategory?.id || categories[0]?.id,
      notes: items.map((i) => i.item).filter(Boolean).join(", ") || (paymentNature === "PURCHASE" ? "Material Purchase" : "Operating Expense"),
      subtotal: totalTaxable,
      taxableAmount: totalTaxable,
      totalGST: totalGst,
      totalInputGST: totalGst,
      inputCGST,
      inputSGST,
      inputIGST,
      cgstAmount: inputCGST,
      sgstAmount: inputSGST,
      igstAmount: inputIGST,
      tdsRate: isTdsApplicable ? globalTdsRate : 0,
      tdsAmount: calculatedTds,
      grossAmount: totalTaxable + totalGst,
      netAmount: netTotal,
      paymentStatus,
      paidAmount: actualPaidAmount,
      balancePayable: pendingPayableBalance,
      isGstEligible,
      isTdsApplicable,
      expenseTreatment,
      isAsset: expenseTreatment === "Fixed Asset",
      assetType: expenseTreatment === "Fixed Asset" ? assetType : null,
      depreciationRate: expenseTreatment === "Fixed Asset" ? Number(depreciationRate || 0) : 0,
      items: items.map((i) => ({
        categoryId: i.categoryId,
        description: i.item || (paymentNature === "PURCHASE" ? "Purchase Item" : "Expense Item"),
        hsnSacCode: i.hsnSac,
        quantity: i.quantity,
        unitPrice: i.rate,
        taxableAmount: i.quantity * i.rate,
        gstRate: i.gstRate,
        cgstRate: isInterstate ? 0 : i.gstRate / 2,
        cgstAmount: isInterstate ? 0 : (i.quantity * i.rate * i.gstRate) / 200,
        sgstRate: isInterstate ? 0 : i.gstRate / 2,
        sgstAmount: isInterstate ? 0 : (i.quantity * i.rate * i.gstRate) / 200,
        igstRate: isInterstate ? i.gstRate : 0,
        igstAmount: isInterstate ? (i.quantity * i.rate * i.gstRate) / 100 : 0,
        totalGST: (i.quantity * i.rate * i.gstRate) / 100,
        totalAmount: i.amount,
        isAsset: expenseTreatment === "Fixed Asset",
        depreciationRate: expenseTreatment === "Fixed Asset" ? Number(depreciationRate || 0) : 0,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-2.5 sm:p-4 backdrop-blur-md">
      <div className="bg-white/95 backdrop-blur-2xl w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-slate-200/70 flex justify-between items-center bg-white/70 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold text-sm sm:text-base shrink-0">
              💸
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {isEdit ? "Edit Expense / Purchase" : "Record Expense or Purchase"}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Fast entry with auto GST, TDS, employee reimbursement & partial payment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 sm:p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 sm:space-y-5">
          {/* Nature of Payment Switcher (Operating Overhead vs Purchase COGS) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 bg-slate-50/80 border border-slate-200/70 rounded-2xl">
            <div>
              <span className="text-xs font-bold text-slate-800">Nature of Transaction:</span>
              <p className="text-[10px] sm:text-[11px] text-slate-500">Classify whether this is an operating expense or direct material/service purchase</p>
            </div>
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs w-full sm:w-auto justify-center sm:justify-start">
              <button
                type="button"
                onClick={() => setPaymentNature("EXPENSE")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  paymentNature === "EXPENSE"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🏢 Operating Expense
              </button>
              <button
                type="button"
                onClick={() => setPaymentNature("PURCHASE")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  paymentNature === "PURCHASE"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📦 Purchase (COGS)
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form id="expense-modal-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Section 1: Transaction Details */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Transaction Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Vendor <span className="text-[10px] text-slate-400 font-normal">(Optional for Salary/Petty)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddVendorOpen(true)}
                      className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      + Add Vendor
                    </button>
                  </div>
                  <select
                    value={vendorId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "ADD_NEW") {
                        setIsAddVendorOpen(true);
                      } else {
                        setVendorId(val);
                        const vObj = vendorList.find((v) => v.id === val);
                        if (vObj && vObj.tdsRate && Number(vObj.tdsRate) > 0) {
                          setIsTdsApplicable(true);
                          setGlobalTdsRate(Number(vObj.tdsRate));
                        }
                      }
                    }}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium text-slate-800"
                  >
                    <option value="">— No Vendor / Internal (Salary, Refreshments, Fees) —</option>
                    <option value="ADD_NEW" className="font-bold text-emerald-700">+ Add New Vendor...</option>
                    {vendorList.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Single Consolidated "Paid By" Smart Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Paid By *
                  </label>
                  <select
                    value={paidBySelection}
                    onChange={(e) => setPaidBySelection(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-800"
                  >
                    <optgroup label="Company Accounts">
                      <option value="COMPANY">🏢 Company Bank Account / Cash</option>
                    </optgroup>
                    {employees.length > 0 && (
                      <optgroup label="Employee Reimbursements (Paid by Staff)">
                        {employees.map((emp) => (
                          <option key={emp.id} value={`EMP_${emp.id}`}>
                            👤 {emp.name} (Employee Reimbursement)
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Payment Status & Partial Payment */}
            <div className="p-3.5 bg-slate-50/70 border border-slate-200/70 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800">Payment Clearance Status</label>
                  <span className="text-[11px] text-slate-500">Record full payment, partial deposit, or vendor credit</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus("PAID")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      paymentStatus === "PAID"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    🟢 Fully Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatus("PARTIALLY_PAID");
                      if (!amountPaidNow && netTotal > 0) setAmountPaidNow(String(Math.round(netTotal / 2)));
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      paymentStatus === "PARTIALLY_PAID"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    🟡 Partial Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus("UNPAID")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      paymentStatus === "UNPAID"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    🔴 Credit (Unpaid)
                  </button>
                </div>
              </div>

              {/* Partial Payment Input Field */}
              {paymentStatus === "PARTIALLY_PAID" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Amount Paid Now (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 5000"
                      value={amountPaidNow}
                      onChange={(e) => setAmountPaidNow(e.target.value)}
                      className="w-full h-9 border border-amber-300 rounded-xl px-3 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-xl">
                    <div>
                      <span className="text-[11px] font-bold text-amber-900">Remaining Balance (Payable)</span>
                      <p className="text-[10px] text-amber-700">Tracked in Sundry Creditors</p>
                    </div>
                    <span className="text-sm font-extrabold text-amber-900 font-mono font-tabular">
                      ₹{pendingPayableBalance.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Expense Items */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Particulars &amp; Line Items</h3>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="px-3 py-1 border border-slate-200 text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-colors shadow-2xs"
                >
                  + Add Line Item
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse min-w-[680px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Description / Item</th>
                      <th className="py-2.5 px-3">Category Head</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-2 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-2 text-center">GST</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="e.g. Monthly Office Rent / Refreshments"
                            value={row.item}
                            onChange={(e) => updateItem(idx, "item", e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white font-medium"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={row.categoryId || ""}
                            onChange={(e) => {
                              if (e.target.value === "ADD_NEW") {
                                setActiveItemCategoryIndex(idx);
                                setIsAddCategoryOpen(true);
                              } else {
                                updateItem(idx, "categoryId", e.target.value);
                              }
                            }}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white font-semibold text-slate-800"
                          >
                            <option value="">Select Category...</option>
                            {categoryList
                              .filter((c) => (c.financialType || "EXPENSE").toUpperCase() === "EXPENSE")
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            <option value="ADD_NEW" className="font-bold text-emerald-700">
                              + Add New Category...
                            </option>
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                            className="w-12 border border-slate-200 rounded-lg px-1.5 py-1.5 text-xs text-center bg-white font-medium"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={row.rate}
                            onChange={(e) => updateItem(idx, "rate", Number(e.target.value))}
                            className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-right bg-white font-bold"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <select
                            value={row.gstRate}
                            onChange={(e) => updateItem(idx, "gstRate", Number(e.target.value))}
                            className="border border-slate-200 rounded-lg px-1.5 py-1.5 text-xs bg-white font-medium"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>
                        <td className="py-2 px-3 text-right font-extrabold text-slate-900 font-tabular font-mono">
                          ₹{row.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="text-slate-400 hover:text-rose-600 text-sm font-bold p-1 rounded"
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
            </div>

            {/* Section 4: Accounting Treatment & Calculations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
              <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200/70 rounded-2xl">
                <span className="text-xs font-bold text-slate-800">Tax &amp; Depreciation Rules</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">GST Input Credit</label>
                    <select
                      value={isGstEligible ? "Eligible" : "Ineligible"}
                      onChange={(e) => setIsGstEligible(e.target.value === "Eligible")}
                      className="w-full h-8 border border-slate-200 rounded-lg px-2 text-xs bg-white font-medium"
                    >
                      <option value="Eligible">Eligible (ITC Claim)</option>
                      <option value="Ineligible">Blocked / Ineligible</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">TDS Deduction</label>
                    <select
                      value={isTdsApplicable ? "Yes" : "No"}
                      onChange={(e) => setIsTdsApplicable(e.target.value === "Yes")}
                      className="w-full h-8 border border-slate-200 rounded-lg px-2 text-xs bg-white font-medium"
                    >
                      <option value="No">No TDS</option>
                      <option value="Yes">Deduct TDS</option>
                    </select>
                  </div>
                </div>
                {isTdsApplicable && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">TDS Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={globalTdsRate}
                      onChange={(e) => setGlobalTdsRate(Number(e.target.value))}
                      className="w-full h-8 border border-slate-200 rounded-lg px-2 text-xs bg-white font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Calculations Summary Card */}
              <div className="glass-panel rounded-2xl p-4 space-y-2 text-xs border border-slate-200">
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Taxable Base Value</span>
                  <b className="text-slate-900 font-mono font-tabular">₹{totalTaxable.toLocaleString("en-IN")}</b>
                </div>
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Input GST (CGST + SGST / IGST)</span>
                  <b className="text-slate-900 font-mono font-tabular">₹{totalGst.toLocaleString("en-IN")}</b>
                </div>
                {isTdsApplicable && (
                  <div className="flex justify-between text-amber-700 font-medium">
                    <span>Less: TDS Deducted ({globalTdsRate}%)</span>
                    <b className="font-mono font-tabular">- ₹{calculatedTds.toLocaleString("en-IN")}</b>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold border-t border-slate-200 pt-2 text-slate-900">
                  <span>Net Payable Amount</span>
                  <span className="text-emerald-700 font-mono font-tabular text-base">₹{netTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200/70 flex justify-end items-center gap-3 bg-white/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="expense-modal-form"
            disabled={isPending}
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? "Saving Record..." : isEdit ? "Update Record" : "Record Entry"}
          </button>
        </div>
      </div>

      {isAddVendorOpen && (
        <AddMasterRecordModal
          defaultTab="vendor"
          onClose={() => setIsAddVendorOpen(false)}
          onSuccess={(newVendor) => {
            if (newVendor) {
              setVendorList((prev) => [...prev, newVendor]);
              setVendorId(newVendor.id);
            }
            setIsAddVendorOpen(false);
          }}
        />
      )}

      {isAddCategoryOpen && (
        <AddMasterRecordModal
          defaultTab="category"
          categories={categoryList}
          onClose={() => {
            setIsAddCategoryOpen(false);
            setActiveItemCategoryIndex(null);
          }}
          onSuccess={(newCat) => {
            if (newCat) {
              setCategoryList((prev) => [...prev, newCat]);
              if (activeItemCategoryIndex !== null) {
                updateItem(activeItemCategoryIndex, "categoryId", newCat.id);
              }
            }
            setIsAddCategoryOpen(false);
            setActiveItemCategoryIndex(null);
          }}
        />
      )}
    </div>
  );
}

