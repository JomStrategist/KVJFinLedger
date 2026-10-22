"use server";

import { revalidatePath } from "next/cache";
import { BankReconciliationService, StatementLineInput } from "@/services/bank-reconciliation.service";
import { requireActionAuth, requireActionAdmin } from "@/lib/auth-utils";

export async function createStatementImportAction(bankAccountId: string, fileName: string, lines: StatementLineInput[]) {
  try {
    await requireActionAuth();
    const res = await BankReconciliationService.createImport(bankAccountId, fileName, lines);
    revalidatePath("/bank-transfers/reconciliation");
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create statement import" };
  }
}

export async function confirmLineMatchAction(lineId: string, matchedType: string, matchedId: string, notes?: string) {
  try {
    await requireActionAuth();
    const res = await BankReconciliationService.confirmMatch(lineId, matchedType, matchedId, notes);
    revalidatePath("/bank-transfers/reconciliation");
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to confirm match" };
  }
}

export async function unmatchLineAction(lineId: string) {
  try {
    await requireActionAuth();
    const res = await BankReconciliationService.unmatchLine(lineId);
    revalidatePath("/bank-transfers/reconciliation");
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to unmatch line" };
  }
}

export async function deleteImportAction(importId: string) {
  try {
    await requireActionAdmin();
    await BankReconciliationService.deleteImport(importId);
    revalidatePath("/bank-transfers/reconciliation");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete import" };
  }
}

export async function recordReconciliationAdjustmentAction(data: {
  bankAccountId: string;
  adjustmentType: "BANK_CHARGES" | "INTEREST_RECEIVED" | "CUSTOM";
  amount: number;
  date: string;
  reference?: string;
  particulars?: string;
  contraAccountId?: string;
  contraAccountName?: string;
}) {
  try {
    const session = await requireActionAuth();
    const user = (session.user as any) || {};
    const actor = {
      id: user.id,
      name: user.name || "User",
      email: user.email || "user@kvjfinledger.internal",
      role: user.role || "USER",
    };
    const res = await BankReconciliationService.createAdjustment(
      {
        ...data,
        date: new Date(data.date),
      },
      actor
    );
    revalidatePath("/bank-transfers/reconciliation");
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to record adjustment" };
  }
}
