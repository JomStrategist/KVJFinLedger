"use server";

import { revalidatePath } from "next/cache";
import { BankTransferService } from "@/services/bank-transfer.service";

export async function createBankTransferAction(data: {
  date: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  reference?: string;
  description?: string;
}) {
  try {
    const transfer = await BankTransferService.createBankTransfer({
      ...data,
      date: new Date(data.date),
      amount: Number(data.amount),
    });
    revalidatePath("/bank-transfers");
    revalidatePath("/finance");
    return { success: true, data: transfer };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create bank transfer." };
  }
}

export async function updateBankTransferAction(
  id: string,
  data: {
    date: string;
    fromAccount: string;
    toAccount: string;
    amount: number;
    reference?: string;
    description?: string;
  }
) {
  try {
    const transfer = await BankTransferService.updateBankTransfer(id, {
      ...data,
      date: new Date(data.date),
      amount: Number(data.amount),
    });
    revalidatePath("/bank-transfers");
    revalidatePath("/finance");
    return { success: true, data: transfer };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update bank transfer." };
  }
}
