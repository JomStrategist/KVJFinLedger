import { prisma } from "@/lib/prisma";

export type RecordTdsDepositInput = {
  financialYear: string;
  quarter?: string;
  section?: string;
  challanNumber: string;
  bsrCode?: string;
  challanSerial?: string;
  depositDate?: string | Date;
  amountPaid: number;
  bankAccount?: string;
  notes?: string;
  expenseIds?: string[];
};

export class TdsDepositService {
  /**
   * Fetch all TDS deposits across all financial years
   */
  static async getAllTdsDeposits() {
    return await prisma.tdsDeposit.findMany({
      orderBy: { depositDate: "desc" },
    });
  }

  /**
   * Record a TDS Challan ITNS 281 deposit
   */
  static async recordTdsDeposit(data: RecordTdsDepositInput) {
    const depositDate = data.depositDate ? new Date(data.depositDate) : new Date();

    return await prisma.$transaction(async (tx) => {
      const deposit = await tx.tdsDeposit.create({
        data: {
          financialYear: data.financialYear,
          quarter: data.quarter || "Annual",
          section: data.section || "194J",
          challanNumber: data.challanNumber,
          bsrCode: data.bsrCode || null,
          challanSerial: data.challanSerial || null,
          depositDate,
          amountPaid: Number(data.amountPaid || 0),
          status: "PAID",
          bankAccount: data.bankAccount || "Primary Bank Account",
          notes: data.notes || null,
        },
      });

      // If specific expense IDs are given, or if marking all for FY:
      if (data.expenseIds && data.expenseIds.length > 0) {
        await tx.expense.updateMany({
          where: { id: { in: data.expenseIds } },
          data: {
            tdsPaymentStatus: "PAID",
            tdsPaidDate: depositDate,
            tdsChallanNumber: data.challanNumber,
          },
        });
      }

      return deposit;
    });
  }

  /**
   * Mark a single expense's TDS as paid
   */
  static async markExpenseTdsPaid(expenseId: string, challanNumber: string, paidDate?: string | Date) {
    const d = paidDate ? new Date(paidDate) : new Date();
    return await prisma.expense.update({
      where: { id: expenseId },
      data: {
        tdsPaymentStatus: "PAID",
        tdsPaidDate: d,
        tdsChallanNumber: challanNumber,
      },
    });
  }

  /**
   * Delete / Reopen a TDS deposit
   */
  static async deleteTdsDeposit(id: string) {
    return await prisma.tdsDeposit.delete({
      where: { id },
    });
  }
}
