import { prisma } from "@/lib/prisma";
import { AccountingEngine } from "./accounting-engine.service";

export interface EmployeeAdvanceInput {
  employeeId: string;
  amount: number;
  advanceDate?: string | Date;
  purpose?: string;
  deductionMonth?: string;
  paymentMode?: string;
  reference?: string;
  notes?: string;
}

export class EmployeeAdvanceService {
  /**
   * Get all employee advances with optional filtering.
   */
  static async getAdvances(params?: {
    employeeId?: string;
    status?: string; // ACTIVE, REPAID, DEDUCTED
  }) {
    const where: any = {};
    if (params?.employeeId) where.employeeId = params.employeeId;
    if (params?.status && params.status !== "ALL") where.status = params.status;

    return prisma.employeeAdvance.findMany({
      where,
      orderBy: { advanceDate: "desc" },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            department: true,
            designation: true,
            pan: true,
          },
        },
      },
    });
  }

  /**
   * Get total outstanding advances for an employee.
   */
  static async getOutstandingAdvanceForEmployee(employeeId: string): Promise<number> {
    const advances = await prisma.employeeAdvance.findMany({
      where: {
        employeeId,
        status: "ACTIVE",
      },
    });
    return advances.reduce((sum, a) => sum + (a.balanceAmount || 0), 0);
  }

  /**
   * Create an employee advance and post the double-entry voucher.
   * Debits: Employee Advances (Current Asset)
   * Credits: Bank Account
   */
  static async createAdvance(data: EmployeeAdvanceInput) {
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });
    if (!employee) throw new Error("Employee not found.");

    const amount = Number(data.amount);
    if (amount <= 0) throw new Error("Advance amount must be greater than zero.");

    // Generate Advance Reference
    const count = await prisma.employeeAdvance.count();
    const currentYear = new Date().getFullYear();
    const advanceNumber = `ADV-${currentYear}-${(count + 1).toString().padStart(4, "0")}`;

    // Find or create 'Employee Advances' asset category
    let advanceCategory = await prisma.expenseCategory.findFirst({
      where: {
        OR: [
          { name: { contains: "Employee Advance", mode: "insensitive" } },
          { code: "ASST-ADV-001" },
        ],
      },
    });

    if (!advanceCategory) {
      advanceCategory = await prisma.expenseCategory.create({
        data: {
          name: "Employee Advances",
          code: "ASST-ADV-001",
          statementGroup: "Loans and Advances",
          financialType: "ASSET",
          accountNature: "DEBIT",
          description: "Short-term recoverable employee advances and salary prepayments",
        },
      });
    }

    const advanceDate = data.advanceDate ? new Date(data.advanceDate) : new Date();

    // Create Advance Master Record
    const advance = await prisma.employeeAdvance.create({
      data: {
        advanceNumber,
        employeeId: employee.id,
        advanceDate,
        amount,
        repaidAmount: 0,
        balanceAmount: amount,
        status: "ACTIVE",
        purpose: data.purpose || "Salary / Emergency Advance",
        deductionMonth: data.deductionMonth || "Next Payroll",
        paymentMode: data.paymentMode || "BANK",
        reference: data.reference || null,
        notes: data.notes || null,
      },
      include: {
        employee: true,
      },
    });

    // Create Expense record with Asset category to disburse funds from Bank
    // This creates Dr. Employee Advances (Asset), Cr. Bank Account
    const expenseCount = await prisma.expense.count();
    const expenseNumber = `EXP-${currentYear}-${(expenseCount + 1).toString().padStart(4, "0")}`;

    await prisma.expense.create({
      data: {
        expenseNumber,
        expenseDate: advanceDate,
        description: `Advance Disbursed - ${employee.name} [${advanceNumber}]`,
        notes: `Salary Advance #${advanceNumber} to ${employee.name}. Purpose: ${data.purpose || "Personal Advance"}`,
        categoryId: advanceCategory.id,
        paidBy: "COMPANY",
        employeeId: employee.id,
        paymentStatus: "PAID",
        status: "APPROVED",
        taxableAmount: amount,
        subtotal: amount,
        inputCGST: 0,
        inputSGST: 0,
        inputIGST: 0,
        totalInputGST: 0,
        grossAmount: amount,
        netAmount: amount,
        paidAmount: amount,
        isAsset: true,
        assetType: "CURRENT_ASSET",
        items: {
          create: [
            {
              categoryId: advanceCategory.id,
              categoryNameSnapshot: advanceCategory.name,
              quantity: 1,
              unit: "Lump Sum",
              unitPrice: amount,
              taxableAmount: amount,
              gstRate: 0,
              cgstAmount: 0,
              sgstAmount: 0,
              igstAmount: 0,
              totalGST: 0,
              totalAmount: amount,
              isAsset: true,
            },
          ],
        },
      },
    });

    AccountingEngine.invalidateCache();
    return advance;
  }

  /**
   * Deduct an advance amount during payroll processing.
   * Decrements outstanding balance across oldest active advances for the employee.
   */
  static async deductAdvanceInPayroll(employeeId: string, deductionAmount: number) {
    if (deductionAmount <= 0) return;

    let remainingToDeduct = deductionAmount;
    const activeAdvances = await prisma.employeeAdvance.findMany({
      where: {
        employeeId,
        status: "ACTIVE",
      },
      orderBy: { advanceDate: "asc" },
    });

    for (const adv of activeAdvances) {
      if (remainingToDeduct <= 0) break;

      const currentBalance = adv.balanceAmount || (adv.amount - adv.repaidAmount);
      const deductFromThis = Math.min(currentBalance, remainingToDeduct);

      const newRepaid = (adv.repaidAmount || 0) + deductFromThis;
      const newBalance = Math.max(0, currentBalance - deductFromThis);
      const newStatus = newBalance <= 0.01 ? "REPAID" : "ACTIVE";

      await prisma.employeeAdvance.update({
        where: { id: adv.id },
        data: {
          repaidAmount: newRepaid,
          balanceAmount: newBalance,
          status: newStatus,
          notes: adv.notes
            ? `${adv.notes} | Deducted ₹${deductFromThis} via payroll`
            : `Deducted ₹${deductFromThis} via payroll`,
        },
      });

      remainingToDeduct -= deductFromThis;
    }

    AccountingEngine.invalidateCache();
  }

  /**
   * Record a manual cash / bank repayment against an advance.
   */
  static async recordAdvanceRepayment(
    advanceId: string,
    amount: number,
    notes?: string
  ) {
    const adv = await prisma.employeeAdvance.findUnique({
      where: { id: advanceId },
    });
    if (!adv) throw new Error("Advance not found.");

    const currentBalance = adv.balanceAmount || (adv.amount - adv.repaidAmount);
    const repayAmt = Math.min(currentBalance, Math.max(0, Number(amount)));
    const newRepaid = (adv.repaidAmount || 0) + repayAmt;
    const newBalance = Math.max(0, currentBalance - repayAmt);
    const newStatus = newBalance <= 0.01 ? "REPAID" : "ACTIVE";

    const updated = await prisma.employeeAdvance.update({
      where: { id: advanceId },
      data: {
        repaidAmount: newRepaid,
        balanceAmount: newBalance,
        status: newStatus,
        notes: notes ? `${adv.notes || ""} | Repayment: ${notes}` : adv.notes,
      },
      include: { employee: true },
    });

    AccountingEngine.invalidateCache();
    return updated;
  }
}
