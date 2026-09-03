"use server";

import { revalidatePath } from "next/cache";
import { ExpenseService } from "@/services/expense.service";
import { PaymentStatus } from "@prisma/client";

function revalidateAllExpenseRoutes(id?: string) {
  revalidatePath("/expenses");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  revalidatePath("/finance");
  if (id) {
    revalidatePath(`/expenses/${id}`);
  }
}

export async function createExpenseAction(data: any) {
  try {
    const expense = await ExpenseService.createExpense(data);
    revalidateAllExpenseRoutes();
    return { success: true, data: expense };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create expense." };
  }
}

export async function updateExpenseAction(id: string, data: any) {
  try {
    const expense = await ExpenseService.updateExpense(id, data);
    revalidateAllExpenseRoutes(id);
    return { success: true, data: expense };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update expense." };
  }
}

export async function approveExpenseAction(id: string) {
  try {
    await ExpenseService.approveExpense(id);
    revalidateAllExpenseRoutes(id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to approve expense." };
  }
}

export async function cancelExpenseAction(id: string, reason: string) {
  try {
    await ExpenseService.cancelExpense(id, reason);
    revalidateAllExpenseRoutes(id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to cancel expense." };
  }
}

export async function updatePaymentStatusAction(id: string, status: PaymentStatus) {
  try {
    await ExpenseService.updatePaymentStatus(id, status);
    revalidateAllExpenseRoutes(id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update payment status." };
  }
}
