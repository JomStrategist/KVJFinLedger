import { requireAuth } from "@/lib/auth-utils";
import { BankTransferService } from "@/services/bank-transfer.service";
import { BankAccountService } from "@/services/bank-account.service";
import { BankTransfersClient } from "./BankTransfersClient";
import { BankReconciliationClient } from "./reconciliation/BankReconciliationClient";
import { BankAccountsView } from "./BankAccountsView";
import { OptimisticTabs } from "@/components/OptimisticTabs";
import Link from "next/link";

export default async function BankTransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; [key: string]: any }>;
}) {
  await requireAuth();
  const params = await searchParams;
  const activeTab = params.tab || 'transfers';

  const [transfers, bankAccounts] = await Promise.all([
    BankTransferService.getBankTransfers(),
    BankAccountService.getBankAccounts(),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-7">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#17211B] tracking-tight">Banking &amp; Cash</h1>
          <p className="text-[#68756C] text-sm mt-0.5 font-normal">
            Inter-bank fund movements, contra vouchers, bank reconciliation, and cash accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'accounts' && (
            <Link
              href="/masters?tab=bank-accounts"
              className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#177B55] hover:bg-[#0B5F46] shadow-xs transition-colors gap-1.5 shrink-0"
            >
              <span>+</span> New Bank Account
            </Link>
          )}
        </div>
      </div>

      {/* Ribbon Tabs */}
      <OptimisticTabs
        basePath="/bank-transfers"
        defaultTab="transfers"
        tabs={[
          { id: "transfers", label: "Transfers & Contra" },
          { id: "reconciliation", label: "Bank Reconciliation (BRS)" },
          { id: "accounts", label: "Bank Accounts" },
        ]}
      />

      {/* Content */}
      {activeTab === 'transfers' && (
        <BankTransfersClient
          initialTransfers={JSON.parse(JSON.stringify(transfers))}
          bankAccounts={JSON.parse(JSON.stringify(bankAccounts))}
          showHeader={false}
        />
      )}

      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          <BankReconciliationClient bankAccounts={JSON.parse(JSON.stringify(bankAccounts))} />
        </div>
      )}

      {activeTab === 'accounts' && (
        <BankAccountsView bankAccounts={JSON.parse(JSON.stringify(bankAccounts))} />
      )}
    </div>
  );
}
