"use server";

import { revalidatePath } from "next/cache";
import { BankTransferService } from "@/services/bank-transfer.service";
import { requireActionAuth, requireActionAdmin } from "@/lib/auth-utils";

export async function createBankTransferAction(data: {
  date: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  reference?: string;
  description?: string;
}) {
  try {
    await requireActionAuth();
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
    await requireActionAuth();
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

export async function deleteBankTransferAction(id: string) {
  try {
    await requireActionAdmin();
    const res = await BankTransferService.deleteBankTransfer(id);
    revalidatePath("/bank-transfers");
    revalidatePath("/finance");
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete bank transfer." };
  }
}

