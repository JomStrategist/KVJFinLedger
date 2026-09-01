import Link from "next/link";
import { ProformaInvoiceService } from "@/services/proforma-invoice.service";
import { CustomerService } from "@/services/customer.service";
import { ProformaInvoiceClientList } from "./ProformaInvoiceClientList";

export async function ProformaInvoices() {
  const [invoices, customers] = await Promise.all([
    ProformaInvoiceService.getProformaInvoices(),
    CustomerService.getCustomers(),
  ]);

  // Summary Cards Data
  const totalItems = invoices.length;
  const draftItems = invoices.filter(i => i.status === "DRAFT").length;
  const sentItems = invoices.filter(i => i.status === "SENT").length;
  const acceptedItems = invoices.filter(i => i.status === "ACCEPTED").length;
  const totalValue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-theme-surface p-4 rounded-xl shadow-sm border border-theme-border">
          <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wide">Total Items</p>
          <p className="mt-2 text-2xl font-bold text-theme-text">{totalItems}</p>
        </div>
        <div className="bg-theme-surface p-4 rounded-xl shadow-sm border border-theme-border">
          <p className="text-xs font-medium text-theme-text-muted uppercase tracking-wide">Draft</p>
          <p className="mt-2 text-2xl font-bold text-theme-text">{draftItems}</p>
        </div>
        <div className="bg-theme-surface p-4 rounded-xl shadow-sm border border-theme-border">
          <p className="text-xs font-medium text-blue-500 uppercase tracking-wide">Sent</p>
          <p className="mt-2 text-2xl font-bold text-theme-text">{sentItems}</p>
        </div>
        <div className="bg-theme-surface p-4 rounded-xl shadow-sm border border-theme-border">
          <p className="text-xs font-medium text-emerald-500 uppercase tracking-wide">Accepted</p>
          <p className="mt-2 text-2xl font-bold text-theme-text">{acceptedItems}</p>
        </div>
        <div className="bg-theme-surface p-4 rounded-xl shadow-sm border border-theme-border">
          <p className="text-xs font-medium text-purple-500 uppercase tracking-wide">Total Value</p>
          <p className="mt-2 text-xl font-bold text-theme-text">₹{totalValue.toFixed(2)}</p>
        </div>
      </div>

      <ProformaInvoiceClientList 
        initialInvoices={JSON.parse(JSON.stringify(invoices))} 
        initialCustomers={JSON.parse(JSON.stringify(customers))} 
      />
    </div>
  );
}
