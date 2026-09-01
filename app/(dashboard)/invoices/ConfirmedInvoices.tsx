import { TaxInvoiceService } from "@/services/tax-invoice.service";
import { CustomerService } from "@/services/customer.service";
import { ConfirmedInvoiceClientList } from "./ConfirmedInvoiceClientList";

export async function ConfirmedInvoices({
  searchParams,
}: {
  searchParams?: { q?: string; status?: any };
}) {
  const [invoices, metrics, customers] = await Promise.all([
    TaxInvoiceService.getTaxInvoices(),
    TaxInvoiceService.getDashboardMetrics(),
    CustomerService.getCustomers(),
  ]);

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

      <ConfirmedInvoiceClientList initialInvoices={invoices} initialCustomers={customers} />
    </div>
  );
}
