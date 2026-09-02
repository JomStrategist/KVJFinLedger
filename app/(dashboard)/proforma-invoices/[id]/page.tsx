import { ProformaInvoiceService } from "@/services/proforma-invoice.service";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProformaInvoiceStatus } from "@prisma/client";
import { TaxEngine } from "@/lib/tax";
import { BUSINESS_LOCATION } from "@/lib/config/business";
import { ConvertToTaxInvoiceButton } from "./ConvertToTaxInvoiceButton";

export default async function ProformaInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const invoice = await ProformaInvoiceService.getProformaInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  const getStatusColor = (status: ProformaInvoiceStatus) => {
    switch (status) {
      case "DRAFT": return "bg-theme-surface-hover text-theme-text border-theme-border";
      case "SENT": return "bg-theme-surface-hover text-blue-800 border-blue-200";
      case "ACCEPTED": return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "REJECTED": return "bg-red-900/20 text-red-800 border-red-200";
      case "EXPIRED": return "bg-orange-50 text-orange-800 border-orange-200";
      case "CONVERTED": return "bg-purple-50 text-purple-800 border-purple-200";
      case "CANCELLED": return "bg-theme-surface-hover text-theme-text-muted border-theme-border line-through";
      default: return "bg-theme-surface-hover text-theme-text border-theme-border";
    }
  };

  const isIntraState = !invoice.customer.state || (invoice.customer.state.toLowerCase().trim() === BUSINESS_LOCATION.state.toLowerCase().trim());

  // Re-generate GST Summary Grouping from items
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
      <Link href="/invoices?tab=proforma" className="mb-2 inline-flex items-center text-sm font-medium text-theme-primary hover:text-theme-primary-dark print:hidden">
        ← Back to Invoices
      </Link>
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-theme-surface p-4 rounded-xl shadow-sm border border-theme-border print:hidden">
        <div>
          <h1 className="text-xl font-bold text-theme-text">{invoice.invoiceNumber}</h1>
          <p className="text-theme-text-muted text-sm">Created on {new Date(invoice.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {invoice.status === "DRAFT" && (
            <Link
              href={`/proforma-invoices/${invoice.id}/edit`}
              className="inline-flex items-center justify-center px-4 py-2 bg-theme-surface hover:bg-theme-surface-hover text-theme-text text-sm font-medium rounded-lg border border-theme-border transition-colors gap-2"
            >
              Edit Draft
            </Link>
          )}
          <button
            className="inline-flex items-center justify-center px-4 py-2 bg-theme-surface hover:bg-theme-surface-hover text-theme-text text-sm font-medium rounded-lg border border-theme-border transition-colors gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print
          </button>
          
          {(invoice.status === "DRAFT" || invoice.status === "ACCEPTED") && (
            <div className="relative">
              <ConvertToTaxInvoiceButton proformaId={invoice.id} />
            </div>
          )}
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0 text-gray-900 font-sans">
        {/* Top Header: Logo + Company Info (Left), Title & Invoice Meta (Right) */}
        <div className="p-8 pb-6 flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            {/* KVJ Analytics Official Logo */}
            <img src="/kvj-logo.png" alt="KVJ Analytics" className="h-14 w-auto mb-4 object-contain" />
            <div className="space-y-0.5 text-xs text-gray-600">
              <p className="font-bold text-gray-900 text-sm">KVJ Analytics</p>
              <p>III- Floor, Lalan Towers</p>
              <p>Banerji Road, Kochi, Kerala - 682031</p>
              <p className="pt-1.5"><span className="text-gray-500 font-medium">Mobile:</span> <strong className="text-gray-900 font-semibold">+91 99618 13730</strong></p>
              <p><span className="text-gray-500 font-medium">Phone:</span> <strong className="text-gray-900 font-semibold">0484 4059310</strong></p>
            </div>
          </div>
          
          <div className="flex flex-col items-start md:items-end text-left md:text-right">
            <h2 className="text-3xl font-extrabold text-[#1e3a8a] tracking-tight mb-4 uppercase">
              {invoice.isPurchaseOrder ? "PURCHASE ORDER" : "PROFORMA INVOICE"}
            </h2>
            
            <table className="text-xs sm:text-sm">
              <tbody>
                <tr>
                  <td className="text-gray-500 pr-4 py-1 text-right">Proforma No:</td>
                  <td className="font-bold text-gray-900 text-right">{invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td className="text-gray-500 pr-4 py-1 text-right">Date:</td>
                  <td className="font-semibold text-gray-900 text-right">
                    {new Date(invoice.invoiceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </td>
                </tr>
                <tr>
                  <td className="text-gray-500 pr-4 py-1 text-right">GSTIN:</td>
                  <td className="font-bold text-gray-900 text-right">32BIDPK3118B1Z2</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-8"><hr className="border-gray-200" /></div>

        {/* Billed To & Supply Info */}
        <div className="p-8 py-6 flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-1 text-xs sm:text-sm max-w-md">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">BILLED TO:</h3>
            <p className="font-bold text-gray-900 text-base">{invoice.customer.legalName}</p>
            {invoice.customer.tradeName && invoice.customer.tradeName !== invoice.customer.legalName && (
              <p className="text-gray-700">{invoice.customer.tradeName}</p>
            )}
            {invoice.customer.address && (
              <p className="text-gray-600 whitespace-pre-line break-words leading-snug">{invoice.customer.address}</p>
            )}
            <p className="text-gray-600">Place / Country: <strong className="text-gray-900">{[invoice.customer.city, invoice.customer.state, "India"].filter(Boolean).join(", ")}</strong></p>
            {invoice.customer.gstin && (
              <p className="text-gray-600">GSTIN: <strong className="text-gray-900">{invoice.customer.gstin}</strong></p>
            )}
          </div>

          <div className="text-left md:text-right space-y-1 text-xs sm:text-sm">
            <p><span className="text-gray-500 font-medium">Place of Supply:</span> <strong className="text-gray-900">{invoice.customer.state || "Kerala"}</strong></p>
            <p><span className="text-gray-500 font-medium">Purchase Order No:</span> <strong className="text-gray-900">NIL</strong></p>
          </div>
        </div>

        {/* Items Table */}
        <div className="p-8 py-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3 w-28 text-center">HSN/SAC</th>
                <th className="py-3 px-3 w-20 text-center">Qty</th>
                <th className="py-3 px-3 w-32 text-right">Rate</th>
                <th className="py-3 px-3 w-36 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-800">
              {invoice.items.map((item, index) => (
                <tr key={item.id} className="align-top">
                  <td className="py-3.5 px-3 text-center text-gray-500 font-medium">{index + 1}</td>
                  <td className="py-3.5 px-3">
                    <p className="font-semibold text-gray-900">{item.product.name}</p>
                    {item.description && <p className="text-gray-500 text-xs mt-0.5">{item.description}</p>}
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-xs text-gray-600">{item.product.hsnSacCode}</td>
                  <td className="py-3.5 px-3 text-center">{item.quantity.toString()}</td>
                  <td className="py-3.5 px-3 text-right font-medium">₹{Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3.5 px-3 text-right font-semibold text-gray-900">₹{Number(item.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Block */}
        <div className="p-8 py-4 flex flex-col md:flex-row justify-end items-end">
          <div className="w-full md:w-80 space-y-2 text-xs sm:text-sm border-t md:border-t-0 border-gray-200 pt-4 md:pt-0">
            {Number(invoice.totalTax || 0) > 0 ? (
              <>
                <div className="flex justify-between text-gray-600 px-2 py-0.5">
                  <span>Sub Total</span>
                  <span className="font-semibold text-gray-900">₹{Number(invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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

            <div className="flex justify-between items-center text-sm sm:text-base font-bold text-gray-900 px-2 pt-2 border-t border-gray-300">
              <span>Total Amount</span>
              <span className="text-gray-900">₹{Number(invoice.totalAmount || invoice.grossAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="p-8 py-4 text-xs text-gray-600">
            <h4 className="font-bold text-gray-800 mb-1">Notes / Terms:</h4>
            <p className="whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Payment Details (Bottom Left) & Authorised Signatory (Bottom Right) */}
        <div className="p-8 pt-6 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-t border-gray-200">
          <div className="space-y-1 text-xs text-gray-700">
            <h4 className="font-bold text-gray-900 text-sm mb-2">Payment Details</h4>
            <p><span className="text-gray-500 font-medium">Bank:</span> <strong className="text-gray-900">{invoice.bankNameSnapshot || "Federal Bank"}</strong></p>
            <p><span className="text-gray-500 font-medium">Account Name:</span> <strong className="text-gray-900">{invoice.accountNameSnapshot || "KVJ Analytics"}</strong></p>
            <p><span className="text-gray-500 font-medium">Current Account No:</span> <strong className="text-gray-900 font-mono">{invoice.accountNumberSnapshot || "12830200020507"}</strong></p>
            <p><span className="text-gray-500 font-medium">IFSC:</span> <strong className="text-gray-900 font-mono">{invoice.ifscSnapshot || "FDRL0001283"}</strong></p>
            <p><span className="text-gray-500 font-medium">PAN:</span> <strong className="text-gray-900 font-mono">BIDPK3118B</strong></p>
          </div>

          <div className="text-center w-56 self-end">
            <p className="text-xs font-bold text-gray-900 mb-12">For KVJ Analytics</p>
            <div className="border-b border-gray-300 w-full mb-1"></div>
            <p className="text-xs font-bold text-gray-800">Authorised Signatory</p>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="p-4 px-8 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center text-[11px] text-gray-500 gap-2">
          <span>info@kvjanalytics.in</span>
          <span>This is a computer-generated document</span>
          <span>www.kvjanalytics.in</span>
        </div>
      </div>
    </div>
  );
}
