"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TaxInvoiceStatus } from "@prisma/client";
import { InvoicePaymentModal } from "./InvoicePaymentModal";
import { useRouter } from "next/navigation";
import { markInvoiceGstPaidAction } from "./actions";

// ─── Date helpers ─────────────────────────────────────────────────────────────
function getMonthRange(offset: 0 | -1): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59);
  return { start, end };
}

type DatePreset = "ALL" | "CURRENT_MONTH" | "LAST_MONTH" | "RANGE";

export function ConfirmedInvoiceClientList({
  initialInvoices,
  initialCustomers = [],
}: {
  initialInvoices: any[];
  initialCustomers?: any[];
}) {
  const router = useRouter();

  const [invoices, setInvoices] = useState(initialInvoices);
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("ALL");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Date filter
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  // GST paid modal
  const [gstModalInvoice, setGstModalInvoice] = useState<any | null>(null);
  const [challanRef, setChallanRef] = useState("");
  const [gstPaidDate, setGstPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [gstLoading, setGstLoading] = useState(false);

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

  // Compute date filter bounds
  const dateBounds = useMemo<{ start: Date | null; end: Date | null }>(() => {
    if (datePreset === "CURRENT_MONTH") {
      const { start, end } = getMonthRange(0);
      return { start, end };
    }
    if (datePreset === "LAST_MONTH") {
      const { start, end } = getMonthRange(-1);
      return { start, end };
    }
    if (datePreset === "RANGE" && rangeStart && rangeEnd) {
      return { start: new Date(rangeStart), end: new Date(rangeEnd + "T23:59:59") };
    }
    return { start: null, end: null };
  }, [datePreset, rangeStart, rangeEnd]);

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

    let matchesDate = true;
    if (dateBounds.start && dateBounds.end) {
      const invDate = new Date(invoice.invoiceDate || invoice.createdAt);
      matchesDate = invDate >= dateBounds.start && invDate <= dateBounds.end;
    }

    return matchesSearch && matchesCustomer && matchesCustomerType && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: TaxInvoiceStatus) => {
    switch (status) {
      case "PAID":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold bg-[#E5F3EC] text-[#0B5F46] tracking-wider">PAID</span>;
      case "PARTIALLY_PAID":
        return (
          <span className="inline-flex flex-col items-center justify-center px-2.5 py-1 rounded-lg text-[9px] font-extrabold bg-[#FFF3D8] text-[#B27A17] tracking-wider leading-tight text-center min-w-[70px]">
            <span>PARTIALLY</span>
            <span>PAID</span>
          </span>
        );
      case "CONFIRMED":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold bg-[#FBEAEA] text-[#B94B4B] tracking-wider">UNPAID</span>;
      case "CANCELLED":
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-700 tracking-wider">CANCELLED</span>;
      default:
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold bg-theme-surface-hover text-theme-text">{status}</span>;
    }
  };

  const handleMarkGstPaid = async () => {
    if (!gstModalInvoice || !challanRef.trim() || !gstPaidDate) return;
    setGstLoading(true);
    const res = await markInvoiceGstPaidAction(gstModalInvoice.id, challanRef, gstPaidDate);
    setGstLoading(false);
    if (res.success) {
      setInvoices((prev: any[]) =>
        prev.map((inv: any) =>
          inv.id === gstModalInvoice.id
            ? { ...inv, gstPaidToGovt: true, gstPaidDate: new Date(gstPaidDate).toISOString(), gstChallanRef: challanRef }
            : inv
        )
      );
      setGstModalInvoice(null);
      setChallanRef("");
    } else {
      alert(res.error || "Failed to mark GST as paid");
    }
  };

  const DATE_PRESETS: { value: DatePreset; label: string }[] = [
    { value: "ALL", label: "All Dates" },
    { value: "CURRENT_MONTH", label: "Current Month" },
    { value: "LAST_MONTH", label: "Last Month" },
    { value: "RANGE", label: "Date Range" },
  ];

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
              placeholder="Search invoice / customer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[40px] sm:h-[41px] px-3.5 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white placeholder-[#68756C]"
            />
          </div>

          {/* Filter Dropdowns Grid on mobile, inline on desktop */}
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
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-[40px] sm:h-[41px] border border-[#D9E3DC] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] sm:min-w-[125px]"
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
              className="h-[40px] sm:h-[41px] border border-[#D9E3DC] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] sm:min-w-[125px]"
            >
              <option value="ALL">All Types</option>
              <option value="B2B">B2B</option>
              <option value="B2B_EXPORT">Export</option>
              <option value="B2C">B2C</option>
            </select>
          </div>
        </div>

        {/* Row 2: Date Filter Swipeable Pills */}
        <div className="flex items-center gap-2 border-t border-[#F3F4F6] pt-3 overflow-x-auto custom-scrollbar pb-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#738078] uppercase tracking-wider shrink-0 mr-1">Date:</span>
          {DATE_PRESETS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDatePreset(value)}
              className={`h-[32px] px-3 rounded-xl text-[11px] font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                datePreset === value
                  ? "bg-[#177B55] text-white border-[#177B55] shadow-xs"
                  : "border-[#D9E3DC] text-[#4B5563] bg-white hover:bg-[#F4F7F3]"
              }`}
            >
              {label}
            </button>
          ))}

          {datePreset === "RANGE" && (
            <div className="flex items-center gap-1.5 ml-1 shrink-0">
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="h-[32px] px-2 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white"
              />
              <span className="text-[11px] text-[#738078] font-semibold">to</span>
              <input
                type="date"
                value={rangeEnd}
                min={rangeStart}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="h-[32px] px-2 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white"
              />
            </div>
          )}

          <span className="ml-auto text-[11px] text-[#738078] font-semibold whitespace-nowrap pl-2">
            {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                <th className="py-3 px-2">INVOICE</th>
                <th className="py-3 px-3">CUSTOMER</th>
                <th className="py-3 px-3">TYPE</th>
                <th className="py-3 px-3 text-right">TOTAL</th>
                <th className="py-3 px-3 text-right">PAID</th>
                <th className="py-3 px-3 text-right">OUTSTANDING</th>
                <th className="py-3 px-3">GST</th>
                <th className="py-3 px-3" title="Whether GST collected has been remitted to Government via GSTR-3B">
                  GST PAID ℹ
                </th>
                <th className="py-3 px-3">TDS</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-2 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EEE9] text-xs">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#68756C]">
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

                  const hasGst = totalGstAmount > 0;
                  const gstPaid = Boolean(invoice.gstPaidToGovt);
                  const gstPaidDateStr = invoice.gstPaidDate
                    ? new Date(invoice.gstPaidDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : null;

                  return (
                    <tr key={invoice.id} className="hover:bg-[#F9FAF8] transition-colors align-middle">
                      {/* Invoice */}
                      <td className="py-4 px-2 font-bold text-[#17211B] align-middle">
                        <Link href={`/invoices/${invoice.id}`} className="hover:text-[#177B55]">
                          {invoice.invoiceNumber}
                        </Link>
                        <div className="text-[10px] text-[#9CA3AF] font-normal mt-0.5">
                          {new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </td>

                      {/* Customer with GSTIN */}
                      <td className="py-4 px-3 align-middle">
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
                      <td className="py-4 px-3 text-[#17211B] font-medium align-middle">
                        {formattedType}
                      </td>

                      {/* Total */}
                      <td className="py-4 px-3 text-right font-bold text-[#17211B] align-middle">
                        ₹{totalGross.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                      </td>

                      {/* Paid */}
                      <td className="py-4 px-3 text-right text-[#17211B] font-medium align-middle">
                        ₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                      </td>

                      {/* Outstanding */}
                      <td className="py-4 px-3 text-right font-medium text-[#17211B] align-middle">
                        ₹{outstanding.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
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

                      {/* GST PAID TO GOVT */}
                      <td className="py-4 px-3 whitespace-nowrap align-middle">
                        {!hasGst ? (
                          <span className="text-[11px] text-[#9CA3AF]">N/A</span>
                        ) : gstPaid ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#166534] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full w-fit">
                              ✓ Remitted
                            </span>
                            {gstPaidDateStr && <span className="text-[10px] text-[#6B7280]">{gstPaidDateStr}</span>}
                            {invoice.gstChallanRef && (
                              <span className="text-[10px] text-[#9CA3AF] font-mono truncate max-w-[110px]" title={invoice.gstChallanRef}>{invoice.gstChallanRef}</span>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setGstModalInvoice(invoice);
                              setChallanRef("");
                              setGstPaidDate(new Date().toISOString().split("T")[0]);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#92400E] bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                            title="Mark GST as remitted to Government (GSTR-3B)"
                          >
                            ⚠ Mark Paid
                          </button>
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

                      {/* Action */}
                      <td className="py-3 px-2 text-right align-middle whitespace-nowrap">
                        <div className="flex flex-col items-end justify-center gap-1">
                          {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => setSelectedInvoiceForPayment(invoice)}
                              className="px-2.5 py-0.5 border border-[#D9E3DC] rounded-lg text-[11px] font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs cursor-pointer bg-[#F9FAF8]"
                            >
                              Payment
                            </button>
                          )}
                          {invoice.status !== "CANCELLED" && (
                            <Link
                              href={`/invoices/${invoice.id}/edit`}
                              className="px-2.5 py-0.5 border border-[#D9E3DC] rounded-lg text-[11px] font-bold text-[#1e40af] hover:bg-blue-50 transition-colors shadow-2xs bg-white text-center min-w-[50px]"
                            >
                              Edit
                            </Link>
                          )}
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="px-2.5 py-0.5 border border-[#D9E3DC] rounded-lg text-[11px] font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs bg-white text-center min-w-[50px]"
                          >
                            View
                          </Link>
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

      {/* GST Remittance Modal */}
      {gstModalInvoice && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D9E3DC] space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-[#E5EDE7] pb-4">
              <span className="text-[10px] font-bold text-[#177B55] uppercase tracking-widest block">
                GST COMPLIANCE • GSTR-3B REMITTANCE
              </span>
              <h3 className="text-base font-black text-[#111827] mt-1">Mark GST Remitted to Government</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Invoice <strong>{gstModalInvoice.invoiceNumber}</strong> — GST:{" "}
                <strong>₹{Number(gstModalInvoice.totalGST || 0).toLocaleString("en-IN")}</strong>
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#374151] mb-1.5">
                  CPIN / Challan Reference <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={challanRef}
                  onChange={(e) => setChallanRef(e.target.value)}
                  placeholder="e.g. 2400100000001234 or CPIN123456"
                  className="w-full h-[40px] px-3.5 border border-[#D1D5DB] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white"
                />
                <p className="text-[10px] text-[#9CA3AF] mt-1">
                  CPIN from GST portal or Challan Identification Number (CIN) from bank
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#374151] mb-1.5">
                  Date of Remittance <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={gstPaidDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setGstPaidDate(e.target.value)}
                  className="w-full h-[40px] px-3.5 border border-[#D1D5DB] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-[#78350F]">
                <p className="font-bold mb-0.5">📋 CA Note</p>
                <p>GST collected must be remitted to the Government by the 20th of the following month via GSTR-3B. This will reduce the GST Payable balance in your Balance Sheet.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setGstModalInvoice(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-[#D1D5DB] text-[#4B5563] bg-white hover:bg-[#F9FAFB] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkGstPaid}
                disabled={!challanRef.trim() || !gstPaidDate || gstLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#177B55] text-white hover:bg-[#136f4e] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {gstLoading ? "Saving…" : "✓ Confirm GST Remittance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

