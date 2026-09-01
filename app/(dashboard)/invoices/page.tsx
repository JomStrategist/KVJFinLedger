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

  const params = await Promise.resolve(searchParams);
  const activeTab = params.tab || 'confirmed';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-7">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#17211B] tracking-tight">Invoices</h1>
          <p className="text-[#68756C] text-sm mt-0.5 font-normal">
            Proforma, Tax Invoices, GST, TDS and payment tracking.
          </p>
        </div>
        <Link
          href="/proforma-invoices/new"
          className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#177B55] hover:bg-[#0B5F46] shadow-xs transition-colors gap-1.5 shrink-0"
        >
          <span>+</span> Create Proforma
        </Link>
      </div>

      {/* Tabs */}
      <OptimisticTabs 
        basePath="/invoices"
        defaultTab="confirmed"
        tabs={[
          { id: "confirmed", label: "Confirmed Invoices" },
          { id: "proforma", label: "Proforma Invoices" }
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
