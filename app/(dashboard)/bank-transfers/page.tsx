import { requireAuth } from "@/lib/auth-utils";
import { BankTransferService } from "@/services/bank-transfer.service";
import { BankAccountService } from "@/services/bank-account.service";
import { BankTransfersClient } from "./BankTransfersClient";

export default async function BankTransfersPage() {
  await requireAuth();

  const [transfers, bankAccounts] = await Promise.all([
    BankTransferService.getBankTransfers(),
    BankAccountService.getBankAccounts(),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <BankTransfersClient
        initialTransfers={JSON.parse(JSON.stringify(transfers))}
        bankAccounts={JSON.parse(JSON.stringify(bankAccounts))}
      />
    </div>
  );
}
