"use server";

import { revalidatePath } from "next/cache";
import { PayrollService, BatchPayrollInput } from "@/services/payroll.service";
import { EmployeeAdvanceService, EmployeeAdvanceInput } from "@/services/employee-advance.service";
import { BankPortalType, generateCorporateBankBatchFile, BankingPayoutRecord } from "@/lib/banking-export";

function revalidatePayrollRoutes() {
  revalidatePath("/expenses");
  revalidatePath("/expenses?tab=employees");
  revalidatePath("/reports");
  revalidatePath("/reports?category=employees");
  revalidatePath("/reports?category=tds");
  revalidatePath("/ledgers");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function runBatchPayrollAction(input: BatchPayrollInput) {
  try {
    const result = await PayrollService.runBatchPayroll(input);
    revalidatePayrollRoutes();
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to process batch payroll." };
  }
}

export async function getPayslipAction(expenseId: string) {
  try {
    const data = await PayrollService.getPayslipData(expenseId);
    return { success: true, data: JSON.parse(JSON.stringify(data)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch payslip details." };
  }
}

export async function recordEmployeeAdvanceAction(data: EmployeeAdvanceInput) {
  try {
    const advance = await EmployeeAdvanceService.createAdvance(data);
    revalidatePayrollRoutes();
    return { success: true, data: JSON.parse(JSON.stringify(advance)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to record employee advance." };
  }
}

export async function repayEmployeeAdvanceAction(advanceId: string, amount: number, notes?: string) {
  try {
    const updated = await EmployeeAdvanceService.recordAdvanceRepayment(advanceId, amount, notes);
    revalidatePayrollRoutes();
    return { success: true, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to record advance repayment." };
  }
}

export async function getEmployeeAdvancesAction(employeeId?: string) {
  try {
    const advances = await EmployeeAdvanceService.getAdvances({ employeeId });
    return { success: true, data: JSON.parse(JSON.stringify(advances)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch employee advances." };
  }
}

export async function getForm24QAction(quarter: string = "Q2", financialYear: string = "FY 2026–27") {
  try {
    const data = await PayrollService.getForm24QSummary(quarter, financialYear);
    return { success: true, data: JSON.parse(JSON.stringify(data)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch Form 24Q report." };
  }
}

export async function getForm16Action(employeeId: string, financialYear: string = "FY 2026–27") {
  try {
    const data = await PayrollService.getForm16Data(employeeId, financialYear);
    return { success: true, data: JSON.parse(JSON.stringify(data)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate Form 16." };
  }
}
