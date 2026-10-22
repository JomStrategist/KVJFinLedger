"use server";

import { revalidatePath } from "next/cache";
import { LoanService, CreateLoanInput, RecordRepaymentInput } from "@/services/loan.service";
import { requireActionAuth, requireActionAdmin } from "@/lib/auth-utils";

export async function createLoanAction(data: CreateLoanInput) {
  try {
    const session = await requireActionAuth();
    const user = (session.user as any) || {};
    const actor = {
      id: user.id,
      name: user.name || "User",
      email: user.email || "user@kvjfinledger.internal",
      role: user.role || "USER",
    };
    const loan = await LoanService.createLoan(data, actor);
    revalidatePath("/finance");
    revalidatePath("/reports/balance-sheet");
    revalidatePath("/dashboard");
    return { success: true, data: loan };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create loan." };
  }
}

export async function recordLoanRepaymentAction(data: RecordRepaymentInput) {
  try {
    const session = await requireActionAuth();
    const user = (session.user as any) || {};
    const actor = {
      id: user.id,
      name: user.name || "User",
      email: user.email || "user@kvjfinledger.internal",
      role: user.role || "USER",
    };
    const repayment = await LoanService.recordRepayment(data, actor);
    revalidatePath("/finance");
    revalidatePath("/profit-loss");
    revalidatePath("/reports/balance-sheet");
    revalidatePath("/dashboard");
    return { success: true, data: repayment };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to record loan repayment." };
  }
}

export async function deleteLoanRepaymentAction(repaymentId: string) {
  try {
    const session = await requireActionAdmin();
    const user = (session.user as any) || {};
    const actor = {
      id: user.id,
      name: user.name || "Admin",
      email: user.email || "admin@kvjfinledger.internal",
      role: user.role || "ADMIN",
    };
    await LoanService.deleteRepayment(repaymentId, actor);
    revalidatePath("/finance");
    revalidatePath("/profit-loss");
    revalidatePath("/reports/balance-sheet");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete loan repayment." };
  }
}

export async function deleteLoanAction(loanId: string) {
  try {
    const session = await requireActionAdmin();
    const user = (session.user as any) || {};
    const actor = {
      id: user.id,
      name: user.name || "Admin",
      email: user.email || "admin@kvjfinledger.internal",
      role: user.role || "ADMIN",
    };
    await LoanService.deleteLoan(loanId, actor);
    revalidatePath("/finance");
    revalidatePath("/reports/balance-sheet");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete loan." };
  }
}
