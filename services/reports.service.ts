import { prisma } from "@/lib/prisma";
import { AccountingEngine } from "./accounting-engine.service";

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
      include: {
        customer: true,
        payments: true,
        items: true,
      },
      orderBy: { invoiceDate: 'desc' }
    });

    let totalSales = 0;
    let totalTaxableAmount = 0;
    let totalGST = 0;
    let outstandingReceivables = 0;
    let totalCollected = 0;
    let totalTdsDeducted = 0;

    const enrichedInvoices = invoices.map(inv => {
      const gross = Number(inv.grossAmount || inv.netAmount || 0);
      const taxable = Number(inv.taxableAmount || 0);
      const gst = Number(inv.totalGST || 0);

      const paidSoFar = (inv.payments || []).reduce((sum, p) => sum + Number(p.paymentAmount || 0), 0);
      const tdsSoFar = (inv.payments || []).reduce((sum, p) => sum + (p.isTdsDeducted ? Number(p.tdsAmount || 0) : 0), 0);
      const bankSoFar = (inv.payments || []).reduce((sum, p) => sum + Number(p.bankReceipt || 0), 0);
      const balanceRemaining = Math.max(0, gross - paidSoFar);

      totalSales += taxable;
      totalTaxableAmount += taxable;
      totalGST += gst;
      outstandingReceivables += balanceRemaining;
      totalCollected += bankSoFar;
      totalTdsDeducted += tdsSoFar;

      return {
        ...inv,
        grossAmount: gross,
        taxableAmount: taxable,
        totalGST: gst,
        paidSoFar,
        tdsSoFar,
        bankSoFar,
        balanceRemaining,
      };
    });

    return {
      data: enrichedInvoices,
      summary: {
        totalSales: Math.round(totalSales * 100) / 100,
        numberOfInvoices: invoices.length,
        totalTaxableAmount: Math.round(totalTaxableAmount * 100) / 100,
        totalGST: Math.round(totalGST * 100) / 100,
        outstandingReceivables: Math.round(outstandingReceivables * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        totalTdsDeducted: Math.round(totalTdsDeducted * 100) / 100,
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
      include: { vendor: true, category: true, employee: true },
      orderBy: { expenseDate: 'desc' }
    });

    let totalExpenses = 0;
    let totalFixedAssets = 0;
    let totalInputGST = 0;
    let totalTDS = 0;
    let paidExpenses = 0;
    let unpaidExpenses = 0;

    for (const exp of expenses) {
      const taxable = Number(exp.taxableAmount || 0);
      const net = Number(exp.netAmount || exp.grossAmount || 0);
      const isAsset = Boolean(exp.isAsset);

      if (isAsset) {
        totalFixedAssets += taxable;
      } else {
        totalExpenses += taxable;
      }

      totalInputGST += Number(exp.totalInputGST || 0);
      totalTDS += Number(exp.tdsAmount || 0);

      const paid = Number(exp.paidAmount || (exp.paymentStatus === "PAID" ? net : 0));
      const unpaid = Math.max(0, net - paid);

      paidExpenses += paid;
      unpaidExpenses += unpaid;
    }

    return {
      data: expenses,
      summary: {
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalFixedAssets: Math.round(totalFixedAssets * 100) / 100,
        totalInputGST: Math.round(totalInputGST * 100) / 100,
        totalTDS: Math.round(totalTDS * 100) / 100,
        paidExpenses: Math.round(paidExpenses * 100) / 100,
        unpaidExpenses: Math.round(unpaidExpenses * 100) / 100,
        numberOfTransactions: expenses.length,
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
      totalTaxableValue += Number(inv.taxableAmount || 0);
      totalCGST += Number(inv.totalCGST || 0);
      totalSGST += Number(inv.totalSGST || 0);
      totalIGST += Number(inv.totalIGST || 0);
      totalOutputGST += Number(inv.totalGST || 0);
    }

    return {
      data: invoices,
      summary: {
        totalTaxableValue: Math.round(totalTaxableValue * 100) / 100,
        totalCGST: Math.round(totalCGST * 100) / 100,
        totalSGST: Math.round(totalSGST * 100) / 100,
        totalIGST: Math.round(totalIGST * 100) / 100,
        totalOutputGST: Math.round(totalOutputGST * 100) / 100
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
      totalTaxablePurchases += Number(exp.taxableAmount || 0);
      totalInputCGST += Number(exp.inputCGST || 0);
      totalInputSGST += Number(exp.inputSGST || 0);
      totalInputIGST += Number(exp.inputIGST || 0);
      totalInputGST += Number(exp.totalInputGST || 0);
    }

    return {
      data: expenses,
      summary: {
        totalTaxablePurchases: Math.round(totalTaxablePurchases * 100) / 100,
        totalInputCGST: Math.round(totalInputCGST * 100) / 100,
        totalInputSGST: Math.round(totalInputSGST * 100) / 100,
        totalInputIGST: Math.round(totalInputIGST * 100) / 100,
        totalInputGST: Math.round(totalInputGST * 100) / 100
      }
    };
  }

  static async getTdsReport(filters?: ReportDateFilter) {
    // 1. TDS Payable (we deducted from vendors)
    const { data: expenses } = await this.getExpenseReport(filters);
    const vendorTdsExpenses = expenses.filter(e => Number(e.tdsAmount || 0) > 0);

    let totalTdsPayable = 0;
    for (const exp of vendorTdsExpenses) {
      totalTdsPayable += Number(exp.tdsAmount || 0);
    }

    // 2. TDS Receivable (customers deducted from us)
    const { data: invoices } = await this.getSalesReport(filters);
    let totalTdsReceivable = 0;
    const customerTdsRecords: any[] = [];

    for (const inv of invoices) {
      for (const p of inv.payments || []) {
        if (p.isTdsDeducted && Number(p.tdsAmount || 0) > 0) {
          totalTdsReceivable += Number(p.tdsAmount);
          customerTdsRecords.push({
            id: p.id,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerNameSnapshot || inv.customer?.legalName,
            paymentDate: p.paymentDate,
            tdsRate: p.tdsRate,
            tdsAmount: p.tdsAmount,
            bankReceipt: p.bankReceipt,
          });
        }
      }
    }

    const vendorGross = vendorTdsExpenses.reduce((s, e) => s + Number(e.grossAmount || 0), 0);

    return {
      data: vendorTdsExpenses,
      tdsPayable: {
        records: vendorTdsExpenses,
        totalAmount: Math.round(totalTdsPayable * 100) / 100,
        totalGross: Math.round(vendorGross * 100) / 100,
      },
      tdsReceivable: {
        records: customerTdsRecords,
        totalAmount: Math.round(totalTdsReceivable * 100) / 100,
      },
      summary: {
        totalGrossAmount: Math.round(vendorGross * 100) / 100,
        totalTDSDeducted: Math.round(totalTdsPayable * 100) / 100,
        numberOfTransactions: vendorTdsExpenses.length,
        totalTdsPayable: Math.round(totalTdsPayable * 100) / 100,
        totalTdsReceivable: Math.round(totalTdsReceivable * 100) / 100,
      }
    };
  }

  static async getReceivablesReport(filters?: ReportDateFilter) {
    const { data: invoices } = await this.getSalesReport({ ...filters, paymentStatus: undefined });
    const now = new Date().getTime();

    // Only invoices with positive balance remaining
    const receivables = invoices
      .filter(inv => Number(inv.balanceRemaining || 0) > 0)
      .map(inv => {
        const invDate = new Date(inv.invoiceDate).getTime();
        const daysDiff = Math.max(0, Math.floor((now - invDate) / (1000 * 60 * 60 * 24)));

        let bucket = "CURRENT";
        if (daysDiff <= 30) bucket = "0_30";
        else if (daysDiff <= 60) bucket = "31_60";
        else if (daysDiff <= 90) bucket = "61_90";
        else bucket = "90_PLUS";

        return {
          ...inv,
          ageInDays: daysDiff,
          ageingBucket: bucket,
        };
      });

    let totalGrossInvoiced = 0;
    let totalReceived = 0;
    let outstandingAmount = 0;

    for (const inv of receivables) {
      totalGrossInvoiced += Number(inv.grossAmount || 0);
      totalReceived += Number(inv.paidSoFar || 0);
      outstandingAmount += Number(inv.balanceRemaining || 0);
    }

    return {
      data: receivables,
      summary: {
        totalGrossInvoiced: Math.round(totalGrossInvoiced * 100) / 100,
        totalReceivables: Math.round(totalGrossInvoiced * 100) / 100,
        totalReceived: Math.round(totalReceived * 100) / 100,
        paidAmount: Math.round(totalReceived * 100) / 100,
        outstandingAmount: Math.round(outstandingAmount * 100) / 100,
        numberOfUnpaidInvoices: receivables.length,
      }
    };
  }

  static async getPayablesReport(filters?: ReportDateFilter) {
    const { data: expenses } = await this.getExpenseReport({ ...filters, paymentStatus: undefined });
    const now = new Date().getTime();

    const payables = expenses
      .filter(exp => exp.paymentStatus !== "PAID" && exp.status !== "CANCELLED")
      .map(exp => {
        const net = Number(exp.netAmount || exp.grossAmount || 0);
        const paid = Number(exp.paidAmount || 0);
        const outstanding = Math.max(0, net - paid);

        const expDate = new Date(exp.expenseDate).getTime();
        const daysDiff = Math.max(0, Math.floor((now - expDate) / (1000 * 60 * 60 * 24)));

        let bucket = "CURRENT";
        if (daysDiff <= 30) bucket = "0_30";
        else if (daysDiff <= 60) bucket = "31_60";
        else if (daysDiff <= 90) bucket = "61_90";
        else bucket = "90_PLUS";

        return {
          ...exp,
          netAmount: net,
          paidAmount: paid,
          balanceOutstanding: outstanding,
          ageInDays: daysDiff,
          ageingBucket: bucket,
        };
      })
      .filter(p => p.balanceOutstanding > 0);

    let totalPayables = 0;
    let paidAmount = 0;
    let outstandingAmount = 0;

    for (const exp of payables) {
      totalPayables += exp.netAmount;
      paidAmount += exp.paidAmount;
      outstandingAmount += exp.balanceOutstanding;
    }

    return {
      data: payables,
      summary: {
        totalPayables: Math.round(totalPayables * 100) / 100,
        paidAmount: Math.round(paidAmount * 100) / 100,
        outstandingAmount: Math.round(outstandingAmount * 100) / 100,
        numberOfUnpaidExpenses: payables.length,
      }
    };
  }
}
