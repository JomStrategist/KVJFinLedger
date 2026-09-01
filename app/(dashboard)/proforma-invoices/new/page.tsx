import { ProformaInvoiceForm } from "../ProformaInvoiceForm";
import { CustomerService } from "@/services/customer.service";
import { ProductService } from "@/services/product.service";

export default async function NewProformaInvoicePage() {
  const [customers, products] = await Promise.all([
    CustomerService.getCustomers({ isActive: true }),
    ProductService.getProducts({ isActive: true }),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Create Proforma Invoice</h1>
          <p className="text-theme-text-muted mt-1 text-sm">Draft a new quotation for a customer.</p>
        </div>
      </div>
      
      <ProformaInvoiceForm 
        customers={JSON.parse(JSON.stringify(customers))} 
        products={JSON.parse(JSON.stringify(products))} 
      />
    </div>
  );
}
