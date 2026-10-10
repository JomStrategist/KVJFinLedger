"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TaxEngine } from "@/lib/tax";
import { BUSINESS_LOCATION } from "@/lib/config/business";
import { createExpenseAction, updateExpenseAction } from "./actions";
import { createVendorAction } from "../vendors/actions";
import { AddMasterRecordModal } from "../masters/AddMasterRecordModal";
import { QuickCategoryModal } from "./QuickCategoryModal";
import { formatCurrency } from "@/lib/utils/currency";

export function ExpenseForm({ 
  initialData, 
  vendors: initialVendors,
  categories: initialCategories,
  products = [],
  employees: initialEmployees = []
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
  const [employees, setEmployees] = useState(initialEmployees);

  useEffect(() => { setVendors(initialVendors); }, [initialVendors]);
  useEffect(() => { setCategories(initialCategories); }, [initialCategories]);
  useEffect(() => { setEmployees(initialEmployees); }, [initialEmployees]);

  // Quick Category Modal State
  const [isQuickCategoryModalOpen, setIsQuickCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<any | null>(null);

  // Primary Category Head Selection
  const initialCatId = initialData?.categoryId || initialData?.items?.[0]?.categoryId || categories[0]?.id || "";
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string>(initialCatId);

  // Nature of Transaction
  const [paymentNature, setPaymentNature] = useState<"EXPENSE" | "PURCHASE">(
    initialData?.paymentNature || (initialData?.isPurchase ? "PURCHASE" : "EXPENSE")
  );

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
  const [paidAmount, setPaidAmount] = useState<string>(
    initialData?.paidAmount !== undefined && initialData?.paidAmount !== null && Number(initialData.paidAmount) > 0 ? String(initialData.paidAmount) : ""
  );

  // Bill & Category-Aware Contextual Fields
  const [billNumber, setBillNumber] = useState<string>(initialData?.billNumber || "");
  const [salaryPeriod, setSalaryPeriod] = useState<string>(
    initialData?.salaryPeriod || new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })
  );
  const [consumerRef, setConsumerRef] = useState<string>(initialData?.consumerRef || "");
  const [billingPeriod, setBillingPeriod] = useState<string>(initialData?.billingPeriod || "");
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>(initialData?.subscriptionPlan || "");
  const [renewalDate, setRenewalDate] = useState<string>(
    initialData?.renewalDate ? new Date(initialData.renewalDate).toISOString().split("T")[0] : ""
  );
  const [billingCycle, setBillingCycle] = useState<string>(initialData?.billingCycle || "MONTHLY");
  const [supportingDocRef, setSupportingDocRef] = useState<string>(initialData?.supportingDocRef || "");
  const [lossRationale, setLossRationale] = useState<string>(initialData?.lossRationale || "");

  // Additional Settings State
  const [isAdditionalSettingsOpen, setIsAdditionalSettingsOpen] = useState(false);
  const [itcEligibility, setItcEligibility] = useState<string>("ELIGIBLE");
  const [expenseTreatment, setExpenseTreatment] = useState<"Operating Expense" | "Fixed Asset" | "Business Loss">(
    initialData?.isAsset || initialData?.expenseTreatment === "Fixed Asset"
      ? "Fixed Asset"
      : initialData?.isLoss || initialData?.expenseTreatment === "Business Loss"
      ? "Business Loss"
      : "Operating Expense"
  );
  const [isCapitalAsset, setIsCapitalAsset] = useState<boolean>(
    Boolean(initialData?.isAsset)
  );
  const [assetCategory, setAssetCategory] = useState<string>(
    initialData?.assetType || "COMPUTERS_IT"
  );
  const [depreciationRate, setDepreciationRate] = useState<number>(
    Number(initialData?.depreciationRate) > 0 ? Number(initialData.depreciationRate) : 40
  );
  const [lossType, setLossType] = useState<string>(
    initialData?.lossType || "Operational Loss"
  );

  // Notes
  const [notes, setNotes] = useState(initialData?.notes || "");
  
  // Expense Items
  const [items, setItems] = useState<any[]>(
    initialData?.items?.map((item: any) => ({
      productId: item.productId || "",
      vendorId: item.vendorId || "",
      categoryId: item.categoryId || initialCatId,
      date: item.date ? new Date(item.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      hsnSacCode: item.hsnSacCode || "",
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      gstRate: Number(item.gstRate) || 0,
      isCustomGst: ![0, 5, 12, 18, 28].includes(Number(item.gstRate)),
      tdsRate: item.tdsRate?.toString() || "",
      isCustomTds: item.tdsRate !== null && item.tdsRate !== undefined && ![0, 1, 2, 5, 10].includes(Number(item.tdsRate)),
      unit: item.unit || "NOS",
    })) || [{ 
      productId: "", vendorId: "", categoryId: initialCatId, 
      date: new Date().toISOString().split('T')[0], hsnSacCode: "", 
      quantity: 1, unitPrice: 0, gstRate: 0, isCustomGst: false, 
      tdsRate: "", isCustomTds: false, unit: "NOS" 
    }]
  );

  const selectedCategoryObj = categories.find((c) => c.id === primaryCategoryId);
  const categoryNameLower = (selectedCategoryObj?.name || "").toLowerCase();
  const isSalaryCategory =
    selectedCategoryObj?.accountingClassification === "EMPLOYEE_EXPENSE" ||
    selectedCategoryObj?.statementGroup === "Employee Costs" ||
    categoryNameLower.includes("salary") ||
    categoryNameLower.includes("bonus") ||
    categoryNameLower.includes("wage") ||
    categoryNameLower.includes("payroll") ||
    categoryNameLower.includes("incentive") ||
    categoryNameLower.includes("employee");
  const isInternetCategory =
    categoryNameLower.includes("internet") ||
    categoryNameLower.includes("broadband") ||
    categoryNameLower.includes("telephone") ||
    categoryNameLower.includes("mobile bill");
  const isElectricityCategory =
    categoryNameLower.includes("electric") ||
    categoryNameLower.includes("power") ||
    categoryNameLower.includes("water bill");
  const isSubscriptionCategory =
    categoryNameLower.includes("software") ||
    categoryNameLower.includes("subscription") ||
    categoryNameLower.includes("saas") ||
    categoryNameLower.includes("license") ||
    categoryNameLower.includes("online service");
  const isLossCategory =
    selectedCategoryObj?.isLossCategory ||
    selectedCategoryObj?.accountingClassification === "BUSINESS_LOSS" ||
    categoryNameLower.includes("loss");
  const isFixedAssetCategory =
    selectedCategoryObj?.isCapitalAsset ||
    selectedCategoryObj?.accountingClassification === "FIXED_ASSET" ||
    selectedCategoryObj?.financialType === "ASSET" ||
    categoryNameLower.includes("furniture") ||
    categoryNameLower.includes("computer") ||
    categoryNameLower.includes("equipment") ||
    categoryNameLower.includes("asset");

  // Category Groups for organized dropdown
  const employeeCategories = categories.filter(c => 
    c.statementGroup === "Employee Costs" || c.name?.toLowerCase().includes("salary") || c.name?.toLowerCase().includes("bonus") || c.name?.toLowerCase().includes("employee")
  );
  const utilityCategories = categories.filter(c => 
    c.statementGroup === "Administrative Expenses" && (c.name?.toLowerCase().includes("util") || c.name?.toLowerCase().includes("elect") || c.name?.toLowerCase().includes("water") || c.name?.toLowerCase().includes("rent"))
  );
  const commCategories = categories.filter(c => 
    c.name?.toLowerCase().includes("internet") || c.name?.toLowerCase().includes("tele") || c.name?.toLowerCase().includes("comm")
  );
  const subscriptionCategories = categories.filter(c => 
    c.name?.toLowerCase().includes("soft") || c.name?.toLowerCase().includes("subscr") || c.name?.toLowerCase().includes("licen") || c.name?.toLowerCase().includes("cloud") || c.name?.toLowerCase().includes("host")
  );
  const lossCategories = categories.filter(c => 
    c.isLossCategory || c.accountingClassification === "BUSINESS_LOSS" || c.name?.toLowerCase().includes("loss")
  );
  const assetCategories = categories.filter(c => 
    c.isCapitalAsset || c.accountingClassification === "FIXED_ASSET" || c.financialType === "ASSET" || c.name?.toLowerCase().includes("asset") || c.name?.toLowerCase().includes("furn") || c.name?.toLowerCase().includes("comp")
  );
  const otherCategories = categories.filter(c => 
    !employeeCategories.includes(c) && 
    !utilityCategories.includes(c) && 
    !commCategories.includes(c) && 
    !subscriptionCategories.includes(c) && 
    !lossCategories.includes(c) && 
    !assetCategories.includes(c)
  );

  const handlePrimaryCategoryChange = (catId: string) => {
    if (catId === "ADD_NEW_CATEGORY") {
      setCategoryToEdit(null);
      setIsQuickCategoryModalOpen(true);
      return;
    }

    setPrimaryCategoryId(catId);
    const selectedCat = categories.find((c) => c.id === catId);
    if (!selectedCat) return;

    const isAsset = selectedCat.isCapitalAsset || selectedCat.accountingClassification === "FIXED_ASSET" || selectedCat.financialType === "ASSET";
    const isLoss = selectedCat.isLossCategory || selectedCat.accountingClassification === "BUSINESS_LOSS";
    const isEmp = selectedCat.accountingClassification === "EMPLOYEE_EXPENSE" || selectedCat.statementGroup === "Employee Costs" || selectedCat.name.toLowerCase().includes("salary") || selectedCat.name.toLowerCase().includes("wage");

    if (isAsset) {
      setExpenseTreatment("Fixed Asset");
      setIsCapitalAsset(true);
      if (selectedCat.name.toLowerCase().includes("furniture")) {
        setAssetCategory("FURNITURE_FIXTURES");
        setDepreciationRate(10);
      } else {
        setAssetCategory("COMPUTERS_IT");
        setDepreciationRate(40);
      }
    } else if (isLoss) {
      setExpenseTreatment("Business Loss");
      setIsCapitalAsset(false);
    } else {
      setExpenseTreatment("Operating Expense");
      setIsCapitalAsset(false);
    }

    // Default GST: 0 for salaries / non-taxable, or default rate
    const defaultGst = selectedCat.isTaxApplicable === false || isEmp ? 0 : Number(selectedCat.defaultGstRate ?? 18);

    // Sync primary item row
    setItems((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((item, idx) => {
        if (idx === 0) {
          return {
            ...item,
            categoryId: catId,
            gstRate: defaultGst,
            isCustomGst: ![0, 5, 12, 18, 28].includes(defaultGst),
          };
        }
        return item;
      });
    });
  };

  const handleCategorySaved = (savedCat: any) => {
    if (!savedCat) return;
    setCategories((prev) => {
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

  const handlePaidByChange = (newPaidBy: "COMPANY" | "EMPLOYEE") => {
    setPaidBy(newPaidBy);
    if (newPaidBy === "COMPANY") {
      if (!initialData) setPaymentStatus("PAID");
    } else {
      if (!initialData) setPaymentStatus("UNPAID");
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const [modalConfig, setModalConfig] = useState<{ type: string; itemIndex?: number } | null>(null);

  const handleItemVendorChange = (index: number, value: string) => {
    if (value === "ADD_NEW") {
      setModalConfig({ type: "vendor", itemIndex: index });
    } else {
      handleItemChange(index, "vendorId", value);
    }
  };

  const handleItemCategoryChange = (index: number, value: string) => {
    if (value === "ADD_NEW") {
      setCategoryToEdit(null);
      setIsQuickCategoryModalOpen(true);
    } else {
      handleItemChange(index, "categoryId", value);
    }
  };

  const handleModalSuccess = (newRecord?: any) => {
    if (modalConfig?.type === "vendor" && newRecord) {
      setVendors((prev) => [...prev, newRecord]);
      if (modalConfig.itemIndex !== undefined) {
        handleItemChange(modalConfig.itemIndex, "vendorId", newRecord.id);
      }
    } else if (modalConfig?.type === "employee" && newRecord) {
      setEmployees((prev) => [newRecord, ...prev]);
      setEmployeeId(newRecord.id);
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
    productId: "", vendorId: "", categoryId: primaryCategoryId || categories[0]?.id || "", 
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
      gstRate: isSalaryCategory ? 0 : Number(item.gstRate) || 0,
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

    if (items.some(i => !i.categoryId && !primaryCategoryId)) {
      setError("Please select a category for this expense.");
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

    let computedNotes = notes.trim();
    if (isSalaryCategory && employeeId) {
      const emp = employees.find(e => e.id === employeeId);
      computedNotes = `Salary Payment - ${emp?.name || "Staff"} (${salaryPeriod})${computedNotes ? ` | ${computedNotes}` : ""}`;
    } else if (isInternetCategory) {
      computedNotes = `Internet Bill${billingPeriod ? ` (${billingPeriod})` : ""}${billNumber ? ` | Inv #${billNumber}` : ""}${computedNotes ? ` | ${computedNotes}` : ""}`;
    } else if (isElectricityCategory) {
      computedNotes = `Electricity Bill${consumerRef ? ` (CA: ${consumerRef})` : ""}${billingPeriod ? ` - ${billingPeriod}` : ""}${computedNotes ? ` | ${computedNotes}` : ""}`;
    } else if (isSubscriptionCategory) {
      computedNotes = `Software Subscription${subscriptionPlan ? ` - ${subscriptionPlan}` : ""}${billingCycle ? ` (${billingCycle})` : ""}${renewalDate ? ` | Renewal: ${renewalDate}` : ""}${computedNotes ? ` | ${computedNotes}` : ""}`;
    } else if (isLossCategory) {
      computedNotes = `Business Loss: ${lossType}${lossRationale ? ` - ${lossRationale}` : ""}${supportingDocRef ? ` | Ref: ${supportingDocRef}` : ""}${computedNotes ? ` | ${computedNotes}` : ""}`;
    } else if (isFixedAssetCategory) {
      computedNotes = `Fixed Asset Purchase - ${items[0]?.item || assetCategory}${computedNotes ? ` | ${computedNotes}` : ""}`;
    }

    const payload = {
      expenseDate: items[0]?.date || new Date().toISOString().split('T')[0],
      billNumber: billNumber.trim() || null,
      vendorId: items[0]?.vendorId || null,
      categoryId: primaryCategoryId || items[0]?.categoryId || categories[0]?.id,
      paidBy,
      employeeId: employeeId || null,
      paymentNature,
      paymentStatus,
      paidAmount: paymentStatus === "PAID" 
        ? Number(calc.netAmount || 0) 
        : paymentStatus === "PARTIALLY_PAID" 
        ? Math.min(Number(calc.netAmount || 0), Math.max(0, parseFloat(paidAmount) || 0)) 
        : 0,
      balancePayable: Math.max(0, Number(calc.netAmount || 0) - (
        paymentStatus === "PAID" 
          ? Number(calc.netAmount || 0) 
          : paymentStatus === "PARTIALLY_PAID" 
          ? Math.min(Number(calc.netAmount || 0), Math.max(0, parseFloat(paidAmount) || 0)) 
          : 0
      )),
      notes: computedNotes || (paymentNature === "PURCHASE" ? "Material Purchase" : "Operating Expense"),
      
      subtotal: Number(calc.subtotal ?? calc.taxableAmount ?? 0),
      discountAmount: Number(calc.totalDiscount ?? 0),
      taxableAmount: Number(calc.taxableAmount ?? 0),

      inputCGST: isSalaryCategory ? 0 : Number(calc.totalCGST ?? 0),
      inputSGST: isSalaryCategory ? 0 : Number(calc.totalSGST ?? 0),
      inputIGST: isSalaryCategory ? 0 : Number(calc.totalIGST ?? 0),
      totalInputGST: isSalaryCategory ? 0 : Number(calc.totalGST ?? 0),

      tdsRate: 0,
      tdsAmount: Number(calc.tdsAmount ?? 0),
      grossAmount: Number(calc.grossAmount ?? 0),
      netAmount: Number(calc.netAmount ?? 0),
      
      isGstEligible: isSalaryCategory ? false : true,
      expenseTreatment,
      isAsset: expenseTreatment === "Fixed Asset" || isCapitalAsset,
      assetType: expenseTreatment === "Fixed Asset" || isCapitalAsset ? assetCategory : null,
      depreciationRate: expenseTreatment === "Fixed Asset" || isCapitalAsset ? Number(depreciationRate || 0) : 0,
      isLoss: expenseTreatment === "Business Loss" || isLossCategory,
      lossType: expenseTreatment === "Business Loss" || isLossCategory ? lossType : null,

      items: items.map((item, i) => ({
        productId: item.productId || null,
        vendorId: item.vendorId || null,
        categoryId: item.categoryId || primaryCategoryId || categories[0]?.id,
        date: item.date,
        hsnSacCode: item.hsnSacCode || (isSalaryCategory ? "9999" : "9983"),
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        gstRate: isSalaryCategory ? 0 : item.gstRate,
        taxableAmount: calc.calculatedItems[i].taxableAmount,
        cgstRate: isSalaryCategory ? 0 : calc.calculatedItems[i].cgstRate,
        cgstAmount: isSalaryCategory ? 0 : calc.calculatedItems[i].cgstAmount,
        sgstRate: isSalaryCategory ? 0 : calc.calculatedItems[i].sgstRate,
        sgstAmount: isSalaryCategory ? 0 : calc.calculatedItems[i].sgstAmount,
        igstRate: isSalaryCategory ? 0 : calc.calculatedItems[i].igstRate,
        igstAmount: isSalaryCategory ? 0 : calc.calculatedItems[i].igstAmount,
        totalGST: isSalaryCategory ? 0 : calc.calculatedItems[i].totalGST,
        tdsRate: Number(item.tdsRate) || 0,
        tdsAmount: calc.calculatedItems[i].tdsAmount || 0,
        isAsset: expenseTreatment === "Fixed Asset" || isCapitalAsset,
        depreciationRate: expenseTreatment === "Fixed Asset" || isCapitalAsset ? Number(depreciationRate || 0) : 0,
        totalAmount: isSalaryCategory ? calc.calculatedItems[i].taxableAmount : calc.calculatedItems[i].totalAmount
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
            {initialData ? `Edit Expense (${initialData.expenseNumber})` : "Record Expense"}
          </h1>
          <p className="text-theme-text-muted mt-1 text-sm">
            Manage all expense categories, utilities, salaries, subscriptions and capex with inline category creation.
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

      {/* NATURE OF PAYMENT SWITCHER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl">
        <div>
          <span className="text-xs font-bold text-slate-800">Nature of Transaction:</span>
          <p className="text-xs text-slate-500">Classify whether this is an operating expense or direct material purchase</p>
        </div>
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setPaymentNature("EXPENSE")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              paymentNature === "PURCHASE"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📦 Purchase (COGS)
          </button>
        </div>
      </div>

      {/* CATEGORY SELECTOR WITH + ADD CATEGORY & EDIT CATEGORY */}
      <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <span>🏷️</span> Expense Category Head *
            </label>
            <p className="text-xs text-emerald-800 font-medium">
              Select any expense category or create a new one directly here without leaving this form
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
                className="text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-100/70 border border-emerald-300 px-3 py-1.5 rounded-xl shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                title="Edit category settings, GST rate, or classification"
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
              className="text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-3.5 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
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

      {/* DYNAMIC CATEGORY-AWARE CONTEXTUAL CARD */}
      {selectedCategoryObj && (
        <div className="p-4 bg-slate-50/90 border border-slate-200/80 rounded-2xl space-y-3.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">Category Specific Details:</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                {selectedCategoryObj.name}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Classification: <b className="text-slate-800">{expenseTreatment}</b>
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
                    value={employeeId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEmployeeId(val);
                      const emp = employees.find(emp => emp.id === val);
                      if (emp && Number(emp.salary || 0) > 0 && items[0]) {
                        handleItemChange(0, "unitPrice", Number(emp.salary));
                      }
                    }}
                    className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-semibold text-slate-800"
                  >
                    <option value="">— Select Employee from Master —</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Disbursement Channel</label>
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value as any)}
                    className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-semibold"
                  >
                    <option value="COMPANY">🏢 Direct Company Bank Payout</option>
                    <option value="EMPLOYEE">💵 Staff Out-of-Pocket / Reimbursement</option>
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
                    value={items[0]?.vendorId || ""}
                    onChange={(e) => handleItemChange(0, "vendorId", e.target.value)}
                    className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-semibold"
                  >
                    <option value="">— Select ISP Vendor —</option>
                    {vendors.map(v => (
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
                    value={items[0]?.vendorId || ""}
                    onChange={(e) => handleItemChange(0, "vendorId", e.target.value)}
                    className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-semibold"
                  >
                    <option value="">— Select Electricity Board —</option>
                    {vendors.map(v => (
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
                    value={items[0]?.vendorId || ""}
                    onChange={(e) => handleItemChange(0, "vendorId", e.target.value)}
                    className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-semibold"
                  >
                    <option value="">— Select Provider —</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tool / Plan Name</label>
                  <input
                    type="text"
                    value={subscriptionPlan}
                    onChange={(e) => setSubscriptionPlan(e.target.value)}
                    placeholder="e.g. Slack Pro / Google Workspace"
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
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUAL">Annual</option>
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
              <div className="p-2.5 bg-rose-50/80 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-900">
                <span className="font-semibold">📉 Business Loss Accounting (P&amp;L Other Expenses)</span>
                <span className="text-[11px] bg-rose-200/60 font-bold px-2 py-0.5 rounded">
                  Requires Supporting Audit Documentation
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Loss Nature / Type *</label>
                  <select
                    value={lossType}
                    onChange={(e) => setLossType(e.target.value)}
                    className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-semibold"
                  >
                    <option value="Operational Loss">Operational / Inventory Shrinkage</option>
                    <option value="Asset Disposal Loss">Loss on Sale / Disposal of Fixed Assets</option>
                    <option value="Bad Debt Write-off">Bad Debt / Unrecoverable Receivable</option>
                    <option value="Foreign Exchange Loss">Forex Loss (AS 11 / Ind AS 21)</option>
                    <option value="Other Business Loss">Other Approved Business Loss</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Audit / Incident Ref #</label>
                  <input
                    type="text"
                    value={supportingDocRef}
                    onChange={(e) => setSupportingDocRef(e.target.value)}
                    placeholder="e.g. AUDIT-2026-LOSS-001"
                    className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Business Rationale / Note</label>
                  <input
                    type="text"
                    value={lossRationale}
                    onChange={(e) => setLossRationale(e.target.value)}
                    placeholder="e.g. Scrapped defective inventory per survey"
                    className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Case 6: Fixed Asset (Capex) */}
          {isFixedAssetCategory && (
            <div className="space-y-3">
              <div className="p-2.5 bg-purple-50/80 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-900">
                <span className="font-semibold">🏛️ Fixed Asset Capitalization (Balance Sheet Capex)</span>
                <span className="text-[11px] bg-purple-200/60 font-bold px-2 py-0.5 rounded">
                  ₹0 Operating Expense Impact • Capitalized to Net Block
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Asset Class / Block *</label>
                  <select
                    value={assetCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAssetCategory(val);
                      if (val === "COMPUTERS_IT") setDepreciationRate(40);
                      else if (val === "FURNITURE_FIXTURES") setDepreciationRate(10);
                      else if (val === "VEHICLES" || val === "OFFICE_EQUIPMENT") setDepreciationRate(15);
                      else setDepreciationRate(10);
                    }}
                    className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-semibold"
                  >
                    <option value="COMPUTERS_IT">💻 Computers &amp; IT Equipment (40%)</option>
                    <option value="FURNITURE_FIXTURES">🪑 Furniture &amp; Fixtures (10%)</option>
                    <option value="OFFICE_EQUIPMENT">📱 Office Equipment (15%)</option>
                    <option value="VEHICLES">🚗 Motor Vehicles (15%)</option>
                    <option value="BUILDINGS">🏢 Premises / Leasehold Improvements (10%)</option>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Asset Vendor / Supplier</label>
                  <select
                    value={items[0]?.vendorId || ""}
                    onChange={(e) => handleItemChange(0, "vendorId", e.target.value)}
                    className="w-full h-9 border border-slate-200 rounded-xl px-2.5 text-xs bg-white font-semibold"
                  >
                    <option value="">— Select Equipment Vendor —</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expense Items Card */}
      <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-theme-text">Expense Line Items</h2>
            <p className="text-xs text-theme-text-muted mt-0.5">
              Enter item details. Category is automatically synced with the Category Head or can be chosen individually.
            </p>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center justify-center px-4 py-2 border border-theme-border rounded-lg text-sm font-medium text-theme-primary bg-theme-surface hover:bg-theme-surface-hover shadow-sm transition-colors gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
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
                <th className="pb-3 px-2 w-44">Party</th>
                <th className="pb-3 px-2 w-44">Item (Optional)</th>
                <th className="pb-3 px-2 w-52">Category</th>
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
                      <option value="">No Party / Internal</option>
                      {vendors.map(v => {
                        const hasDiffName = v.businessName && v.businessName.trim().toLowerCase() !== v.name.trim().toLowerCase();
                        return (
                          <option key={v.id} value={v.id}>
                            {v.name}{hasDiffName ? ` (${v.businessName})` : ''}
                          </option>
                        );
                      })}
                      <option value="ADD_NEW" className="font-bold text-theme-primary">+ Add Party</option>
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
                      className="w-full border border-theme-border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-theme-primary focus:border-transparent text-xs bg-theme-surface font-semibold"
                    >
                      <option value="">Select Category...</option>
                      <option value="ADD_NEW" className="font-bold text-emerald-700 bg-emerald-50">✨ + Add New Category...</option>
                      {employeeCategories.length > 0 && (
                        <optgroup label="💼 Employee Costs & Salaries">
                          {employeeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </optgroup>
                      )}
                      {utilityCategories.length > 0 && (
                        <optgroup label="⚡ Utilities & Premises">
                          {utilityCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </optgroup>
                      )}
                      {commCategories.length > 0 && (
                        <optgroup label="🌐 Communication & Internet">
                          {commCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </optgroup>
                      )}
                      {subscriptionCategories.length > 0 && (
                        <optgroup label="💻 Software & Subscriptions">
                          {subscriptionCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </optgroup>
                      )}
                      {lossCategories.length > 0 && (
                        <optgroup label="📉 Business Losses">
                          {lossCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </optgroup>
                      )}
                      {assetCategories.length > 0 && (
                        <optgroup label="🏛️ Fixed Assets (Capex)">
                          {assetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </optgroup>
                      )}
                      {otherCategories.length > 0 && (
                        <optgroup label="🏢 General Operating">
                          {otherCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </optgroup>
                      )}
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
                      className="w-full border border-theme-border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-theme-primary focus:border-transparent text-xs text-right bg-theme-surface font-semibold"
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
                      className="w-full border border-theme-border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-theme-primary focus:border-transparent text-xs text-right bg-theme-surface font-semibold"
                    />
                  </td>
                  <td className="py-2.5 px-2">
                    {isSalaryCategory ? (
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md block text-center">
                        0% (Non-GST)
                      </span>
                    ) : !item.isCustomGst ? (
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
                        className="w-full border border-theme-border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-theme-primary focus:border-transparent text-xs text-right bg-theme-surface font-semibold"
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

      {/* Row: Paid By | Employee (only when applicable) | Payment Status */}
      <div className={`grid grid-cols-1 ${paidBy === "EMPLOYEE" ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4 transition-all duration-200`}>
        {/* Paid By Card */}
        <div className="bg-theme-surface rounded-xl shadow-xs border border-theme-border p-5 flex flex-col justify-between">
          <div>
            <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-2">
              PAID BY
            </label>
            <select
              value={paidBy}
              onChange={(e) => handlePaidByChange(e.target.value as "COMPANY" | "EMPLOYEE")}
              className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-theme-surface text-theme-text cursor-pointer"
            >
              <option value="COMPANY">Company</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
          </div>
          <p className="text-xs text-theme-text-muted mt-3">
            {paidBy === "COMPANY"
              ? "Disbursed directly from corporate bank account."
              : "Paid personally by employee (pending company reimbursement)."}
          </p>
        </div>

        {/* Employee Card */}
        <div className="bg-theme-surface rounded-xl shadow-xs border border-theme-border p-5 flex flex-col justify-between animate-in fade-in duration-200">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-theme-text uppercase tracking-wider">
                {paidBy === "EMPLOYEE" ? "EMPLOYEE NAME" : "EMPLOYEE / BENEFICIARY (OPTIONAL)"}
              </label>
              {paidBy === "EMPLOYEE" ? (
                <span className="text-[10px] uppercase font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                  Required
                </span>
              ) : (
                <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  Payroll / Payout
                </span>
              )}
            </div>
            <select
              value={employeeId}
              required={paidBy === "EMPLOYEE"}
              onChange={(e) => {
                if (e.target.value === "ADD_NEW_EMPLOYEE") {
                  setModalConfig({ type: "employee" });
                } else {
                  setEmployeeId(e.target.value);
                }
              }}
              className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-theme-surface text-theme-text cursor-pointer"
            >
              <option value="">{paidBy === "EMPLOYEE" ? "Select Employee..." : "None / External Vendor"}</option>
              <option value="ADD_NEW_EMPLOYEE" className="font-bold text-theme-primary">+ Add Employee...</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name || emp.email}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-theme-text-muted mt-3">
            {paidBy === "EMPLOYEE"
              ? "Employee ledger to credit for out-of-pocket disbursement."
              : "Optionally assign to employee ledger for salary, payroll, or staff payouts."}
          </p>
        </div>

        {/* Payment Status Card */}
        <div className="bg-theme-surface rounded-xl shadow-xs border border-theme-border p-5 flex flex-col justify-between">
          <div>
            <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-2">
              PAYMENT STATUS
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as any)}
              className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-theme-primary focus:border-transparent bg-theme-surface text-theme-text cursor-pointer"
            >
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
            </select>

            {paymentStatus === "PARTIALLY_PAID" && (
              <div className="mt-3 pt-3 border-t border-theme-border space-y-2">
                <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Amount Paid Now (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 5000"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-amber-500 bg-white text-theme-text font-mono"
                />
                <div className="flex justify-between items-center text-xs text-amber-800 font-medium">
                  <span>Balance Payable:</span>
                  <span className="font-bold font-mono">
                    {formatCurrency(Math.max(0, Number(calc.netAmount || 0) - (parseFloat(paidAmount) || 0)))}
                  </span>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-theme-text-muted mt-3">
            {paidBy === "EMPLOYEE"
              ? "Employee-paid items remain payable until reimbursement."
              : "Spot bank settlement or credit purchase."}
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
                  onChange={(e) => {
                    setIsCapitalAsset(e.target.checked);
                    setExpenseTreatment(e.target.checked ? "Fixed Asset" : "Operating Expense");
                  }}
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
                      Applied to Fixed Asset WDV schedule &amp; Balance Sheet capitalisation.
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
            Notes & Remarks
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="Optional internal remarks or expense notes..."
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
                <span className="font-medium text-theme-text">₹{(isSalaryCategory ? 0 : calc.totalGST).toFixed(2)}</span>
              </div>

              {!isSalaryCategory && calc.totalGST > 0 && (
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
                  ₹{(isSalaryCategory ? calc.taxableAmount : calc.netAmount).toFixed(2)}
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
            className="flex-1 sm:flex-none px-5 py-2.5 border border-theme-border text-theme-text rounded-lg text-sm font-medium hover:bg-theme-surface-hover transition-colors shadow-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-theme-primary text-white rounded-lg text-sm font-medium hover:bg-theme-primary-dark transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "Saving..." : initialData ? "Save Draft" : "Save Expense"}
          </button>
        </div>
      </div>

      {/* Quick Category Modal for Adding & Editing Categories */}
      {isQuickCategoryModalOpen && (
        <QuickCategoryModal
          isOpen={isQuickCategoryModalOpen}
          categoryToEdit={categoryToEdit}
          categories={categories}
          onClose={() => {
            setIsQuickCategoryModalOpen(false);
            setCategoryToEdit(null);
          }}
          onSuccess={handleCategorySaved}
        />
      )}

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
