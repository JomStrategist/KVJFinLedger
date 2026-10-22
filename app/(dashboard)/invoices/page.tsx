import { requireAuth } from '@/lib/auth-utils';
import Link from 'next/link';
import { ProformaInvoices } from './ProformaInvoices';
import { ConfirmedInvoices } from './ConfirmedInvoices';
import { OptimisticTabs } from '@/components/OptimisticTabs';
import { CustomerService } from '@/services/customer.service';
import { CustomerClientList } from '../customers/CustomerClientList';
import { ProductService } from '@/services/product.service';
import { ProductClientList } from '../products/ProductClientList';

export default async function InvoicesHubPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    search?: string;
    type?: string;
    status?: string;
  }>;
}) {
  await requireAuth();

  const params = await searchParams;
  const activeTab = params.tab || 'confirmed';

  const [customers, products] = await Promise.all([
    activeTab === 'customers'
      ? CustomerService.getCustomers({
          search: params.q || params.search || "",
          customerType: params.type === "B2B" || params.type === "B2C" ? params.type : undefined,
          isActive: params.status === "ACTIVE" ? true : params.status === "INACTIVE" ? false : undefined,
        })
      : Promise.resolve([]),
    activeTab === 'products'
      ? ProductService.getProducts()
      : Promise.resolve([]),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-7">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#17211B] tracking-tight">Sales &amp; Invoicing</h1>
          <p className="text-[#68756C] text-sm mt-0.5 font-normal">
            Confirmed Tax Invoices, Proforma Invoices, Customer Directory, and Products &amp; Services Catalog.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/invoices/new"
            className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors gap-1.5 shrink-0"
          >
            <span>+</span> New Tax Invoice
          </Link>
          <Link
            href="/proforma-invoices/new"
            className="inline-flex items-center justify-center px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-xs transition-colors gap-1.5 shrink-0"
          >
            <span>+</span> Create Proforma
          </Link>
          {activeTab === 'customers' && (
            <Link
              href="/customers/new"
              className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#177B55] hover:bg-[#0B5F46] shadow-xs transition-colors gap-1.5 shrink-0"
            >
              <span>+</span> New Customer
            </Link>
          )}
          {activeTab === 'products' && (
            <Link
              href="/products/new"
              className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#177B55] hover:bg-[#0B5F46] shadow-xs transition-colors gap-1.5 shrink-0"
            >
              <span>+</span> New Product / Service
            </Link>
          )}
        </div>
      </div>

      {/* Ribbon Tabs */}
      <OptimisticTabs 
        basePath="/invoices"
        defaultTab="confirmed"
        tabs={[
          { id: "confirmed", label: "Confirmed Invoices" },
          { id: "proforma", label: "Proforma Invoices" },
          { id: "customers", label: "Customers" },
          { id: "products", label: "Products & Services" }
        ]}
      />

      {/* Tab Content */}
      <div>
        {activeTab === 'proforma' ? (
          <ProformaInvoices />
        ) : activeTab === 'customers' ? (
          <CustomerClientList 
            initialCustomers={customers} 
            searchParams={{ q: params.q || params.search, type: params.type, status: params.status }} 
          />
        ) : activeTab === 'products' ? (
          <ProductClientList initialProducts={JSON.parse(JSON.stringify(products))} />
        ) : (
          <ConfirmedInvoices searchParams={{ q: params.q || params.search, status: params.status }} />
        )}
      </div>
    </div>
  );
}
