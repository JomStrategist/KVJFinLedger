import { prisma } from "@/lib/prisma";


export interface ReportDateFilter {
  fromDate?: Date;
  toDate?: Date;
}

export class ReportsService {
  private static getSourceDateWhereClause(dateField: string, filters?: ReportDateFilter) {
    const where: any = {};
    if (filters?.fromDate || filters?.toDate) {
      where[dateField] = {};
      if (filters.fromDate) where[dateField].gte = filters.fromDate;
      if (filters.toDate) {
        const end = new Date(filters.toDate);
        end.setHours(23, 59, 59, 999);
        where[dateField].lte = end;
      }
    }
    return where;
  }

  static async getSalesReport(filters?: ReportDateFilter & { customerId?: string; paymentStatus?: string; search?: string }) {
    const where: any = {
      status: { in: ["CONFIRMED", "PAID", "PARTIALLY_PAID"] },
      ...this.getSourceDateWhereClause("invoiceDate", filters)
    };

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters?.paymentStatus) {
      where.status = filters.paymentStatus;
    }
    if (filters?.search) {
      where.OR = [
        { invoiceNumber: { contains: filters.search } },
        { customerNameSnapshot: { contains: filters.search } },
      ];
    }

    const invoices = await prisma.taxInvoice.findMany({
      where,
      include: { customer: true },
      orderBy: { invoiceDate: 'desc' }
    });

    let totalSales = 0;
    let totalTaxableAmount = 0;
    let totalGST = 0;
    let outstandingReceivables = 0;

    for (const inv of invoices) {
      totalSales += Number(inv.netAmount);
      totalTaxableAmount += Number(inv.taxableAmount);
      totalGST += Number(inv.totalGST);
      if (inv.status !== "PAID") {
        outstandingReceivables += Number(inv.netAmount); // Simplified logic
      }
    }

    return {
      data: invoices,
      summary: {
        totalSales,
        numberOfInvoices: invoices.length,
        totalTaxableAmount,
        totalGST,
        outstandingReceivables
      }
    };
  }

  static async getExpenseReport(filters?: ReportDateFilter & { vendorId?: string; categoryId?: string; paymentStatus?: string; search?: string }) {
    const where: any = {
      status: "APPROVED",
      ...this.getSourceDateWhereClause("expenseDate", filters)
    };

    if (filters?.vendorId) {
      where.vendorId = filters.vendorId;
    }
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters?.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }
    if (filters?.search) {
      where.OR = [
        { expenseNumber: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { vendor: true, category: true },
      orderBy: { expenseDate: 'desc' }
    });

    let totalExpenses = 0;
    let totalInputGST = 0;
    let totalTDS = 0;
    let paidExpenses = 0;
    let unpaidExpenses = 0;

    for (const exp of expenses) {
      const net = Number(exp.netAmount);
      totalExpenses += net;
      totalInputGST += Number(exp.totalInputGST);
      totalTDS += Number(exp.tdsAmount);
      
      if (exp.paymentStatus === "PAID") {
        paidExpenses += net;
      } else if (exp.paymentStatus === "PARTIALLY_PAID") {
        const paid = Number(exp.paidAmount || 0);
        paidExpenses += paid;
        unpaidExpenses += Math.max(0, net - paid);
      } else {
        unpaidExpenses += net;
      }
    }

    return {
      data: expenses,
      summary: {
        totalExpenses,
        totalInputGST,
        totalTDS,
        paidExpenses,
        unpaidExpenses
      }
    };
  }

  static async getGstOutwardSupplies(filters?: ReportDateFilter) {
    const { data: invoices } = await this.getSalesReport(filters);
    
    let totalTaxableValue = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalOutputGST = 0;

    for (const inv of invoices) {
      totalTaxableValue += Number(inv.taxableAmount);
      totalCGST += Number(inv.totalCGST);
      totalSGST += Number(inv.totalSGST);
      totalIGST += Number(inv.totalIGST);
      totalOutputGST += Number(inv.totalGST);
    }

    return {
      data: invoices,
      summary: {
        totalTaxableValue,
        totalCGST,
        totalSGST,
        totalIGST,
        totalOutputGST
      }
    };
  }

  static async getInputTaxCredit(filters?: ReportDateFilter) {
    const { data: expenses } = await this.getExpenseReport(filters);

    let totalTaxablePurchases = 0;
    let totalInputCGST = 0;
    let totalInputSGST = 0;
    let totalInputIGST = 0;
    let totalInputGST = 0;

    for (const exp of expenses) {
      totalTaxablePurchases += Number(exp.taxableAmount);
      totalInputCGST += Number(exp.inputCGST);
      totalInputSGST += Number(exp.inputSGST);
      totalInputIGST += Number(exp.inputIGST);
      totalInputGST += Number(exp.totalInputGST);
    }

    return {
      data: expenses,
      summary: {
        totalTaxablePurchases,
        totalInputCGST,
        totalInputSGST,
        totalInputIGST,
        totalInputGST
      }
    };
  }

  static async getTdsReport(filters?: ReportDateFilter) {
    const where: any = {
      status: "APPROVED",
      tdsAmount: { gt: 0 },
      ...this.getSourceDateWhereClause("expenseDate", filters)
    };

    const expenses = await prisma.expense.findMany({
      where,
      include: { vendor: true },
      orderBy: { expenseDate: 'desc' }
    });

    let totalGrossAmount = 0;
    let totalTDSDeducted = 0;

    for (const exp of expenses) {
      totalGrossAmount += Number(exp.grossAmount);
      totalTDSDeducted += Number(exp.tdsAmount);
    }

    return {
      data: expenses,
      summary: {
        totalGrossAmount,
        totalTDSDeducted,
        numberOfTransactions: expenses.length
      }
    };
  }

  static async getReceivablesReport(filters?: ReportDateFilter) {
    const { data: invoices } = await this.getSalesReport({ ...filters, paymentStatus: undefined });
    // Filter out PAID
    const receivables = invoices.filter(inv => inv.status !== "PAID");

    let totalReceivables = 0;
    let outstandingAmount = 0;

    for (const inv of receivables) {
      const net = Number(inv.netAmount);
      totalReceivables += net;
      outstandingAmount += net;
    }

    return {
      data: receivables,
      summary: {
        totalReceivables,
        paidAmount: 0, // Simplified without tracking partial sums properly
        outstandingAmount,
        numberOfUnpaidInvoices: receivables.length
      }
    };
  }

  static async getPayablesReport(filters?: ReportDateFilter) {
    const { data: expenses } = await this.getExpenseReport({ ...filters, paymentStatus: undefined });
    const payables = expenses.filter(exp => exp.paymentStatus !== "PAID" && exp.status !== "CANCELLED");

    let totalPayables = 0;
    let paidAmount = 0;
    let outstandingAmount = 0;

    for (const exp of payables) {
      const net = Number(exp.netAmount);
      const paid = exp.paymentStatus === "PARTIALLY_PAID" ? Number(exp.paidAmount || 0) : 0;
      const outstanding = Math.max(0, net - paid);
      totalPayables += net;
      paidAmount += paid;
      outstandingAmount += outstanding;
    }

    return {
      data: payables,
      summary: {
        totalPayables,
        paidAmount,
        outstandingAmount,
        numberOfUnpaidExpenses: payables.length
      }
    };
  }
}
