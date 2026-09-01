import { requireAuth } from '@/lib/auth-utils';
import Link from 'next/link';
import { ProformaInvoices } from './ProformaInvoices';
import { ConfirmedInvoices } from './ConfirmedInvoices';
import { OptimisticTabs } from '@/components/OptimisticTabs';

export default async function InvoicesHubPage({
  searchParams
}: {
  searchParams: { tab?: string; [key: string]: any }
}) {
  await requireAuth();

  // Await searchParams per Next.js 16 requirements
  const params = await Promise.resolve(searchParams);
  const activeTab = params.tab || 'proforma';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Invoices</h1>
          <p className="text-theme-text-muted mt-1 text-sm">Manage both draft estimates (Proforma) and finalized Tax Invoices.</p>
        </div>
        <Link
          href="/proforma-invoices/new"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-theme-primary hover:bg-theme-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary gap-1.5 shrink-0"
        >
          <svg className="-ml-1 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Proforma
        </Link>
      </div>

      {/* Tabs */}
      <OptimisticTabs 
        basePath="/invoices"
        defaultTab="proforma"
        tabs={[
          { id: "proforma", label: "Proforma Invoice" },
          { id: "confirmed", label: "Confirmed Invoice" }
        ]}
      />

      {/* Tab Content */}
      <div>
        {activeTab === 'proforma' ? (
          <ProformaInvoices />
        ) : (
          <ConfirmedInvoices searchParams={params as any} />
        )}
      </div>
    </div>
  );
}
