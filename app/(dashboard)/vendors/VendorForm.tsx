"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createVendorAction, updateVendorAction } from "./actions";

export function VendorForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      businessName: formData.get("businessName") as string,
      gstin: formData.get("gstin") as string,
      pan: formData.get("pan") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      stateCode: formData.get("stateCode") as string,
    };

    startTransition(async () => {
      const res = initialData 
        ? await updateVendorAction(initialData.id, data)
        : await createVendorAction(data);
        
      if (res.success) {
        router.push("/vendors");
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-theme-surface rounded-xl shadow-sm border border-theme-border overflow-hidden">
      <div className="p-6 border-b border-theme-border">
        <h2 className="text-lg font-bold text-theme-text">Vendor Information</h2>
        <p className="text-sm text-theme-text-muted">Provide details for the supplier or service provider.</p>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">Contact Name *</label>
            <input
              type="text"
              name="name"
              required
              defaultValue={initialData?.name}
              className="w-full border border-theme-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
              placeholder="e.g. John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">Business Name</label>
            <input
              type="text"
              name="businessName"
              defaultValue={initialData?.businessName}
              className="w-full border border-theme-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">GSTIN</label>
            <input
              type="text"
              name="gstin"
              defaultValue={initialData?.gstin}
              className="w-full border border-theme-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">PAN</label>
            <input
              type="text"
              name="pan"
              defaultValue={initialData?.pan}
              className="w-full border border-theme-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">Email</label>
            <input
              type="email"
              name="email"
              defaultValue={initialData?.email}
              className="w-full border border-theme-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              defaultValue={initialData?.phone}
              className="w-full border border-theme-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
            />
          </div>
        </div>

        <div className="border-t border-theme-border pt-6">
          <h3 className="text-md font-bold text-theme-text mb-4">Address Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-theme-text mb-1">Address</label>
              <input
                type="text"
                name="address"
                defaultValue={initialData?.address}
                className="w-full border border-theme-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">City</label>
              <input
                type="text"
                name="city"
                defaultValue={initialData?.city}
                className="w-full border border-theme-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">State</label>
                <input
                  type="text"
                  name="state"
                  defaultValue={initialData?.state}
                  className="w-full border border-theme-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
                  placeholder="e.g. Kerala"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">State Code</label>
                <input
                  type="text"
                  name="stateCode"
                  defaultValue={initialData?.stateCode}
                  className="w-full border border-theme-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
                  placeholder="e.g. 32"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-theme-surface-hover border-t border-theme-border flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-theme-border bg-theme-surface text-theme-text rounded-lg text-sm font-medium hover:bg-theme-surface-hover"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:bg-theme-primary-dark disabled:opacity-50"
        >
          {isPending ? "Saving..." : initialData ? "Save Changes" : "Add Party"}
        </button>
      </div>
    </form>
  );
}
