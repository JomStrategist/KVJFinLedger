"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createProformaInvoiceAction, updateProformaInvoiceAction } from "../invoices/proforma-actions";
import { CustomerForm } from "../customers/CustomerForm";
import { TaxEngine, TDS_RATES } from "@/lib/tax";
import { BUSINESS_LOCATION } from "@/lib/config/business";

type FormProps = {
  initialData?: any;
  customers: any[];
  products: any[];
};

const GST_RATES = [0, 5, 12, 18, 28];

const getCurrentFinancialYear = () => {
  const today = new Date();
  const year = today.getFullYear();
  // month is 0-indexed. April is 3.
  if (today.getMonth() >= 3) {
    return `FY ${year}-${(year + 1).toString().slice(2)}`;
  } else {
    return `FY ${year - 1}-${year.toString().slice(2)}`;
  }
};

const getFinancialYearsList = () => {
  const today = new Date();
  const currentStartYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  // Generate 5 years centered around the current FY
  return Array.from({ length: 5 }, (_, i) => {
    const start = currentStartYear - 2 + i;
    return `FY ${start}-${(start + 1).toString().slice(2)}`;
  });
};

export function ProformaInvoiceForm({ initialData, customers: initialCustomers, products }: FormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [customers, setCustomers] = useState(initialCustomers);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState(initialData?.customerId || "");
  const [customerType, setCustomerType] = useState(initialData?.customerType || "B2B");
  const [financialYear, setFinancialYear] = useState(initialData?.financialYear || getCurrentFinancialYear());
  const [invoiceDate, setInvoiceDate] = useState(
    initialData?.invoiceDate ? new Date(initialData.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [isPurchaseOrder, setIsPurchaseOrder] = useState(initialData?.isPurchaseOrder || false);
  const [notes, setNotes] = useState(initialData?.notes || "");

  // Global Tax State
  const [globalGstRate, setGlobalGstRate] = useState(0);

  // Reverse GST Calculator is now computed automatically below after calculationResult
  // Items State
  const [items, setItems] = useState<any[]>(
    initialData?.items?.map((i: any) => ({
      id: Math.random().toString(), // temporary UI id
      productId: i.productId,
      description: i.description || "",
      hsnSacCode: products.find(p => p.id === i.productId)?.hsnSacCode || "", // Display only
      quantity: Number(i.quantity),
      unit: i.unit,
      unitPrice: Number(i.unitPrice),
      discountPercent: Number(i.discountPercent),
      isGstEnabled: i.isGstEnabled ?? true,
      gstRate: Number(i.gstRate),
      isTdsEnabled: i.isTdsEnabled ?? true,
      tdsRate: Number(i.tdsRate || 0),
      customGstRate: false,
      customTdsRate: false,
    })) || []
  );

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === customerId);
  }, [customerId, customers]);

  // Live Calculations utilizing the unified TaxEngine
  const calculationResult = useMemo(() => {
    const mappedItems = items.map(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const discount = Number(item.discountPercent) || 0;

      const grossAmount = Number((qty * price).toFixed(2));
      const discountAmount = Number(((grossAmount * discount) / 100).toFixed(2));
      const taxableAmount = Number((grossAmount - discountAmount).toFixed(2));

      return {
        ...item,
        quantity: qty,
        unitPrice: price,
        discountPercent: discount,
        grossAmount,
        discountAmount,
        taxableAmount,
        customerState: selectedCustomer?.state || BUSINESS_LOCATION.state,
      };
    });

    const isB2BExport = customerType === "B2B_EXPORT";
    return TaxEngine.calculateInvoiceTaxes({
      items: mappedItems,
      businessState: BUSINESS_LOCATION.state,
      customerState: selectedCustomer?.state || "",
      tdsRate: 0, 
      globalGstRate: isB2BExport ? 0 : globalGstRate,
      isGlobalGstEnabled: true,
      globalTdsRate: 0,
      isGlobalTdsEnabled: false,
    });
  }, [items, selectedCustomer, globalGstRate, customerType]);

  const revGstBaseAmount = useMemo(() => {
    const isB2BExport = customerType === "B2B_EXPORT";
    return calculationResult.calculatedItems.reduce((total, itemCalc, index) => {
      const item = items[index];
      const appliedGstRate = isB2BExport ? 0 : globalGstRate;
      const inclusiveAmt = itemCalc.taxableAmount || 0;
      return total + (inclusiveAmt / (1 + (appliedGstRate / 100)));
    }, 0);
  }, [calculationResult, items, globalGstRate, customerType]);

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
        isTdsEnabled: true,
        tdsRate: 0,
        customGstRate: false,
        customTdsRate: false,
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Auto-fill defaults when product is selected
        if (field === 'productId' && value) {
          const product = products.find(p => p.id === value);
          if (product) {
            updated.description = product.description || "";
            updated.hsnSacCode = product.hsnSacCode || "";
            updated.unit = product.unit;
            updated.unitPrice = Number(product.customPrice || product.sellingPrice);
            updated.gstRate = Number(product.gstRate);
            if (!GST_RATES.includes(updated.gstRate)) updated.customGstRate = true;
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
      setShowAddCustomer(true);
    } else {
      setCustomerId(val);
      const cust = customers.find(c => c.id === val);
      if (cust?.customerType) {
        setCustomerType(cust.customerType);
      }
    }
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
        tdsRate: 0,
        globalGstRate: customerType === "B2B_EXPORT" ? 0 : globalGstRate,
        isGlobalGstEnabled: true,
        globalTdsRate: 0,
        isGlobalTdsEnabled: false,
        items: items.map(i => ({
          productId: i.productId,
          description: i.description,
          quantity: Number(i.quantity),
          unit: i.unit,
          unitPrice: Number(i.unitPrice),
          discountPercent: Number(i.discountPercent),
          isGstEnabled: false,
          gstRate: 0,
          isTdsEnabled: false,
          tdsRate: 0,
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
        }, 1500);
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8 pb-24">
      {error && (
        <div className="bg-red-900/20 text-red-700 p-4 rounded-lg text-sm font-medium border border-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-900/20 text-green-700 p-4 rounded-lg text-sm font-medium border border-green-200">
          {success}
        </div>
      )}

      {/* Primary Details */}
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-4 flex justify-between items-center border-b border-theme-border pb-2 mb-2">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-theme-text">Invoice Details</h3>
            <label className="flex items-center gap-2 bg-theme-surface-hover px-3 py-1.5 rounded-lg border border-theme-border cursor-pointer">
              <input 
                type="checkbox" 
                checked={isPurchaseOrder} 
                onChange={(e) => setIsPurchaseOrder(e.target.checked)}
                className="w-4 h-4 text-theme-primary focus:ring-theme-primary border-theme-border rounded"
              />
              <span className="text-sm font-medium text-theme-text">Purchase Order</span>
            </label>
          </div>
          <span className="bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {initialData?.status || "DRAFT"}
          </span>
        </div>
        
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-theme-text mb-1">
            Customer <span className="text-red-500">*</span>
          </label>
          <select
            value={customerId}
            onChange={handleCustomerChange}
            required
            className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface"
          >
            <option value="">Select a customer...</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.legalName} {c.gstin ? `(${c.gstin})` : ''} - {c.state || "State missing"}
              </option>
            ))}
            <option value="ADD_NEW" className="font-bold text-theme-primary bg-theme-surface-hover">+ Add New Customer</option>
          </select>
          {selectedCustomer && (
            <p className="text-xs text-theme-text-muted mt-1">
              State: {selectedCustomer.state || "Unknown"}
            </p>
          )}
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-theme-text mb-1">
            Customer Type <span className="text-red-500">*</span>
          </label>
          <select
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value)}
            className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface"
          >
            <option value="B2B">B2B</option>
            <option value="B2C">B2C</option>
            <option value="B2B_EXPORT">B2B Export</option>
          </select>
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-theme-text mb-1">
            Financial Year <span className="text-red-500">*</span>
          </label>
          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface"
          >
            {getFinancialYearsList().map(fy => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-theme-text mb-1">
            Invoice Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface"
          />
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-theme-surface-hover border-b border-theme-border flex justify-between items-center">
          <h3 className="text-lg font-semibold text-theme-text">Items</h3>
          <button
            type="button"
            onClick={handleAddItem}
            className="text-sm font-medium text-theme-primary hover:text-theme-primary-dark flex items-center gap-1"
          >
            <span>+</span> Add Item
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="bg-theme-surface-hover text-xs uppercase text-theme-text-muted font-semibold">
                <th className="px-3 py-3 w-48">Item & Desc</th>
                <th className="px-3 py-3 w-24">HSN/SAC</th>
                <th className="px-3 py-3 w-20">Qty</th>
                <th className="px-3 py-3 w-24">Rate</th>
                <th className="px-3 py-3 text-right w-24">Amount</th>
                <th className="px-3 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {items.map((item, index) => {
                const calc = calculationResult.calculatedItems[index];
                return (
                  <tr key={item.id} className="bg-theme-surface align-top">
                    <td className="px-3 py-3 space-y-2">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(item.id, 'productId', e.target.value)}
                        required
                        className="w-full border border-theme-border rounded-md px-2 py-1.5 text-sm focus:ring-1 focus:ring-theme-primary bg-theme-surface"
                      >
                        <option value="">Select...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input 
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        className="w-full border border-theme-border rounded-md px-2 py-1.5 text-xs bg-theme-surface-hover"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        readOnly
                        value={item.hsnSacCode}
                        placeholder="HSN"
                        className="w-full border border-theme-border rounded-md px-2 py-1.5 text-sm bg-theme-surface-hover opacity-70"
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
                        className="w-full border border-theme-border rounded-md px-2 py-1.5 text-sm bg-theme-surface"
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
                        className="w-full border border-theme-border rounded-md px-2 py-1.5 text-sm bg-theme-surface"
                      />
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-theme-text">
                      {Number(calc?.taxableAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove Item"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
              No items added. Click "Add Item" to start.
            </div>
          )}
        </div>

        {/* Common GST and TDS */}
        {items.length > 0 && (
          <div className="p-4 bg-theme-surface-hover border-t border-theme-border flex flex-wrap gap-8 items-center">
            {customerType !== "B2B_EXPORT" && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <label className="text-sm font-semibold text-theme-text uppercase">
                    {selectedCustomer?.state && selectedCustomer.state.toLowerCase() !== BUSINESS_LOCATION.state.toLowerCase() 
                      ? "IGST Rate:" 
                      : "GST Rate:"}
                  </label>
                  <div className="flex items-center border border-theme-border rounded-md overflow-hidden bg-theme-surface focus-within:ring-1 focus-within:ring-theme-primary">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={globalGstRate}
                      onChange={(e) => setGlobalGstRate(Number(e.target.value))}
                      className="w-16 px-2 py-1 text-sm bg-transparent outline-none"
                    />
                    <span className="px-2 py-1 text-sm bg-theme-surface-hover border-l border-theme-border text-theme-text-muted select-none">
                      %
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 bg-theme-surface px-4 py-2 rounded-lg border border-theme-border flex-1">
              <span className="text-sm font-bold text-theme-text min-w-max">Reverse GST Calculator</span>
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-xs text-theme-text-muted uppercase font-semibold min-w-max">Base Amount:</label>
                <span className="text-sm font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded min-w-max">
                  ₹{Number(revGstBaseAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer and Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Notes / Terms
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface"
              placeholder="Add any additional notes for the customer..."
            />
          </div>
        </div>
        
        <div className="bg-theme-surface border border-theme-border rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-theme-text border-b border-theme-border pb-2 mb-4">Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-theme-text-muted">
              <span>Subtotal</span>
              <span>₹{calculationResult.subtotal.toFixed(2)}</span>
            </div>
            
            {calculationResult.totalGST > 0 && customerType !== "B2B_EXPORT" && (
              <>
                {calculationResult.totalCGST > 0 || calculationResult.totalSGST > 0 ? (
                  <div className="flex justify-between text-theme-text-muted">
                    <span>GST</span>
                    <span>₹{(calculationResult.totalCGST + calculationResult.totalSGST).toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-theme-text-muted">
                    <span>IGST</span>
                    <span>₹{calculationResult.totalIGST.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}

            <div className="pt-3 border-t border-theme-border flex justify-between items-center">
              <span className="text-base font-bold text-theme-text">
                Grand Total
              </span>
              <span className="text-2xl font-bold text-theme-primary">₹{calculationResult.netAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-white border border-theme-border rounded-xl shadow-lg p-8 mx-auto w-full text-black">
        <div className="text-center mb-6 pb-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold uppercase tracking-wider text-gray-800">
            {isPurchaseOrder ? "Purchase Order Preview" : "Proforma Invoice Preview"}
          </h2>
          {customerType === "B2B_EXPORT" && (
            <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 font-bold rounded text-xs uppercase tracking-widest">
              B2B Export
            </span>
          )}
        </div>
        
        <div className="flex justify-between mb-8">
          <div>
            <h4 className="font-bold text-gray-700 mb-1">Billed To:</h4>
            {selectedCustomer ? (
              <div className="text-sm text-gray-600">
                <p className="font-bold text-gray-800 text-base">{selectedCustomer.legalName}</p>
                <p>State: {selectedCustomer.state || <span className="text-red-500 font-bold">MISSING STATE</span>}</p>
                {selectedCustomer.gstin && <p>GSTIN: {selectedCustomer.gstin}</p>}
                <p>Type: {customerType}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Select a customer</p>
            )}
          </div>
          <div className="text-right text-sm text-gray-600">
            <p><span className="font-bold text-gray-700">Financial Year:</span> {financialYear}</p>
            <p><span className="font-bold text-gray-700">Date:</span> {invoiceDate}</p>
            <p><span className="font-bold text-gray-700">Place of Supply:</span> {selectedCustomer?.state || BUSINESS_LOCATION.state}</p>
          </div>
        </div>

        <table className="w-full text-left text-sm mb-6 border-collapse">
          <thead>
            <tr className="border-y-2 border-gray-800 font-bold text-gray-700">
              <th className="py-2 px-2">Item</th>
              <th className="py-2 px-2">HSN/SAC</th>
              <th className="py-2 px-2 text-right">Qty</th>
              <th className="py-2 px-2 text-right">Rate</th>
              <th className="py-2 px-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {calculationResult.calculatedItems.map((itemCalc, idx) => {
              const item = items[idx];
              return (
                <tr key={idx}>
                  <td className="py-2 px-2">
                    <p className="font-medium text-gray-800">{products.find(p => p.id === item.productId)?.name || "N/A"}</p>
                    {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                  </td>
                  <td className="py-2 px-2 text-gray-600">{item.hsnSacCode}</td>
                  <td className="py-2 px-2 text-right">{Number(item.quantity || 0)}</td>
                  <td className="py-2 px-2 text-right">₹{Number(item.unitPrice || 0).toFixed(2)}</td>
                  <td className="py-2 px-2 text-right font-medium">₹{Number(itemCalc?.taxableAmount || 0).toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="flex justify-end border-t border-gray-200 pt-4">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between font-bold text-gray-700">
              <span>Subtotal:</span>
              <span>₹{calculationResult.taxableAmount.toFixed(2)}</span>
            </div>
            
            {calculationResult.totalGST > 0 && customerType !== "B2B_EXPORT" && (
              <>
                {calculationResult.totalCGST > 0 || calculationResult.totalSGST > 0 ? (
                  <div className="flex justify-between text-gray-600">
                    <span>GST:</span>
                    <span>₹{(calculationResult.totalCGST + calculationResult.totalSGST).toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-gray-600">
                    <span>IGST:</span>
                    <span>₹{calculationResult.totalIGST.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between items-center border-t-2 border-gray-800 pt-2 mt-2">
              <span className="font-bold text-lg text-gray-800">Grand Total:</span>
              <span className="font-black text-xl text-theme-primary">₹{calculationResult.netAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 right-0 left-64 p-4 bg-theme-surface border-t border-theme-border flex justify-end gap-3 z-10 shadow-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-theme-text bg-theme-surface border border-theme-border rounded-lg hover:bg-theme-surface-hover focus:outline-none focus:ring-2 focus:ring-theme-primary"
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || items.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-theme-primary rounded-lg hover:bg-theme-primary-dark focus:outline-none focus:ring-2 focus:ring-theme-primary flex items-center gap-2 disabled:opacity-50"
        >
          {isPending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
          Save as Draft
        </button>
      </div>
    </form>

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
  </>
  );
}
