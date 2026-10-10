"use server";

import { revalidatePath } from "next/cache";
import { RecurringExpenseService, CreateRecurringInput } from "@/services/recurring-expense.service";

function revalidateRecurringRoutes() {
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports/expenses");
}

export async function createRecurringScheduleAction(data: CreateRecurringInput) {
  try {
    const schedule = await RecurringExpenseService.createSchedule(data);
    revalidateRecurringRoutes();
    return { success: true, data: JSON.parse(JSON.stringify(schedule)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create recurring schedule." };
  }
}

export async function updateRecurringScheduleAction(id: string, data: Partial<CreateRecurringInput>) {
  try {
    const schedule = await RecurringExpenseService.updateSchedule(id, data);
    revalidateRecurringRoutes();
    return { success: true, data: JSON.parse(JSON.stringify(schedule)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update recurring schedule." };
  }
}

export async function toggleRecurringScheduleAction(id: string, isActive: boolean) {
  try {
    const schedule = await RecurringExpenseService.toggleSchedule(id, isActive);
    revalidateRecurringRoutes();
    return { success: true, data: JSON.parse(JSON.stringify(schedule)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to toggle schedule state." };
  }
}

export async function deleteRecurringScheduleAction(id: string) {
  try {
    await RecurringExpenseService.deleteSchedule(id);
    revalidateRecurringRoutes();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete recurring schedule." };
  }
}

export async function confirmRecurringExpenseAction(
  scheduleId: string,
  options?: {
    actualAmount?: number;
    expenseDate?: string;
    billNumber?: string;
    notes?: string;
    paidBy?: "COMPANY" | "EMPLOYEE";
    paymentStatus?: "PAID" | "UNPAID" | "PARTIALLY_PAID";
    paidAmount?: number;
    bankAccountId?: string;
  }
) {
  try {
    const expense = await RecurringExpenseService.confirmAndGenerateExpense(scheduleId, options);
    revalidateRecurringRoutes();
    revalidatePath("/expenses");
    revalidatePath("/reports/expenses");
    return { success: true, data: JSON.parse(JSON.stringify(expense)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate recurring expense." };
  }
}
