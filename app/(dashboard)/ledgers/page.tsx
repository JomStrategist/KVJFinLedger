import { LedgerService } from "@/services/ledger.service";
import LedgerClient from "./LedgerClient";
import { GeneralLedgerNav } from "@/components/GeneralLedgerNav";

export const dynamic = "force-dynamic";

export default async function LedgersPage({
  searchParams,
}: {
  searchParams: Promise<{
    accountId?: string;
    fromDate?: string;
    toDate?: string;
  }>;
}) {
  const params = await searchParams;
  const accountList = await LedgerService.getAccountList();
  
  const selectedAccountId = params.accountId || (accountList.length > 0 ? accountList[0].id : "");

  const statement = selectedAccountId 
    ? await LedgerService.getLedgerStatement(selectedAccountId, params.fromDate, params.toDate)
    : null;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-7">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#17211B] tracking-tight">General Ledger</h1>
          <p className="text-[#68756C] text-sm mt-0.5 font-normal">
            Chart of Accounts explorer, double-entry ledger vouchers, and financial statements.
          </p>
        </div>
      </div>

      <GeneralLedgerNav />

      <LedgerClient
        accountList={accountList}
        initialStatement={statement}
        selectedAccountId={selectedAccountId}
        initialFromDate={params.fromDate || ""}
        initialToDate={params.toDate || ""}
      />
    </div>
  );
}
