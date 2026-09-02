"use server";

import { revalidatePath } from "next/cache";
import { BankAccountService, CreateBankAccountInput, UpdateBankAccountInput } from "@/services/bank-account.service";
import { requireAdmin } from "@/lib/auth-utils";

export async function getBankAccountsAction() {
  try {
    const accounts = await BankAccountService.getBankAccounts();
    return { success: true, data: accounts };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch bank accounts." };
  }
}

export async function createBankAccountAction(data: CreateBankAccountInput) {
  try {
    await requireAdmin();
    const account = await BankAccountService.createBankAccount(data);
    revalidatePath("/settings");
    revalidatePath("/invoices");
    revalidatePath("/proforma-invoices");
    return { success: true, data: account };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create bank account." };
  }
}

export async function updateBankAccountAction(id: string, data: UpdateBankAccountInput) {
  try {
    await requireAdmin();
    const account = await BankAccountService.updateBankAccount(id, data);
    revalidatePath("/settings");
    revalidatePath("/invoices");
    revalidatePath("/proforma-invoices");
    return { success: true, data: account };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update bank account." };
  }
}

export async function setPrimaryBankAccountAction(id: string) {
  try {
    await requireAdmin();
    const account = await BankAccountService.setPrimaryBankAccount(id);
    revalidatePath("/settings");
    revalidatePath("/invoices");
    revalidatePath("/proforma-invoices");
    return { success: true, data: account };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to set primary bank account." };
  }
}
