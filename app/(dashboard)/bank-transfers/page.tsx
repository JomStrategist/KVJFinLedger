import { requireAuth } from "@/lib/auth-utils";
import { BankTransferService } from "@/services/bank-transfer.service";
import { BankTransfersClient } from "./BankTransfersClient";

export default async function BankTransfersPage() {
  await requireAuth();

  const transfers = await BankTransferService.getBankTransfers();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <BankTransfersClient initialTransfers={JSON.parse(JSON.stringify(transfers))} />
    </div>
  );
}
