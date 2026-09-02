import { prisma } from "@/lib/prisma";
import { PrismaClient, FinancialTransactionType, PaymentStatus } from "@prisma/client";

export class FinancialTransactionService {
  private static async generateTransactionNumber(tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TXN-${year}-`;
    
    const latestTxn = await tx.financialTransaction.findFirst({
      where: { transactionNumber: { startsWith: prefix } },
      orderBy: { transactionNumber: 'desc' },
    });

    if (!latestTxn) {
      return `${prefix}0001`;
    }

    const lastSequenceStr = latestTxn.transactionNumber.replace(prefix, "");
    const nextSequence = parseInt(lastSequenceStr, 10) + 1;
    return `${prefix}${nextSequence.toString().padStart(4, "0")}`;
  }

  static async createRevenueTransaction(tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">, data: {
    sourceId: string;
    transactionDate: Date;
    description: string;
    amount: number | any;
    taxableAmount: number | any;
    totalGST: number | any;
    tdsAmount: number | any;
    netAmount: number | any;
  }) {
    const existing = await tx.financialTransaction.findFirst({
      where: { sourceType: "TAX_INVOICE", sourceId: data.sourceId }
    });

    if (existing) {
      throw new Error("Revenue transaction already exists for this source.");
    }

    const transactionNumber = await this.generateTransactionNumber(tx);

    return await tx.financialTransaction.create({
      data: {
        transactionNumber,
        type: "REVENUE",
        sourceType: "TAX_INVOICE",
        sourceId: data.sourceId,
        transactionDate: data.transactionDate,
        description: data.description,
        amount: Number(data.amount),
        taxableAmount: Number(data.taxableAmount),
        totalGST: Number(data.totalGST),
        tdsAmount: Number(data.tdsAmount),
        netAmount: Number(data.netAmount),
        paymentStatus: "UNPAID",
      }
    });
  }

  static async createExpenseTransaction(tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">, data: {
    sourceId: string;
    transactionDate: Date;
    description: string;
    amount: number | any;
    taxableAmount: number | any;
    totalGST: number | any;
    tdsAmount: number | any;
    netAmount: number | any;
  }) {
    const existing = await tx.financialTransaction.findFirst({
      where: { sourceType: "EXPENSE", sourceId: data.sourceId }
    });

    if (existing) {
      throw new Error("Expense transaction already exists for this source.");
    }

    const transactionNumber = await this.generateTransactionNumber(tx);

    return await tx.financialTransaction.create({
      data: {
        transactionNumber,
        type: "EXPENSE",
        sourceType: "EXPENSE",
        sourceId: data.sourceId,
        transactionDate: data.transactionDate,
        description: data.description,
        amount: Number(data.amount),
        taxableAmount: Number(data.taxableAmount),
        totalGST: Number(data.totalGST),
        tdsAmount: Number(data.tdsAmount),
        netAmount: Number(data.netAmount),
        paymentStatus: "UNPAID",
      }
    });
  }

  static async deleteTransactionBySource(tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">, sourceType: string, sourceId: string) {
    return await tx.financialTransaction.deleteMany({
      where: { sourceType, sourceId }
    });
  }

  static async getTransactions(params?: { 
    search?: string; 
    type?: FinancialTransactionType; 
    paymentStatus?: PaymentStatus;
    fromDate?: string;
    toDate?: string;
  }) {
    const { search, type, paymentStatus, fromDate, toDate } = params || {};
    const where: any = {};

    if (type) where.type = type;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    
    if (fromDate || toDate) {
      where.transactionDate = {};
      if (fromDate) where.transactionDate.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        where.transactionDate.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { transactionNumber: { contains: search } },
        { description: { contains: search } },
      ];
    }

    return await prisma.financialTransaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
    });
  }

  static async getLedgerSummary() {
    const txns = await prisma.financialTransaction.findMany();
    
    const totalRevenue = txns.filter(t => t.type === "REVENUE").reduce((sum, t) => sum + Number(t.netAmount), 0);
    const totalExpenses = txns.filter(t => t.type === "EXPENSE").reduce((sum, t) => sum + Number(t.netAmount), 0);
    
    return {
      totalRevenue,
      totalExpenses,
      netOperatingResult: totalRevenue - totalExpenses,
    };
  }

  static async updatePaymentStatus(id: string, paymentStatus: PaymentStatus) {
    return await prisma.$transaction(async (tx) => {
      const txn = await tx.financialTransaction.update({
        where: { id },
        data: { paymentStatus }
      });

      if (txn.sourceType === "TAX_INVOICE") {
        const mappedStatus = paymentStatus === "UNPAID" ? "CONFIRMED" : paymentStatus;
        await tx.taxInvoice.update({
          where: { id: txn.sourceId },
          data: { status: mappedStatus as any }
        });
      } else if (txn.sourceType === "EXPENSE") {
        await tx.expense.update({
          where: { id: txn.sourceId },
          data: { paymentStatus }
        });
      }
      return txn;
    });
  }
}
