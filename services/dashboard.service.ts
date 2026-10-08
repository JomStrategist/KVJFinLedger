import { prisma } from "@/lib/prisma";
import { AccountingEngine } from "./accounting-engine.service";

export interface DateFilter {
  fromDate?: Date;
  toDate?: Date;
}

export class DashboardService {
  /**
   * Unified, 100% reconciled dashboard fetch backed by AccountingEngine
   */
  static async getUnifiedDashboardData(filters?: DateFilter) {
    const engineData = await AccountingEngine.getDashboardData({
      fromDate: filters?.fromDate,
      toDate: filters?.toDate,
    });

    const { pnl, bs, trends, taxPosition, kpis } = engineData;

    // Fetch active proformas (not converted, cancelled, or expired)
    let activeProformas: any[] = [];
    try {
      activeProformas = await prisma.proformaInvoice.findMany({
        where: {
          status: { notIn: ["CONVERTED", "CANCELLED", "EXPIRED", "REJECTED"] },
          ...(filters?.fromDate || filters?.toDate
            ? {
                invoiceDate: {
                  ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                  ...(filters.toDate ? { lte: filters.toDate } : {}),
                },
              }
            : {}),
        },
        select: {
          id: true,
          totalAmount: true,
          netAmount: true,
          grossAmount: true,
        },
      });
    } catch (e) {
      console.warn("Could not fetch active proformas:", e);
    }

    const activeProformaCount = activeProformas.length;
    const activeProformaValue = Math.round(
      activeProformas.reduce((sum, p) => sum + Number(p.totalAmount || p.netAmount || p.grossAmount || 0), 0) * 100
    ) / 100;

    // Revenue categories from P&L
    const revenueCategories = pnl.revenueFromOperations.map(r => ({
      category: r.name,
      amount: r.amount,
      group: "Revenue from Operations",
      percentage: pnl.totalRevenue > 0 ? Math.round((r.amount / pnl.totalRevenue) * 1000) / 10 : 0,
    }));

    // Expense categories from P&L
    const allExpensesList = [
      ...pnl.operatingExpenses,
      ...pnl.employeeCosts,
      ...pnl.depreciationAmortization,
      ...pnl.financeCosts,
      ...pnl.otherExpenses,
    ];

    const expenseCategories = allExpensesList.map(e => ({
      category: e.name,
      amount: e.amount,
      group: "Operating Expenses",
      percentage: pnl.totalExpenses > 0 ? Math.round((e.amount / pnl.totalExpenses) * 1000) / 10 : 0,
    }));

    // Top Customers by revenue
    let topCustomers: { customer: string; amount: number; percentage: number }[] = [];
    try {
      const invoices = await prisma.taxInvoice.findMany({
        where: {
          status: { in: ["CONFIRMED", "PAID", "PARTIALLY_PAID"] },
          ...(filters?.fromDate || filters?.toDate
            ? {
                invoiceDate: {
                  ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                  ...(filters.toDate ? { lte: filters.toDate } : {}),
                },
              }
            : {}),
        },
        select: {
          taxableAmount: true,
          customerNameSnapshot: true,
          customer: { select: { legalName: true } },
        },
      });

      const custMap: Record<string, number> = {};
      for (const inv of invoices) {
        const name = inv.customerNameSnapshot || inv.customer?.legalName || "Customer";
        custMap[name] = (custMap[name] || 0) + Number(inv.taxableAmount || 0);
      }

      topCustomers = Object.entries(custMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([customer, amount]) => ({
          customer,
          amount: Math.round(amount * 100) / 100,
          percentage: pnl.totalRevenue > 0 ? Math.round((amount / pnl.totalRevenue) * 1000) / 10 : 0,
        }));
    } catch (e) {
      console.warn("Could not compute top customers:", e);
    }

    // Top Expenses
    const topExpenses = [...allExpensesList]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(e => ({
        category: e.name,
        amount: e.amount,
        percentage: pnl.totalExpenses > 0 ? Math.round((e.amount / pnl.totalExpenses) * 1000) / 10 : 0,
      }));

    // Monthly Financial Summary
    const monthlySummary = trends.map(t => {
      const net = Math.round((t.revenue - t.expenses) * 100) / 100;
      const margin = t.revenue > 0 ? Math.round((net / t.revenue) * 1000) / 10 : 0;
      return {
        month: t.month,
        revenue: t.revenue,
        expenses: t.expenses,
        netResult: net,
        margin,
        operatingResult: net,
        profitMargin: margin,
      };
    });

    // Recent Transactions from recent vouchers
    const vouchers = await AccountingEngine.generateAllVouchers(filters);
    const recentTransactions = vouchers
      .slice(-6)
      .reverse()
      .map(v => ({
        id: v.id,
        date: v.date,
        transaction: v.narration || v.voucherNumber,
        category: v.voucherType,
        amount: v.totalDebit,
        type: (v.voucherType === "Sales" || v.voucherType === "Receipt"
          ? "REVENUE"
          : v.lines.some(l => l.accountGroup === "Fixed Assets")
            ? "ASSET"
            : "EXPENSE") as "REVENUE" | "EXPENSE" | "ASSET",
      }));

    // Insights
    const insights: string[] = [];
    if (kpis.totalRevenue === 0 && kpis.totalExpenses === 0) {
      insights.push("No accounting transactions recorded for the selected period.");
    } else {
      if (kpis.operatingResult > 0) {
        insights.push(`Operating profit of ₹${kpis.operatingResult.toLocaleString('en-IN')} achieved with a margin of ${kpis.profitMargin}%.`);
      } else if (kpis.operatingResult < 0) {
        insights.push(`Operating deficit of ₹${Math.abs(kpis.operatingResult).toLocaleString('en-IN')} for the selected period.`);
      }
      if (kpis.outstandingReceivables > 0) {
        insights.push(`Outstanding customer receivables stand at ₹${kpis.outstandingReceivables.toLocaleString('en-IN')}.`);
      }
      if (kpis.isBalanceSheetBalanced) {
        insights.push("Schedule III Balance Sheet is in 100% mathematical equilibrium (Total Assets = Total Equity & Liabilities).");
      }
    }

    return {
      isDbConnected: true,
      kpis: {
        totalRevenue: kpis.totalRevenue,
        totalExpenses: kpis.totalExpenses,
        operatingResult: kpis.operatingResult,
        profitMargin: kpis.profitMargin,
        outstandingReceivables: kpis.outstandingReceivables,
        outstandingPayables: kpis.outstandingPayables,
        netProfitAfterTax: kpis.netProfitAfterTax,
        cashAndBankBalance: kpis.cashAndBankBalance,
        activeProformaCount,
        activeProformaValue,
        isBalanceSheetBalanced: kpis.isBalanceSheetBalanced,
        isTrialBalanceBalanced: kpis.isTrialBalanceBalanced,
      },
      trends,
      monthlySummary,
      expenseCategories,
      revenueCategories,
      topCustomers,
      topExpenses,
      recentTransactions,
      insights,
      taxPosition,
      pnl,
      bs,
    };
  }

  // Backward-compatible helpers
  static async getDashboardKPIs(filters?: DateFilter) {
    const data = await this.getUnifiedDashboardData(filters);
    return data.kpis;
  }

  static async getRevenueVsExpenseTrend(filters?: DateFilter) {
    const data = await this.getUnifiedDashboardData(filters);
    return data.trends;
  }

  static async getExpenseByCategory(filters?: DateFilter) {
    const data = await this.getUnifiedDashboardData(filters);
    return data.expenseCategories;
  }

  static async getRevenueByCategory(filters?: DateFilter) {
    const data = await this.getUnifiedDashboardData(filters);
    return data.revenueCategories;
  }

  static async getRevenueByCustomer(filters?: DateFilter) {
    const data = await this.getUnifiedDashboardData(filters);
    return data.topCustomers;
  }

  static async getMonthlyFinancialSummary(filters?: DateFilter) {
    const data = await this.getUnifiedDashboardData(filters);
    return data.monthlySummary;
  }

  static async getTopExpenses(filters?: DateFilter) {
    const data = await this.getUnifiedDashboardData(filters);
    return data.topExpenses;
  }

  static async getFinancialInsights(filters?: DateFilter) {
    const data = await this.getUnifiedDashboardData(filters);
    return data.insights;
  }
}
