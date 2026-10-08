"use server";

import { revalidatePath } from "next/cache";
import { BankReconciliationService, StatementLineInput } from "@/services/bank-reconciliation.service";

export async function createStatementImportAction(bankAccountId: string, fileName: string, lines: StatementLineInput[]) {
  try {
    const res = await BankReconciliationService.createImport(bankAccountId, fileName, lines);
    revalidatePath("/bank-transfers/reconciliation");
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create statement import" };
  }
}

export async function confirmLineMatchAction(lineId: string, matchedType: string, matchedId: string, notes?: string) {
  try {
    const res = await BankReconciliationService.confirmMatch(lineId, matchedType, matchedId, notes);
    revalidatePath("/bank-transfers/reconciliation");
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to confirm match" };
  }
}

export async function unmatchLineAction(lineId: string) {
  try {
    const res = await BankReconciliationService.unmatchLine(lineId);
    revalidatePath("/bank-transfers/reconciliation");
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to unmatch line" };
  }
}

export async function deleteImportAction(importId: string) {
  try {
    await BankReconciliationService.deleteImport(importId);
    revalidatePath("/bank-transfers/reconciliation");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete import" };
  }
}
