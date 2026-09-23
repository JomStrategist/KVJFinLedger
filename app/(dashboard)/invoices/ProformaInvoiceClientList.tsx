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

  const getStatusBadge = (status: ProformaInvoiceStatus) => {
    switch (status) {
      case "DRAFT":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#F3F4F6] text-[#4B5563] tracking-wider">DRAFT</span>;
      case "SENT":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 tracking-wider">SENT</span>;
      case "ACCEPTED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E5F3EC] text-[#0B5F46] tracking-wider">ACCEPTED</span>;
      case "CONVERTED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 tracking-wider">CONVERTED</span>;
      case "REJECTED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 tracking-wider">REJECTED</span>;
      case "EXPIRED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-50 text-orange-700 tracking-wider">EXPIRED</span>;
      case "CANCELLED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-500 line-through tracking-wider">CANCELLED</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-700">{status}</span>;
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
    <div className="space-y-4 sm:space-y-6">
      {/* Main Card Container */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-3.5 sm:p-6 space-y-4 sm:space-y-5">
        {/* Filters Toolbar */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="Search invoice number, customer, GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[40px] sm:h-[41px] px-3.5 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white placeholder-[#68756C]"
            />
          </div>

          {/* Dropdown filters */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3">
            {/* All Customers Dropdown */}
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="h-[40px] sm:h-[41px] border border-[#D9E3DC] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] col-span-2 sm:col-auto sm:min-w-[150px]"
            >
              <option value="ALL">All Customers</option>
              {customerOptions.map((cust) => (
                <option key={cust.id} value={cust.id}>
                  {cust.name}
                </option>
              ))}
            </select>

            {/* All Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-[40px] sm:h-[41px] border border-[#D9E3DC] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] sm:min-w-[125px]"
            >
              <option value="ALL">Active (All)</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="CONVERTED">Converted</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* All Types Dropdown */}
            <select
              value={customerTypeFilter}
              onChange={(e) => setCustomerTypeFilter(e.target.value)}
              className="h-[40px] sm:h-[41px] border border-[#D9E3DC] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] sm:min-w-[125px]"
            >
              <option value="ALL">All Types</option>
              <option value="B2B">B2B</option>
              <option value="B2B_EXPORT">B2B Export</option>
              <option value="B2C">B2C</option>
            </select>
          </div>

          <span className="ml-auto text-[11px] text-[#738078] font-semibold">
            {filteredInvoices.length} proforma{filteredInvoices.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                <th className="py-3 px-2">PROFORMA #</th>
                <th className="py-3 px-3">CUSTOMER</th>
                <th className="py-3 px-3">DATE</th>
                <th className="py-3 px-3 text-right">TOTAL</th>
                <th className="py-3 px-3">GST</th>
                <th className="py-3 px-3">TDS</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-2 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EEE9] text-xs">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#68756C]">
                    No proforma invoices found matching your criteria.
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
                  const totalGross = Number(invoice.totalAmount || invoice.netAmount || 0);

                  return (
                    <tr key={invoice.id} className="hover:bg-[#F9FAF8] transition-colors align-middle">
                      {/* Invoice # */}
                      <td className="py-4 px-2 font-bold text-[#17211B] align-middle">
                        <Link href={`/proforma-invoices/${invoice.id}`} className="hover:text-[#177B55]">
                          {invoice.invoiceNumber}
                        </Link>
                      </td>

                      {/* Customer with GSTIN */}
                      <td className="py-4 px-3 align-middle">
                        <p className="font-bold text-[#17211B]">
                          {invoice.customer?.tradeName || invoice.customer?.legalName}
                        </p>
                        {invoice.customer?.gstin ? (
                          <p className="text-[11px] text-[#7B877F] mt-0.5">
                            GSTIN · {invoice.customer.gstin}
                          </p>
                        ) : (
                          <p className="text-[11px] text-[#7B877F] mt-0.5">Unregistered</p>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-3 text-[#17211B] font-medium align-middle" suppressHydrationWarning>
                        {new Date(invoice.invoiceDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>

                      {/* Total Amount */}
                      <td className="py-4 px-3 text-right font-bold text-[#17211B] align-middle">
                        ₹{totalGross.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                      </td>

                      {/* GST */}
                      <td className="py-4 px-3 whitespace-nowrap align-middle">
                        {totalGstAmount > 0 ? (
                          <div>
                            <p className="font-bold text-[#17211B]">₹{totalGstAmount.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</p>
                            {effectiveGstRate > 0 && (
                              <p className="text-[11px] text-[#7B877F] mt-0.5">{effectiveGstRate}%</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#7B877F]">—</span>
                        )}
                      </td>

                      {/* TDS */}
                      <td className="py-4 px-3 whitespace-nowrap align-middle">
                        {effectiveTdsAmount > 0 ? (
                          <div>
                            <p className="font-bold text-[#17211B]">₹{effectiveTdsAmount.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</p>
                            {effectiveTdsRate > 0 && (
                              <p className="text-[11px] text-[#7B877F] mt-0.5">{effectiveTdsRate}%</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#7B877F]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-3 text-center align-middle">
                        {getStatusBadge(invoice.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-2 text-right align-middle whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {invoice.status !== "CONVERTED" && invoice.status !== "CANCELLED" && invoice.status !== "REJECTED" && (
                            <button
                              type="button"
                              onClick={() => {
                                setConvertingInvoice(invoice);
                                setConvertError(null);
                              }}
                              disabled={isConverting}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#177B55] text-white hover:bg-[#136f4e] transition-colors shadow-2xs cursor-pointer"
                            >
                              Convert to Invoice
                            </button>
                          )}
                          {invoice.status === "DRAFT" && (
                            <Link 
                              href={`/proforma-invoices/${invoice.id}/edit`}
                              className="px-2.5 py-1 border border-[#D9E3DC] rounded-lg text-[11px] font-bold text-[#1e40af] hover:bg-blue-50 transition-colors shadow-2xs bg-white text-center"
                            >
                              Edit
                            </Link>
                          )}
                          <Link 
                            href={`/proforma-invoices/${invoice.id}`}
                            className="px-2.5 py-1 border border-[#D9E3DC] rounded-lg text-[11px] font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs bg-white text-center"
                          >
                            View
                          </Link>
                          {invoice.status !== "CANCELLED" && invoice.status !== "CONVERTED" && (
                            <button
                              type="button"
                              onClick={() => handleCancel(invoice.id)}
                              disabled={isPending}
                              className="px-2.5 py-1 border border-red-200 rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors shadow-2xs bg-white cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {convertingInvoice && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-white rounded-2xl border border-[#D9E3DC] p-6 w-full max-w-md shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5EDE7] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#177B55] uppercase tracking-widest block">
                  PROFORMA WORKFLOW
                </span>
                <h3 className="text-base font-black text-[#111827] mt-0.5">Convert to Confirmed Tax Invoice</h3>
              </div>
              <button
                type="button"
                onClick={() => { if (!isConverting) { setConvertingInvoice(null); setConvertError(null); } }}
                disabled={isConverting}
                className="text-[#9CA3AF] hover:text-[#374151] p-1 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Converting this proforma will create a confirmed Tax Invoice with official numbering and update accounts receivable.
              </p>

              <div className="bg-[#F8FAF9] p-3.5 rounded-xl border border-[#D9E3DC] text-xs space-y-1.5 text-[#4B5563]">
                <div className="flex justify-between">
                  <span className="font-medium text-[#738078]">Proforma Invoice:</span>
                  <span className="font-bold text-[#17211B]">{convertingInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-[#738078]">Customer:</span>
                  <span className="font-bold text-[#17211B]">{convertingInvoice.customer?.tradeName || convertingInvoice.customer?.legalName}</span>
                </div>
                <div className="flex justify-between border-t border-[#E5EDE7] pt-1.5 mt-1.5">
                  <span className="font-bold text-[#17211B]">Total Amount:</span>
                  <span className="font-extrabold text-[#177B55] text-sm">₹{Number(convertingInvoice.totalAmount || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {convertError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {convertError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-[#E5EDE7]">
              <button
                type="button"
                onClick={() => { setConvertingInvoice(null); setConvertError(null); }}
                disabled={isConverting}
                className="px-4 py-2 text-xs font-bold text-[#4B5563] bg-white border border-[#D1D5DB] rounded-xl hover:bg-[#F9FAFB] transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmConvert}
                disabled={isConverting}
                className="px-5 py-2 text-xs font-bold text-white bg-[#177B55] hover:bg-[#136f4e] rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-sm transition-colors cursor-pointer"
              >
                {isConverting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                {isConverting ? "Converting..." : "✓ Confirm & Convert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
