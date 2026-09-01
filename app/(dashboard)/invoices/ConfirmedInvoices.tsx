import Link from "next/link";
import { TaxInvoiceService } from "@/services/tax-invoice.service";
import { TaxInvoiceStatus } from "@prisma/client";

export async function ConfirmedInvoices({
  searchParams,
}: {
  searchParams: { q?: string; status?: TaxInvoiceStatus };
}) {
  const query = searchParams.q || "";
  const statusFilter = searchParams.status;

  const [invoices, metrics] = await Promise.all([
    TaxInvoiceService.getTaxInvoices({ search: query, status: statusFilter }),
    TaxInvoiceService.getDashboardMetrics()
  ]);

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
    <div className="space-y-6 mt-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-theme-surface p-4 rounded-xl border border-theme-border shadow-sm">
          <p className="text-sm font-medium text-theme-text-muted">Total Invoices</p>
          <p className="text-2xl font-bold text-theme-text mt-1">{metrics.totalCount}</p>
        </div>
        <div className="bg-theme-surface p-4 rounded-xl border border-theme-border shadow-sm">
          <p className="text-sm font-medium text-theme-text-muted">Confirmed</p>
          <p className="text-2xl font-bold text-theme-primary mt-1">{metrics.confirmedCount}</p>
        </div>
        <div className="bg-theme-surface p-4 rounded-xl border border-theme-border shadow-sm">
          <p className="text-sm font-medium text-theme-text-muted">Cancelled</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{metrics.cancelledCount}</p>
        </div>
        <div className="bg-theme-surface p-4 rounded-xl border border-theme-border shadow-sm">
          <p className="text-sm font-medium text-theme-text-muted">Total Value</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">₹{metrics.totalValue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-theme-border bg-theme-surface-hover flex flex-col sm:flex-row gap-4 justify-between items-center">
          <form className="flex-1 w-full max-w-md flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by invoice number or customer..."
              className="flex-1 border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
            />
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <button type="submit" className="px-4 py-2 bg-theme-bg text-white rounded-lg text-sm font-medium hover:bg-theme-surface-hover">
              Search
            </button>
          </form>

          <div className="flex gap-2 text-sm">
            <Link href={`/invoices?q=${query}`} className={`px-3 py-1.5 rounded-lg border ${!statusFilter ? 'bg-theme-bg text-white' : 'bg-theme-surface text-theme-text-muted hover:bg-theme-surface-hover'}`}>
              All
            </Link>
            <Link href={`/invoices?status=CONFIRMED&q=${query}`} className={`px-3 py-1.5 rounded-lg border ${statusFilter === 'CONFIRMED' ? 'bg-theme-bg text-white' : 'bg-theme-surface text-theme-text-muted hover:bg-theme-surface-hover'}`}>
              Confirmed
            </Link>
            <Link href={`/invoices?status=PAID&q=${query}`} className={`px-3 py-1.5 rounded-lg border ${statusFilter === 'PAID' ? 'bg-theme-bg text-white' : 'bg-theme-surface text-theme-text-muted hover:bg-theme-surface-hover'}`}>
              Paid
            </Link>
          </div>
        </div>

        {/* Table */}
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
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-theme-text-muted">
                    No tax invoices found. Convert a Proforma Invoice to create one.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-theme-surface-hover/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/invoices/${invoice.id}`} className="font-medium text-theme-primary hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-theme-text">{invoice.customerNameSnapshot}</p>
                      {invoice.businessNameSnapshot && (
                        <p className="text-xs text-theme-text-muted">{invoice.businessNameSnapshot}</p>
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
