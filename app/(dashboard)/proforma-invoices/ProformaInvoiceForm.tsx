"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createProformaInvoiceAction, updateProformaInvoiceAction } from "../invoices/proforma-actions";
import { CustomerForm } from "../customers/CustomerForm";
import { TaxEngine } from "@/lib/tax";
import { BUSINESS_LOCATION } from "@/lib/config/business";
import { AddMasterRecordModal } from "../masters/AddMasterRecordModal";
import { formatDate } from "@/lib/utils/format-date";
import { numberToWords } from "@/lib/utils/number-to-words";

const GST_RATES = [0, 5, 12, 18, 28];

type FormProps = {
  initialData?: any;
  customers: any[];
  products: any[];
};

const PAYMENT_TERMS_OPTIONS = [
  "Due on Receipt",
  "7 Days",
  "15 Days",
  "30 Days",
  "45 Days",
  "60 Days",
  "Custom",
];

const getCurrentFinancialYear = () => {
  const today = new Date();
  const year = today.getFullYear();
  if (today.getMonth() >= 3) {
    return `FY ${year}-${(year + 1).toString().slice(2)}`;
  } else {
    return `FY ${year - 1}-${year.toString().slice(2)}`;
  }
};

const getFinancialYearsList = () => {
  const today = new Date();
  const currentStartYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  return Array.from({ length: 5 }, (_, i) => {
    const start = currentStartYear - 2 + i;
    return `FY ${start}-${(start + 1).toString().slice(2)}`;
  });
};

export function ProformaInvoiceForm({ initialData, customers: initialCustomers, products: initialProducts }: FormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [customers, setCustomers] = useState(initialCustomers);
  const [products, setProducts] = useState(initialProducts);
  const [modalConfig, setModalConfig] = useState<{ type: string; itemId?: string } | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState(initialData?.customerId || "");
  const [customerType, setCustomerType] = useState(initialData?.customerType || "B2B");
  const [financialYear, setFinancialYear] = useState(initialData?.financialYear || getCurrentFinancialYear());
  const [invoiceDate, setInvoiceDate] = useState(
    initialData?.invoiceDate ? new Date(initialData.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [isPurchaseOrder, setIsPurchaseOrder] = useState(initialData?.isPurchaseOrder || false);
  const [notes, setNotes] = useState(initialData?.notes || "");

  // GST & Tax Options
  const [globalGstRate, setGlobalGstRate] = useState<number>(initialData?.globalGstRate ?? 18);
  const [isGstInclusive, setIsGstInclusive] = useState<"EXCLUSIVE" | "INCLUSIVE">("EXCLUSIVE");

  // Additional Settings State
  const [showAdditionalSettings, setShowAdditionalSettings] = useState(true);
  const [gstTreatment, setGstTreatment] = useState<string>("CGST + SGST");
  const [paymentTerms, setPaymentTerms] = useState<string>("Due on Receipt");
  const [isTdsApplicable, setIsTdsApplicable] = useState<"NO" | "YES">(
    initialData?.tdsRate && Number(initialData.tdsRate) > 0 ? "YES" : "NO"
  );
  const [tdsPercent, setTdsPercent] = useState<number>(
    initialData?.tdsRate ? Number(initialData.tdsRate) : 10
  );
  const [placeCountry, setPlaceCountry] = useState<string>("Kerala, India");
  const [customerGstin, setCustomerGstin] = useState<string>("");
  const [customerAddress, setCustomerAddress] = useState<string>("");

  // Items State
  const [items, setItems] = useState<any[]>(
    initialData?.items?.map((i: any) => ({
      id: Math.random().toString(),
      productId: i.productId,
      description: i.description || "",
      hsnSacCode: products.find(p => p.id === i.productId)?.hsnSacCode || "",
      quantity: Number(i.quantity) || 1,
      unit: i.unit || "Piece",
      unitPrice: Number(i.unitPrice) || 0,
      discountPercent: Number(i.discountPercent) || 0,
      isGstEnabled: i.isGstEnabled ?? true,
      gstRate: Number(i.gstRate || 0),
    })) || [
      {
        id: Math.random().toString(),
        productId: products[0]?.id || "",
        description: products[0]?.description || "",
        hsnSacCode: products[0]?.hsnSacCode || "",
        quantity: 1,
        unit: products[0]?.unit || "Piece",
        unitPrice: Number(products[0]?.sellingPrice || 0),
        discountPercent: 0,
        isGstEnabled: true,
        gstRate: Number(products[0]?.gstRate || 18),
      }
    ]
  );

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === customerId);
  }, [customerId, customers]);

  // Auto-fill customer details when selectedCustomer or customerType changes
  useEffect(() => {
    if (selectedCustomer) {
      setCustomerGstin(selectedCustomer.gstin || "");
      const addr = [selectedCustomer.address, selectedCustomer.city, selectedCustomer.pinCode]
        .filter(Boolean)
        .join(", ");
      setCustomerAddress(addr || selectedCustomer.address || "");

      const isKerala = (selectedCustomer.state || "").trim().toLowerCase() === BUSINESS_LOCATION.state.toLowerCase();
      setPlaceCountry(
        selectedCustomer.state
          ? `${selectedCustomer.state}, ${selectedCustomer.country || "India"}`
          : "Kerala, India"
      );

      if (customerType === "B2B_EXPORT") {
        setGstTreatment("Export / Zero Rated");
      } else if (isKerala || !selectedCustomer.state) {
        setGstTreatment("CGST + SGST");
      } else {
        setGstTreatment("IGST");
      }
    }
  }, [selectedCustomer, customerType]);

  // Determine active tax logic based on Customer Type & GST Treatment
  const isKerala = !selectedCustomer?.state || selectedCustomer.state.trim().toLowerCase() === BUSINESS_LOCATION.state.toLowerCase();
  const isExport = customerType === "B2B_EXPORT" || gstTreatment === "Export / Zero Rated";
  const isGstExempt = gstTreatment === "GST Not Applicable";
  const effectiveGstRate = isExport || isGstExempt ? 0 : globalGstRate;

  // Live Calculations
  const calculationResult = useMemo(() => {
    const isInclusive = isGstInclusive === "INCLUSIVE";
    let subtotal = 0;
    let totalDiscount = 0;
    let taxableAmount = 0;

    const calculatedItems = items.map(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const discount = Number(item.discountPercent) || 0;

      const rawGross = Number((qty * price).toFixed(2));
      const discountAmount = Number(((rawGross * discount) / 100).toFixed(2));
      let itemTaxable = 0;

      if (isInclusive && effectiveGstRate > 0) {
        const netAfterDiscount = Number((rawGross - discountAmount).toFixed(2));
        itemTaxable = Number((netAfterDiscount / (1 + effectiveGstRate / 100)).toFixed(2));
      } else {
        itemTaxable = Number((rawGross - discountAmount).toFixed(2));
      }

      subtotal += rawGross;
      totalDiscount += discountAmount;
      taxableAmount += itemTaxable;

      return {
        ...item,
        quantity: qty,
        unitPrice: price,
        discountPercent: discount,
        grossAmount: rawGross,
        discountAmount,
        taxableAmount: itemTaxable,
      };
    });

    subtotal = Number(subtotal.toFixed(2));
    totalDiscount = Number(totalDiscount.toFixed(2));
    taxableAmount = Number(taxableAmount.toFixed(2));

    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalGST = 0;

    if (effectiveGstRate > 0) {
      if (gstTreatment === "IGST" || (selectedCustomer?.state && selectedCustomer.state.toLowerCase() !== BUSINESS_LOCATION.state.toLowerCase() && gstTreatment !== "CGST + SGST")) {
        totalIGST = Number(((taxableAmount * effectiveGstRate) / 100).toFixed(2));
        totalGST = totalIGST;
      } else {
        const halfRate = effectiveGstRate / 2;
        totalCGST = Number(((taxableAmount * halfRate) / 100).toFixed(2));
        totalSGST = Number(((taxableAmount * halfRate) / 100).toFixed(2));
        totalGST = Number((totalCGST + totalSGST).toFixed(2));
      }
    }

    const grossAmount = isInclusive && effectiveGstRate > 0
      ? Number((subtotal - totalDiscount).toFixed(2))
      : Number((taxableAmount + totalGST).toFixed(2));

    const tdsRateApplied = isTdsApplicable === "YES" ? Number(tdsPercent) || 0 : 0;
    const totalTdsAmount = tdsRateApplied > 0
      ? Number(((taxableAmount * tdsRateApplied) / 100).toFixed(2))
      : 0;

    const netAmount = Number((grossAmount - totalTdsAmount).toFixed(2));

    return {
      subtotal,
      totalDiscount,
      taxableAmount,
      totalCGST,
      totalSGST,
      totalIGST,
      totalGST,
      tdsRate: tdsRateApplied,
      tdsAmount: totalTdsAmount,
      grossAmount,
      netAmount,
      calculatedItems,
    };
  }, [items, selectedCustomer, effectiveGstRate, isGstInclusive, gstTreatment, isTdsApplicable, tdsPercent]);

  // Base Amount for Reverse GST display
  const revGstBaseAmount = calculationResult.taxableAmount;

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(),
        productId: "",
        description: "",
        hsnSacCode: "",
        quantity: 1,
        unit: "Piece",
        unitPrice: 0,
        discountPercent: 0,
        isGstEnabled: true,
        gstRate: 0,
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    if (field === 'productId' && value === 'ADD_NEW') {
      setModalConfig({ type: 'product', itemId: id });
      return;
    }
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'productId' && value) {
          const product = products.find(p => p.id === value);
          if (product) {
            updated.description = product.description || "";
            updated.hsnSacCode = product.hsnSacCode || "";
            updated.unit = product.unit || "Piece";
            updated.unitPrice = Number(product.customPrice || product.sellingPrice || 0);
            updated.gstRate = Number(product.gstRate || 18);
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "ADD_NEW") {
      setModalConfig({ type: "customer" });
    } else {
      setCustomerId(val);
      const cust = customers.find(c => c.id === val);
      if (cust?.customerType) {
        setCustomerType(cust.customerType);
      }
    }
  };

  const handleModalSuccess = (newRecord?: any) => {
    if (modalConfig?.type === "customer" && newRecord) {
      setCustomers((prev) => [...prev, newRecord]);
      setCustomerId(newRecord.id);
    } else if (modalConfig?.type === "product" && newRecord) {
      setProducts((prev) => [...prev, newRecord]);
      if (modalConfig.itemId) {
        handleItemChange(modalConfig.itemId, "productId", newRecord.id);
      }
    }
    setModalConfig(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!customerId) return setError("Please select a customer.");
    
    if (customerType !== "B2B_EXPORT" && (!selectedCustomer?.state || selectedCustomer.state.trim() === "")) {
      return setError("Customer must have a valid State for GST calculation. Please update the customer details.");
    }

    if (!invoiceDate) return setError("Invoice Date is required.");
    if (items.length === 0) return setError("At least one item is required.");
    
    for (const item of items) {
      if (!item.productId) return setError("Please select a product for all items.");
      if (item.quantity <= 0) return setError("Quantity must be greater than 0.");
      if (item.unitPrice < 0) return setError("Unit price cannot be negative.");
    }

    startTransition(async () => {
      const payload = {
        customerId,
        customerType,
        financialYear,
        invoiceDate,
        isPurchaseOrder,
        notes,
        tdsRate: calculationResult.tdsRate,
        globalGstRate: effectiveGstRate,
        isGlobalGstEnabled: true,
        globalTdsRate: calculationResult.tdsRate,
        isGlobalTdsEnabled: calculationResult.tdsRate > 0,
        isGstInclusive: isGstInclusive === "INCLUSIVE",
        gstTreatment,
        paymentTerms,
        placeCountry,
        customerGstin,
        customerAddress,
        items: items.map(i => ({
          productId: i.productId,
          description: i.description,
          quantity: Number(i.quantity),
          unit: i.unit,
          unitPrice: Number(i.unitPrice),
          discountPercent: Number(i.discountPercent),
          isGstEnabled: effectiveGstRate > 0,
          gstRate: effectiveGstRate,
          isTdsEnabled: calculationResult.tdsRate > 0,
          tdsRate: calculationResult.tdsRate,
          isIgstEnabled: gstTreatment === "IGST",
          igstRate: gstTreatment === "IGST" ? effectiveGstRate : 0,
        }))
      };

      let res;
      if (initialData) {
        res = await updateProformaInvoiceAction(initialData.id, payload);
      } else {
        res = await createProformaInvoiceAction(payload);
      }

      if (res.success) {
        setSuccess("Proforma Invoice saved as draft successfully.");
        setTimeout(() => {
          router.push("/invoices?tab=proforma");
        }, 1200);
      } else {
        setError(res.error || "Unable to save Proforma Invoice.");
      }
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 pb-28">
        <p className="text-xs text-theme-text-muted">
          Enter customer details, add items, check the total and preview.
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium border border-red-200 shadow-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm font-medium border border-emerald-200 shadow-sm">
            {success}
          </div>
        )}

        {/* Invoice Details Card */}
        <div className="bg-theme-surface border border-theme-border rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-start border-b border-theme-border pb-3">
            <div>
              <h3 className="text-base font-bold text-theme-text">Invoice Details</h3>
              <p className="text-xs text-theme-text-muted">Basic details for this proforma invoice</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-theme-text bg-theme-surface-hover px-2.5 py-1 rounded-lg border border-theme-border cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isPurchaseOrder} 
                  onChange={(e) => setIsPurchaseOrder(e.target.checked)}
                  className="w-3.5 h-3.5 text-theme-primary focus:ring-theme-primary border-theme-border rounded"
                />
                <span>Purchase Order</span>
              </label>
              <span className="bg-yellow-100 text-yellow-800 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                {initialData?.status || "DRAFT"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Customer */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-theme-text uppercase tracking-wide">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={customerId}
                onChange={handleCustomerChange}
                required
                className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface"
              >
                <option value="">Select Customer...</option>
                {customers.map(c => {
                  const hasDifferentTradeName = c.tradeName && c.tradeName.trim().toLowerCase() !== c.legalName.trim().toLowerCase();
                  return (
                    <option key={c.id} value={c.id}>
                      {c.legalName}{hasDifferentTradeName ? ` (${c.tradeName})` : ''}
                    </option>
                  );
                })}
                <option value="ADD_NEW" className="font-bold text-theme-primary bg-theme-surface-hover">+ Add New Customer</option>
              </select>
              <p className="text-[11px] text-theme-text-muted">
                GSTIN and address are loaded from the customer master
              </p>
              {selectedCustomer && (
                <div className="text-[11px] text-theme-text font-medium pt-0.5 truncate">
                  <span>{selectedCustomer.legalName}</span>
                  {selectedCustomer.city && <span> • {selectedCustomer.city}, {selectedCustomer.state}</span>}
                  {selectedCustomer.gstin && <span className="text-theme-text-muted"> | GSTIN: <strong className="text-theme-text">{selectedCustomer.gstin}</strong></span>}
                </div>
              )}
            </div>

            {/* Invoice Type */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-theme-text uppercase tracking-wide">
                Invoice Type <span className="text-red-500">*</span>
              </label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface"
              >
                <option value="B2B">Domestic B2B</option>
                <option value="B2C">Domestic B2C</option>
                <option value="B2B_EXPORT">B2B Export</option>
              </select>
              <p className="text-[11px] text-theme-text-muted">
                {customerType === "B2B_EXPORT" 
                  ? "Zero-rated international supply" 
                  : selectedCustomer?.state && selectedCustomer.state.toLowerCase() === BUSINESS_LOCATION.state.toLowerCase()
                  ? `Domestic supply • ${BUSINESS_LOCATION.state}, India`
                  : `Inter-state supply • ${selectedCustomer?.state || "India"}`}
              </p>
            </div>

            {/* Financial Year */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-theme-text uppercase tracking-wide">
                Financial Year <span className="text-red-500">*</span>
              </label>
              <select
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface"
              >
                {getFinancialYearsList().map(fy => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </select>
            </div>

            {/* Invoice Date */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-theme-text uppercase tracking-wide">
                Invoice Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface"
              />
            </div>
          </div>
        </div>

        {/* Items Card */}
        <div className="bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden space-y-0">
          <div className="p-4 bg-theme-surface border-b border-theme-border flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-theme-text">Items</h3>
              <p className="text-xs text-theme-text-muted">Add the services or products being billed.</p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs font-bold text-theme-primary hover:text-theme-primary-dark border border-theme-primary/30 px-3 py-1.5 rounded-lg hover:bg-theme-primary/5 flex items-center gap-1 transition-colors"
            >
              <span>+</span> Add Item
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[750px]">
              <thead>
                <tr className="bg-theme-surface-hover text-[11px] uppercase text-theme-text-muted font-bold tracking-wider border-b border-theme-border">
                  <th className="px-4 py-3 w-72">Item & Description</th>
                  <th className="px-3 py-3 w-28">HSN / SAC</th>
                  <th className="px-3 py-3 w-20">Qty</th>
                  <th className="px-3 py-3 w-32">Rate</th>
                  <th className="px-4 py-3 text-right w-36">Amount</th>
                  <th className="px-2 py-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border text-sm">
                {items.map((item, index) => {
                  const calc = calculationResult.calculatedItems[index];
                  const enteredLineAmount = Number(((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2));
                  const displayAmount = isGstInclusive === "INCLUSIVE"
                    ? enteredLineAmount
                    : (calc?.taxableAmount || 0);

                  return (
                    <tr key={item.id} className="bg-theme-surface align-top hover:bg-theme-surface-hover/50">
                      <td className="px-4 py-3 space-y-1.5">
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemChange(item.id, 'productId', e.target.value)}
                          required
                          className="w-full border border-theme-border rounded-lg px-2.5 py-1.5 text-sm font-medium focus:ring-1 focus:ring-theme-primary bg-theme-surface"
                        >
                          <option value="">Select Service / Product...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                          <option value="ADD_NEW" className="font-bold text-theme-primary bg-theme-surface-hover">+ Add New Product / Service</option>
                        </select>
                        <input 
                          type="text"
                          placeholder="Description or specifics..."
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          className="w-full border border-theme-border/60 rounded-md px-2.5 py-1 text-xs bg-theme-surface text-theme-text-muted"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          readOnly
                          value={item.hsnSacCode}
                          placeholder="9983"
                          className="w-full border border-theme-border rounded-lg px-2.5 py-1.5 text-sm bg-theme-surface-hover/80 opacity-80"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                          className="w-full border border-theme-border rounded-lg px-2.5 py-1.5 text-sm bg-theme-surface text-center font-medium"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                          className="w-full border border-theme-border rounded-lg px-2.5 py-1.5 text-sm bg-theme-surface font-medium"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-theme-text whitespace-nowrap pt-4">
                        ₹{Number(displayAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-3 text-center pt-3.5">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Remove Item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {items.length === 0 && (
              <div className="text-center py-8 text-sm text-theme-text-muted">
                No items added. Click "+ Add Item" above to add products or services.
              </div>
            )}
          </div>

          {/* GST Controls Bar (Matching Screenshot 1 & 2) */}
          <div className="p-4 bg-theme-surface-hover/60 border-t border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              {/* GST / IGST Rate */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-theme-text uppercase tracking-wide">
                  {isExport ? "Tax Rate:" : isKerala ? "GST Rate:" : "IGST Rate:"}
                </label>
                <select
                  value={globalGstRate}
                  disabled={isExport || isGstExempt}
                  onChange={(e) => setGlobalGstRate(Number(e.target.value))}
                  className="border border-theme-border rounded-lg px-2.5 py-1.5 text-sm font-semibold bg-theme-surface focus:ring-1 focus:ring-theme-primary disabled:opacity-50"
                >
                  {GST_RATES.map(rate => (
                    <option key={rate} value={rate}>{rate}%</option>
                  ))}
                </select>
              </div>

              {/* GST-inclusive / IGST-inclusive? */}
              {!isExport && !isGstExempt && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-theme-text uppercase tracking-wide">
                    {isKerala ? "GST-inclusive?" : "IGST-inclusive?"}
                  </label>
                  <select
                    value={isGstInclusive}
                    onChange={(e) => setIsGstInclusive(e.target.value as "EXCLUSIVE" | "INCLUSIVE")}
                    className="border border-theme-border rounded-lg px-3 py-1.5 text-sm font-semibold bg-theme-surface focus:ring-2 focus:ring-theme-primary text-theme-text"
                  >
                    <option value="EXCLUSIVE">{isKerala ? "GST Exclusive" : "IGST Exclusive"}</option>
                    <option value="INCLUSIVE">{isKerala ? "GST Inclusive" : "IGST Inclusive"}</option>
                  </select>
                </div>
              )}
            </div>

            {/* Reverse GST Base Amount Indicator */}
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-lg text-xs self-start sm:self-auto">
              <span className="text-emerald-800 font-medium">Base amount:</span>
              <span className="text-emerald-900 font-bold text-sm">
                ₹{Number(revGstBaseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Notes & Summary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Notes / Terms */}
          <div className="bg-theme-surface border border-theme-border rounded-xl shadow-sm p-6 space-y-2">
            <label className="block text-xs font-bold text-theme-text uppercase tracking-wide">
              Notes / Terms
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full border border-theme-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface"
              placeholder="Add any additional notes for the customer..."
            />
          </div>
          
          {/* Summary Card */}
          <div className="bg-theme-surface border border-theme-border rounded-xl shadow-sm p-6 space-y-3">
            <h3 className="text-base font-bold text-theme-text border-b border-theme-border pb-2">Summary</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-theme-text font-medium">
                <span>Subtotal</span>
                <span>₹{calculationResult.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              {calculationResult.totalDiscount > 0 && (
                <div className="flex justify-between text-theme-text-muted">
                  <span>Discount</span>
                  <span>-₹{calculationResult.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}

              {effectiveGstRate > 0 && (
                <>
                  {gstTreatment === "IGST" ? (
                    <div className="flex justify-between text-theme-text-muted">
                      <span>IGST {effectiveGstRate}%</span>
                      <span>₹{calculationResult.totalIGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-theme-text-muted">
                        <span>CGST {effectiveGstRate / 2}%</span>
                        <span>₹{calculationResult.totalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-theme-text-muted">
                        <span>SGST {effectiveGstRate / 2}%</span>
                        <span>₹{calculationResult.totalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                </>
              )}

              {isTdsApplicable === "YES" && calculationResult.tdsRate > 0 && (
                <div className="flex justify-between text-amber-700 font-medium">
                  <span>TDS ({calculationResult.tdsRate}%)</span>
                  <span>-₹{calculationResult.tdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="pt-3 border-t border-theme-border flex justify-between items-center">
                <span className="text-base font-bold text-theme-text">
                  Grand Total
                </span>
                <span className="text-2xl font-black text-theme-primary">
                  ₹{calculationResult.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Settings Tile (Matching Screenshot 2) */}
        <div className="bg-theme-surface border border-theme-border rounded-xl shadow-sm p-6 space-y-4">
          <div 
            className="flex justify-between items-center cursor-pointer select-none"
            onClick={() => setShowAdditionalSettings(!showAdditionalSettings)}
          >
            <div>
              <h3 className="text-base font-bold text-theme-text">Additional Settings</h3>
              <p className="text-xs text-theme-text-muted">GST treatment, payment terms and internal TDS tracking</p>
            </div>
            <button
              type="button"
              className="text-theme-text-muted hover:text-theme-text p-1"
            >
              <svg className={`w-5 h-5 transition-transform ${showAdditionalSettings ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {showAdditionalSettings && (
            <div className="pt-2 space-y-4 border-t border-theme-border">
              {/* Row 1: GST Treatment, Payment Terms, TDS Applicable? */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* GST Treatment */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-theme-text uppercase tracking-wide">
                    GST Treatment
                  </label>
                  <select
                    value={gstTreatment}
                    onChange={(e) => setGstTreatment(e.target.value)}
                    className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm font-semibold bg-theme-surface focus:ring-2 focus:ring-theme-primary"
                  >
                    <option value="CGST + SGST">CGST + SGST</option>
                    <option value="IGST">IGST</option>
                    <option value="Export / Zero Rated">Export / Zero Rated</option>
                    <option value="GST Not Applicable">GST Not Applicable</option>
                  </select>
                </div>

                {/* Payment Terms */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-theme-text uppercase tracking-wide">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm font-semibold bg-theme-surface focus:ring-2 focus:ring-theme-primary"
                  >
                    {PAYMENT_TERMS_OPTIONS.map(term => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                </div>

                {/* TDS Applicable? */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-theme-text uppercase tracking-wide">
                    TDS Applicable?
                  </label>
                  <select
                    value={isTdsApplicable}
                    onChange={(e) => setIsTdsApplicable(e.target.value as "NO" | "YES")}
                    className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm font-semibold bg-theme-surface focus:ring-2 focus:ring-theme-primary"
                  >
                    <option value="NO">No</option>
                    <option value="YES">Yes</option>
                  </select>
                </div>
              </div>

              {/* Row 2: TDS %, Place / Country, Customer GSTIN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* TDS % */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-theme-text uppercase tracking-wide">
                    TDS %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    disabled={isTdsApplicable === "NO"}
                    value={tdsPercent}
                    onChange={(e) => setTdsPercent(Number(e.target.value))}
                    placeholder="10"
                    className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm font-semibold bg-theme-surface focus:ring-2 focus:ring-theme-primary disabled:bg-theme-surface-hover disabled:opacity-50"
                  />
                </div>

                {/* Place / Country */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-theme-text uppercase tracking-wide">
                    Place / Country
                  </label>
                  <input
                    type="text"
                    value={placeCountry}
                    onChange={(e) => setPlaceCountry(e.target.value)}
                    placeholder="Kerala, India"
                    className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm font-semibold bg-theme-surface focus:ring-2 focus:ring-theme-primary"
                  />
                </div>

                {/* Customer GSTIN */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-theme-text uppercase tracking-wide">
                    Customer GSTIN
                  </label>
                  <input
                    type="text"
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value)}
                    placeholder="32AAAAA0000A1Z5"
                    className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm font-semibold bg-theme-surface focus:ring-2 focus:ring-theme-primary uppercase"
                  />
                </div>
              </div>

              {/* Row 3: Customer Address */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wide">
                  Customer Address
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Kochi, Kerala"
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm font-medium bg-theme-surface focus:ring-2 focus:ring-theme-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Live Invoice Preview Card */}
        <div className="bg-white border border-theme-border rounded-xl shadow-lg p-6 sm:p-8 text-black space-y-6">
          {/* Top Header: Logo + Company Info (Left), Title & Invoice Meta (Right) */}
          <div className="pb-4 border-b border-gray-200 flex flex-row justify-between items-start gap-4">
            <div>
              {/* KVJ Analytics Official Logo */}
              <img src="/kvj-logo.png" alt="KVJ Analytics" className="h-12 w-auto mb-3 object-contain" />
              <div className="space-y-0.5 text-xs text-gray-600">
                <p className="font-bold text-gray-900 text-sm">KVJ Analytics</p>
                <p>III- Floor, Lalan Towers</p>
                <p>Banerji Road, Kochi, Kerala - 682031</p>
                <p className="pt-1"><span className="text-gray-500 font-medium">Mobile:</span> <strong className="text-gray-900 font-semibold">+91 99618 13730</strong></p>
                <p><span className="text-gray-500 font-medium">Phone:</span> <strong className="text-gray-900 font-semibold">0484 4059310</strong></p>
              </div>
            </div>
            
            <div className="flex flex-col items-end text-right">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1e3a8a] tracking-tight mb-3 uppercase">
                {isPurchaseOrder ? "PURCHASE ORDER" : "PROFORMA INVOICE"}
              </h2>
              
              <table className="text-xs sm:text-sm">
                <tbody>
                  <tr>
                    <td className="text-gray-500 pr-3 py-0.5 text-right">Proforma No:</td>
                    <td className="font-bold text-gray-900 text-right">{initialData?.invoiceNumber || "Auto-assigned on Save"}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 pr-3 py-0.5 text-right">Date:</td>
                    <td className="font-semibold text-gray-900 text-right">{formatDate(invoiceDate)}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 pr-3 py-0.5 text-right">GSTIN:</td>
                    <td className="font-bold text-gray-900 text-right">32BIDPK3118B1Z2</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <h4 className="font-bold text-gray-800 text-xs uppercase mb-1">BILLED TO:</h4>
              {selectedCustomer ? (
                <div className="space-y-1 max-w-md">
                  <p className="font-bold text-gray-900 text-base">{selectedCustomer.legalName}</p>
                  {customerAddress && <p className="whitespace-pre-line break-words leading-snug">{customerAddress}</p>}
                  <p>Place / Country: <strong className="text-gray-900">{placeCountry}</strong></p>
                </div>
              ) : (
                <p className="text-gray-400 italic">Select a customer</p>
              )}
            </div>
            <div className="sm:text-right space-y-1 text-xs sm:text-sm self-start md:self-auto">
              {customerGstin && (
                <p><span className="text-gray-500 font-medium">GSTIN:</span> <strong className="text-gray-900">{customerGstin}</strong></p>
              )}
              <p><span className="text-gray-500 font-medium">Place of Supply:</span> <strong className="text-gray-900">{placeCountry}</strong></p>
              <p><span className="text-gray-500 font-medium">Purchase Order No:</span> <strong className="text-gray-900">NIL</strong></p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-y-2 border-gray-800 font-bold text-gray-700 text-xs uppercase">
                  <th className="py-2.5 px-2">Item</th>
                  <th className="py-2.5 px-2">HSN/SAC</th>
                  <th className="py-2.5 px-2 text-right">Qty</th>
                  <th className="py-2.5 px-2 text-right">Rate</th>
                  <th className="py-2.5 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {calculationResult.calculatedItems.map((itemCalc, idx) => {
                  const item = items[idx];
                  return (
                    <tr key={idx}>
                      <td className="py-2.5 px-2">
                        <p className="font-medium text-gray-900">{products.find(p => p.id === item.productId)?.name || "Service / Product"}</p>
                        {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                      </td>
                      <td className="py-2.5 px-2 text-gray-600">{item.hsnSacCode || "—"}</td>
                      <td className="py-2.5 px-2 text-right">{Number(item.quantity || 0)}</td>
                      <td className="py-2.5 px-2 text-right">₹{Number(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2.5 px-2 text-right font-medium">₹{Number(itemCalc?.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end border-t border-gray-200 pt-4">
            <div className="w-80 space-y-2 text-sm">
              <div className="flex justify-between font-medium text-gray-700">
                <span>Subtotal:</span>
                <span>₹{calculationResult.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              {effectiveGstRate > 0 && (
                <>
                  {gstTreatment === "IGST" ? (
                    <div className="flex justify-between text-gray-600">
                      <span>IGST ({effectiveGstRate}%):</span>
                      <span>₹{calculationResult.totalIGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-gray-600">
                        <span>CGST ({effectiveGstRate / 2}%):</span>
                        <span>₹{calculationResult.totalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>SGST ({effectiveGstRate / 2}%):</span>
                        <span>₹{calculationResult.totalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                </>
              )}

              {isTdsApplicable === "YES" && calculationResult.tdsRate > 0 && (
                <div className="flex justify-between text-amber-800 font-medium">
                  <span>TDS Deduction ({calculationResult.tdsRate}%):</span>
                  <span>-₹{calculationResult.tdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex justify-between items-center border-t-2 border-gray-800 pt-2 mt-2">
                <span className="font-bold text-base text-gray-900">Grand Total:</span>
                <span className="font-black text-xl text-theme-primary">
                  ₹{calculationResult.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Amount In Words & Notes */}
          <div className="border-t border-gray-200 pt-4 space-y-2 text-xs sm:text-sm">
            <div>
              <h4 className="font-bold text-gray-900 mb-0.5">Amount in words:</h4>
              <p className="font-medium text-gray-700 italic">
                {numberToWords(calculationResult.netAmount)}
              </p>
            </div>
            {isExport && (
              <p className="text-xs text-gray-700 font-medium pt-0.5">
                Supply to SEZ for authorized operations under Letter of Undertaking without payment of Integrated Tax (IGST)
              </p>
            )}
            {notes && (
              <div className="pt-1 text-xs text-gray-600">
                <h4 className="font-bold text-gray-800 mb-0.5">Notes / Terms:</h4>
                <p className="whitespace-pre-wrap">{notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Action Bar */}
        <div className="sticky bottom-4 z-30 bg-theme-surface/95 backdrop-blur-md p-4 rounded-2xl border border-theme-border shadow-xl flex justify-between items-center flex-wrap gap-4 mt-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 text-sm font-semibold text-theme-text bg-theme-surface border border-theme-border rounded-xl hover:bg-theme-surface-hover transition-colors shadow-sm cursor-pointer"
            disabled={isPending}
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="px-5 py-2.5 text-sm font-semibold text-theme-text bg-theme-surface border border-theme-border rounded-xl hover:bg-theme-surface-hover transition-colors shadow-sm cursor-pointer"
            >
              Preview Invoice
            </button>
            <button
              type="submit"
              disabled={isPending || items.length === 0}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-theme-primary rounded-xl hover:bg-theme-primary-dark transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isPending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              Save Proforma
            </button>
          </div>
        </div>
      </form>

      {/* Preview Modal (When clicking Preview Invoice button) */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-theme-border w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto my-8 p-8 space-y-6 text-black">
            <div className="flex justify-between items-start border-b border-gray-200 pb-4">
              <div>
                <img src="/kvj-logo.png" alt="KVJ Analytics" className="h-12 w-auto mb-3 object-contain" />
                <div className="space-y-0.5 text-xs text-gray-600">
                  <p className="font-bold text-gray-900 text-sm">KVJ Analytics</p>
                  <p>III- Floor, Lalan Towers</p>
                  <p>Banerji Road, Kochi, Kerala - 682031</p>
                  <p className="pt-1"><span className="text-gray-500 font-medium">Mobile:</span> <strong className="text-gray-900 font-semibold">+91 99618 13730</strong></p>
                </div>
              </div>
              <div className="flex flex-col items-end text-right">
                <div className="flex items-center gap-4 mb-2">
                  <h2 className="text-2xl font-extrabold text-[#1e3a8a] tracking-tight uppercase">
                    {isPurchaseOrder ? "PURCHASE ORDER" : "PROFORMA INVOICE"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(false)}
                    className="text-gray-500 hover:text-gray-800 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <table className="text-xs sm:text-sm">
                  <tbody>
                    <tr>
                      <td className="text-gray-500 pr-3 py-0.5 text-right">Proforma No:</td>
                      <td className="font-bold text-gray-900 text-right">{initialData?.invoiceNumber || "Auto-assigned on Save"}</td>
                    </tr>
                    <tr>
                      <td className="text-gray-500 pr-3 py-0.5 text-right">Date:</td>
                      <td className="font-semibold text-gray-900 text-right">{formatDate(invoiceDate)}</td>
                    </tr>
                    <tr>
                      <td className="text-gray-500 pr-3 py-0.5 text-right">GSTIN:</td>
                      <td className="font-bold text-gray-900 text-right">32BIDPK3118B1Z2</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-sm text-gray-600">
              <div>
                <h4 className="font-bold text-gray-800 text-xs uppercase mb-1">BILLED TO:</h4>
                <div className="space-y-1 max-w-md">
                  <p className="font-bold text-gray-900 text-base">{selectedCustomer?.legalName || "Customer Name"}</p>
                  {customerAddress && <p className="whitespace-pre-line break-words leading-snug">{customerAddress}</p>}
                  <p>Place / Country: <strong className="text-gray-900">{placeCountry}</strong></p>
                </div>
              </div>
              <div className="text-right space-y-1 text-xs sm:text-sm">
                {customerGstin && (
                  <p><span className="text-gray-500 font-medium">GSTIN:</span> <strong className="text-gray-900">{customerGstin}</strong></p>
                )}
                <p><span className="text-gray-500 font-medium">Place of Supply:</span> <strong className="text-gray-900">{placeCountry}</strong></p>
                <p><span className="text-gray-500 font-medium">Purchase Order No:</span> <strong className="text-gray-900">NIL</strong></p>
              </div>
            </div>

            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-y-2 border-gray-800 font-bold text-gray-700 text-xs uppercase">
                  <th className="py-2.5 px-2">Item</th>
                  <th className="py-2.5 px-2">HSN/SAC</th>
                  <th className="py-2.5 px-2 text-right">Qty</th>
                  <th className="py-2.5 px-2 text-right">Rate</th>
                  <th className="py-2.5 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {calculationResult.calculatedItems.map((itemCalc, idx) => {
                  const item = items[idx];
                  return (
                    <tr key={idx}>
                      <td className="py-2.5 px-2">
                        <p className="font-medium text-gray-900">{products.find(p => p.id === item.productId)?.name || "Item"}</p>
                        {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                      </td>
                      <td className="py-2.5 px-2 text-gray-600">{item.hsnSacCode || "—"}</td>
                      <td className="py-2.5 px-2 text-right">{Number(item.quantity || 0)}</td>
                      <td className="py-2.5 px-2 text-right">₹{Number(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2.5 px-2 text-right font-medium">₹{Number(itemCalc?.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex justify-end border-t border-gray-200 pt-4">
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between font-medium text-gray-700">
                  <span>Subtotal:</span>
                  <span>₹{calculationResult.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {effectiveGstRate > 0 && (
                  <>
                    {gstTreatment === "IGST" ? (
                      <div className="flex justify-between text-gray-600">
                        <span>IGST ({effectiveGstRate}%):</span>
                        <span>₹{calculationResult.totalIGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-gray-600">
                          <span>CGST ({effectiveGstRate / 2}%):</span>
                          <span>₹{calculationResult.totalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>SGST ({effectiveGstRate / 2}%):</span>
                          <span>₹{calculationResult.totalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
                {isTdsApplicable === "YES" && calculationResult.tdsRate > 0 && (
                  <div className="flex justify-between text-amber-800 font-medium">
                    <span>TDS Deduction ({calculationResult.tdsRate}%):</span>
                    <span>-₹{calculationResult.tdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t-2 border-gray-800 pt-2 mt-2">
                  <span className="font-bold text-base text-gray-900">Grand Total:</span>
                  <span className="font-black text-xl text-theme-primary">
                    ₹{calculationResult.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Amount In Words & Notes */}
            <div className="border-t border-gray-200 pt-4 space-y-2 text-xs sm:text-sm">
              <div>
                <h4 className="font-bold text-gray-900 mb-0.5">Amount in words:</h4>
                <p className="font-medium text-gray-700 italic">
                  {numberToWords(calculationResult.netAmount)}
                </p>
              </div>
              {isExport && (
                <p className="text-xs text-gray-700 font-medium pt-0.5">
                  Supply to SEZ for authorized operations under Letter of Undertaking without payment of Integrated Tax (IGST)
                </p>
              )}
              {notes && (
                <div className="pt-1 text-xs text-gray-600">
                  <h4 className="font-bold text-gray-800 mb-0.5">Notes / Terms:</h4>
                  <p className="whitespace-pre-wrap">{notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-theme-surface rounded-xl border border-theme-border w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto my-8">
            <div className="flex justify-between items-center border-b border-theme-border p-6 pb-4">
              <div>
                <h2 className="text-xl font-bold text-theme-text">Add New Customer</h2>
                <p className="text-sm text-theme-text-muted mt-0.5">Create a new customer profile without leaving this invoice.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomer(false)}
                className="text-theme-text-muted hover:text-theme-text p-1.5 rounded-lg hover:bg-theme-surface-hover transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <CustomerForm
              isModal={true}
              onSuccess={(createdCustomer) => {
                setCustomers((prev) => [createdCustomer, ...prev]);
                setCustomerId(createdCustomer.id);
                if (createdCustomer.customerType) {
                  setCustomerType(createdCustomer.customerType);
                }
                setShowAddCustomer(false);
              }}
              onCancel={() => setShowAddCustomer(false)}
            />
          </div>
        </div>
      )}

      {modalConfig && (
        <AddMasterRecordModal
          defaultTab={modalConfig.type}
          categories={[]}
          onClose={() => setModalConfig(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
}
