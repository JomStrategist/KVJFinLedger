"use client";

import { useState, useTransition, useEffect } from "react";
import {
  createCustomerMasterAction,
  updateCustomerMasterAction,
  createVendorMasterAction,
  updateVendorMasterAction,
  createProductMasterAction,
  updateProductMasterAction,
  createCategoryMasterAction,
  updateCategoryMasterAction,
  getFinancialTypesAction,
  getStatementGroupsAction,
  getAccountNaturesAction,
} from "./actions";
import { INDIAN_STATES, extractGstinInfo } from "@/lib/constants/indian-states";

const DEFAULT_FINANCIAL_TYPES = [
  { code: "EXPENSE", name: "Expense", financialStatement: "Profit & Loss", normalBalance: "Debit" },
  { code: "INCOME", name: "Income", financialStatement: "Profit & Loss", normalBalance: "Credit" },
  { code: "ASSET", name: "Asset", financialStatement: "Balance Sheet", normalBalance: "Debit" },
  { code: "LIABILITY", name: "Liability", financialStatement: "Balance Sheet", normalBalance: "Credit" },
  { code: "EQUITY", name: "Equity", financialStatement: "Balance Sheet", normalBalance: "Credit" },
];

const DEFAULT_STATEMENT_GROUPS_MAP: Record<string, string[]> = {
  EXPENSE: [
    "Administrative Expenses",
    "Employee Costs",
    "Professional & Consultancy",
    "Selling & Marketing Expenses",
    "Finance Costs",
    "Depreciation & Amortisation",
    "Other Expenses",
  ],
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

export function AddMasterRecordModal({
  defaultTab = "customer",
  initialData = null,
  categories = [],
  financialTypes: initialDbTypes = [],
  statementGroups: initialDbGroups = [],
  accountNatures: initialDbNatures = [],
  onClose,
  onSuccess,
}: {
  defaultTab?: "customer" | "vendor" | "product" | "category" | string;
  initialData?: any;
  categories?: any[];
  financialTypes?: any[];
  statementGroups?: any[];
  accountNatures?: any[];
  onClose: () => void;
  onSuccess: (createdRecord?: any) => void;
}) {
  const [activeType, setActiveType] = useState<string>(defaultTab);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Customer State
  const [customerName, setCustomerName] = useState(initialData?.legalName || initialData?.tradeName || "");
  const [customerGstin, setCustomerGstin] = useState(initialData?.gstin || "");
  const [customerType, setCustomerType] = useState(initialData?.customerType || "B2B");
  const [customerPan, setCustomerPan] = useState(initialData?.pan || "");
  const [customerEmail, setCustomerEmail] = useState(initialData?.email || "");
  const [customerPhone, setCustomerPhone] = useState(initialData?.phone || "");
  const [customerContact, setCustomerContact] = useState(initialData?.contactPerson || "");
  const [customerAddress, setCustomerAddress] = useState(initialData?.address || "");
  const [customerState, setCustomerState] = useState(initialData?.state || "Kerala");
  const [placeOfSupply, setPlaceOfSupply] = useState(initialData?.placeOfSupply || "Kerala");
  const [customerCountry, setCustomerCountry] = useState(initialData?.country || "India");

  // Vendor State
  const [vendorName, setVendorName] = useState(initialData?.name || "");
  const [vendorType, setVendorType] = useState(initialData?.vendorType || "B2B");
  const [vendorGstin, setVendorGstin] = useState(initialData?.gstin || "");
  const [vendorPan, setVendorPan] = useState(initialData?.pan || "");
  const [vendorEmail, setVendorEmail] = useState(initialData?.email || "");
  const [vendorPhone, setVendorPhone] = useState(initialData?.phone || "");
  const [vendorContact, setVendorContact] = useState(initialData?.contactPerson || "");
  const [vendorAddress, setVendorAddress] = useState(initialData?.address || "");
  const [vendorState, setVendorState] = useState(initialData?.state || "Kerala");
  const [vendorCountry, setVendorCountry] = useState(initialData?.country || "India");

  // Product State
  const [productName, setProductName] = useState(initialData?.name || "");
  const [productType, setProductType] = useState(initialData?.type || "SERVICE");
  const [productHsn, setProductHsn] = useState(initialData?.hsnSacCode || "9983");
  const [productRate, setProductRate] = useState(initialData?.sellingPrice ? String(initialData.sellingPrice) : "0");
  const [productGst, setProductGst] = useState(initialData?.gstRate ? String(initialData.gstRate) : "18");
  const [productUnit, setProductUnit] = useState(initialData?.unit || "Hours");
  const [productDescription, setProductDescription] = useState(initialData?.description || "");

  // Database-driven accounting masters state
  const [dbTypes, setDbTypes] = useState<any[]>(initialDbTypes);
  const [dbGroups, setDbGroups] = useState<any[]>(initialDbGroups);
  const [dbNatures, setDbNatures] = useState<any[]>(initialDbNatures);

  useEffect(() => {
    getFinancialTypesAction().then((res) => {
      if (res.success && res.data && res.data.length > 0) setDbTypes(res.data);
    });
    getStatementGroupsAction().then((res) => {
      if (res.success && res.data && res.data.length > 0) setDbGroups(res.data);
    });
    getAccountNaturesAction().then((res) => {
      if (res.success && res.data && res.data.length > 0) setDbNatures(res.data);
    });
  }, []);

  const handleCustomerGstinChange = (value: string) => {
    const uppercaseVal = value.toUpperCase().trim();
    setCustomerGstin(uppercaseVal);
    
    if (uppercaseVal.length >= 2) {
      const info = extractGstinInfo(uppercaseVal);
      if (info.pan && !customerPan) {
        setCustomerPan(info.pan);
      }
      if (info.stateName && customerCountry === "India") {
        setCustomerState(info.stateName);
        setPlaceOfSupply(info.stateName);
      }
    }
  };

  const handleVendorGstinChange = (value: string) => {
    const uppercaseVal = value.toUpperCase().trim();
    setVendorGstin(uppercaseVal);
    
    if (uppercaseVal.length >= 2) {
      const info = extractGstinInfo(uppercaseVal);
      if (info.pan && !vendorPan) {
        setVendorPan(info.pan);
      }
      if (info.stateName && vendorCountry === "India") {
        setVendorState(info.stateName);
      }
    }
  };

  const handleCustomerStateChange = (newState: string) => {
    setCustomerState(newState);
    setPlaceOfSupply(newState);
  };

  // Category State
  const [categoryList, setCategoryList] = useState<any[]>(categories);
  const [categoryName, setCategoryName] = useState(initialData?.name || "");
  const [categoryCode, setCategoryCode] = useState(initialData?.code || "");
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(Boolean(initialData?.code));
  const [parentCategoryId, setParentCategoryId] = useState(initialData?.parentId || "");
  const [financialType, setFinancialType] = useState(initialData?.financialType || "EXPENSE");

  const generateAutoCategoryCode = (name: string, type: string) => {
    const prefix = type === "INCOME" ? "INC" : type === "ASSET" ? "AST" : type === "LIABILITY" ? "LIA" : "EXP";
    const slug = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "_")
      .slice(0, 8);
    return slug ? `${prefix}_${slug}` : prefix;
  };

  // Filtered Statement Groups & Account Natures
  const filteredGroups = dbGroups.filter(
    (g) => (g.financialType?.code || g.financialTypeCode || "").toUpperCase() === financialType.toUpperCase()
  );
  const filteredNatures = dbNatures.filter(
    (n) => (n.financialType?.code || n.financialTypeCode || "").toUpperCase() === financialType.toUpperCase()
  );

  const typesToRender = dbTypes.length > 0 ? dbTypes : DEFAULT_FINANCIAL_TYPES;
  const rawGroupNames = filteredGroups.length > 0
    ? filteredGroups.map((g) => g.name)
    : (DEFAULT_STATEMENT_GROUPS_MAP[financialType] || ["Administrative Expenses"]);
  const groupsToRender = Array.from(new Set(rawGroupNames));

  const rawNatureNames = filteredNatures.length > 0
    ? filteredNatures.map((n) => n.name)
    : (DEFAULT_ACCOUNT_NATURES_MAP[financialType] || ["Operating Expense"]);
  const naturesToRender = Array.from(new Set(rawNatureNames));

  const [statementGroup, setStatementGroup] = useState(
    initialData?.statementGroup || groupsToRender[0] || "Administrative Expenses"
  );
  const [accountNature, setAccountNature] = useState(
    initialData?.accountNature || naturesToRender[0] || "Operating Expense"
  );
  const [categoryDescription, setCategoryDescription] = useState(initialData?.description || "");
  const [categoryIsActive, setCategoryIsActive] = useState(initialData?.isActive ?? true);

  const currentTypeObj = typesToRender.find((t) => t.code.toUpperCase() === financialType.toUpperCase());
  const derivedFinancialStatement =
    currentTypeObj?.financialStatement ||
    (financialType === "INCOME" || financialType === "EXPENSE" ? "Profit & Loss" : "Balance Sheet");
  const derivedNormalBalance =
    currentTypeObj?.normalBalance ||
    (financialType === "ASSET" || financialType === "EXPENSE" ? "Debit" : "Credit");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      let res: any;
      const isEdit = Boolean(initialData?.id);

      if (activeType === "customer") {
        const isB2B = customerType === "B2B" || customerType === "B2B_EXPORT";
        const payload = {
          legalName: customerName,
          tradeName: customerName,
          customerType,
          gstRegistrationStatus: isB2B && customerGstin ? "REGISTERED" : "UNREGISTERED",
          gstin: isB2B && customerGstin ? customerGstin : null,
          pan: customerPan || null,
          email: customerEmail || null,
          phone: customerPhone || null,
          contactPerson: customerContact || null,
          address: customerAddress || null,
          state: customerState,
          placeOfSupply: placeOfSupply || customerState,
          country: customerCountry || "India",
          isActive: true,
        };
        res = isEdit
          ? await updateCustomerMasterAction(initialData.id, payload)
          : await createCustomerMasterAction(payload);
      } else if (activeType === "vendor") {
        const isB2B = vendorType === "B2B";
        const payload = {
          name: vendorName,
          vendorType,
          gstRegistrationStatus: isB2B && vendorGstin ? "REGISTERED" : "UNREGISTERED",
          gstin: isB2B && vendorGstin ? vendorGstin : null,
          pan: vendorPan || null,
          email: vendorEmail || null,
          phone: vendorPhone || null,
          contactPerson: vendorContact || null,
          address: vendorAddress || null,
          state: vendorState,
          country: vendorCountry || "India",
          isActive: true,
        };
        res = isEdit
          ? await updateVendorMasterAction(initialData.id, payload)
          : await createVendorMasterAction(payload);
      } else if (activeType === "product") {
        const payload = {
          name: productName,
          type: productType,
          hsnSacCode: productHsn,
          sellingPrice: parseFloat(productRate) || 0,
          gstRate: parseFloat(productGst) || 18,
          unit: productUnit || "Hours",
          description: productDescription,
          isActive: true,
        };
        res = isEdit
          ? await updateProductMasterAction(initialData.id, payload)
          : await createProductMasterAction(payload);
      } else if (activeType === "category") {
        const payload = {
          name: categoryName,
          code: categoryCode || undefined,
          parentId: parentCategoryId || null,
          hierarchyLevel: parentCategoryId ? 2 : 1,
          financialType,
          financialStatement: derivedFinancialStatement,
          statementGroup,
          accountNature,
          normalBalance: derivedNormalBalance,
          description: categoryDescription,
          isActive: categoryIsActive,
        };
        res = isEdit
          ? await updateCategoryMasterAction(initialData.id, payload)
          : await createCategoryMasterAction(payload);
      }

      if (res?.success) {
        onSuccess(res.data);
        onClose();
      } else {
        setError(res?.error || "Failed to save master record.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md">
      <div className="bg-white/95 backdrop-blur-2xl w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/70 flex justify-between items-center bg-white/70">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold text-sm">
              ✨
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {initialData ? "Edit Master Record" : "Add Master Record"}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">Configure customer, vendor, service, or accounting heads</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Type Selector */}
        {!initialData && (
          <div className="px-6 pt-3 flex gap-2 border-b border-slate-200/70 bg-slate-50/50">
            {[
              { id: "customer", label: "Customer", icon: "👤" },
              { id: "vendor", label: "Vendor", icon: "🏢" },
              { id: "product", label: "Product & Service", icon: "📦" },
              { id: "category", label: "Category", icon: "🏷️" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveType(t.id)}
                className={`pb-3 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                  activeType === t.id
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {activeType === "customer" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Customer Legal / Trade Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Exodesoft Technologies Pvt Ltd"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Address</label>
                <input
                  type="text"
                  placeholder="Street, City, Pincode"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                />
              </div>

              {/* Customer Type & Registration Logic */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Customer Classification *
                  </label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-800"
                  >
                    <option value="B2B">Registered Business (B2B)</option>
                    <option value="B2C">Consumer / Unregistered (B2C)</option>
                    <option value="B2B_EXPORT">Export / Overseas Client (B2B)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {customerType === "B2C" ? "GST Status" : "GSTIN *"}
                  </label>
                  {customerType === "B2C" ? (
                    <div className="w-full h-10 border border-slate-200 rounded-xl px-3.5 flex items-center bg-slate-50 text-slate-400 text-xs font-semibold">
                      Unregistered (B2C Consumer)
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="e.g. 32AAAAA0000A1Z5"
                      value={customerGstin}
                      onChange={(e) => handleCustomerGstinChange(e.target.value)}
                      className="w-full h-10 border border-slate-200 rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 uppercase font-mono font-bold tracking-wider"
                    />
                  )}
                </div>
              </div>

              {/* PAN & Country */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    PAN Number {customerType !== "B2C" && "(Auto-extracted from GSTIN)"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    value={customerPan}
                    onChange={(e) => setCustomerPan(e.target.value.toUpperCase())}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 uppercase font-mono font-bold tracking-wider"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Country *</label>
                  <select
                    value={customerCountry}
                    onChange={(e) => {
                      const newCountry = e.target.value;
                      setCustomerCountry(newCountry);
                      if (newCountry !== "India") {
                        setCustomerState("");
                        setPlaceOfSupply("96 - Outside India / Export");
                      } else {
                        setCustomerState("Kerala");
                        setPlaceOfSupply("Kerala");
                      }
                    }}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-800"
                  >
                    <option value="India">India</option>
                    <option value="United Arab Emirates">United Arab Emirates (UAE)</option>
                    <option value="United States">United States (USA)</option>
                    <option value="United Kingdom">United Kingdom (UK)</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Germany">Germany</option>
                    <option value="Australia">Australia</option>
                    <option value="Other">Other / International</option>
                  </select>
                </div>
              </div>

              {/* State & Place of Supply */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">State *</label>
                  {customerCountry === "India" ? (
                    <select
                      value={customerState}
                      onChange={(e) => handleCustomerStateChange(e.target.value)}
                      className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-800"
                    >
                      {INDIAN_STATES.filter((s) => s.code !== "96").map((st) => (
                        <option key={st.code} value={st.name}>
                          {st.code} - {st.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Dubai, California"
                      value={customerState}
                      onChange={(e) => setCustomerState(e.target.value)}
                      className="w-full h-10 border border-slate-200 rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Place of Supply (GST Routing)
                  </label>
                  {customerCountry === "India" ? (
                    <select
                      value={placeOfSupply}
                      onChange={(e) => setPlaceOfSupply(e.target.value)}
                      className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-800"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st.code} value={st.name}>
                          {st.code} - {st.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={placeOfSupply}
                      onChange={(e) => setPlaceOfSupply(e.target.value)}
                      placeholder="Outside India / Export"
                      className="w-full h-10 border border-slate-200 rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                    />
                  )}
                </div>
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Contact Person</label>
                  <input
                    type="text"
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {activeType === "vendor" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Vendor Services"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Address</label>
                <input
                  type="text"
                  placeholder="Street, City, Pincode"
                  value={vendorAddress}
                  onChange={(e) => setVendorAddress(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                />
              </div>

              {/* Vendor Type & GSTIN */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Vendor Type *</label>
                  <select
                    value={vendorType}
                    onChange={(e) => setVendorType(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-800"
                  >
                    <option value="B2B">Registered Business (B2B)</option>
                    <option value="B2C">Unregistered / Service Provider (B2C)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {vendorType === "B2C" ? "GST Status" : "GSTIN *"}
                  </label>
                  {vendorType === "B2C" ? (
                    <div className="w-full h-10 border border-slate-200 rounded-xl px-3.5 flex items-center bg-slate-50 text-slate-400 text-xs font-semibold">
                      Unregistered Vendor
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="e.g. 32VENDOR1234A1Z5"
                      value={vendorGstin}
                      onChange={(e) => handleVendorGstinChange(e.target.value)}
                      className="w-full h-10 border border-slate-200 rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 uppercase font-mono font-bold tracking-wider"
                    />
                  )}
                </div>
              </div>

              {/* PAN & State */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">PAN Number</label>
                  <input
                    type="text"
                    placeholder="e.g. VENDOR1234A"
                    value={vendorPan}
                    onChange={(e) => setVendorPan(e.target.value.toUpperCase())}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 uppercase font-mono font-bold tracking-wider"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">State *</label>
                  <select
                    value={vendorState}
                    onChange={(e) => setVendorState(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-800"
                  >
                    {INDIAN_STATES.filter((s) => s.code !== "96").map((st) => (
                      <option key={st.code} value={st.name}>
                        {st.code} - {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={vendorContact}
                    onChange={(e) => setVendorContact(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">Email</label>
                  <input
                    type="email"
                    value={vendorEmail}
                    onChange={(e) => setVendorEmail(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">Phone</label>
                  <input
                    type="text"
                    value={vendorPhone}
                    onChange={(e) => setVendorPhone(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
              </div>
            </div>
          )}

          {activeType === "product" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1">
                  Product / Service Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Power BI Consulting"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">Type *</label>
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    <option value="SERVICE">Service</option>
                    <option value="PRODUCT">Product</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">HSN / SAC Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="9983"
                    value={productHsn}
                    onChange={(e) => setProductHsn(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">Default Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productRate}
                    onChange={(e) => setProductRate(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">GST Rate (%)</label>
                  <select
                    value={productGst}
                    onChange={(e) => setProductGst(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    <option value="18">18%</option>
                    <option value="12">12%</option>
                    <option value="5">5%</option>
                    <option value="0">0%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">Unit</label>
                  <input
                    type="text"
                    value={productUnit}
                    onChange={(e) => setProductUnit(e.target.value)}
                    placeholder="Hours / Units"
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Executive training and dashboard creation"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>
            </div>
          )}

          {activeType === "category" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      financialType === "INCOME"
                        ? "e.g. Consulting Revenue"
                        : "e.g. Printing & Designing"
                    }
                    value={categoryName}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setCategoryName(newName);
                      if (!isCodeManuallyEdited || !categoryCode) {
                        setCategoryCode(generateAutoCategoryCode(newName, financialType));
                      }
                    }}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">Financial Type *</label>
                  <select
                    value={financialType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setFinancialType(newType);
                      if (!isCodeManuallyEdited && categoryName) {
                        setCategoryCode(generateAutoCategoryCode(categoryName, newType));
                      }
                      const newGroups = dbGroups.filter(
                        (g) => (g.financialType?.code || g.financialTypeCode || "").toUpperCase() === newType.toUpperCase()
                      );
                      const newNatures = dbNatures.filter(
                        (n) => (n.financialType?.code || n.financialTypeCode || "").toUpperCase() === newType.toUpperCase()
                      );
                      if (newGroups.length > 0) setStatementGroup(newGroups[0].name);
                      if (newNatures.length > 0) setAccountNature(newNatures[0].name);
                    }}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55] font-semibold text-[#177B55]"
                  >
                    {typesToRender.map((ft) => (
                      <option key={ft.id || ft.code} value={ft.code}>{ft.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Accounting Derived Details Info Bar */}
              <div className="p-3 bg-[#F4F7F3] border border-[#D9E3DC] rounded-xl flex items-center justify-between text-xs text-[#68756C]">
                <div>
                  <span className="font-bold">Financial Statement:</span>{" "}
                  <span className="font-semibold text-[#177B55]">{derivedFinancialStatement}</span>
                </div>
                <div>
                  <span className="font-bold">Normal Balance:</span>{" "}
                  <span className="font-semibold text-[#177B55]">{derivedNormalBalance}</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
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
              disabled={isPending}
              className="px-6 py-2 bg-[#1b5e4b] hover:bg-[#136f58] text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
