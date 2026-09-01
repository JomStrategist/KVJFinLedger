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
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden print:shadow-none print:border-none">
        {/* Invoice Header */}
        <div className="p-8 border-b border-theme-border flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <h2 className="text-3xl font-bold text-theme-text tracking-tight">
              {invoice.isPurchaseOrder ? "PURCHASE ORDER" : "PROFORMA INVOICE"}
            </h2>
            <p className="text-theme-text-muted mt-1 font-medium">NOT A TAX INVOICE</p>
            
            <div className="mt-8 space-y-1 text-sm text-theme-text-muted">
              <p className="font-bold text-theme-text text-xl">FinLedger India</p>
              <p className="text-xs font-semibold text-theme-primary">IT Services • Training • Digital Products</p>
              <p>123 Business Avenue, Tech Park</p>
              <p>{BUSINESS_LOCATION.state} - {BUSINESS_LOCATION.stateCode}</p>
              <p>GSTIN: 27AAAAA0000A1Z5</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end text-right">
            <div className={`px-4 py-1.5 rounded-full border text-sm font-bold tracking-wide mb-6 ${getStatusColor(invoice.status)}`}>
              {invoice.status}
            </div>
            
            <table className="text-sm">
              <tbody>
                <tr>
                  <td className="text-theme-text-muted pr-6 py-1">Invoice Number:</td>
                  <td className="font-bold text-theme-text">{invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td className="text-theme-text-muted pr-6 py-1">Invoice Date:</td>
                  <td className="font-medium text-theme-text">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Info */}
        <div className="p-8 border-b border-theme-border bg-theme-surface-hover/50">
          <h3 className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-3">Billed To</h3>
          <div className="text-sm text-theme-text space-y-1">
            <p className="font-bold text-theme-text text-base">{invoice.customer.legalName}</p>
            {invoice.customer.tradeName && <p>{invoice.customer.tradeName}</p>}
            {invoice.customer.address && <p>{invoice.customer.address}</p>}
            <p>
              {[invoice.customer.city, invoice.customer.state, invoice.customer.pinCode].filter(Boolean).join(", ")}
            </p>
            {invoice.customer.stateCode && <p className="pt-2 font-medium">State Code: {invoice.customer.stateCode}</p>}
            {invoice.customer.gstin && <p className="pt-1 font-medium">GSTIN: {invoice.customer.gstin}</p>}
          </div>
        </div>

        {/* Items Table */}
        <div className="p-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-theme-border text-sm font-bold text-theme-text">
                <th className="py-3 pl-2 w-12">#</th>
                <th className="py-3">Item Description</th>
                <th className="py-3 text-right">Qty</th>
                <th className="py-3 text-right">Rate</th>
                <th className="py-3 text-right">Disc</th>
                <th className="py-3 text-right">Tax</th>
                <th className="py-3 text-right pr-2">Amount</th>
              </tr>
            </thead>
            <tbody className="text-sm text-theme-text">
              {invoice.items.map((item, index) => (
                <tr key={item.id} className="border-b border-theme-border">
                  <td className="py-4 pl-2 text-theme-text-muted">{index + 1}</td>
                  <td className="py-4">
                    <p className="font-medium text-theme-text">{item.product.name}</p>
                    {item.description && <p className="text-theme-text-muted text-xs mt-1">{item.description}</p>}
                    <p className="text-theme-text-muted text-xs mt-1">HSN/SAC: {item.product.hsnSacCode}</p>
                  </td>
                  <td className="py-4 text-right">{item.quantity.toString()} {item.unit}</td>
                  <td className="py-4 text-right">₹{item.unitPrice.toString()}</td>
                  <td className="py-4 text-right">{Number(item.discountPercent) > 0 ? `${item.discountPercent.toString()}%` : '-'}</td>
                  <td className="py-4 text-right">{item.gstRate.toString()}%</td>
                  <td className="py-4 text-right pr-2 font-medium text-theme-text">₹{item.totalAmount.toString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* GST Summary Grouping */}
        {gstSummaryGroups.length > 0 && (
          <div className="p-8 border-t border-theme-border">
            <h3 className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-4">GST Summary</h3>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-theme-border text-theme-text-muted font-medium">
                  <th className="pb-2">GST Rate</th>
                  <th className="pb-2 text-right">Taxable Amt</th>
                  {isIntraState ? (
                    <th className="pb-2 text-right">GST</th>
                  ) : (
                    <th className="pb-2 text-right">IGST</th>
                  )}
                  <th className="pb-2 text-right">Total Tax</th>
                </tr>
              </thead>
              <tbody className="text-theme-text">
                {gstSummaryGroups.map((group) => (
                  <tr key={group.gstRate} className="border-b border-theme-border last:border-0">
                    <td className="py-2">{group.gstRate}%</td>
                    <td className="py-2 text-right">₹{group.taxableAmount.toFixed(2)}</td>
                    {isIntraState ? (
                      <td className="py-2 text-right">₹{(group.cgstAmount + group.sgstAmount).toFixed(2)}</td>
                    ) : (
                      <td className="py-2 text-right">₹{group.igstAmount.toFixed(2)}</td>
                    )}
                    <td className="py-2 text-right font-medium">₹{group.totalTax.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="p-8 border-t border-theme-border flex flex-col md:flex-row justify-between items-start gap-8 bg-theme-surface-hover/50">
          <div className="flex-1 w-full text-sm text-theme-text-muted">
            {invoice.notes && (
              <>
                <h4 className="font-bold text-theme-text mb-2">Notes</h4>
                <p className="whitespace-pre-wrap">{invoice.notes}</p>
              </>
            )}
          </div>
          
          <div className="w-full md:w-80 space-y-3 text-sm">
            <div className="flex justify-between text-theme-text-muted px-2">
              <span>Subtotal</span>
              <span>₹{invoice.subtotal.toString()}</span>
            </div>
            {Number(invoice.totalDiscount) > 0 && (
              <div className="flex justify-between text-red-600 px-2">
                <span>Discount</span>
                <span>-₹{invoice.totalDiscount.toString()}</span>
              </div>
            )}
            
            {/* Tax Breakdown */}
            <div className="py-3 border-y border-theme-border space-y-2">
              <div className="flex justify-between text-theme-text-muted px-2 font-medium">
                <span>Taxable Amount</span>
                <span>₹{(Number(invoice.subtotal) - Number(invoice.totalDiscount)).toFixed(2)}</span>
              </div>
              
              {isIntraState ? (
                <div className="flex justify-between text-theme-text-muted px-2 text-xs">
                  <span>GST</span>
                  <span>₹{(Number(invoice.totalCGST) + Number(invoice.totalSGST)).toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-theme-text-muted px-2 text-xs">
                  <span>IGST</span>
                  <span>₹{invoice.totalIGST.toString()}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between font-medium text-theme-text px-2 pt-2">
              <span>Gross Amount</span>
              <span>₹{invoice.grossAmount.toString()}</span>
            </div>

            {Number(invoice.tdsAmount) > 0 && (
              <div className="flex justify-between text-red-600 font-medium pt-2 border-t border-theme-border px-2">
                <span>Less: TDS ({invoice.tdsRate.toString()}%)</span>
                <span>-₹{invoice.tdsAmount.toString()}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-lg font-bold text-theme-text px-2 pt-3 border-t border-theme-border">
              <span>{Number(invoice.tdsAmount) > 0 ? "Net Amount" : "Grand Total"}</span>
              <span className="text-theme-primary">₹{invoice.netAmount.toString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-theme-border text-center text-xs text-theme-text-muted">
          This is a computer generated {invoice.isPurchaseOrder ? "purchase order" : "proforma invoice"} and does not require a signature.
        </div>
      </div>
    </div>
  );
}
