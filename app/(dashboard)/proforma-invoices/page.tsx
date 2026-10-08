import { requireAuth } from '@/lib/auth-utils';
import Link from 'next/link';
import { ProformaInvoiceService } from '@/services/proforma-invoice.service';
import { CustomerService } from '@/services/customer.service';
import { ProformaInvoiceClientList } from '../invoices/ProformaInvoiceClientList';

export const dynamic = "force-dynamic";

export default async function ProformaInvoicesPage() {
  await requireAuth();

  const [invoices, customers] = await Promise.all([
    ProformaInvoiceService.getProformaInvoices(),
    CustomerService.getCustomers(),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-7">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#17211B] tracking-tight">Proforma Invoices</h1>
          <p className="text-[#68756C] text-sm mt-0.5 font-normal">
            Quotations and estimates issued to clients prior to formal tax invoice generation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="inline-flex items-center justify-center px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 shadow-xs transition"
          >
            &larr; Back to Tax Invoices
          </Link>
          <Link
            href="/proforma-invoices/new"
            className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#177B55] hover:bg-[#0B5F46] shadow-xs transition gap-1.5"
          >
            <span>+</span> Create Proforma
          </Link>
        </div>
      </div>

      <div className="bg-theme-surface rounded-2xl shadow-xs border border-theme-border p-5">
        <ProformaInvoiceClientList 
          initialInvoices={JSON.parse(JSON.stringify(invoices))} 
          initialCustomers={JSON.parse(JSON.stringify(customers))} 
        />
      </div>
    </div>
  );
}
