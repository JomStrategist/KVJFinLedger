"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TaxEngine } from "@/lib/tax";
import { BUSINESS_LOCATION } from "@/lib/config/business";
import { createExpenseAction, updateExpenseAction } from "./actions";
import { createVendorAction } from "../vendors/actions";
import { createExpenseCategoryAction } from "./category-actions";
import { AddMasterRecordModal } from "../masters/AddMasterRecordModal";

export function ExpenseForm({ 
  initialData, 
  vendors: initialVendors,
  categories: initialCategories,
  products = [],
  employees = []
}: { 
  initialData?: any;
  vendors: any[];
  categories: any[];
  products?: any[];
  employees?: any[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [vendors, setVendors] = useState(initialVendors);
  const [categories, setCategories] = useState(initialCategories);

  // Paid By, Employee, Payment Status
  const [paidBy, setPaidBy] = useState<"COMPANY" | "EMPLOYEE">(
    initialData?.paidBy || "COMPANY"
  );
  const [employeeId, setEmployeeId] = useState<string>(
    initialData?.employeeId || ""
  );
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "UNPAID" | "PARTIALLY_PAID">(
    initialData?.paymentStatus || (initialData?.paidBy === "EMPLOYEE" ? "UNPAID" : "PAID")
  );

  // Additional Settings State
  const [isAdditionalSettingsOpen, setIsAdditionalSettingsOpen] = useState(false);
  const [itcEligibility, setItcEligibility] = useState<string>("ELIGIBLE");
  const [isCapitalAsset, setIsCapitalAsset] = useState<boolean>(
    Boolean(initialData?.isAsset)
  );
  const [assetCategory, setAssetCategory] = useState<string>(
    initialData?.assetType || "COMPUTERS_IT"
  );
  const [depreciationRate, setDepreciationRate] = useState<number>(
    Number(initialData?.depreciationRate) > 0 ? Number(initialData.depreciationRate) : 40
  );

  // Notes
  const [notes, setNotes] = useState(initialData?.notes || "");
  
  // Expense Items
  const [items, setItems] = useState<any[]>(
    initialData?.items?.map((item: any) => ({
      productId: item.productId || "",
      vendorId: item.vendorId || "",
      categoryId: item.categoryId || "",
      date: item.date ? new Date(item.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      hsnSacCode: item.hsnSacCode || "",
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      gstRate: Number(item.gstRate),
      isCustomGst: ![0, 5, 12, 18, 28].includes(Number(item.gstRate)),
      tdsRate: item.tdsRate?.toString() || "",
      isCustomTds: item.tdsRate !== null && item.tdsRate !== undefined && ![0, 1, 2, 5, 10].includes(Number(item.tdsRate)),
      unit: item.unit || "NOS",
    })) || [{ 
      productId: "", vendorId: "", categoryId: "", 
      date: new Date().toISOString().split('T')[0], hsnSacCode: "", 
      quantity: 1, unitPrice: 0, gstRate: 0, isCustomGst: false, 
      tdsRate: "", isCustomTds: false, unit: "NOS" 
    }]
  );

  const handlePaidByChange = (newPaidBy: "COMPANY" | "EMPLOYEE") => {
    setPaidBy(newPaidBy);
    if (newPaidBy === "COMPANY") {
      setEmployeeId("");
      // When company pays, default status can be PAID
      if (!initialData) setPaymentStatus("PAID");
    } else {
      // When employee pays, default status can be UNPAID (pending reimbursement)
      if (!initialData) setPaymentStatus("UNPAID");
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const [modalConfig, setModalConfig] = useState<{ type: string; itemIndex: number } | null>(null);

  const handleItemVendorChange = (index: number, value: string) => {
    if (value === "ADD_NEW") {
      setModalConfig({ type: "vendor", itemIndex: index });
    } else {
      handleItemChange(index, "vendorId", value);
    }
  };

  const handleItemCategoryChange = (index: number, value: string) => {
    if (value === "ADD_NEW") {
      setModalConfig({ type: "category", itemIndex: index });
    } else {
      handleItemChange(index, "categoryId", value);
    }
  };

  const handleModalSuccess = (newRecord?: any) => {
    if (modalConfig?.type === "vendor" && newRecord) {
      setVendors((prev) => [...prev, newRecord]);
      handleItemChange(modalConfig.itemIndex, "vendorId", newRecord.id);
    } else if (modalConfig?.type === "category" && newRecord) {
      setCategories((prev) => [...prev, newRecord]);
      handleItemChange(modalConfig.itemIndex, "categoryId", newRecord.id);
    }
    setModalConfig(null);
  };

  const handleProductChange = (index: number, productId: string) => {
    const newItems = [...items];
    const selectedProduct = products.find(p => p.id === productId);
    
    if (selectedProduct) {
      const gst = Number(selectedProduct.gstRate || 0);
      newItems[index] = {
        ...newItems[index],
        productId,
        hsnSacCode: selectedProduct.hsnSacCode || newItems[index].hsnSacCode,
        unitPrice: Number(selectedProduct.purchasePrice || selectedProduct.sellingPrice || newItems[index].unitPrice),
        gstRate: gst,
        isCustomGst: ![0, 5, 12, 18, 28].includes(gst)
      };
    } else {
      newItems[index].productId = "";
    }
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { 
    productId: "", vendorId: "", categoryId: "", 
    date: new Date().toISOString().split('T')[0], hsnSacCode: "", 
    quantity: 1, unitPrice: 0, gstRate: 0, isCustomGst: false, 
    tdsRate: "", isCustomTds: false, unit: "NOS" 
  }]);
  
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Tax Engine Calculation
  const taxInput = items.map(item => {
    const grossAmount = Number(item.quantity) * Number(item.unitPrice);
    const itemVendor = vendors.find(v => v.id === item.vendorId);
    return {
      taxableAmount: grossAmount,
      gstRate: Number(item.gstRate) || 0,
      grossAmount,
      discountAmount: 0,
      customerState: itemVendor?.state || BUSINESS_LOCATION.state,
      tdsRate: Number(item.tdsRate) || 0
    };
  });

  const calc = TaxEngine.calculateInvoiceTaxes({
    items: taxInput,
    businessState: BUSINESS_LOCATION.state,
    customerState: BUSINESS_LOCATION.state // fallback
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (items.some(i => !i.categoryId)) {
      setError("All items must have a category.");
      return;
    }

    if (paidBy === "EMPLOYEE" && !employeeId) {
      setError("Please select the employee who paid for this expense.");
      return;
    }

    // State Validation for Vendors
    const missingStateVendors = items.filter(i => {
      if (!i.vendorId) return false;
      const vendor = vendors.find(v => v.id === i.vendorId);
      return !vendor?.state || vendor.state.trim() === "";
    });

    if (missingStateVendors.length > 0) {
      setError("One or more selected vendors are missing a State. Please update the vendor's profile with a valid State before proceeding. State is required for accurate tax calculation.");
      return;
    }

    const payload = {
      expenseDate: items[0]?.date || new Date().toISOString().split('T')[0],
      vendorId: items[0]?.vendorId || null,
      categoryId: items[0]?.categoryId || null,
      paidBy,
      employeeId: paidBy === "EMPLOYEE" ? employeeId : null,
      paymentStatus,
      notes: notes.trim() || null,
      
      subtotal: Number(calc.subtotal ?? calc.taxableAmount ?? 0),
      discountAmount: Number(calc.totalDiscount ?? 0),
      taxableAmount: Number(calc.taxableAmount ?? 0),

      inputCGST: Number(calc.totalCGST ?? 0),
      inputSGST: Number(calc.totalSGST ?? 0),
      inputIGST: Number(calc.totalIGST ?? 0),
      totalInputGST: Number(calc.totalGST ?? 0),

      tdsRate: 0,
      tdsAmount: Number(calc.tdsAmount ?? 0),
      grossAmount: Number(calc.grossAmount ?? 0),
      netAmount: Number(calc.netAmount ?? 0),
      isAsset: isCapitalAsset,
      assetType: isCapitalAsset ? assetCategory : null,
      depreciationRate: isCapitalAsset ? Number(depreciationRate || 0) : 0,

      items: items.map((item, i) => ({
        productId: item.productId || null,
        vendorId: item.vendorId || null,
        categoryId: item.categoryId || null,
        date: item.date,
        hsnSacCode: item.hsnSacCode,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        gstRate: item.gstRate,
        taxableAmount: calc.calculatedItems[i].taxableAmount,
        cgstRate: calc.calculatedItems[i].cgstRate,
        cgstAmount: calc.calculatedItems[i].cgstAmount,
        sgstRate: calc.calculatedItems[i].sgstRate,
        sgstAmount: calc.calculatedItems[i].sgstAmount,
        igstRate: calc.calculatedItems[i].igstRate,
        igstAmount: calc.calculatedItems[i].igstAmount,
        totalGST: calc.calculatedItems[i].totalGST,
        tdsRate: Number(item.tdsRate) || 0,
        tdsAmount: calc.calculatedItems[i].tdsAmount || 0,
        isAsset: isCapitalAsset,
        depreciationRate: isCapitalAsset ? Number(depreciationRate || 0) : 0,
        totalAmount: calc.calculatedItems[i].totalAmount
      }))
    };

    startTransition(async () => {
      const res = initialData 
        ? await updateExpenseAction(initialData.id, payload)
        : await createExpenseAction(payload);
      
      if (res.success) {
        router.push(initialData ? `/expenses/${initialData.id}` : "/expenses");
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Title & Context */}
      <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-theme-primary uppercase tracking-wider">
            EXPENSE ENTRY
          </span>
          <h1 className="text-2xl font-bold text-theme-text mt-1">
            {initialData ? `Edit Expense (${initialData.expenseNumber})` : "Add Expense"}
          </h1>
          <p className="text-theme-text-muted mt-1 text-sm">
            Add one or more expense items. Each item is categorised for financial statements.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-theme-text-muted hover:text-theme-text p-2 rounded-lg hover:bg-theme-surface-hover transition-colors"
          title="Close / Cancel"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/10 border border-red-300 rounded-xl text-red-700 font-medium text-sm flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Expense Items Card */}
      <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-theme-text">Expense Items</h2>
            <p className="text-xs text-theme-text-muted mt-0.5">
              Use one row for each expense. Different vendors, categories or tax treatments can be entered separately.
            </p>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center justify-center px-4 py-2 border border-theme-border rounded-lg text-sm font-medium text-theme-primary bg-theme-surface hover:bg-theme-surface-hover shadow-sm transition-colors gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            + Add Item
          </button>
        </div>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead>
              <tr className="border-b-2 border-theme-border text-xs font-semibold text-theme-text-muted uppercase tracking-wider">
                <th className="pb-3 px-2 w-36">Date</th>
                <th className="pb-3 px-2 w-44">Vendor</th>
                <th className="pb-3 px-2 w-44">Item (Optional)</th>
                <th className="pb-3 px-2 w-44">Category</th>
                <th className="pb-3 px-2 w-28">HSN / SAC</th>
                <th className="pb-3 px-2 w-24 text-right">Qty</th>
                <th className="pb-3 px-2 w-28 text-right">Rate</th>
                <th className="pb-3 px-2 w-32 text-right">GST</th>
                <th className="pb-3 px-2 w-32 text-right">Amount</th>
                <th className="pb-3 px-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {items.map((item, index) => (
                <tr key={index} className="group hover:bg-theme-surface-hover/50 transition-colors">
                  <td className="py-2.5 px-2">
                    <input
                      type="date"
                      required
                      value={item.date}
                      onChange={e => handleItemChange(index, "date", e.target.value)}
                      className="w-full border border-theme-border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-theme-primary focus:border-transparent text-xs bg-theme-surface"
                    />
                  </td>
                  <td className="py-2.5 px-2">
                    <select
                      value={item.vendorId}
                      onChange={e => handleItemVendorChange(index, e.target.value)}
                      className="w-full border border-theme-border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-theme-primary focus:border-transparent text-xs bg-theme-surface"
                    >
                      <option value="">No Vendor</option>
                      {vendors.map(v => {
                        const hasDiffName = v.businessName && v.businessName.trim().toLowerCase() !== v.name.trim().toLowerCase();
                        return (
                          <option key={v.id} value={v.id}>
                            {v.name}{hasDiffName ? ` (${v.businessName})` : ''}
                          </option>
                        );
                      })}
                      <option value="ADD_NEW" className="font-bold text-theme-primary">+ Add Custom Vendor</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-2">
                    <select
                      value={item.productId}
                      onChange={e => handleProductChange(index, e.target.value)}
                      className="w-full border border-theme-border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-theme-primary focus:border-transparent text-xs bg-theme-surface"
                    >
                      <option value="">Select Item</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 px-2">
                    <select
                      required
                      value={item.categoryId}
                      onChange={e => handleItemCategoryChange(index, e.target.value)}
                      className="w-full border border-theme-border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-theme-primary focus:border-transparent text-xs bg-theme-surface"
                    >
                      <option value="">Select Category...</option>
                      {categories
                        .filter((c) => (c.financialType || "EXPENSE").toUpperCase() === "EXPENSE")
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      <option value="ADD_NEW" className="font-bold text-theme-primary">+ Add New Category...</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-2">
                    <input
                      type="text"
                      placeholder="HSN/SAC"
                      value={item.hsnSacCode}
                      onChange={e => handleItemChange(index, "hsnSacCode", e.target.value)}
                      className="w-full border border-theme-border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-theme-primary focus:border-transparent text-xs bg-theme-surface"
                    />
                  </td>
                  <td className="py-2.5 px-2">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={item.quantity}
                      onChange={e => handleItemChange(index, "quantity", e.target.value)}
                      className="w-full border border-theme-border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-theme-primary focus:border-transparent text-xs text-right bg-theme-surface"
                    />
                  </td>
                  <td className="py-2.5 px-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.unitPrice}
                      onChange={e => handleItemChange(index, "unitPrice", e.target.value)}
                      className="w-full border border-theme-border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-theme-primary focus:border-transparent text-xs text-right bg-theme-surface"
                    />
                  </td>
                  <td className="py-2.5 px-2">
                    {!item.isCustomGst ? (
                      <select
                        value={item.gstRate}
                        onChange={e => {
                          if (e.target.value === "CUSTOM") {
                            handleItemChange(index, "isCustomGst", true);
                            handleItemChange(index, "gstRate", 0);
                          } else {
                            handleItemChange(index, "gstRate", e.target.value);
                          }
                        }}
                        className="w-full border border-theme-border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-theme-primary focus:border-transparent text-xs text-right bg-theme-surface"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className="flex items-center w-full border border-theme-border rounded-lg px-1.5 py-1 focus-within:ring-2 focus-within:ring-theme-primary bg-theme-surface">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            required
                            value={item.gstRate}
                            onChange={e => handleItemChange(index, "gstRate", e.target.value)}
                            className="w-full border-none focus:ring-0 bg-transparent text-xs text-right p-0"
                          />
                          <span className="text-theme-text-muted text-xs font-medium ml-1">%</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => {
                            handleItemChange(index, "isCustomGst", false);
                            handleItemChange(index, "gstRate", 0);
                          }}
                          className="text-theme-text-muted hover:text-theme-text p-0.5"
                          title="Reset to standard rates"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-right font-semibold text-theme-text text-xs">
                    ₹{calc.calculatedItems[index]?.totalAmount?.toFixed(2) || "0.00"}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="text-red-500 hover:text-red-700 disabled:opacity-25 p-1 rounded transition-colors"
                      title="Remove Item"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row of 3 Cards: Paid By | Employee | Payment Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Paid By Card */}
        <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border p-5 flex flex-col justify-between">
          <div>
            <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-2">
              PAID BY
            </label>
            <select
              value={paidBy}
              onChange={(e) => handlePaidByChange(e.target.value as "COMPANY" | "EMPLOYEE")}
              className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-theme-surface text-theme-text"
            >
              <option value="COMPANY">Company</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
          </div>
          <p className="text-xs text-theme-text-muted mt-3">
            {paidBy === "COMPANY"
              ? "Company payment is recorded against the bank."
              : "Employee paid personally and the company may need to reimburse the employee."}
          </p>
        </div>

        {/* Employee Card */}
        <div className={`bg-theme-surface rounded-xl shadow-sm border border-theme-border p-5 flex flex-col justify-between ${paidBy === "COMPANY" ? "opacity-80" : ""}`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-theme-text uppercase tracking-wider">
                EMPLOYEE
              </label>
              {paidBy === "EMPLOYEE" && (
                <span className="text-[10px] uppercase font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                  Required
                </span>
              )}
            </div>
            <select
              value={employeeId}
              disabled={paidBy === "COMPANY"}
              required={paidBy === "EMPLOYEE"}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-theme-surface text-theme-text disabled:bg-theme-surface-hover disabled:cursor-not-allowed"
            >
              <option value="">Select Employee</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.email})
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-theme-text-muted mt-3">
            Used when an employee has paid personally.
          </p>
        </div>

        {/* Payment Status Card */}
        <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border p-5 flex flex-col justify-between">
          <div>
            <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-2">
              PAYMENT STATUS
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as any)}
              className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-theme-surface text-theme-text"
            >
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
            </select>
          </div>
          <p className="text-xs text-theme-text-muted mt-3">
            {paidBy === "EMPLOYEE"
              ? "Employee-paid items can remain payable until reimbursement."
              : "Payment status recorded for company books."}
          </p>
        </div>
      </div>

      {/* Expandable Section: Additional Settings */}
      <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border overflow-hidden">
        <button
          type="button"
          onClick={() => setIsAdditionalSettingsOpen(!isAdditionalSettingsOpen)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-theme-surface-hover/50 transition-colors"
        >
          <div>
            <h3 className="text-sm font-bold text-theme-text">Additional Settings</h3>
            <p className="text-xs text-theme-text-muted mt-0.5">
              GST input credit, TDS, asset treatment and notes
            </p>
          </div>
          <div className="text-theme-text-muted">
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${isAdditionalSettingsOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {isAdditionalSettingsOpen && (
          <div className="p-5 border-t border-theme-border bg-theme-surface-hover/20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-sm">
            <div>
              <label className="block text-xs font-semibold text-theme-text mb-1">
                GST / ITC Treatment
              </label>
              <select
                value={itcEligibility}
                onChange={(e) => setItcEligibility(e.target.value)}
                className="w-full border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface focus:ring-2 focus:ring-theme-primary"
              >
                <option value="ELIGIBLE">Eligible for Input Tax Credit (ITC)</option>
                <option value="INELIGIBLE">Ineligible / Blocked ITC (Sec 17(5))</option>
                <option value="RCM">Reverse Charge Mechanism (RCM)</option>
              </select>
              <p className="text-[11px] text-theme-text-muted mt-1">
                Determines how GST is reported on GSTR-3B / ITC statements.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-theme-text mb-1">
                Fixed Asset Treatment
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="capitalAssetCheckbox"
                  checked={isCapitalAsset}
                  onChange={(e) => setIsCapitalAsset(e.target.checked)}
                  className="rounded border-theme-border text-theme-primary focus:ring-theme-primary h-4 w-4"
                />
                <label htmlFor="capitalAssetCheckbox" className="text-xs text-theme-text font-medium cursor-pointer">
                  Capitalize as Fixed Asset
                </label>
              </div>
              {isCapitalAsset && (
                <div className="space-y-2 mt-2 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                      Asset Class / IT Act Category
                    </label>
                    <select
                      value={assetCategory}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAssetCategory(val);
                        if (val === "COMPUTERS_IT") setDepreciationRate(40);
                        else if (val === "VEHICLES" || val === "OFFICE_EQUIPMENT") setDepreciationRate(15);
                        else if (val === "FURNITURE_FIXTURES") setDepreciationRate(10);
                        else if (val === "BUILDINGS") setDepreciationRate(10);
                      }}
                      className="w-full border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-theme-text focus:ring-2 focus:ring-emerald-500 font-medium"
                    >
                      <option value="COMPUTERS_IT">💻 Computers &amp; IT Equipment (40% IT Act)</option>
                      <option value="OFFICE_EQUIPMENT">📱 Office Equipment (15% IT Act)</option>
                      <option value="VEHICLES">🚗 Motor Vehicles / Plant (15% IT Act)</option>
                      <option value="FURNITURE_FIXTURES">🪑 Furniture &amp; Fixtures (10% IT Act)</option>
                      <option value="BUILDINGS">🏢 Buildings &amp; Premises (10% IT Act)</option>
                      <option value="CUSTOM">⚙️ Other / Custom Asset</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                      Depreciation Rate (%) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={depreciationRate}
                        onChange={(e) => setDepreciationRate(Math.max(0, Number(e.target.value)))}
                        placeholder="e.g. 40"
                        className="w-full border border-emerald-300 rounded-lg px-2.5 py-1.5 pr-7 text-xs font-bold bg-white text-theme-text focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-emerald-700">%</span>
                    </div>
                    <p className="text-[10px] text-emerald-700 mt-0.5">
                      Applied to Fixed Asset WDV schedule &amp; P&amp;L Depreciation.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-theme-text mb-1">
                TDS & Withholding Info
              </label>
              <div className="bg-theme-surface p-3 rounded-lg border border-theme-border text-xs text-theme-text-muted space-y-1">
                <p>TDS is calculated line-by-line using standard IT rates.</p>
                <p className="font-medium text-theme-text">Total TDS Deducted: ₹{calc.tdsAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes & Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Notes Column (Spans 2 cols on lg) */}
        <div className="lg:col-span-2 bg-theme-surface rounded-xl shadow-sm border border-theme-border p-6">
          <label className="block text-sm font-bold text-theme-text mb-2">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="Optional notes for this expense..."
            className="w-full border border-theme-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface text-theme-text placeholder:text-theme-text-muted"
          />
        </div>

        {/* Expense Summary Column (Spans 1 col on lg) */}
        <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border overflow-hidden">
          <div className="p-6">
            <h3 className="text-base font-bold text-theme-text mb-4 pb-3 border-b border-theme-border">
              Summary
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-theme-text-muted">
                <span>Expense Subtotal</span>
                <span className="font-medium text-theme-text">₹{calc.subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-theme-text-muted">
                <span>GST</span>
                <span className="font-medium text-theme-text">₹{calc.totalGST.toFixed(2)}</span>
              </div>

              {calc.totalGST > 0 && (
                <div className="pl-3 py-1 space-y-1 border-l-2 border-theme-border text-xs text-theme-text-muted">
                  {calc.totalCGST > 0 && (
                    <div className="flex justify-between">
                      <span>Input CGST</span>
                      <span>₹{calc.totalCGST.toFixed(2)}</span>
                    </div>
                  )}
                  {calc.totalSGST > 0 && (
                    <div className="flex justify-between">
                      <span>Input SGST</span>
                      <span>₹{calc.totalSGST.toFixed(2)}</span>
                    </div>
                  )}
                  {calc.totalIGST > 0 && (
                    <div className="flex justify-between">
                      <span>Input IGST</span>
                      <span>₹{calc.totalIGST.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between text-theme-text-muted">
                <span>TDS</span>
                <span className={calc.tdsAmount > 0 ? "text-red-600 font-medium" : "font-medium text-theme-text"}>
                  {calc.tdsAmount > 0 ? `-₹${calc.tdsAmount.toFixed(2)}` : "₹0.00"}
                </span>
              </div>

              <div className="pt-3 border-t border-theme-border flex justify-between items-center">
                <span className="font-bold text-theme-text">Total Expense</span>
                <span className="text-xl font-bold text-emerald-600">
                  ₹{calc.netAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Context Info & Action Buttons */}
      <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs text-theme-text-muted text-center sm:text-left">
          {paidBy === "COMPANY"
            ? "Company-paid expense → expense and bank payment are recorded together."
            : "Employee-paid expense → expense recorded as employee payable / pending reimbursement."}
        </p>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 sm:flex-none px-5 py-2.5 border border-theme-border text-theme-text rounded-lg text-sm font-medium hover:bg-theme-surface-hover transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-theme-primary text-white rounded-lg text-sm font-medium hover:bg-theme-primary-dark transition-colors shadow-sm disabled:opacity-50"
          >
            {isPending ? "Saving..." : initialData ? "Save Draft" : "Save Expense"}
          </button>
        </div>
      </div>

      {modalConfig && (
        <AddMasterRecordModal
          defaultTab={modalConfig.type}
          categories={categories}
          onClose={() => setModalConfig(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </form>
  );
}
