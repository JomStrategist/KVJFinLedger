import { prisma } from "@/lib/prisma";

export interface DateFilter {
  fromDate?: Date;
  toDate?: Date;
}

export class DashboardService {
  private static getDateWhereClause(filters?: DateFilter) {
    const where: any = {};
    if (filters?.fromDate || filters?.toDate) {
      where.transactionDate = {};
      if (filters.fromDate) where.transactionDate.gte = filters.fromDate;
      if (filters.toDate) {
        const end = new Date(filters.toDate);
        end.setHours(23, 59, 59, 999);
        where.transactionDate.lte = end;
      }
    }
    return where;
  }

  private static getSourceDateWhereClause(dateField: string, filters?: DateFilter) {
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

  /**
   * Unified, high-performance dashboard fetch.
   * Executes queries in parallel via Promise.all and computes metrics dynamically.
   */
  static async getUnifiedDashboardData(filters?: DateFilter) {
    const txnWhere = this.getDateWhereClause(filters);
    const invoiceWhere = {
      status: { not: "CANCELLED" as const },
      ...this.getSourceDateWhereClause("invoiceDate", filters)
    };
    const expenseWhere = {
      status: { not: "CANCELLED" as const },
      ...this.getSourceDateWhereClause("expenseDate", filters)
    };
    const proformaWhere = {
      status: { notIn: ["CONVERTED" as const, "CANCELLED" as const, "EXPIRED" as const] },
      ...this.getSourceDateWhereClause("invoiceDate", filters)
    };

    let txns: any[] = [];
    let invoices: any[] = [];
    let expenses: any[] = [];
    let activeProformas: any[] = [];

    try {
      const [txnsRes, invoicesRes, expensesRes, activeProformasRes] = await Promise.allSettled([
        prisma.financialTransaction.findMany({
          where: txnWhere,
          orderBy: { transactionDate: "asc" }
        }),
        prisma.taxInvoice.findMany({
          where: invoiceWhere,
          include: { customer: true, payments: true }
        }),
        prisma.expense.findMany({
          where: expenseWhere,
          include: { category: true, vendor: true },
          orderBy: { netAmount: "desc" }
        }),
        prisma.proformaInvoice.findMany({
          where: proformaWhere,
        })
      ]);

      txns = txnsRes.status === "fulfilled" ? (txnsRes.value as any[]) : [];
      invoices = invoicesRes.status === "fulfilled" ? (invoicesRes.value as any[]) : [];
      expenses = expensesRes.status === "fulfilled" ? (expensesRes.value as any[]) : [];
      activeProformas = activeProformasRes.status === "fulfilled" ? (activeProformasRes.value as any[]) : [];
    } catch (error) {
      console.error("Dashboard database fetch error:", error);
    }

    const isDbConnected = txns.length > 0 || invoices.length > 0 || expenses.length > 0 || activeProformas.length > 0;

    // 1. KPIs
    let totalRevenue = 0;
    let totalExpenses = 0;
    let outstandingPayables = 0;

    for (const txn of txns) {
      const net = Number(txn.netAmount);
      if (txn.type === "REVENUE") {
        totalRevenue += net;
      } else if (txn.type === "EXPENSE") {
        totalExpenses += net;
        if (txn.paymentStatus !== "PAID") {
          outstandingPayables += net;
        }
      }
    }

    // MA-008: Outstanding Receivables calculated dynamically from confirmed Tax Invoices
    let outstandingReceivables = 0;
    for (const inv of invoices) {
      if (inv.status === "CANCELLED" || inv.status === "PAID") continue;

      const invoiceTotal = Number(inv.netAmount || inv.grossAmount || (inv as any).totalAmount || 0);
      const paidAmount = (inv.payments || []).reduce((sum, p) => sum + Number(p.paymentAmount || 0), 0);

      const balanceRemaining = invoiceTotal - paidAmount;
      if (balanceRemaining > 0) {
        outstandingReceivables += balanceRemaining;
      }
    }

    // MA-007: Active Proforma Count & Total Value (excludes CONVERTED / CANCELLED)
    const activeProformaCount = activeProformas.length;
    const activeProformaValue = activeProformas.reduce(
      (sum, p) => sum + Number(p.totalAmount || p.netAmount || p.grossAmount || 0),
      0
    );

    const operatingResult = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (operatingResult / totalRevenue) * 100 : 0;

    const kpis = {
      totalRevenue,
      totalExpenses,
      operatingResult,
      profitMargin,
      outstandingReceivables,
      outstandingPayables,
      activeProformaCount,
      activeProformaValue,
    };

    // 2. Trends (Monthly Revenue vs Expenses)
    const monthlyData: Record<string, { month: string; revenue: number; expenses: number }> = {};
    for (const txn of txns) {
      const date = new Date(txn.transactionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleString('default', { month: 'short', year: 'numeric' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthLabel, revenue: 0, expenses: 0 };
      }

      if (txn.type === "REVENUE") {
        monthlyData[monthKey].revenue += Number(txn.netAmount);
      } else {
        monthlyData[monthKey].expenses += Number(txn.netAmount);
      }
    }
    const trends = Object.values(monthlyData);

    // 3. Monthly Financial Summary Table
    const monthlySummary = trends.map(t => ({
      month: t.month,
      revenue: t.revenue,
      expenses: t.expenses,
      operatingResult: t.revenue - t.expenses,
      profitMargin: t.revenue > 0 ? ((t.revenue - t.expenses) / t.revenue) * 100 : 0
    })).reverse();

    // 4. Expense by Category
    const categoryMap: Record<string, { category: string; amount: number }> = {};
    let totalExpenseAmount = 0;
    for (const exp of expenses) {
      const name = exp.category?.name || "Uncategorized/Multiple";
      const net = Number(exp.netAmount);
      if (!categoryMap[name]) categoryMap[name] = { category: name, amount: 0 };
      categoryMap[name].amount += net;
      totalExpenseAmount += net;
    }
    const expenseCategories = Object.values(categoryMap).map(c => ({
      ...c,
      percentage: totalExpenseAmount > 0 ? (c.amount / totalExpenseAmount) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);

    // 5. Revenue by Top Customers
    const customerMap: Record<string, { customer: string; amount: number }> = {};
    let totalInvoiceRevenue = 0;
    for (const inv of invoices) {
      const name = inv.customerNameSnapshot || inv.customer?.legalName || "Customer";
      const net = Number(inv.netAmount);
      if (!customerMap[name]) customerMap[name] = { customer: name, amount: 0 };
      customerMap[name].amount += net;
      totalInvoiceRevenue += net;
    }
    const topCustomers = Object.values(customerMap).map(c => ({
      ...c,
      percentage: totalInvoiceRevenue > 0 ? (c.amount / totalInvoiceRevenue) * 100 : 0
    })).sort((a, b) => b.amount - a.amount).slice(0, 5);

    // 6. Top 5 Expenses
    const topExpenses = expenses.slice(0, 5);

    // 7. Live Tax Position
    const outputGST = invoices.reduce((sum, inv) => sum + Number(inv.totalGST || 0), 0);
    const inputGST = expenses.reduce((sum, exp) => sum + Number(exp.totalInputGST || 0), 0);
    const netGST = outputGST - inputGST;
    const tdsReceivable = invoices.reduce((sum, inv) => {
      const paymentTds = (inv.payments || []).reduce((pSum, p) => pSum + Number(p.tdsAmount || 0), 0);
      return sum + (paymentTds > 0 ? paymentTds : Number(inv.tdsAmount || 0));
    }, 0);
    const tdsPayable = expenses.reduce((sum, exp) => sum + Number(exp.tdsAmount || 0), 0);

    // 8. Recent Transactions
    const recentTxnList: Array<{
      id: string;
      date: Date;
      transaction: string;
      category: string;
      amount: number;
      type: "REVENUE" | "EXPENSE" | "ASSET";
    }> = [];

    for (const inv of invoices) {
      recentTxnList.push({
        id: inv.id,
        date: new Date(inv.invoiceDate || inv.createdAt),
        transaction: `${inv.customerNameSnapshot || inv.customer?.legalName || "Customer"} — Tax Invoice`,
        category: "Income",
        amount: Number(inv.netAmount || inv.grossAmount),
        type: "REVENUE",
      });
    }

    for (const exp of expenses) {
      const isAsset = exp.category?.name?.toLowerCase().includes("asset") || false;
      recentTxnList.push({
        id: exp.id,
        date: new Date(exp.expenseDate || exp.createdAt),
        transaction: exp.notes || (exp.vendor?.name ? `${exp.vendor.name}` : "Business Expense"),
        category: exp.category?.name || "Operating Expense",
        amount: Number(exp.netAmount),
        type: isAsset ? "ASSET" : "EXPENSE",
      });
    }

    recentTxnList.sort((a, b) => b.date.getTime() - a.date.getTime());
    const recentTransactions = recentTxnList.slice(0, 6);

    // 9. Financial Insights
    const insights: string[] = [];
    if (kpis.totalRevenue === 0 && kpis.totalExpenses === 0) {
      insights.push("No financial transactions recorded for the selected period.");
    } else {
      if (kpis.operatingResult > 0) {
        insights.push("Operating result is positive for the selected period.");
      } else if (kpis.operatingResult < 0) {
        insights.push("Expenses exceed revenue for the selected period.");
      }
      if (kpis.totalRevenue > 0 && (kpis.outstandingReceivables / kpis.totalRevenue) > 0.3) {
        insights.push("Outstanding receivables represent over 30% of total recorded revenue.");
      }
      if (expenseCategories.length > 0 && expenseCategories[0].percentage > 40) {
        insights.push(`A significant portion of expenses (${expenseCategories[0].percentage.toFixed(1)}%) comes from ${expenseCategories[0].category}.`);
      }
    }

    return {
      isDbConnected,
      kpis,
      trends,
      monthlySummary,
      expenseCategories,
      topCustomers,
      topExpenses,
      recentTransactions,
      insights,
      taxPosition: {
        outputGST,
        inputGST,
        netGST,
        tdsReceivable,
        tdsPayable
      }
    };
  }

  // Legacy helper methods for backward compatibility
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
