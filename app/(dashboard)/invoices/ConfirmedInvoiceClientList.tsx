"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TaxInvoiceStatus } from "@prisma/client";
import { InvoicePaymentModal } from "./InvoicePaymentModal";
import { useRouter } from "next/navigation";

export function ConfirmedInvoiceClientList({
  initialInvoices,
  initialCustomers = [],
}: {
  initialInvoices: any[];
  initialCustomers?: any[];
}) {
  const router = useRouter();
  const [invoices] = useState(initialInvoices);
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("ALL");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Selected invoice for payment modal
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any | null>(null);

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

    let matchesStatus = true;
    if (statusFilter === "PAID") {
      matchesStatus = invoice.status === "PAID";
    } else if (statusFilter === "PARTIALLY_PAID") {
      matchesStatus = invoice.status === "PARTIALLY_PAID";
    } else if (statusFilter === "UNPAID") {
      matchesStatus = invoice.status === "CONFIRMED";
    } else if (statusFilter !== "ALL") {
      matchesStatus = invoice.status === statusFilter;
    }

    return matchesSearch && matchesCustomer && matchesCustomerType && matchesStatus;
  });

  const getStatusBadge = (status: TaxInvoiceStatus) => {
    switch (status) {
      case "PAID":
        return <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E5F3EC] text-[#0B5F46] tracking-wider">PAID</span>;
      case "PARTIALLY_PAID":
        return <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFF3D8] text-[#B27A17] tracking-wider">PARTIALLY PAID</span>;
      case "CONFIRMED":
        return <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FBEAEA] text-[#B94B4B] tracking-wider">UNPAID</span>;
      case "CANCELLED":
        return <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-700 tracking-wider">CANCELLED</span>;
      default:
        return <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-theme-surface-hover text-theme-text">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Card Container */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6 space-y-5">
        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search invoice / customer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[41px] px-3.5 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white placeholder-[#68756C]"
            />
          </div>

          {/* All Customers Dropdown */}
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] min-w-[150px]"
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
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] min-w-[130px]"
          >
            <option value="ALL">All Status</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>

          {/* All Types Dropdown */}
          <select
            value={customerTypeFilter}
            onChange={(e) => setCustomerTypeFilter(e.target.value)}
            className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] min-w-[130px]"
          >
            <option value="ALL">All Types</option>
            <option value="B2B">B2B</option>
            <option value="B2B_EXPORT">Export</option>
            <option value="B2C">B2C</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                <th className="py-3 px-2">INVOICE</th>
                <th className="py-3 px-3">CUSTOMER</th>
                <th className="py-3 px-3">TYPE</th>
                <th className="py-3 px-3 text-right">TOTAL</th>
                <th className="py-3 px-3 text-right">PAID</th>
                <th className="py-3 px-3 text-right">OUTSTANDING</th>
                <th className="py-3 px-3">GST</th>
                <th className="py-3 px-3">TDS</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-2 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EEE9] text-xs">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#68756C]">
                    No invoices found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const payments = invoice.payments || [];
                  const totalPaid = payments.reduce((sum: number, p: any) => sum + Number(p.paymentAmount), 0);
                  const totalTdsDeducted = payments.reduce((sum: number, p: any) => sum + Number(p.tdsAmount || 0), 0);
                  const totalSettled = totalPaid;
                  const totalGross = Number(invoice.grossAmount || invoice.netAmount);
                  const outstanding = Math.max(0, totalGross - totalSettled);

                  const effectiveTdsAmount = totalTdsDeducted > 0 ? totalTdsDeducted : Number(invoice.tdsAmount || 0);
                  const paymentWithTds = payments.find((p: any) => Number(p.tdsRate) > 0 || Number(p.tdsAmount) > 0);
                  const effectiveTdsRate = Number(invoice.tdsRate || 0) > 0 
                    ? Number(invoice.tdsRate) 
                    : (paymentWithTds ? Number(paymentWithTds.tdsRate || 10) : (totalTdsDeducted > 0 ? 10 : 0));

                  const totalGstAmount = Number(invoice.totalGST || invoice.totalTax || 0);
                  const taxableAmt = Number(invoice.taxableAmount || (invoice.subtotal - invoice.totalDiscount) || 0);
                  
                  let effectiveGstRate = 0;
                  if (invoice.items && invoice.items.length > 0) {
                    effectiveGstRate = Number(invoice.items[0].gstRate || 0);
                  } else if (taxableAmt > 0 && totalGstAmount > 0) {
                    effectiveGstRate = Math.round((totalGstAmount / taxableAmt) * 100);
                  }

                  const customerType = invoice.customer?.customerType || "B2B";
                  const formattedType = customerType === "B2B_EXPORT" ? "Export" : customerType === "B2B" ? "B2B" : "B2C";

                  return (
                    <tr key={invoice.id} className="hover:bg-[#F9FAF8] transition-colors">
                      {/* Invoice */}
                      <td className="py-4 px-2 font-bold text-[#17211B]">
                        <Link href={`/invoices/${invoice.id}`} className="hover:text-[#177B55]">
                          {invoice.invoiceNumber}
                        </Link>
                      </td>

                      {/* Customer with GSTIN */}
                      <td className="py-4 px-3">
                        <p className="font-bold text-[#17211B]">
                          {invoice.customerNameSnapshot || invoice.customer?.legalName || invoice.businessNameSnapshot}
                        </p>
                        {invoice.gstinSnapshot ? (
                          <p className="text-[11px] text-[#7B877F] mt-0.5">
                            GSTIN · {invoice.gstinSnapshot}
                          </p>
                        ) : invoice.customer?.gstin ? (
                          <p className="text-[11px] text-[#7B877F] mt-0.5">
                            GSTIN · {invoice.customer.gstin}
                          </p>
                        ) : customerType === "B2B_EXPORT" ? (
                          <p className="text-[11px] text-[#7B877F] mt-0.5">Export Customer</p>
                        ) : (
                          <p className="text-[11px] text-[#7B877F] mt-0.5">Unregistered</p>
                        )}
                      </td>

                      {/* Type */}
                      <td className="py-4 px-3 text-[#17211B] font-medium">
                        {formattedType}
                      </td>

                      {/* Total */}
                      <td className="py-4 px-3 text-right font-bold text-[#17211B]">
                        ₹{totalGross.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                      </td>

                      {/* Paid */}
                      <td className="py-4 px-3 text-right text-[#17211B] font-medium">
                        ₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                      </td>

                      {/* Outstanding */}
                      <td className="py-4 px-3 text-right font-medium text-[#17211B]">
                        ₹{outstanding.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                      </td>

                      {/* GST */}
                      <td className="py-4 px-3 whitespace-nowrap">
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
                      <td className="py-4 px-3 whitespace-nowrap">
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
                      <td className="py-4 px-3 text-center">
                        {getStatusBadge(invoice.status)}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-2 text-right space-x-2 whitespace-nowrap">
                        {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForPayment(invoice)}
                            className="bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
                          >
                            Payment
                          </button>
                        )}
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="inline-block bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedInvoiceForPayment && (
        <InvoicePaymentModal
          invoice={selectedInvoiceForPayment}
          onClose={() => setSelectedInvoiceForPayment(null)}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
