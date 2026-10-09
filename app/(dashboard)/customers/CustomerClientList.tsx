"use client";

import { Customer } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleCustomerStatusAction } from "./actions";

export function CustomerClientList({ 
  initialCustomers,
  searchParams,
}: { 
  initialCustomers: Customer[];
  searchParams: { q?: string; type?: string; status?: string };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState(searchParams.q || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.type || "ALL");
  const [statusFilter, setStatusFilter] = useState(searchParams.status || "ACTIVE");

  const applyFilters = (newQ: string, newType: string, newStatus: string) => {
    const params = new URLSearchParams();
    if (newQ) params.set("q", newQ);
    if (newType && newType !== "ALL") params.set("type", newType);
    if (newStatus) params.set("status", newStatus); // "ACTIVE" is implicit default, but keeping it explicit in url for clarity when switching.

    startTransition(() => {
      router.push(`/customers?${params.toString()}`);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(searchQuery, typeFilter, statusFilter);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setTypeFilter(val);
    applyFilters(searchQuery, val, statusFilter);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setStatusFilter(val);
    applyFilters(searchQuery, typeFilter, val);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? "deactivate" : "reactivate"} this customer?`)) {
      return;
    }
    const res = await toggleCustomerStatusAction(id, currentStatus);
    if (!res.success) {
      alert(res.error);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b border-theme-border flex flex-col sm:flex-row gap-4 items-center justify-between bg-theme-surface-hover/50 rounded-t-xl">
        <form onSubmit={handleSearch} className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search by name, GSTIN, email, phone..."
            className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </form>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            className="border border-theme-border text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-theme-primary"
            value={typeFilter}
            onChange={handleTypeChange}
          >
            <option value="ALL">All Types</option>
            <option value="B2B">B2B Only</option>
            <option value="B2C">B2C Only</option>
            <option value="B2B_EXPORT">B2B Export Only</option>
          </select>
          <select
            className="border border-theme-border text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-theme-primary"
            value={statusFilter}
            onChange={handleStatusChange}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ALL">All Status</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto relative">
        {isPending && (
          <div className="absolute inset-0 bg-theme-surface/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <table className="w-full text-left text-sm text-theme-text-muted">
          <thead className="bg-theme-surface-hover border-b border-theme-border text-theme-text font-medium">
            <tr>
              <th className="px-6 py-4">Customer Name</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">GSTIN</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border">
            {initialCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-theme-text-muted">
                  No customers found. Try adjusting your search or filters.
                </td>
              </tr>
            ) : (
              initialCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-theme-surface-hover transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-theme-text">{c.legalName}</div>
                    {c.tradeName && c.tradeName.trim().toLowerCase() !== c.legalName.trim().toLowerCase() && (
                      <div className="text-xs text-theme-text-muted">{c.tradeName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.customerType === 'B2B' ? 'bg-indigo-100 text-indigo-700' : c.customerType === 'B2B_EXPORT' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {c.customerType === 'B2B_EXPORT' ? 'B2B Export' : c.customerType}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{c.gstin || "-"}</td>
                  <td className="px-6 py-4">
                    <div className="text-theme-text">{c.phone || "-"}</div>
                    <div className="text-xs text-theme-text-muted">{c.email || "-"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <Link href={`/customers/${c.id}`} className="text-theme-primary hover:text-blue-800 font-medium">
                      View
                    </Link>
                    <Link href={`/customers/${c.id}/edit`} className="text-theme-text-muted hover:text-theme-text font-medium">
                      Edit
                    </Link>
                    <button 
                      onClick={() => handleToggleStatus(c.id, c.isActive)}
                      className={`${c.isActive ? 'text-red-600 hover:text-red-800' : 'text-emerald-600 hover:text-emerald-800'} font-medium`}
                    >
                      {c.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
