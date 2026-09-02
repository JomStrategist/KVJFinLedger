import { TaxInvoiceService } from "@/services/tax-invoice.service";
import { notFound } from "next/navigation";
import { TaxInvoiceStatus } from "@prisma/client";
import { TaxEngine } from "@/lib/tax";
import { BUSINESS_LOCATION } from "@/lib/config/business";
import { numberToWords } from "@/lib/utils/number-to-words";
import { InvoiceDetailActions } from "./InvoiceDetailActions";
import Link from "next/link";
import { formatDate } from "@/lib/utils/format-date";

export default async function TaxInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const invoice = await TaxInvoiceService.getTaxInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  const getStatusColor = (status: TaxInvoiceStatus) => {
    switch (status) {
      case "CONFIRMED": return "bg-theme-surface-hover text-blue-800 border-blue-200";
      case "PAID": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "PARTIALLY_PAID": return "bg-orange-100 text-orange-800 border-orange-200";
      case "CANCELLED": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-theme-surface-hover text-theme-text border-theme-border";
    }
  };

  const isIntraState = !invoice.stateSnapshot || (invoice.stateSnapshot.toLowerCase().trim() === BUSINESS_LOCATION.state.toLowerCase().trim());

  // Regenerate GST Summary Grouping dynamically from the snapshot items
  const gstSummaryGroups = TaxEngine.getGSTSummary(invoice.items.map(i => ({
    gstRate: Number(i.gstRate),
    taxableAmount: Number(i.taxableAmount),
    cgstAmount: Number(i.cgstAmount),
    sgstAmount: Number(i.sgstAmount),
    igstAmount: Number(i.igstAmount),
    totalGST: Number(i.totalGST),
  })));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20 print:p-0 print:space-y-0">
      <Link href="/invoices" className="mb-2 inline-flex items-center text-sm font-medium text-theme-primary hover:text-theme-primary-dark print:hidden">
        ← Back to Invoices
      </Link>
      {/* Header Actions (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-theme-surface p-4 rounded-xl shadow-sm border border-theme-border print:hidden">
        <div>
          <h1 className="text-xl font-bold text-theme-text">{invoice.invoiceNumber}</h1>
          <p className="text-theme-text-muted text-sm">Confirmed on {new Date(invoice.createdAt).toLocaleDateString()}</p>
        </div>
        <InvoiceDetailActions invoice={invoice} />
      </div>

      {invoice.status === "CANCELLED" && (
        <div className="bg-red-900/20 border border-red-200 text-red-800 p-4 rounded-xl print:border-none print:bg-theme-surface print:text-black">
          <p className="font-bold">This invoice was cancelled.</p>
          {invoice.cancellationReason && <p className="text-sm mt-1">Reason: {invoice.cancellationReason}</p>}
        </div>
      )}

      {/* Printable Invoice Container */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0 text-gray-900 font-sans printable-card flex flex-col justify-between min-h-[780px] print:min-h-[275mm]">
        {/* Main Document Body */}
        <div>
          {/* Top Header: Logo + Company Info (Left), Title & Invoice Meta (Right) */}
          <div className="p-6 sm:p-8 pb-4 sm:pb-6 print:p-5 print:pb-3 flex flex-row justify-between items-start gap-4">
          <div>
            {/* KVJ Analytics Official Logo */}
            <img src="/kvj-logo.png" alt="KVJ Analytics" className="h-12 sm:h-14 w-auto mb-3 sm:mb-4 object-contain" />
            <div className="space-y-0.5 text-xs text-gray-600">
              <p className="font-bold text-gray-900 text-sm">KVJ Analytics</p>
              <p>III- Floor, Lalan Towers</p>
              <p>Banerji Road, Kochi, Kerala - 682031</p>
              <p className="pt-1"><span className="text-gray-500 font-medium">Mobile:</span> <strong className="text-gray-900 font-semibold">+91 99618 13730</strong></p>
              <p><span className="text-gray-500 font-medium">Phone:</span> <strong className="text-gray-900 font-semibold">0484 4059310</strong></p>
            </div>
          </div>
          
          <div className="flex flex-col items-end text-right">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1e3a8a] tracking-tight mb-3 sm:mb-4 uppercase">TAX INVOICE</h2>
            
            <table className="text-xs sm:text-sm">
              <tbody>
                <tr>
                  <td className="text-gray-500 pr-4 py-0.5 text-right">Invoice No:</td>
                  <td className="font-bold text-gray-900 text-right">{invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td className="text-gray-500 pr-4 py-0.5 text-right">Date:</td>
                  <td className="font-semibold text-gray-900 text-right">
                    {formatDate(invoice.invoiceDate)}
                  </td>
                </tr>
                <tr>
                  <td className="text-gray-500 pr-4 py-0.5 text-right">GSTIN:</td>
                  <td className="font-bold text-gray-900 text-right">32BIDPK3118B1Z2</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 sm:px-8 print:px-5"><hr className="border-gray-200" /></div>

        {/* Billed To & Supply Info */}
        <div className="p-6 sm:p-8 py-4 sm:py-6 print:p-5 print:py-3 flex flex-row justify-between items-start gap-4">
          <div className="space-y-1 text-xs sm:text-sm max-w-md">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">BILLED TO:</h3>
            <p className="font-bold text-gray-900 text-base">{invoice.customerNameSnapshot}</p>
            {invoice.businessNameSnapshot && invoice.businessNameSnapshot !== invoice.customerNameSnapshot && (
              <p className="text-gray-700">{invoice.businessNameSnapshot}</p>
            )}
            {invoice.addressSnapshot && (
              <p className="text-gray-600 whitespace-pre-line break-words leading-snug">{invoice.addressSnapshot}</p>
            )}
            <p className="text-gray-600">Place / Country: <strong className="text-gray-900">{invoice.stateSnapshot || "Kerala"}, India</strong></p>
          </div>

          <div className="text-right space-y-1 text-xs sm:text-sm flex flex-col items-end">
            {invoice.gstinSnapshot && (
              <p><span className="text-gray-500 font-medium">GSTIN:</span> <strong className="text-gray-900">{invoice.gstinSnapshot}</strong></p>
            )}
            <p><span className="text-gray-500 font-medium">Place of Supply:</span> <strong className="text-gray-900">{invoice.stateSnapshot || "Kerala"}</strong></p>
            <p><span className="text-gray-500 font-medium">Purchase Order No:</span> <strong className="text-gray-900">NIL</strong></p>
          </div>
        </div>

        {/* Items Table */}
        <div className="p-6 sm:p-8 py-2 sm:py-4 print:p-5 print:py-2 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-12 text-center">No</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 w-28 text-center">HSN/SAC</th>
                <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                <th className="py-2.5 px-3 w-32 text-right">Rate</th>
                <th className="py-2.5 px-3 w-36 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-800">
              {invoice.items.map((item, index) => (
                <tr key={item.id} className="align-top">
                  <td className="py-2.5 print:py-2 px-3 text-center text-gray-500 font-medium">{index + 1}</td>
                  <td className="py-2.5 print:py-2 px-3">
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    {item.description && <p className="text-gray-500 text-xs mt-0.5">{item.description}</p>}
                  </td>
                  <td className="py-2.5 print:py-2 px-3 text-center font-mono text-xs text-gray-600">{item.hsnSacCode}</td>
                  <td className="py-2.5 print:py-2 px-3 text-center">{item.quantity.toString()}</td>
                  <td className="py-2.5 print:py-2 px-3 text-right font-medium">₹{Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="py-2.5 print:py-2 px-3 text-right font-semibold text-gray-900">₹{Number(item.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Block */}
        <div className="p-6 sm:p-8 py-2 sm:py-4 print:p-5 print:py-1 flex flex-col md:flex-row justify-end items-end">
          <div className="w-full md:w-80 space-y-1.5 text-xs sm:text-sm border-t md:border-t-0 border-gray-200 pt-3 md:pt-0">
            {/* Intra-State (Kerala CGST + SGST) vs Inter-State (IGST) vs Zero-Rated */}
            {Number(invoice.totalGST) > 0 ? (
              <>
                <div className="flex justify-between text-gray-600 px-2 py-0.5">
                  <span>Sub Total</span>
                  <span className="font-semibold text-gray-900">₹{Number(invoice.taxableAmount || invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {isIntraState ? (
                  <>
                    <div className="flex justify-between text-gray-600 px-2 py-0.5">
                      <span>CGST (9%)</span>
                      <span className="font-medium text-gray-900">₹{(Number(invoice.totalCGST)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 px-2 py-0.5">
                      <span>SGST (9%)</span>
                      <span className="font-medium text-gray-900">₹{(Number(invoice.totalSGST)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-gray-600 px-2 py-0.5">
                    <span>IGST (18%)</span>
                    <span className="font-medium text-gray-900">₹{Number(invoice.totalIGST).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </>
            ) : null}

            <div className="flex justify-between items-center text-sm sm:text-base font-bold text-gray-900 px-2 pt-1.5 border-t border-gray-300">
              <span>Total Amount</span>
              <span className="text-gray-900">₹{Number(invoice.grossAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Amount In Words & Notes */}
        <div className="p-6 sm:p-8 py-2 sm:py-4 print:p-5 print:py-2 space-y-2">
          <div>
            <h4 className="font-bold text-gray-900 text-xs sm:text-sm mb-0.5">Amount in Words</h4>
            <p className="font-medium text-gray-700 italic text-xs sm:text-sm">
              {numberToWords(Number(invoice.grossAmount || invoice.netAmount))}
            </p>
          </div>

          {/* Export / SEZ / LUT Note where GST = 0 */}
          {Number(invoice.totalGST) === 0 && (
            <p className="text-xs text-gray-700 font-medium pt-0.5">
              Supply to SEZ for authorized operations under Letter of Undertaking without payment of Integrated Tax (IGST)
            </p>
          )}

          {invoice.notes && (
            <div className="pt-1 text-xs text-gray-600">
              <h4 className="font-bold text-gray-800 mb-0.5">Notes / Terms:</h4>
              <p className="whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>
        </div>

        {/* Bottom Anchored Footer Section (Payment Details + Signatory + Footer Bar) */}
        <div>
          {/* Payment Details (Bottom Left) & Authorised Signatory (Bottom Right) */}
          <div className="p-6 sm:p-8 pt-4 sm:pt-6 pb-6 sm:pb-8 print:p-5 print:py-3 flex flex-row justify-between items-end gap-4 border-t border-gray-200">
          <div className="space-y-0.5 text-xs text-gray-700">
            <h4 className="font-bold text-gray-900 text-sm mb-1.5">Payment Details</h4>
            <p><span className="text-gray-500 font-medium">Bank:</span> <strong className="text-gray-900">{invoice.bankNameSnapshot || "Federal Bank"}</strong></p>
            <p><span className="text-gray-500 font-medium">Account Name:</span> <strong className="text-gray-900">{invoice.accountNameSnapshot || "KVJ Analytics"}</strong></p>
            <p><span className="text-gray-500 font-medium">Current Account No:</span> <strong className="text-gray-900 font-mono">{invoice.accountNumberSnapshot || "12830200020507"}</strong></p>
            <p><span className="text-gray-500 font-medium">IFSC:</span> <strong className="text-gray-900 font-mono">{invoice.ifscSnapshot || "FDRL0001283"}</strong></p>
            <p><span className="text-gray-500 font-medium">PAN:</span> <strong className="text-gray-900 font-mono">BIDPK3118B</strong></p>
          </div>

          <div className="text-center w-56 self-end">
            <p className="text-xs font-bold text-gray-900 mb-8 sm:mb-12 print:mb-6">For KVJ Analytics</p>
            <div className="border-b border-gray-300 w-full mb-1"></div>
            <p className="text-xs font-bold text-gray-800">Authorised Signatory</p>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="p-3 sm:p-4 px-6 sm:px-8 print:px-5 print:py-2 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center text-[11px] text-gray-500 gap-2">
          <span>info@kvjanalytics.in</span>
          <span>This is a computer-generated invoice</span>
          <span>www.kvjanalytics.in</span>
        </div>
      </div>
      </div>

      {/* Internal Payment Settlement & Tracking History (Hidden in Print) */}
      <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border p-6 space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-theme-border">
          <div>
            <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider">
              Internal Payment Settlement History
            </h3>
            <p className="text-xs text-theme-text-muted">
              Record of bank receipts and actual customer TDS deductions.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-theme-text-muted">Total Received: </span>
              <span className="font-bold text-emerald-600">
                ₹{(invoice.payments || []).reduce((sum: number, p: any) => sum + Number(p.paymentAmount), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-theme-text-muted">Actual TDS: </span>
              <span className="font-bold text-theme-text">
                ₹{(invoice.payments || []).reduce((sum: number, p: any) => sum + Number(p.tdsAmount), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {(invoice.payments || []).length === 0 ? (
          <p className="text-xs text-theme-text-muted italic py-2">
            No payments recorded yet for this invoice. Click &quot;Record Payment&quot; in the header to record partial or full receipts.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-theme-surface-hover text-theme-text-muted font-semibold uppercase">
                <tr>
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5 text-right">Payment Amount</th>
                  <th className="px-4 py-2.5 text-right">TDS Deducted</th>
                  <th className="px-4 py-2.5 text-right">Bank Receipt</th>
                  <th className="px-4 py-2.5">Reference / UTR</th>
                  <th className="px-4 py-2.5">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {(invoice.payments || []).map((p: any, idx: number) => (
                  <tr key={p.id || idx} className="hover:bg-theme-surface-hover/50">
                    <td className="px-4 py-2.5 font-semibold text-theme-text">Payment {idx + 1}</td>
                    <td className="px-4 py-2.5 text-theme-text-muted">
                      {new Date(p.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-theme-text">
                      ₹{Number(p.paymentAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 text-right text-theme-text-muted">
                      {Number(p.tdsAmount) > 0 ? `₹${Number(p.tdsAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${p.tdsRate}%)` : "₹0.00"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-600">
                      ₹{Number(p.bankReceipt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 text-theme-text-muted">{p.reference || "—"}</td>
                    <td className="px-4 py-2.5 text-theme-text-muted">{p.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
