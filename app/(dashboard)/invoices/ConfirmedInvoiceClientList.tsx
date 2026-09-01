"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TaxInvoiceStatus } from "@prisma/client";

export function ConfirmedInvoiceClientList({
  initialInvoices,
  initialCustomers = [],
}: {
  initialInvoices: any[];
  initialCustomers?: any[];
}) {
  const [invoices] = useState(initialInvoices);
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("ALL");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<TaxInvoiceStatus | "ALL">("ALL");

  const customerOptions = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(initialCustomers)) {
      initialCustomers.forEach((c: any) => {
        if (c?.id) {
          map.set(c.id, c.tradeName || c.legalName);
        }
      });
    }
    invoices.forEach((inv: any) => {
      if (inv.customerId) {
        const name = inv.customer?.tradeName || inv.customer?.legalName || inv.customerNameSnapshot || inv.businessNameSnapshot;
        if (name) {
          map.set(inv.customerId, name);
        }
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [initialCustomers, invoices]);

  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = search.toLowerCase().trim();
    const matchesSearch =
      !searchLower ||
      invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
      invoice.customerNameSnapshot?.toLowerCase().includes(searchLower) ||
      invoice.businessNameSnapshot?.toLowerCase().includes(searchLower) ||
      invoice.gstinSnapshot?.toLowerCase().includes(searchLower) ||
      (invoice.customer?.legalName && invoice.customer.legalName.toLowerCase().includes(searchLower)) ||
      (invoice.customer?.tradeName && invoice.customer.tradeName.toLowerCase().includes(searchLower));

    const matchesCustomer =
      customerFilter === "ALL" ||
      invoice.customerId === customerFilter ||
      invoice.customer?.id === customerFilter;

    const actualCustomerType = invoice.customer?.customerType;
    const matchesCustomerType =
      customerTypeFilter === "ALL" ||
      actualCustomerType === customerTypeFilter;

    const matchesStatus = statusFilter === "ALL" || invoice.status === statusFilter;

    return matchesSearch && matchesCustomer && matchesCustomerType && matchesStatus;
  });

  const getStatusColor = (status: TaxInvoiceStatus) => {
    switch (status) {
      case "CONFIRMED": return "bg-theme-surface-hover text-blue-800";
      case "PAID": return "bg-emerald-100 text-emerald-800";
      case "PARTIALLY_PAID": return "bg-orange-100 text-orange-800";
      case "CANCELLED": return "bg-red-100 text-red-800";
      default: return "bg-theme-surface-hover text-theme-text";
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-sm p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by invoice number or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-theme-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface"
          />
          <svg className="w-5 h-5 text-theme-text-muted absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* All Customers Dropdown */}
        <select
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          className="border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface min-w-[150px]"
        >
          <option value="ALL">All Customers</option>
          {customerOptions.map((cust) => (
            <option key={cust.id} value={cust.id}>
              {cust.name}
            </option>
          ))}
        </select>

        {/* All Customer Type Dropdown */}
        <select
          value={customerTypeFilter}
          onChange={(e) => setCustomerTypeFilter(e.target.value)}
          className="border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface min-w-[160px]"
        >
          <option value="ALL">All Customer Types</option>
          <option value="B2B">B2B</option>
          <option value="B2C">B2C</option>
          <option value="B2B_EXPORT">B2B Export</option>
        </select>

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface min-w-[150px]"
        >
          <option value="ALL">All Statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PAID">Paid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-theme-surface-hover border-b border-theme-border text-xs uppercase text-theme-text-muted font-semibold">
                <th className="px-6 py-3">Invoice Number</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-right">Net Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-theme-text-muted">
                    No tax invoices found. Convert a Proforma Invoice to create one.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-theme-surface-hover/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/invoices/${invoice.id}`} className="font-medium text-theme-primary hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-theme-text">{invoice.customerNameSnapshot || invoice.customer?.legalName}</p>
                      {(invoice.businessNameSnapshot || invoice.customer?.tradeName) && (
                        <p className="text-xs text-theme-text-muted">{invoice.businessNameSnapshot || invoice.customer?.tradeName}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-theme-text-muted">
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-medium text-theme-text">₹{invoice.netAmount.toString()}</p>
                      {Number(invoice.tdsAmount) > 0 && (
                        <p className="text-xs text-red-500">inc. TDS</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="text-theme-text-muted hover:text-theme-primary font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
