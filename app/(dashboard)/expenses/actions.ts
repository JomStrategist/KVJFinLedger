"use server";

import { revalidatePath } from "next/cache";
import { ExpenseService } from "@/services/expense.service";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteEmployeeMasterAction } from "../masters/actions";

function revalidateAllExpenseRoutes(id?: string) {
  revalidatePath("/expenses");
  revalidatePath("/reports");
  revalidatePath("/reports/balance-sheet");
  revalidatePath("/reports/payables");
  revalidatePath("/reports/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/finance");
  revalidatePath("/profit-loss");
  revalidatePath("/ledgers");
  if (id) {
    revalidatePath(`/expenses/${id}`);
  }
}

export async function createExpenseAction(data: any) {
  try {
    const expense = await ExpenseService.createExpense(data);
    revalidateAllExpenseRoutes();
    return { success: true, data: JSON.parse(JSON.stringify(expense)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create expense." };
  }
}

export async function updateExpenseAction(id: string, data: any) {
  try {
    const expense = await ExpenseService.updateExpense(id, data);
    revalidateAllExpenseRoutes(id);
    return { success: true, data: JSON.parse(JSON.stringify(expense)) };
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

export async function updatePaymentStatusAction(id: string, status: PaymentStatus, paidAmount?: number) {
  try {
    await ExpenseService.updatePaymentStatus(id, status, paidAmount);
    revalidateAllExpenseRoutes(id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update payment status." };
  }
}

export async function deleteExpenseAction(id: string) {
  try {
    await ExpenseService.deleteExpense(id);
    revalidateAllExpenseRoutes(id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete expense." };
  }
}

export async function recordSalaryPayoutAction(data: {
  employeeId: string;
  paymentDate: string;
  periodMonth: string;
  grossAmount: number;
  tdsAmount?: number;
  advanceDeduction?: number;
  paymentMode?: string;
  reference?: string;
  notes?: string;
}) {
  try {
    const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
    if (!employee) throw new Error("Employee not found.");

    // Find or get Salaries & Wages category
    let salaryCategory = await prisma.expenseCategory.findFirst({
      where: {
        OR: [
          { name: { contains: "Salary", mode: "insensitive" } },
          { name: { contains: "Wage", mode: "insensitive" } },
          { code: "SALARY" },
        ],
      },
    });

    if (!salaryCategory) {
      salaryCategory = await prisma.expenseCategory.create({
        data: {
          name: "Salaries & Wages",
          code: "EXP-SAL-001",
          statementGroup: "Employee Benefits Expense",
          financialType: "EXPENSE",
          accountNature: "DEBIT",
          description: "Staff and executive remuneration",
        },
      });
    }

    const gross = Number(data.grossAmount);
    const tds = Number(data.tdsAmount || 0);
    const advDeduction = Number(data.advanceDeduction || 0);
    const net = Math.max(0, gross - tds - advDeduction);

    const expense = await ExpenseService.createExpense({
      expenseDate: new Date(data.paymentDate),
      description: `Salary Payout - ${employee.name} (${data.periodMonth})`,
      notes: data.notes || `Monthly Salary Payout - ${employee.name} [${employee.employeeCode || "EMP"}] (${data.periodMonth})${advDeduction > 0 ? ` (Less Adv: ₹${advDeduction})` : ""}${data.reference ? ` Ref: ${data.reference}` : ""}`,
      categoryId: salaryCategory.id,
      paidBy: "COMPANY",
      employeeId: employee.id,
      paymentStatus: "PAID",
      status: "APPROVED",
      taxableAmount: gross,
      subtotal: gross,
      inputCGST: 0,
      inputSGST: 0,
      inputIGST: 0,
      totalInputGST: 0,
      tdsRate: gross > 0 ? (tds / gross) * 100 : 0,
      tdsAmount: tds,
      tdsSection: tds > 0 ? "192" : undefined,
      grossAmount: gross,
      netAmount: net,
      paidAmount: net,
      advanceAmount: advDeduction,
      isAsset: false,
      items: [
        {
          categoryId: salaryCategory.id,
          description: `Salary for ${data.periodMonth} - ${employee.name}`,
          quantity: 1,
          unit: "Month",
          unitPrice: gross,
          gstRate: 0,
          taxableAmount: gross,
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          igstRate: 0,
          igstAmount: 0,
          totalGST: 0,
          tdsRate: gross > 0 ? (tds / gross) * 100 : 0,
          tdsAmount: tds,
          totalAmount: gross,
        },
      ],
    });

    // Deduct advance balance if requested
    if (advDeduction > 0) {
      const { EmployeeAdvanceService } = await import("@/services/employee-advance.service");
      await EmployeeAdvanceService.deductAdvanceInPayroll(employee.id, advDeduction);
    }

    revalidateAllExpenseRoutes();
    revalidatePath("/masters");
    return { success: true, data: JSON.parse(JSON.stringify(expense)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to record salary payout." };
  }
}

export { deleteEmployeeMasterAction };
