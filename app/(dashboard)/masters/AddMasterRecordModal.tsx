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
  const [gstRegStatus, setGstRegStatus] = useState(initialData?.gstRegistrationStatus || (initialData?.gstin ? "REGISTERED" : "UNREGISTERED"));
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
  const [vendorGstRegStatus, setVendorGstRegStatus] = useState(initialData?.gstRegistrationStatus || (initialData?.gstin ? "REGISTERED" : "UNREGISTERED"));
  const [vendorGstin, setVendorGstin] = useState(initialData?.gstin || "");
  const [vendorPan, setVendorPan] = useState(initialData?.pan || "");
  const [vendorEmail, setVendorEmail] = useState(initialData?.email || "");
  const [vendorPhone, setVendorPhone] = useState(initialData?.phone || "");
  const [vendorContact, setVendorContact] = useState(initialData?.contactPerson || "");
  const [vendorAddress, setVendorAddress] = useState(initialData?.address || "");
  const [vendorState, setVendorState] = useState(initialData?.state || "Kerala");

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

function generateAutoCategoryCode(name: string, type: string) {
  if (!name.trim()) return "";
  const prefixMap: Record<string, string> = {
    EXPENSE: "EXP",
    INCOME: "INC",
    ASSET: "AST",
    LIABILITY: "LIAB",
    EQUITY: "EQ",
  };
  const prefix = prefixMap[type.toUpperCase()] || "CAT";
  const cleaned = name.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  let abbr = "";
  if (words.length >= 2) {
    abbr = words.map((w) => w[0]).join("").slice(0, 4).toUpperCase();
  } else if (words.length === 1) {
    abbr = words[0].slice(0, 3).toUpperCase();
  }
  abbr = abbr || "GEN";
  return `${prefix}-${abbr}-001`;
}

// Category State
const [categoryName, setCategoryName] = useState(initialData?.name || "");
const [categoryCode, setCategoryCode] = useState(initialData?.code || "");
const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(Boolean(initialData?.code));
const [parentCategoryId, setParentCategoryId] = useState(initialData?.parentId || "");
const [financialType, setFinancialType] = useState(initialData?.financialType || "EXPENSE");

  // Dynamically filtered Statement Groups & Account Natures based on selected Financial Type
  const filteredGroups = dbGroups.filter(
    (g) => (g.financialType?.code || g.financialTypeCode || "").toUpperCase() === financialType.toUpperCase()
  );
  const filteredNatures = dbNatures.filter(
    (n) => (n.financialType?.code || n.financialTypeCode || "").toUpperCase() === financialType.toUpperCase()
  );

  const typesToRender = dbTypes.length > 0 ? dbTypes : DEFAULT_FINANCIAL_TYPES;
  const groupsToRender = filteredGroups.length > 0
    ? filteredGroups.map((g) => g.name)
    : (DEFAULT_STATEMENT_GROUPS_MAP[financialType] || ["Administrative Expenses"]);
  const naturesToRender = filteredNatures.length > 0
    ? filteredNatures.map((n) => n.name)
    : (DEFAULT_ACCOUNT_NATURES_MAP[financialType] || ["Operating Expense"]);

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
        const payload = {
          legalName: customerName,
          tradeName: customerName,
          customerType,
          gstRegistrationStatus: gstRegStatus,
          gstin: gstRegStatus === "REGISTERED" ? customerGstin || null : null,
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
        const payload = {
          name: vendorName,
          vendorType,
          gstRegistrationStatus: vendorGstRegStatus,
          gstin: vendorGstRegStatus === "REGISTERED" ? vendorGstin || null : null,
          pan: vendorPan || null,
          email: vendorEmail || null,
          phone: vendorPhone || null,
          contactPerson: vendorContact || null,
          address: vendorAddress || null,
          state: vendorState,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-[#D9E3DC] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#D9E3DC] flex justify-between items-center bg-white">
          <h2 className="text-xl font-bold text-[#17211B]">
            {initialData ? "Edit Record" : "Add Record"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#68756C] hover:text-[#17211B] p-2 rounded-lg hover:bg-[#F4F7F3] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Type Selector */}
        {!initialData && (
          <div className="px-6 pt-4 flex gap-2 border-b border-[#D9E3DC] bg-[#F6FAF7]">
            {[
              { id: "customer", label: "Customer" },
              { id: "vendor", label: "Vendor" },
              { id: "product", label: "Product & Service" },
              { id: "category", label: "Category" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveType(t.id)}
                className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
                  activeType === t.id
                    ? "border-[#177B55] text-[#177B55]"
                    : "border-transparent text-[#68756C] hover:text-[#17211B]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {activeType === "customer" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1">
                  Customer Legal / Trade Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Exodesoft Technologies Pvt Ltd"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    Customer Type *
                  </label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    <option value="B2B">B2B</option>
                    <option value="B2C">Domestic B2C</option>
                    <option value="B2B_EXPORT">B2B Export</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    GST Registration Status
                  </label>
                  <select
                    value={gstRegStatus}
                    onChange={(e) => setGstRegStatus(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    <option value="REGISTERED">Registered</option>
                    <option value="UNREGISTERED">Unregistered</option>
                  </select>
                </div>
              </div>

              {gstRegStatus === "REGISTERED" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#68756C] mb-1">
                      GSTIN *
                    </label>
                    <input
                      type="text"
                      required={gstRegStatus === "REGISTERED"}
                      placeholder="e.g. 32ABCDE1234F1Z5"
                      value={customerGstin}
                      onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                      className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55] uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#68756C] mb-1">
                      PAN (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ABCDE1234F"
                      value={customerPan}
                      onChange={(e) => setCustomerPan(e.target.value.toUpperCase())}
                      className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55] uppercase"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={customerState}
                    onChange={(e) => setCustomerState(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">Place of Supply</label>
                  <input
                    type="text"
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    placeholder="Kerala"
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">Country</label>
                  <input
                    type="text"
                    value={customerCountry}
                    onChange={(e) => setCustomerCountry(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Street, City, Pincode"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">Phone</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
              </div>
            </div>
          )}

          {activeType === "vendor" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Vendor Services"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">Vendor Type</label>
                  <select
                    value={vendorType}
                    onChange={(e) => setVendorType(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    <option value="B2B">B2B Vendor</option>
                    <option value="B2C">B2C Vendor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">GST Registration</label>
                  <select
                    value={vendorGstRegStatus}
                    onChange={(e) => setVendorGstRegStatus(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    <option value="REGISTERED">Registered</option>
                    <option value="UNREGISTERED">Unregistered</option>
                  </select>
                </div>
              </div>

              {vendorGstRegStatus === "REGISTERED" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#68756C] mb-1">GSTIN</label>
                    <input
                      type="text"
                      placeholder="e.g. 32VENDOR1234A1Z5"
                      value={vendorGstin}
                      onChange={(e) => setVendorGstin(e.target.value.toUpperCase())}
                      className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55] uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#68756C] mb-1">PAN (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. VENDOR1234A"
                      value={vendorPan}
                      onChange={(e) => setVendorPan(e.target.value.toUpperCase())}
                      className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55] uppercase"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1">State</label>
                <input
                  type="text"
                  value={vendorState}
                  onChange={(e) => setVendorState(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
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
                    placeholder="e.g. Printing & Designing"
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
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    Category Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EXP-PRT-001"
                    value={categoryCode}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setCategoryCode(val);
                      if (val.trim()) {
                        setIsCodeManuallyEdited(true);
                      } else {
                        setIsCodeManuallyEdited(false);
                        if (categoryName) {
                          setCategoryCode(generateAutoCategoryCode(categoryName, financialType));
                        }
                      }
                    }}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55] uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">Parent Category</label>
                  <select
                    value={parentCategoryId}
                    onChange={(e) => setParentCategoryId(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    <option value="">None (Top-Level Category)</option>
                    {categories.filter((c) => !c.parentId && c.id !== initialData?.id && (c.financialType || "EXPENSE").toUpperCase() === financialType.toUpperCase()).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">Financial Statement (Auto)</label>
                  <input
                    type="text"
                    disabled
                    value={derivedFinancialStatement}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-[#F4F7F3] text-[#68756C] font-semibold cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">Normal Balance (Auto)</label>
                  <input
                    type="text"
                    disabled
                    value={derivedNormalBalance}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-[#F4F7F3] text-[#68756C] font-semibold cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    Financial Statement Group *
                  </label>
                  <select
                    value={statementGroup}
                    onChange={(e) => setStatementGroup(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    {groupsToRender.map((sgName) => (
                      <option key={sgName} value={sgName}>{sgName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    Account Nature *
                  </label>
                  <select
                    value={accountNature}
                    onChange={(e) => setAccountNature(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    {naturesToRender.map((anName) => (
                      <option key={anName} value={anName}>{anName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Expenses for printing brochures, stickers and marketing materials."
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1">Status *</label>
                <select
                  value={categoryIsActive ? "ACTIVE" : "INACTIVE"}
                  onChange={(e) => setCategoryIsActive(e.target.value === "ACTIVE")}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
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
