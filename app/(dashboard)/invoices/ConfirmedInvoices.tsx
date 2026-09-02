import { TaxInvoiceService } from "@/services/tax-invoice.service";
import { CustomerService } from "@/services/customer.service";
import { ConfirmedInvoiceClientList } from "./ConfirmedInvoiceClientList";

export async function ConfirmedInvoices({
  searchParams,
}: {
  searchParams?: { q?: string; status?: any };
}) {
  const [invoices, customers] = await Promise.all([
    TaxInvoiceService.getTaxInvoices(),
    CustomerService.getCustomers(),
  ]);

  return (
    <div className="space-y-6">
      <ConfirmedInvoiceClientList 
        initialInvoices={JSON.parse(JSON.stringify(invoices))} 
        initialCustomers={JSON.parse(JSON.stringify(customers))} 
      />
    </div>
  );
}
