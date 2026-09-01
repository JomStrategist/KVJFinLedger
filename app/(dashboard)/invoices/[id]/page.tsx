import { TaxInvoiceService } from "@/services/tax-invoice.service";
import { notFound } from "next/navigation";
import { TaxInvoiceStatus } from "@prisma/client";
import { TaxEngine } from "@/lib/tax";
import { BUSINESS_LOCATION } from "@/lib/config/business";
import { numberToWords } from "@/lib/utils/number-to-words";
import { CancelInvoiceButton } from "./CancelInvoiceButton";
import { PrintButton } from "./PrintButton";
import Link from "next/link";

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
        <div className="flex flex-wrap items-center gap-3">
          {invoice.status !== "CANCELLED" && (
            <CancelInvoiceButton invoiceId={invoice.id} />
          )}
          <PrintButton />
        </div>
      </div>

      {invoice.status === "CANCELLED" && (
        <div className="bg-red-900/20 border border-red-200 text-red-800 p-4 rounded-xl print:border-none print:bg-theme-surface print:text-black">
          <p className="font-bold">This invoice was cancelled.</p>
          {invoice.cancellationReason && <p className="text-sm mt-1">Reason: {invoice.cancellationReason}</p>}
        </div>
      )}

      {/* Printable Invoice Container */}
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0">
        {/* Invoice Header */}
        <div className="p-8 border-b border-theme-border flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <h2 className="text-3xl font-bold text-theme-text tracking-tight">TAX INVOICE</h2>
            
            <div className="mt-8 space-y-1 text-sm text-theme-text-muted">
              <p className="font-bold text-theme-text text-xl">FinLedger India</p>
              <p className="text-xs font-semibold text-theme-primary">IT Services • Training • Digital Products</p>
              <p>123 Business Avenue, Tech Park</p>
              <p>{BUSINESS_LOCATION.state} - {BUSINESS_LOCATION.stateCode}</p>
              <p>GSTIN: 27AAAAA0000A1Z5</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end text-right">
            <div className={`px-4 py-1.5 rounded-full border text-sm font-bold tracking-wide mb-6 ${getStatusColor(invoice.status)} print:border-2 print:border-black print:text-black print:bg-theme-surface`}>
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

        {/* Customer Info (Snapshots) */}
        <div className="p-8 border-b border-theme-border bg-theme-surface-hover/50 print:bg-theme-surface">
          <h3 className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-3 print:text-black">Billed To</h3>
          <div className="text-sm text-theme-text space-y-1">
            <p className="font-bold text-theme-text text-base">{invoice.customerNameSnapshot}</p>
            {invoice.businessNameSnapshot && <p>{invoice.businessNameSnapshot}</p>}
            {invoice.addressSnapshot && <p>{invoice.addressSnapshot}</p>}
            {invoice.stateSnapshot && <p>{invoice.stateSnapshot}</p>}
            {invoice.stateCodeSnapshot && <p className="pt-2 font-medium">State Code: {invoice.stateCodeSnapshot}</p>}
            {invoice.gstinSnapshot && <p className="pt-1 font-medium">GSTIN: {invoice.gstinSnapshot}</p>}
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
                    <p className="font-medium text-theme-text">{item.name}</p>
                    {item.description && <p className="text-theme-text-muted text-xs mt-1">{item.description}</p>}
                    <p className="text-theme-text-muted text-xs mt-1">HSN/SAC: {item.hsnSacCode}</p>
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
            <h3 className="text-xs font-bold text-theme-text-muted uppercase tracking-wider mb-4 print:text-black">GST Summary</h3>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-theme-border text-theme-text-muted font-medium print:text-black">
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

        {/* Amount In Words & Totals */}
        <div className="p-8 border-t border-theme-border flex flex-col lg:flex-row justify-between items-start gap-8 bg-theme-surface-hover/50 print:bg-theme-surface">
          <div className="flex-1 w-full text-sm">
            <div className="mb-6">
              <h4 className="font-bold text-theme-text mb-2">Total Amount (in words)</h4>
              <p className="font-medium text-theme-text italic">
                {numberToWords(Number(invoice.netAmount))}
              </p>
            </div>
            {invoice.notes && (
              <div className="text-theme-text-muted">
                <h4 className="font-bold text-theme-text mb-2">Terms & Conditions</h4>
                <p className="whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>
          
          <div className="w-full lg:w-80 space-y-3 text-sm">
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
                <span>₹{invoice.taxableAmount.toString()}</span>
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
                <span>Less: TDS ({invoice.tdsRate?.toString()}%)</span>
                <span>-₹{invoice.tdsAmount.toString()}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-lg font-bold text-theme-text px-2 pt-3 border-t border-theme-border">
              <span>Net Amount Payable</span>
              <span className="text-theme-primary print:text-black">₹{invoice.netAmount.toString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-theme-border flex justify-between items-end">
          <div className="text-xs text-theme-text-muted">
            This is a computer generated invoice.
          </div>
          <div className="text-center w-48">
            <div className="border-b border-gray-400 h-12 mb-2"></div>
            <p className="text-xs font-bold text-theme-text">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}
