import { requireAuth } from "@/lib/auth-utils";
import Link from "next/link";
import { CustomerService } from "@/services/customer.service";
import { ProductService } from "@/services/product.service";
import { ExpenseCategoryService } from "@/services/expense-category.service";
import { ProformaInvoiceForm } from "@/app/(dashboard)/proforma-invoices/ProformaInvoiceForm";

export const dynamic = "force-dynamic";

export default async function NewTaxInvoicePage() {
  await requireAuth();

  const [customers, products, categories] = await Promise.all([
    CustomerService.getCustomers({ isActive: true }),
    ProductService.getProducts({ isActive: true }),
    ExpenseCategoryService.getExpenseCategories({ isActive: true }),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-theme-text">Create Tax Invoice</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
              Direct Accounting Post
            </span>
          </div>
          <p className="text-theme-text-muted mt-1 text-sm">
            Generate and post an authoritative Tax Invoice directly to General Ledger & GST Outward Supplies.
          </p>
        </div>
        <Link
          href="/invoices"
          className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 transition"
        >
          &larr; Back to Invoices
        </Link>
      </div>
      
      <ProformaInvoiceForm 
        mode="taxInvoice"
        customers={JSON.parse(JSON.stringify(customers))} 
        products={JSON.parse(JSON.stringify(products))} 
        categories={JSON.parse(JSON.stringify(categories))}
      />
    </div>
  );
}
