"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Customer, CustomerType } from "@prisma/client";
import { createCustomerAction, updateCustomerAction } from "./actions";

type CustomerFormProps = {
  initialData?: Customer;
  onSuccess?: (customer: Customer) => void;
  onCancel?: () => void;
  isModal?: boolean;
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function CustomerForm({ initialData, onSuccess, onCancel, isModal = false }: CustomerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [customerType, setCustomerType] = useState<CustomerType>(initialData?.customerType || "B2B");
  const [formData, setFormData] = useState({
    legalName: initialData?.legalName || "",
    tradeName: initialData?.tradeName || "",
    gstin: initialData?.gstin || "",
    pan: initialData?.pan || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    address: initialData?.address || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    stateCode: initialData?.stateCode || "",
    pinCode: initialData?.pinCode || "",
    country: initialData?.country || "India",
  });

  const isB2B = customerType === "B2B";
  const isB2BExport = customerType === "B2B_EXPORT";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side Validation
    if (isB2B) {
      if (!formData.gstin) {
        setError("GSTIN is required for B2B customers.");
        return;
      }
      if (!GSTIN_REGEX.test(formData.gstin.toUpperCase())) {
        setError("Invalid GSTIN format.");
        return;
      }
      if (!formData.state || !formData.stateCode || !formData.address) {
        setError("State, State Code, and Billing Address are required for B2B customers.");
        return;
      }
    }

    startTransition(async () => {
      const payload = {
        ...formData,
        customerType,
        gstin: formData.gstin ? formData.gstin.toUpperCase() : null,
      };

      let res;
      if (initialData) {
        res = await updateCustomerAction(initialData.id, payload);
      } else {
        res = await createCustomerAction(payload as any);
      }

      if (res.success) {
        if (onSuccess && res.customer) {
          onSuccess(res.customer);
        } else {
          router.push("/customers");
        }
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className={`${isModal ? "" : "bg-theme-surface border border-theme-border rounded-xl shadow-sm"} p-6 space-y-6`}
    >
      {error && (
        <div className="bg-red-900/20 text-red-700 p-4 rounded-lg text-sm font-medium border border-red-200">
          {error}
        </div>
      )}

      {/* Customer Type */}
      <div>
        <label className="block text-sm font-medium text-theme-text mb-2">Customer Type</label>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="customerType" 
              value="B2B" 
              checked={customerType === "B2B"}
              onChange={() => setCustomerType("B2B")}
              className="text-theme-primary focus:ring-theme-primary"
              disabled={!!initialData} // Cannot change type after creation to keep it simple and safe
            />
            <span className="text-theme-text font-medium">B2B (Business to Business)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="customerType" 
              value="B2C" 
              checked={customerType === "B2C"}
              onChange={() => setCustomerType("B2C")}
              className="text-theme-primary focus:ring-theme-primary"
              disabled={!!initialData}
            />
            <span className="text-theme-text font-medium">B2C (Business to Consumer)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="customerType" 
              value="B2B_EXPORT" 
              checked={customerType === "B2B_EXPORT"}
              onChange={() => setCustomerType("B2B_EXPORT")}
              className="text-theme-primary focus:ring-theme-primary"
              disabled={!!initialData}
            />
            <span className="text-theme-text font-medium">B2B Export</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-theme-text border-b pb-2">Primary Details</h3>
          
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              {isB2B || isB2BExport ? "Legal / Business Name" : "Customer Name"} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="legalName"
              required
              value={formData.legalName}
              onChange={handleChange}
              className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface text-theme-text"
            />
          </div>

          {(isB2B || isB2BExport) && (
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">Trade Name (Optional)</label>
              <input
                type="text"
                name="tradeName"
                value={formData.tradeName}
                onChange={handleChange}
                className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface text-theme-text"
              />
            </div>
          )}

          {!isB2BExport && (
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                GSTIN {isB2B && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary uppercase bg-theme-surface text-theme-text"
                placeholder="e.g. 27ABCDE1234F1Z5"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">PAN (Optional)</label>
            <input
              type="text"
              name="pan"
              value={formData.pan}
              onChange={handleChange}
              className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary uppercase bg-theme-surface text-theme-text"
            />
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-theme-text border-b pb-2">Contact Details</h3>
          
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface text-theme-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface text-theme-text"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-theme-text border-b pb-2">Billing Address</h3>
        
        <div>
          <label className="block text-sm font-medium text-theme-text mb-1">
            Address {isB2B && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface text-theme-text"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface text-theme-text"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              State {isB2B && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface text-theme-text"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              State Code {isB2B && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              name="stateCode"
              value={formData.stateCode}
              onChange={handleChange}
              className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface text-theme-text"
              placeholder="e.g. 27"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">PIN Code</label>
            <input
              type="text"
              name="pinCode"
              value={formData.pinCode}
              onChange={handleChange}
              className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface text-theme-text"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t flex justify-end gap-3">
        <button
          type="button"
          onClick={() => onCancel ? onCancel() : router.back()}
          className="px-4 py-2 text-sm font-medium text-theme-text bg-theme-surface border border-theme-border rounded-lg hover:bg-theme-surface-hover focus:outline-none focus:ring-2 focus:ring-theme-primary"
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-theme-primary rounded-lg hover:bg-theme-primary-dark focus:outline-none focus:ring-2 focus:ring-theme-primary flex items-center gap-2"
        >
          {isPending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
          {initialData ? "Save Changes" : "Create Customer"}
        </button>
      </div>
    </form>
  );
}
