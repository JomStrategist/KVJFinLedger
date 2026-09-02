"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProformaInvoiceStatus } from "@prisma/client";
import { updateProformaInvoiceStatusAction } from "./proforma-actions";
import { convertProformaToTaxInvoiceAction } from "./actions";

export function ProformaInvoiceClientList({
  initialInvoices,
  initialCustomers = [],
}: {
  initialInvoices: any[]; // Using any to avoid complex nested Prisma typings inline
  initialCustomers?: any[];
}) {
  const router = useRouter();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [isPending, startTransition] = useTransition();
  const [isConverting, startConvertTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("ALL");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<ProformaInvoiceStatus | "ALL">("ALL");

  // Conversion modal state
  const [convertingInvoice, setConvertingInvoice] = useState<any | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);

  // Derive unique customers for dropdown
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
      if (inv.customer?.id) {
        map.set(inv.customer.id, inv.customer.tradeName || inv.customer.legalName);
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
      invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
      (invoice.customer?.legalName && invoice.customer.legalName.toLowerCase().includes(searchLower)) ||
      (invoice.customer?.tradeName && invoice.customer.tradeName.toLowerCase().includes(searchLower)) ||
      (invoice.customer?.gstin && invoice.customer.gstin.toLowerCase().includes(searchLower));

    const matchesCustomer =
      customerFilter === "ALL" ||
      invoice.customerId === customerFilter ||
      invoice.customer?.id === customerFilter;

    const actualCustomerType = invoice.customerType || invoice.customer?.customerType;
    const matchesCustomerType =
      customerTypeFilter === "ALL" ||
      actualCustomerType === customerTypeFilter;

    // MA-010: Exclude CONVERTED proformas from active list when statusFilter is ALL
    const matchesStatus =
      statusFilter === "ALL"
        ? invoice.status !== "CONVERTED"
        : invoice.status === statusFilter;

    return matchesSearch && matchesCustomer && matchesCustomerType && matchesStatus;
  });

  const getStatusColor = (status: ProformaInvoiceStatus) => {
    switch (status) {
      case "DRAFT": return "bg-theme-surface-hover text-theme-text";
      case "SENT": return "bg-theme-surface-hover text-blue-800";
      case "ACCEPTED": return "bg-emerald-100 text-emerald-800";
      case "CONVERTED": return "bg-purple-100 text-purple-800";
      case "REJECTED": return "bg-red-100 text-red-800";
      case "EXPIRED": return "bg-orange-100 text-orange-800";
      case "CANCELLED": return "bg-theme-surface-hover text-theme-text-muted line-through";
      default: return "bg-theme-surface-hover text-theme-text";
    }
  };

  const handleCancel = (id: string) => {
    if (!confirm("Are you sure you want to cancel this proforma invoice?")) return;
    
    startTransition(async () => {
      // Optimistic update
      const prev = [...invoices];
      setInvoices(prev.map(i => i.id === id ? { ...i, status: "CANCELLED" } : i));

      const res = await updateProformaInvoiceStatusAction(id, "CANCELLED");
      if (!res.success) {
        setInvoices(prev);
        alert(res.error);
      }
    });
  };

  const handleConfirmConvert = () => {
    if (!convertingInvoice) return;
    setConvertError(null);

    startConvertTransition(async () => {
      const res = await convertProformaToTaxInvoiceAction(convertingInvoice.id);
      if (res.success && res.data) {
        setInvoices((prev) =>
          prev.map((i) =>
            i.id === convertingInvoice.id ? { ...i, status: "CONVERTED" } : i
          )
        );
        const newInvoiceId = res.data.id;
        setConvertingInvoice(null);
        router.push(`/invoices/${newInvoiceId}`);
      } else {
        setConvertError(res.error || "Unable to convert Proforma Invoice to Tax Invoice. Please try again.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-sm p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by Invoice Number or Customer..."
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
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="CONVERTED">Converted</option>
          <option value="REJECTED">Rejected</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-theme-surface-hover border-b border-theme-border text-xs uppercase text-theme-text-muted font-semibold tracking-wider">
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">GST</th>
                <th className="px-6 py-4">TDS</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border text-sm">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-theme-text-muted">
                    No proforma invoices found. Create your first proforma invoice to begin billing.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const totalGstAmount = Number(invoice.totalTax || invoice.totalGST || 0);
                  const taxableAmt = Number(invoice.subtotal - (invoice.totalDiscount || 0));
                  let effectiveGstRate = 0;
                  if (invoice.items && invoice.items.length > 0) {
                    effectiveGstRate = Number(invoice.items[0].gstRate || 0);
                  } else if (taxableAmt > 0 && totalGstAmount > 0) {
                    effectiveGstRate = Math.round((totalGstAmount / taxableAmt) * 100);
                  }

                  const effectiveTdsAmount = Number(invoice.tdsAmount || 0);
                  const effectiveTdsRate = Number(invoice.tdsRate || 0);

                  return (
                  <tr key={invoice.id} className="hover:bg-theme-surface-hover transition-colors">
                    <td className="px-6 py-4 font-medium text-theme-text">
                      <Link href={`/proforma-invoices/${invoice.id}`} className="hover:text-theme-primary">
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-theme-text font-medium">{invoice.customer.legalName}</div>
                      {invoice.customer.gstin && <div className="text-xs text-theme-text-muted mt-0.5">GSTIN: {invoice.customer.gstin}</div>}
                    </td>
                    <td className="px-6 py-4 text-theme-text-muted" suppressHydrationWarning>
                      {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-theme-text">
                      ₹{Number(invoice.totalAmount || invoice.netAmount || 0).toLocaleString("en-IN")}
                    </td>
                    {/* GST */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {totalGstAmount > 0 ? (
                        <span className="text-theme-text font-medium">
                          {effectiveGstRate > 0 ? `${effectiveGstRate}% · ` : ""}₹{totalGstAmount.toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span className="text-theme-text-muted">—</span>
                      )}
                    </td>
                    {/* TDS */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {effectiveTdsAmount > 0 ? (
                        <span className="text-theme-text font-medium">
                          {effectiveTdsRate > 0 ? `${effectiveTdsRate}% · ` : ""}₹{effectiveTdsAmount.toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span className="text-theme-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3 flex-wrap">
                        {invoice.status === "DRAFT" && (
                          <Link 
                            href={`/proforma-invoices/${invoice.id}/edit`}
                            className="text-theme-text-muted hover:text-theme-primary font-medium text-xs transition-colors"
                          >
                            Edit
                          </Link>
                        )}
                        <Link 
                          href={`/proforma-invoices/${invoice.id}`}
                          className="text-theme-text-muted hover:text-theme-primary font-medium text-xs transition-colors"
                        >
                          View
                        </Link>
                        {invoice.status !== "CONVERTED" && invoice.status !== "CANCELLED" && invoice.status !== "REJECTED" && (
                          <button
                            type="button"
                            onClick={() => {
                              setConvertingInvoice(invoice);
                              setConvertError(null);
                            }}
                            disabled={isConverting}
                            className="text-theme-primary hover:text-theme-primary-dark font-medium text-xs transition-colors cursor-pointer"
                          >
                            Convert to Tax Invoice
                          </button>
                        )}
                        {invoice.status !== "CANCELLED" && (
                          <button
                            type="button"
                            onClick={() => handleCancel(invoice.id)}
                            disabled={isPending}
                            className="text-red-500 hover:text-red-700 font-medium text-xs disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {convertingInvoice && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-white rounded-xl border border-theme-border p-6 w-full max-w-md shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="text-lg font-bold text-theme-text">Confirm and Finalize</h3>
              <button
                type="button"
                onClick={() => { if (!isConverting) { setConvertingInvoice(null); setConvertError(null); } }}
                disabled={isConverting}
                className="text-theme-text-muted hover:text-theme-text p-1 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-theme-text leading-relaxed">
                Are you sure you want to convert this Proforma Invoice into a Confirmed Tax Invoice?
              </p>

              <div className="bg-theme-surface-hover p-3.5 rounded-lg border border-theme-border text-xs space-y-1.5 text-theme-text-muted">
                <div className="flex justify-between">
                  <span className="font-medium text-theme-text">Proforma Invoice:</span>
                  <span className="font-semibold text-theme-text">{convertingInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-theme-text">Customer:</span>
                  <span className="font-medium text-theme-text">{convertingInvoice.customer?.legalName}</span>
                </div>
                <div className="flex justify-between border-t border-theme-border pt-1.5 mt-1.5">
                  <span className="font-medium text-theme-text">Total Amount:</span>
                  <span className="font-bold text-theme-primary">₹{convertingInvoice.totalAmount?.toString()}</span>
                </div>
              </div>
            </div>

            {convertError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                {convertError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-theme-border">
              <button
                type="button"
                onClick={() => { setConvertingInvoice(null); setConvertError(null); }}
                disabled={isConverting}
                className="px-4 py-2 text-sm font-medium text-theme-text bg-white border border-theme-border rounded-lg hover:bg-theme-surface-hover transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmConvert}
                disabled={isConverting}
                className="px-4 py-2 text-sm font-medium text-white bg-theme-primary hover:bg-theme-primary-dark rounded-lg flex items-center gap-2 disabled:opacity-50 shadow-sm transition-colors"
              >
                {isConverting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                {isConverting ? "Converting..." : "Confirm and Finalize"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
