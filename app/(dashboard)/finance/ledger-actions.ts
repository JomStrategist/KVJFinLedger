"use server";

import { PaymentStatus } from "@prisma/client";
import { FinancialTransactionService } from "@/services/financial-transaction.service";
import { revalidatePath } from "next/cache";

export async function updateLedgerPaymentStatusAction(id: string, status: PaymentStatus) {
  try {
    const txn = await FinancialTransactionService.updatePaymentStatus(id, status);
    revalidatePath("/revenue");
    revalidatePath("/ledger");
    revalidatePath("/invoices");
    revalidatePath("/expenses");
    return { success: true, txn };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
