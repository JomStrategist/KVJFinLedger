import { ProformaInvoiceForm } from "../../ProformaInvoiceForm";
import { CustomerService } from "@/services/customer.service";
import { ProductService } from "@/services/product.service";
import { ProformaInvoiceService } from "@/services/proforma-invoice.service";
import { notFound, redirect } from "next/navigation";

export default async function EditProformaInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const [invoice, customers, products] = await Promise.all([
    ProformaInvoiceService.getProformaInvoiceById(id),
    CustomerService.getCustomers({ isActive: true }),
    ProductService.getProducts({ isActive: true }),
  ]);

  if (!invoice) {
    notFound();
  }

  if (invoice.status !== "DRAFT") {
    // Only draft invoices can be edited
    redirect(`/proforma-invoices/${invoice.id}`);
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Edit Proforma Invoice</h1>
          <p className="text-theme-text-muted mt-1 text-sm">Update draft quotation {invoice.invoiceNumber}.</p>
        </div>
      </div>
      
      <ProformaInvoiceForm 
        initialData={JSON.parse(JSON.stringify(invoice))} 
        customers={JSON.parse(JSON.stringify(customers))} 
        products={JSON.parse(JSON.stringify(products))} 
      />
    </div>
  );
}
