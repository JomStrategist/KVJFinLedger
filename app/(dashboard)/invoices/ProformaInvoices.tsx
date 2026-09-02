import { ProformaInvoiceService } from "@/services/proforma-invoice.service";
import { CustomerService } from "@/services/customer.service";
import { ProformaInvoiceClientList } from "./ProformaInvoiceClientList";

export async function ProformaInvoices() {
  const [invoices, customers] = await Promise.all([
    ProformaInvoiceService.getProformaInvoices(),
    CustomerService.getCustomers(),
  ]);

  return (
    <div className="space-y-6 mt-4">
      <ProformaInvoiceClientList 
        initialInvoices={JSON.parse(JSON.stringify(invoices))} 
        initialCustomers={JSON.parse(JSON.stringify(customers))} 
      />
    </div>
  );
}
