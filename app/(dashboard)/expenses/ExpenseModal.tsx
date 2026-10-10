"use client";

import { useState, useTransition, useEffect } from "react";
import { createExpenseAction, updateExpenseAction } from "./actions";
import { AddMasterRecordModal } from "../masters/AddMasterRecordModal";
import { QuickCategoryModal } from "./QuickCategoryModal";

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
  onSuccess: (savedRecord?: any) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(expense?.id);

  // Vendor, Category & Employee list state & Add modal state
  const [vendorList, setVendorList] = useState(vendors);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);

  const [categoryList, setCategoryList] = useState<any[]>(categories);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [activeItemCategoryIndex, setActiveItemCategoryIndex] = useState<number | null>(null);

  // Quick Category Modal State (Add & Edit directly inside Record Expense)
  const [isQuickCategoryModalOpen, setIsQuickCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<any | null>(null);

  const [employeeList, setEmployeeList] = useState<any[]>(employees);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);

  useEffect(() => { setVendorList(vendors); }, [vendors]);
  useEffect(() => { setCategoryList(categories); }, [categories]);
  useEffect(() => { setEmployeeList(employees); }, [employees]);

  // Primary Category Head Selection
  const initialCatId = expense?.categoryId || expense?.items?.[0]?.categoryId || categories[0]?.id || "";
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string>(initialCatId);

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
  const initialVendorOrEmp = expense?.vendorId || (expense?.employeeId && expense?.paidBy === "COMPANY" ? `EMP_${expense.employeeId}` : "");
  const [vendorId, setVendorId] = useState(initialVendorOrEmp);
  
  // Unified "Paid By" value: "COMPANY" or "EMP_<id>"
  const initialPaidBy = expense?.employeeId && expense?.paidBy === "EMPLOYEE" ? `EMP_${expense.employeeId}` : "COMPANY";
  const [paidBySelection, setPaidBySelection] = useState<string>(initialPaidBy);

  // Payment Status & Partial Payment
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "PARTIALLY_PAID" | "UNPAID">(
    expense?.paymentStatus || "PAID"
  );
  const [amountPaidNow, setAmountPaidNow] = useState<string>(
    expense?.paidAmount ? String(expense.paidAmount) : ""
  );

  // Bill Number
  const [billNumber, setBillNumber] = useState<string>(expense?.billNumber || "");

  // Dynamic Category-Aware Contextual Fields
  const [salaryPeriod, setSalaryPeriod] = useState<string>(
    expense?.salaryPeriod || new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })
  );
  const [consumerRef, setConsumerRef] = useState<string>(expense?.consumerRef || "");
  const [billingPeriod, setBillingPeriod] = useState<string>(expense?.billingPeriod || "");
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>(expense?.subscriptionPlan || "");
  const [renewalDate, setRenewalDate] = useState<string>(
    expense?.renewalDate ? new Date(expense.renewalDate).toISOString().split("T")[0] : ""
  );
  const [billingCycle, setBillingCycle] = useState<string>(expense?.billingCycle || "MONTHLY");
  const [supportingDocRef, setSupportingDocRef] = useState<string>(expense?.supportingDocRef || "");
  const [lossRationale, setLossRationale] = useState<string>(expense?.lossRationale || "");
  const [isRecurringEligible, setIsRecurringEligible] = useState<boolean>(Boolean(expense?.isRecurring));

  // Accounting Treatment & Classification
  const [isGstEligible, setIsGstEligible] = useState(expense?.isGstEligible ?? true);
  const [expenseTreatment, setExpenseTreatment] = useState<"Operating Expense" | "Fixed Asset" | "Business Loss">(
    expense?.isAsset || expense?.expenseTreatment === "Fixed Asset" 
      ? "Fixed Asset" 
      : expense?.isLoss || expense?.expenseTreatment === "Business Loss"
      ? "Business Loss"
      : "Operating Expense"
  );
  const [lossType, setLossType] = useState<string>(
    expense?.lossType || "Operational Loss"
  );
  const [assetType, setAssetType] = useState<string>(
    expense?.assetType || "Computers & IT Equipment (40%)"
  );
  const [depreciationRate, setDepreciationRate] = useState<number>(
    Number(expense?.depreciationRate) > 0 ? Number(expense.depreciationRate) : 40
  );
  const [isTdsApplicable, setIsTdsApplicable] = useState(Boolean(Number(expense?.tdsRate) > 0 || expense?.isTdsApplicable));
  const [globalTdsRate, setGlobalTdsRate] = useState<number>(Number(expense?.tdsRate) || 2);

  // Section 2: Items
  const defaultCategoryId = primaryCategoryId || categories[0]?.id || "";
  const defaultCategoryName = categoryList.find(c => c.id === defaultCategoryId)?.name || categories[0]?.name || "";

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

  // Helper to re-calculate an item
  const updateItem = (index: number, field: keyof ExpenseItemRow, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: val };

      if (field === "categoryId") {
        const cat = categoryList.find((c) => c.id === val);
        if (cat) {
          target.categoryName = cat.name;
          if (cat.isCapitalAsset || cat.accountingClassification === "FIXED_ASSET" || cat.financialType === "ASSET") {
            setExpenseTreatment("Fixed Asset");
          } else if (cat.isLossCategory || cat.accountingClassification === "BUSINESS_LOSS") {
            setExpenseTreatment("Business Loss");
          }
          if (cat.isTaxApplicable === false) {
            target.gstRate = 0;
          } else if (cat.defaultGstRate !== undefined && target.gstRate === 0) {
            target.gstRate = Number(cat.defaultGstRate);
          }
        }
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

  // Primary Category Change Handler
  const handlePrimaryCategoryChange = (catId: string) => {
    if (catId === "ADD_NEW_CATEGORY") {
      setCategoryToEdit(null);
      setIsQuickCategoryModalOpen(true);
      return;
    }

    setPrimaryCategoryId(catId);
    const selectedCat = categoryList.find((c) => c.id === catId);
    if (!selectedCat) return;

    // Classification mapping
    const isAsset = selectedCat.isCapitalAsset || selectedCat.accountingClassification === "FIXED_ASSET" || selectedCat.financialType === "ASSET";
    const isLoss = selectedCat.isLossCategory || selectedCat.accountingClassification === "BUSINESS_LOSS";
    const isEmp = selectedCat.accountingClassification === "EMPLOYEE_EXPENSE" || selectedCat.statementGroup === "Employee Costs" || selectedCat.name.toLowerCase().includes("salary") || selectedCat.name.toLowerCase().includes("wage");
    
    if (isAsset) {
      setExpenseTreatment("Fixed Asset");
      if (selectedCat.name.toLowerCase().includes("furniture")) {
        setAssetType("Furniture & Fixtures (10%)");
        setDepreciationRate(10);
      } else {
        setAssetType("Computers & IT Equipment (40%)");
        setDepreciationRate(40);
      }
    } else if (isLoss) {
      setExpenseTreatment("Business Loss");
    } else {
      setExpenseTreatment("Operating Expense");
    }

    if (selectedCat.isRecurringDefault) {
      setIsRecurringEligible(true);
    }

    // Default GST: 0 for salaries / non-taxable, or default rate
    const defaultGst = selectedCat.isTaxApplicable === false || isEmp ? 0 : Number(selectedCat.defaultGstRate ?? 18);

    // Sync primary item row
    setItems((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((item, idx) => {
        if (idx === 0) {
          let updatedName = item.item;
          if (!updatedName || updatedName === "Expense Item") {
            updatedName = selectedCat.name;
          }
          return {
            ...item,
            categoryId: catId,
            categoryName: selectedCat.name,
            gstRate: defaultGst,
          };
        }
        return item;
      });
    });
  };

  // Callback when category is added/edited in QuickCategoryModal
  const handleCategorySaved = (savedCat: any) => {
    if (!savedCat) return;
    setCategoryList((prev) => {
      const idx = prev.findIndex((c) => c.id === savedCat.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = savedCat;
        return copy;
      }
      return [savedCat, ...prev];
    });
    handlePrimaryCategoryChange(savedCat.id);
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        item: "",
        categoryId: primaryCategoryId || defaultCategoryId,
        categoryName: categoryList.find(c => c.id === (primaryCategoryId || defaultCategoryId))?.name || defaultCategoryName,
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

  // Selected Category Information
  const selectedCategoryObj = categoryList.find((c) => c.id === primaryCategoryId);
  const catNameLower = (selectedCategoryObj?.name || "").toLowerCase();
  
  // Category Recognition Types for Dynamic Contextual Cards
  const isSalaryCategory = catNameLower.includes("salary") || catNameLower.includes("wage") || catNameLower.includes("bonus") || catNameLower.includes("employee") || selectedCategoryObj?.statementGroup === "Employee Costs" || selectedCategoryObj?.accountingClassification === "EMPLOYEE_EXPENSE";
  const isInternetCategory = catNameLower.includes("internet") || catNameLower.includes("broadband") || catNameLower.includes("isp") || catNameLower.includes("telecom") || catNameLower.includes("communication") || catNameLower.includes("telephone") || catNameLower.includes("mobile");
  const isElectricityCategory = catNameLower.includes("electric") || catNameLower.includes("power") || catNameLower.includes("water") || catNameLower.includes("utility") || catNameLower.includes("utilities");
  const isSubscriptionCategory = catNameLower.includes("subscri") || catNameLower.includes("saas") || catNameLower.includes("license") || catNameLower.includes("licence") || catNameLower.includes("software") || catNameLower.includes("hosting") || catNameLower.includes("cloud");
  const isLossCategory = Boolean(selectedCategoryObj?.isLossCategory || selectedCategoryObj?.accountingClassification === "BUSINESS_LOSS" || catNameLower.includes("loss"));
  const isFixedAssetCategory = Boolean(selectedCategoryObj?.isCapitalAsset || selectedCategoryObj?.accountingClassification === "FIXED_ASSET" || selectedCategoryObj?.financialType === "ASSET" || catNameLower.includes("asset") || catNameLower.includes("furniture") || catNameLower.includes("computer") || catNameLower.includes("equipment"));
  const isEmployeePaid = paidBySelection.startsWith("EMP_");

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!primaryCategoryId && items.some(i => !i.categoryId)) {
      setError("Please select a valid Expense Category Head.");
      return;
    }

    const primaryVendor = vendorList.find((v) => v.id === vendorId);
    const primaryCategory = categoryList.find((c) => c.id === primaryCategoryId) || categoryList.find((c) => c.id === items[0]?.categoryId);

    const isInterstate = Boolean(
      primaryVendor?.state &&
      primaryVendor.state.trim().toLowerCase() !== "kerala" &&
      primaryVendor.state.trim() !== "32"
    );

    const inputCGST = isInterstate ? 0 : totalGst / 2;
    const inputSGST = isInterstate ? 0 : totalGst / 2;
    const inputIGST = isInterstate ? totalGst : 0;

    const isEmployeeRecipient = vendorId.startsWith("EMP_");
    const selectedEmployeeId = isEmployeePaid
      ? paidBySelection.replace("EMP_", "")
      : isEmployeeRecipient
      ? vendorId.replace("EMP_", "")
      : null;
    const finalVendorId = isEmployeeRecipient ? null : vendorId || null;

    // Descriptive Notes Generation
    let computedNotes = items.map((i) => i.item).filter(Boolean).join(", ");
    if (isSalaryCategory && selectedEmployeeId) {
      const emp = employeeList.find(e => e.id === selectedEmployeeId);
      computedNotes = `Monthly Salary - ${emp?.name || "Staff"} (${salaryPeriod})`;
    } else if (isInternetCategory) {
      computedNotes = `Internet Bill - ${primaryVendor?.name || "ISP"} [Ref: ${billNumber || "N/A"}] (${billingPeriod || "Current Month"})`;
    } else if (isElectricityCategory) {
      computedNotes = `Electricity Bill [CA #${consumerRef || billNumber || "N/A"}] (${billingPeriod || "Current Month"})`;
    } else if (isSubscriptionCategory) {
      computedNotes = `Software Subscription - ${subscriptionPlan || items[0]?.item || "Cloud SaaS"} (${billingCycle})`;
    } else if (isLossCategory) {
      computedNotes = `Business Loss [Doc #${supportingDocRef || "N/A"}]: ${lossType}${lossRationale ? ` - ${lossRationale}` : ""}`;
    } else if (isFixedAssetCategory) {
      computedNotes = `Fixed Asset Purchase - ${items[0]?.item || assetType}`;
    }

    const payload = {
      expenseDate: new Date(date),
      billNumber: billNumber.trim() || null,
      vendorId: finalVendorId,
      paidBy: isEmployeePaid ? "EMPLOYEE" : "COMPANY",
      employeeId: selectedEmployeeId,
      paymentNature,
      categoryId: primaryCategory?.id || categories[0]?.id,
      notes: computedNotes || (paymentNature === "PURCHASE" ? "Material Purchase" : "Operating Expense"),
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
      isGstEligible: isSalaryCategory ? false : isGstEligible,
      isTdsApplicable,
      expenseTreatment,
      isAsset: expenseTreatment === "Fixed Asset",
      assetType: expenseTreatment === "Fixed Asset" ? assetType : null,
      depreciationRate: expenseTreatment === "Fixed Asset" ? Number(depreciationRate || 0) : 0,
      isLoss: expenseTreatment === "Business Loss",
      lossType: expenseTreatment === "Business Loss" ? lossType : null,
      isRecurring: isRecurringEligible,
      items: items.map((i) => ({
        categoryId: i.categoryId || primaryCategory?.id,
        description: i.item || (paymentNature === "PURCHASE" ? "Purchase Item" : "Expense Item"),
        hsnSacCode: i.hsnSac || (isSalaryCategory ? "9999" : "9983"),
        quantity: i.quantity,
        unitPrice: i.rate,
        taxableAmount: i.quantity * i.rate,
        gstRate: isSalaryCategory ? 0 : i.gstRate,
        cgstRate: isInterstate || isSalaryCategory ? 0 : i.gstRate / 2,
        cgstAmount: isInterstate || isSalaryCategory ? 0 : (i.quantity * i.rate * i.gstRate) / 200,
        sgstRate: isInterstate || isSalaryCategory ? 0 : i.gstRate / 2,
        sgstAmount: isInterstate || isSalaryCategory ? 0 : (i.quantity * i.rate * i.gstRate) / 200,
        igstRate: isInterstate && !isSalaryCategory ? i.gstRate : 0,
        igstAmount: isInterstate && !isSalaryCategory ? (i.quantity * i.rate * i.gstRate) / 100 : 0,
        totalGST: isSalaryCategory ? 0 : (i.quantity * i.rate * i.gstRate) / 100,
        totalAmount: isSalaryCategory ? i.quantity * i.rate : i.amount,
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
        onSuccess(res.data);
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  // Grouped Categories for clean rendering
  const employeeCategories = categoryList.filter(c => 
    c.statementGroup === "Employee Costs" || c.name?.toLowerCase().includes("salary") || c.name?.toLowerCase().includes("bonus") || c.name?.toLowerCase().includes("employee")
  );
  const utilityCategories = categoryList.filter(c => 
    c.statementGroup === "Administrative Expenses" && (c.name?.toLowerCase().includes("util") || c.name?.toLowerCase().includes("elect") || c.name?.toLowerCase().includes("water") || c.name?.toLowerCase().includes("rent"))
  );
  const commCategories = categoryList.filter(c => 
    c.name?.toLowerCase().includes("internet") || c.name?.toLowerCase().includes("tele") || c.name?.toLowerCase().includes("comm")
  );
  const subscriptionCategories = categoryList.filter(c => 
    c.name?.toLowerCase().includes("soft") || c.name?.toLowerCase().includes("subscr") || c.name?.toLowerCase().includes("licen") || c.name?.toLowerCase().includes("cloud") || c.name?.toLowerCase().includes("host")
  );
  const lossCategories = categoryList.filter(c => 
    c.isLossCategory || c.accountingClassification === "BUSINESS_LOSS" || c.name?.toLowerCase().includes("loss")
  );
  const assetCategories = categoryList.filter(c => 
    c.isCapitalAsset || c.accountingClassification === "FIXED_ASSET" || c.financialType === "ASSET" || c.name?.toLowerCase().includes("asset") || c.name?.toLowerCase().includes("furn") || c.name?.toLowerCase().includes("comp")
  );
  const otherCategories = categoryList.filter(c => 
    !employeeCategories.includes(c) && 
    !utilityCategories.includes(c) && 
    !commCategories.includes(c) && 
    !subscriptionCategories.includes(c) && 
    !lossCategories.includes(c) && 
    !assetCategories.includes(c)
  );

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
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                Unified corporate expense manager with inline category creation, auto GST, TDS &amp; payables
              </p>
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
          {/* Nature of Payment Switcher */}
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
            {/* FIRST-CLASS CATEGORY HEAD SELECTOR & INLINE MANAGEMENT (Prompt Section 2 & 8) */}
            <div className="p-3.5 bg-emerald-50/40 border border-emerald-200/80 rounded-2xl space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>🏷️</span> Expense Category Head *
                  </label>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    Select any business category or create a new one directly here without leaving this form
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedCategoryObj && (
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryToEdit(selectedCategoryObj);
                        setIsQuickCategoryModalOpen(true);
                      }}
                      className="text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-100/70 border border-emerald-300 px-2.5 py-1 rounded-xl shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                      title="Edit details or classification of this category"
                    >
                      ✏️ Edit Category
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryToEdit(null);
                      setIsQuickCategoryModalOpen(true);
                    }}
                    className="text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-3 py-1 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>+</span> Add Category
                  </button>
                </div>
              </div>

              <select
                value={primaryCategoryId}
                onChange={(e) => handlePrimaryCategoryChange(e.target.value)}
                className="w-full h-10 border border-emerald-300 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-700 font-bold text-slate-900 shadow-2xs"
              >
                <option value="">— Select Expense Category Head —</option>
                <option value="ADD_NEW_CATEGORY" className="font-extrabold text-emerald-700 bg-emerald-50">
                  ✨ + Add New Category Directly...
                </option>
                {employeeCategories.length > 0 && (
                  <optgroup label="💼 Employee Costs & Salaries">
                    {employeeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {utilityCategories.length > 0 && (
                  <optgroup label="⚡ Utilities & Premises">
                    {utilityCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {commCategories.length > 0 && (
                  <optgroup label="🌐 Communication & Internet Bills">
                    {commCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {subscriptionCategories.length > 0 && (
                  <optgroup label="💻 Software Subscriptions & SaaS">
                    {subscriptionCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {lossCategories.length > 0 && (
                  <optgroup label="📉 Business Losses (ICAI Loss Accounting)">
                    {lossCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {assetCategories.length > 0 && (
                  <optgroup label="🏛️ Fixed Assets & Capex (Balance Sheet Capitalized)">
                    {assetCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {otherCategories.length > 0 && (
                  <optgroup label="🏢 General Operating Expenses">
                    {otherCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* DYNAMIC CATEGORY-AWARE CONTEXTUAL CARD (Prompt Section 4) */}
            {selectedCategoryObj && (
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Category Specific Details:</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                      {selectedCategoryObj.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Classification: <b className="text-slate-700">{expenseTreatment}</b>
                  </span>
                </div>

                {/* Case 1: Salary & Payroll Expenses */}
                {isSalaryCategory && (
                  <div className="space-y-3">
                    <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
                      <span className="font-semibold">💼 Employee Salary &amp; Payroll Entry</span>
                      <span className="text-[11px] bg-blue-200/60 font-bold px-2 py-0.5 rounded">
                        Non-GST Transaction (CGST Schedule III)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Select Employee *</label>
                        <select
                          value={vendorId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVendorId(val);
                            if (val.startsWith("EMP_")) {
                              const emp = employeeList.find(e => e.id === val.replace("EMP_", ""));
                              if (emp && Number(emp.salary || 0) > 0 && items[0]) {
                                updateItem(0, "rate", Number(emp.salary));
                              }
                            }
                          }}
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-semibold text-slate-800"
                        >
                          <option value="">— Select Employee from Master —</option>
                          {employeeList.map(emp => (
                            <option key={emp.id} value={`EMP_${emp.id}`}>
                              👤 {emp.name} ({emp.employeeCode || "Staff"}) — Salary: ₹{Number(emp.salary || 0).toLocaleString("en-IN")}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Salary Month / Period *</label>
                        <input
                          type="text"
                          value={salaryPeriod}
                          onChange={(e) => setSalaryPeriod(e.target.value)}
                          placeholder="e.g. April 2026"
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Payment Channel</label>
                        <select
                          value={paidBySelection}
                          onChange={(e) => setPaidBySelection(e.target.value)}
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-semibold"
                        >
                          <option value="COMPANY">🏢 Direct Company Bank Payout</option>
                          <option value="EMP_ADVANCE">💵 Paid via Salary Advance</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Case 2: Internet Bill & Telecom */}
                {isInternetCategory && (
                  <div className="space-y-3">
                    <div className="p-2.5 bg-teal-50/80 border border-teal-200 rounded-xl flex items-center justify-between text-xs text-teal-900">
                      <span className="font-semibold">🌐 Internet &amp; Telecom Utility Bill</span>
                      <span className="text-[11px] bg-teal-200/60 font-bold px-2 py-0.5 rounded">
                        18% GST (Input Tax Credit Claimable)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">ISP / Telecom Provider</label>
                        <select
                          value={vendorId}
                          onChange={(e) => setVendorId(e.target.value)}
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-semibold"
                        >
                          <option value="">— Select ISP Vendor —</option>
                          {vendorList.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">ISP Bill / Tax Invoice #</label>
                        <input
                          type="text"
                          value={billNumber}
                          onChange={(e) => setBillNumber(e.target.value)}
                          placeholder="e.g. AIRTEL-982138"
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Billing Period</label>
                        <input
                          type="text"
                          value={billingPeriod}
                          onChange={(e) => setBillingPeriod(e.target.value)}
                          placeholder="01 Apr 2026 – 30 Apr 2026"
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Case 3: Electricity Bill & Power */}
                {isElectricityCategory && (
                  <div className="space-y-3">
                    <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                      <span className="font-semibold">⚡ Electricity &amp; Power Utility Bill</span>
                      <span className="text-[11px] bg-amber-200/60 font-bold px-2 py-0.5 rounded">
                        Consumer Account Verification
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Electricity Discom / Board</label>
                        <select
                          value={vendorId}
                          onChange={(e) => setVendorId(e.target.value)}
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-semibold"
                        >
                          <option value="">— Select Electricity Board —</option>
                          {vendorList.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Consumer / CA Number *</label>
                        <input
                          type="text"
                          value={consumerRef}
                          onChange={(e) => setConsumerRef(e.target.value)}
                          placeholder="e.g. CA No. 10293847"
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Consumption Cycle / Period</label>
                        <input
                          type="text"
                          value={billingPeriod}
                          onChange={(e) => setBillingPeriod(e.target.value)}
                          placeholder="e.g. March 2026 Billing"
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Case 4: Software Subscriptions & SaaS */}
                {isSubscriptionCategory && (
                  <div className="space-y-3">
                    <div className="p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-900">
                      <span className="font-semibold">💻 Software Subscription / SaaS Tool</span>
                      <span className="text-[11px] bg-indigo-200/60 font-bold px-2 py-0.5 rounded">
                        Recurring License Tracking
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">SaaS Provider</label>
                        <select
                          value={vendorId}
                          onChange={(e) => setVendorId(e.target.value)}
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-semibold"
                        >
                          <option value="">— Select SaaS Vendor —</option>
                          {vendorList.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Plan / Service Name *</label>
                        <input
                          type="text"
                          value={subscriptionPlan}
                          onChange={(e) => setSubscriptionPlan(e.target.value)}
                          placeholder="e.g. GitHub Enterprise"
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Billing Frequency</label>
                        <select
                          value={billingCycle}
                          onChange={(e) => setBillingCycle(e.target.value)}
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-semibold"
                        >
                          <option value="MONTHLY">Monthly Cycle</option>
                          <option value="ANNUALLY">Annual Subscription</option>
                          <option value="QUARTERLY">Quarterly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Next Renewal Date</label>
                        <input
                          type="date"
                          value={renewalDate}
                          onChange={(e) => setRenewalDate(e.target.value)}
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Case 5: Business Loss */}
                {isLossCategory && (
                  <div className="space-y-3">
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-900">
                      <span className="font-semibold">📉 Approved Business Loss Recognition</span>
                      <span className="text-[11px] bg-rose-200/60 font-bold px-2 py-0.5 rounded">
                        Classified in P&amp;L Other Expenses
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Loss Nature / Type *</label>
                        <select
                          value={lossType}
                          onChange={(e) => setLossType(e.target.value)}
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-semibold text-rose-800"
                        >
                          <option value="Operational Loss">Operational Loss</option>
                          <option value="Asset Disposal Loss">Asset Disposal Loss</option>
                          <option value="Inventory / Stock Loss">Inventory / Stock Write-off</option>
                          <option value="Bad Debt Loss">Bad Debt Write-off</option>
                          <option value="Other Approved Loss">Other Approved Business Loss</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Supporting Document / Audit Ref</label>
                        <input
                          type="text"
                          value={supportingDocRef}
                          onChange={(e) => setSupportingDocRef(e.target.value)}
                          placeholder="e.g. AUDIT-2026-LOSS-01"
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Business Rationale</label>
                        <input
                          type="text"
                          value={lossRationale}
                          onChange={(e) => setLossRationale(e.target.value)}
                          placeholder="e.g. Obsolete scrap machinery write-off"
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Case 6: Fixed Asset Capitalization */}
                {isFixedAssetCategory && (
                  <div className="space-y-3">
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                      <span className="font-semibold">🏛️ Fixed Asset Purchase (Capital Expenditure)</span>
                      <span className="text-[11px] bg-emerald-200/60 font-bold px-2 py-0.5 rounded">
                        Capitalized to Balance Sheet Net Block (0 P&amp;L Op-Exp)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Asset Category</label>
                        <select
                          value={assetType}
                          onChange={(e) => {
                            setAssetType(e.target.value);
                            if (e.target.value.includes("Furniture")) setDepreciationRate(10);
                            else if (e.target.value.includes("Computers")) setDepreciationRate(40);
                            else setDepreciationRate(15);
                          }}
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-semibold"
                        >
                          <option value="Computers & IT Equipment (40%)">Computers &amp; IT Equipment (40%)</option>
                          <option value="Furniture & Fixtures (10%)">Furniture &amp; Fixtures (10%)</option>
                          <option value="Office Equipment (15%)">Office Equipment (15%)</option>
                          <option value="Plant & Machinery (15%)">Plant &amp; Machinery (15%)</option>
                          <option value="Vehicles (15%)">Commercial Vehicles (15%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Depreciation Rate (%)</label>
                        <input
                          type="number"
                          value={depreciationRate}
                          onChange={(e) => setDepreciationRate(Number(e.target.value))}
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Vendor / Equipment Dealer</label>
                        <select
                          value={vendorId}
                          onChange={(e) => setVendorId(e.target.value)}
                          className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-semibold"
                        >
                          <option value="">— Select Equipment Vendor —</option>
                          {vendorList.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Case 7: Employee Out-of-Pocket Expense */}
                {isEmployeePaid && (
                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-900">
                    <span className="font-semibold">👤 Employee Reimbursement Claim</span>
                    <span className="text-[11px] bg-purple-200/60 font-bold px-2 py-0.5 rounded">
                      Accrued in Employee Payables until reimbursed
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Section 1: Standard Transaction Details Grid */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Transaction Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Bill / Invoice Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-9021 or Bill #"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Party / Payee <span className="text-[10px] text-slate-400 font-normal">(Vendor / Staff)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddVendorOpen(true)}
                      className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      + Add Party
                    </button>
                  </div>
                  <select
                    value={vendorId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "ADD_NEW") {
                        setIsAddVendorOpen(true);
                      } else if (val === "ADD_NEW_EMPLOYEE") {
                        setIsAddEmployeeOpen(true);
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
                    <option value="">— Internal / Petty Cash / General —</option>
                    <optgroup label="Employees (Salaries & Remuneration)">
                      <option value="ADD_NEW_EMPLOYEE" className="font-bold text-emerald-700">+ Add Employee...</option>
                      {employeeList.map((emp) => (
                        <option key={emp.id} value={`EMP_${emp.id}`}>
                          👤 {emp.name} ({emp.employeeCode || "Staff"})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Vendors & Commercial Suppliers">
                      <option value="ADD_NEW" className="font-bold text-emerald-700">+ Add Party...</option>
                      {vendorList.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Single Consolidated "Paid By" Smart Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Paid By *
                  </label>
                  <select
                    value={paidBySelection}
                    onChange={(e) => {
                      if (e.target.value === "ADD_NEW_EMPLOYEE_REIMBURSE") {
                        setIsAddEmployeeOpen(true);
                      } else {
                        setPaidBySelection(e.target.value);
                      }
                    }}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-800"
                  >
                    <optgroup label="Company Accounts">
                      <option value="COMPANY">🏢 Company Bank Account / Cash</option>
                    </optgroup>
                    <optgroup label="Employee Reimbursements (Paid by Staff)">
                      <option value="ADD_NEW_EMPLOYEE_REIMBURSE" className="font-bold text-emerald-700">+ Add Employee...</option>
                      {employeeList.map((emp) => (
                        <option key={emp.id} value={`EMP_${emp.id}`}>
                          👤 {emp.name} (Employee Reimbursement)
                        </option>
                      ))}
                    </optgroup>
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                  className="px-3 py-1 border border-slate-200 text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
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
                                setCategoryToEdit(null);
                                setIsQuickCategoryModalOpen(true);
                              } else {
                                updateItem(idx, "categoryId", e.target.value);
                              }
                            }}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white font-semibold text-slate-800"
                          >
                            <option value="">Select Category...</option>
                            {categoryList.map((c) => (
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
                            disabled={isSalaryCategory}
                            className="border border-slate-200 rounded-lg px-1.5 py-1.5 text-xs bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400"
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
                              className="text-slate-400 hover:text-rose-600 text-sm font-bold p-1 rounded cursor-pointer"
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
                <span className="text-xs font-bold text-slate-800">Accounting Treatment &amp; Taxes</span>

                {/* Classification Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Accounting Classification</label>
                  <select
                    value={expenseTreatment}
                    onChange={(e) => setExpenseTreatment(e.target.value as any)}
                    className="w-full h-8 border border-slate-200 rounded-lg px-2 text-xs bg-white font-semibold text-slate-800"
                  >
                    <option value="Operating Expense">Operating Expense (P&L OPEX)</option>
                    <option value="Fixed Asset">Fixed Asset (Capitalize to Balance Sheet)</option>
                    <option value="Business Loss">Business Loss (ICAI Loss Treatment)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">GST Input Credit</label>
                    <select
                      value={isGstEligible ? "Eligible" : "Ineligible"}
                      onChange={(e) => setIsGstEligible(e.target.value === "Eligible")}
                      disabled={isSalaryCategory}
                      className="w-full h-8 border border-slate-200 rounded-lg px-2 text-xs bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400"
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
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {isSalaryCategory ? "TDS Rate u/s 192 (%)" : "TDS Rate (%)"}
                    </label>
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
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="expense-modal-form"
            disabled={isPending}
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isPending ? "Saving Record..." : isEdit ? "Update Record" : "Record Entry"}
          </button>
        </div>
      </div>

      {/* QUICK CATEGORY MODAL — Inline category creation & editing */}
      <QuickCategoryModal
        isOpen={isQuickCategoryModalOpen}
        categoryToEdit={categoryToEdit}
        categories={categoryList}
        onClose={() => {
          setIsQuickCategoryModalOpen(false);
          setCategoryToEdit(null);
        }}
        onSuccess={handleCategorySaved}
      />

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

      {isAddEmployeeOpen && (
        <AddMasterRecordModal
          defaultTab="employee"
          onClose={() => setIsAddEmployeeOpen(false)}
          onSuccess={(newEmp) => {
            if (newEmp) {
              setEmployeeList((prev) => [newEmp, ...prev]);
              setVendorId(`EMP_${newEmp.id}`);
              const salaryCat = categoryList.find(
                (c) =>
                  c.name?.toLowerCase().includes("salary") ||
                  c.name?.toLowerCase().includes("wage")
              );
              if (salaryCat) {
                handlePrimaryCategoryChange(salaryCat.id);
                if (Number(newEmp.salary || 0) > 0 && items[0]) {
                  updateItem(0, "rate", Number(newEmp.salary));
                }
              }
            }
            setIsAddEmployeeOpen(false);
          }}
        />
      )}
    </div>
  );
}
