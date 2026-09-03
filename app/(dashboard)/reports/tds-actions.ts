"use server";

import { revalidatePath } from "next/cache";
import { TdsDepositService, RecordTdsDepositInput } from "@/services/tds-deposit.service";
import { requireAuth } from "@/lib/auth-utils";

export async function recordTdsDepositAction(data: RecordTdsDepositInput) {
  try {
    await requireAuth();
    const result = await TdsDepositService.recordTdsDeposit(data);
    revalidatePath("/reports");
    revalidatePath("/dashboard");
    revalidatePath("/finance");
    revalidatePath("/expenses");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error recording TDS deposit:", error);
    return { success: false, error: error.message || "Failed to record TDS deposit" };
  }
}

export async function markExpenseTdsPaidAction(expenseId: string, challanNumber: string, paidDate?: string) {
  try {
    await requireAuth();
    const result = await TdsDepositService.markExpenseTdsPaid(expenseId, challanNumber, paidDate);
    revalidatePath("/reports");
    revalidatePath("/dashboard");
    revalidatePath("/finance");
    revalidatePath("/expenses");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error marking expense TDS paid:", error);
    return { success: false, error: error.message || "Failed to mark TDS paid" };
  }
}

export async function deleteTdsDepositAction(id: string) {
  try {
    await requireAuth();
    await TdsDepositService.deleteTdsDeposit(id);
    revalidatePath("/reports");
    revalidatePath("/dashboard");
    revalidatePath("/finance");
    revalidatePath("/expenses");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting TDS deposit:", error);
    return { success: false, error: error.message || "Failed to delete TDS deposit" };
  }
}
