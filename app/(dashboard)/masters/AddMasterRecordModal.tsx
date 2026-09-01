"use client";

import { useState, useTransition } from "react";
import {
  createCustomerMasterAction,
  createVendorMasterAction,
  createProductMasterAction,
  createCategoryMasterAction,
} from "./actions";

export function AddMasterRecordModal({
  defaultTab = "customer",
  onClose,
  onSuccess,
}: {
  defaultTab?: "customer" | "vendor" | "product" | "category";
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [activeType, setActiveType] = useState(defaultTab);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Customer State
  const [customerName, setCustomerName] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerType, setCustomerType] = useState("B2B");
  const [customerState, setCustomerState] = useState("Kerala");

  // Vendor State
  const [vendorName, setVendorName] = useState("");
  const [vendorGstin, setVendorGstin] = useState("");
  const [vendorState, setVendorState] = useState("Kerala");

  // Product State
  const [productName, setProductName] = useState("");
  const [productHsn, setProductHsn] = useState("9983");
  const [productGst, setProductGst] = useState("18");
  const [productTreatment, setProductTreatment] = useState("Training Income");

  // Category State
  const [categoryName, setCategoryName] = useState("");
  const [categoryGroup, setCategoryGroup] = useState("P&L — Operating Expense");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      let res;
      if (activeType === "customer") {
        res = await createCustomerMasterAction({
          legalName: customerName,
          tradeName: customerName,
          gstin: customerGstin || null,
          customerType,
          billingAddress: { state: customerState, country: "India" },
          isActive: true,
        });
      } else if (activeType === "vendor") {
        res = await createVendorMasterAction({
          name: vendorName,
          gstin: vendorGstin || null,
          state: vendorState,
          isActive: true,
        });
      } else if (activeType === "product") {
        res = await createProductMasterAction({
          name: productName,
          type: "SERVICE",
          hsnSacCode: productHsn,
          gstRate: parseFloat(productGst) || 18,
          description: productTreatment,
          isActive: true,
        });
      } else if (activeType === "category") {
        res = await createCategoryMasterAction({
          name: categoryName,
          description: categoryGroup,
          isActive: true,
        });
      }

      if (res?.success) {
        onSuccess();
        onClose();
      } else {
        setError(res?.error || "Failed to create master record.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-[#D9E3DC] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#D9E3DC] flex justify-between items-center bg-white">
          <h2 className="text-xl font-bold text-[#17211B]">Add Record</h2>
          <button
            onClick={onClose}
            className="text-[#68756C] hover:text-[#17211B] p-2 rounded-lg hover:bg-[#F4F7F3] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Type Selector */}
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
              onClick={() => setActiveType(t.id as any)}
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                  placeholder="e.g. ABC College"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 32ABCDE1234F1Z5"
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    Type
                  </label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  >
                    <option value="B2B">B2B</option>
                    <option value="B2B_EXPORT">Export</option>
                    <option value="B2C">B2C</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1">
                  State / Country
                </label>
                <input
                  type="text"
                  value={customerState}
                  onChange={(e) => setCustomerState(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
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
                  placeholder="e.g. ABC Vendor"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 32VENDOR1234A1Z5"
                    value={vendorGstin}
                    onChange={(e) => setVendorGstin(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={vendorState}
                    onChange={(e) => setVendorState(e.target.value)}
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
                  placeholder="e.g. Training Service"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    HSN/SAC
                  </label>
                  <input
                    type="text"
                    placeholder="9983"
                    value={productHsn}
                    onChange={(e) => setProductHsn(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    GST Rate
                  </label>
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
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1">
                  Treatment / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Training Income"
                  value={productTreatment}
                  onChange={(e) => setProductTreatment(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>
            </div>
          )}

          {activeType === "category" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Travel"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1">
                  Statement Group / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. P&L — Operating Expense"
                  value={categoryGroup}
                  onChange={(e) => setCategoryGroup(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
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
