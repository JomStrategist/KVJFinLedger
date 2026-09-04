import { LedgerService } from "@/services/ledger.service";
import LedgerClient from "./LedgerClient";

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
    <LedgerClient
      accountList={accountList}
      initialStatement={statement}
      selectedAccountId={selectedAccountId}
      initialFromDate={params.fromDate || ""}
      initialToDate={params.toDate || ""}
    />
  );
}
