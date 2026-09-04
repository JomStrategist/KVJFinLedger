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

    let isDbConnected = false;

    try {
      const [txnsRes, invoicesRes, expensesRes, activeProformasRes] = await Promise.allSettled([
        prisma.financialTransaction.findMany({
          where: txnWhere,
          select: {
            id: true,
            type: true,
            transactionDate: true,
            netAmount: true,
            paymentStatus: true
          },
          orderBy: { transactionDate: "asc" }
        }),
        prisma.taxInvoice.findMany({
          where: invoiceWhere,
          select: {
            id: true,
            status: true,
            invoiceDate: true,
            createdAt: true,
            netAmount: true,
            grossAmount: true,
            subtotal: true,
            totalGST: true,
            tdsAmount: true,
            customerNameSnapshot: true,
            customer: { select: { id: true, legalName: true } },
            payments: { select: { paymentAmount: true, tdsAmount: true } },
            items: {
              select: {
                categoryNameSnapshot: true,
                statementGroupSnapshot: true,
                taxableAmount: true,
                totalAmount: true,
                incomeCategory: { select: { name: true, statementGroup: true } }
              }
            }
          }
        }),
        prisma.expense.findMany({
          where: expenseWhere,
          select: {
            id: true,
            status: true,
            expenseDate: true,
            createdAt: true,
            netAmount: true,
            paymentStatus: true,
            totalInputGST: true,
            tdsAmount: true,
            vendor: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
            items: {
              select: {
                taxableAmount: true,
                totalAmount: true,
                totalGST: true,
                category: { select: { name: true } }
              }
            }
          },
          orderBy: { netAmount: "desc" }
        }),
        prisma.proformaInvoice.findMany({
          where: proformaWhere,
          select: {
            id: true,
            totalAmount: true,
            netAmount: true,
            grossAmount: true
          }
        })
      ]);

      txns = txnsRes.status === "fulfilled" ? (txnsRes.value as any[]) : [];
      invoices = invoicesRes.status === "fulfilled" ? (invoicesRes.value as any[]) : [];
      expenses = expensesRes.status === "fulfilled" ? (expensesRes.value as any[]) : [];
      activeProformas = activeProformasRes.status === "fulfilled" ? (activeProformasRes.value as any[]) : [];
      isDbConnected = txnsRes.status === "fulfilled" && invoicesRes.status === "fulfilled";
    } catch (error) {
      console.error("Dashboard database fetch error:", error);
    }

    // 1. KPIs
    const recordedExpenseTotal = expenses.reduce((sum: number, exp: any) => sum + Number(exp.netAmount || 0), 0);
    const txnExpenseTotal = txns.filter(t => t.type === "EXPENSE").reduce((sum: number, t: any) => sum + Number(t.netAmount || 0), 0);
    const totalExpenses = recordedExpenseTotal > 0 ? recordedExpenseTotal : txnExpenseTotal;

    const recordedRevenueTotal = invoices.reduce((sum: number, inv: any) => sum + Number(inv.netAmount || 0), 0);
    const txnRevenueTotal = txns.filter(t => t.type === "REVENUE").reduce((sum: number, t: any) => sum + Number(t.netAmount || 0), 0);
    const totalRevenue = txnRevenueTotal > 0 ? txnRevenueTotal : recordedRevenueTotal;

    let outstandingPayables = 0;
    const unpaidExpenses = expenses.filter(e => e.paymentStatus !== "PAID" && e.status !== "CANCELLED");
    if (unpaidExpenses.length > 0) {
      outstandingPayables = unpaidExpenses.reduce((sum, e) => sum + Number(e.netAmount || 0), 0);
    } else {
      outstandingPayables = txns.filter(t => t.type === "EXPENSE" && t.paymentStatus !== "PAID").reduce((sum, t) => sum + Number(t.netAmount || 0), 0);
    }

    // MA-008: Outstanding Receivables calculated dynamically from confirmed Tax Invoices
    let outstandingReceivables = 0;
    for (const inv of invoices) {
      if (inv.status === "CANCELLED" || inv.status === "PAID") continue;

      const invoiceTotal = Number(inv.netAmount || inv.grossAmount || (inv as any).totalAmount || 0);
      const paidAmount = (inv.payments || []).reduce((sum: number, p: any) => sum + Number(p.paymentAmount || 0), 0);

      const balanceRemaining = invoiceTotal - paidAmount;
      if (balanceRemaining > 0) {
        outstandingReceivables += balanceRemaining;
      }
    }

    const operatingResult = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (operatingResult / totalRevenue) * 100 : 0;

    const kpis = {
      totalRevenue,
      totalExpenses,
      operatingResult,
      profitMargin,
      outstandingReceivables,
      outstandingPayables,
      activeProformaCount: activeProformas.length,
      activeProformaValue: activeProformas.reduce((sum: number, p: any) => sum + Number(p.totalAmount || p.netAmount || p.grossAmount || 0), 0),
    };

    // 2. Revenue vs Expense Trends
    const monthlyData: Record<string, { month: string; revenue: number; expenses: number }> = {};
    for (const txn of txns) {
      const date = new Date(txn.transactionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = date.toLocaleString("en-US", { month: "short", year: "2-digit" });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthLabel, revenue: 0, expenses: 0 };
      }

      if (txn.type === "REVENUE") {
        monthlyData[monthKey].revenue += Number(txn.netAmount);
      } else {
        monthlyData[monthKey].expenses += Number(txn.netAmount);
      }
    }

    // Integrate direct invoices if no revenue txns
    if (txnRevenueTotal === 0) {
      for (const inv of invoices) {
        const date = new Date(inv.invoiceDate || inv.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const monthLabel = date.toLocaleString("en-US", { month: "short", year: "2-digit" });
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { month: monthLabel, revenue: 0, expenses: 0 };
        }
        monthlyData[monthKey].revenue += Number(inv.netAmount || 0);
      }
    }

    // Integrate direct expenses if no expense txns
    if (txnExpenseTotal === 0) {
      for (const exp of expenses) {
        const date = new Date(exp.expenseDate || exp.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const monthLabel = date.toLocaleString("en-US", { month: "short", year: "2-digit" });
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { month: monthLabel, revenue: 0, expenses: 0 };
        }
        monthlyData[monthKey].expenses += Number(exp.netAmount || 0);
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
      if (exp.items && exp.items.length > 0) {
        for (const item of exp.items) {
          const catName = item.category?.name || exp.category?.name || "Uncategorized";
          const amount = Number(item.totalAmount || item.taxableAmount || 0);
          if (!categoryMap[catName]) categoryMap[catName] = { category: catName, amount: 0 };
          categoryMap[catName].amount += amount;
          totalExpenseAmount += amount;
        }
      } else {
        const name = exp.category?.name || "Uncategorized";
        const net = Number(exp.netAmount);
        if (!categoryMap[name]) categoryMap[name] = { category: name, amount: 0 };
        categoryMap[name].amount += net;
        totalExpenseAmount += net;
      }
    }
    const expenseCategories = Object.values(categoryMap).map(c => ({
      ...c,
      percentage: totalExpenseAmount > 0 ? (c.amount / totalExpenseAmount) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);

    // 5. Revenue by Income Category & Group
    const revenueCategoryMap: Record<string, { category: string; group: string; amount: number }> = {};
    for (const inv of invoices) {
      if (inv.items && inv.items.length > 0) {
        for (const item of inv.items) {
          const catName = item.categoryNameSnapshot || item.incomeCategory?.name || "Service Revenue";
          const groupName = item.statementGroupSnapshot || item.incomeCategory?.statementGroup || "Revenue from Operations";
          const amount = Number(item.taxableAmount || item.totalAmount || 0);

          if (!revenueCategoryMap[catName]) {
            revenueCategoryMap[catName] = { category: catName, group: groupName, amount: 0 };
          }
          revenueCategoryMap[catName].amount += amount;
        }
      } else {
        const catName = "Service Revenue";
        const groupName = "Revenue from Operations";
        const net = Number(inv.netAmount || inv.subtotal || 0);
        if (!revenueCategoryMap[catName]) {
          revenueCategoryMap[catName] = { category: catName, group: groupName, amount: 0 };
        }
        revenueCategoryMap[catName].amount += net;
      }
    }
    const revenueCategories = Object.values(revenueCategoryMap).map(r => ({
      ...r,
      percentage: totalRevenue > 0 ? (r.amount / totalRevenue) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);

    // 6. Revenue by Top Customers
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
    const outputGST = invoices.reduce((sum: number, inv: any) => sum + Number(inv.totalGST || 0), 0);
    const inputGST = expenses.reduce((sum: number, exp: any) => {
      const parentInputGST = Number(exp.totalInputGST || 0);
      if (parentInputGST > 0) return sum + parentInputGST;
      const itemsGST = (exp.items || []).reduce((iSum: number, item: any) => iSum + Number(item.totalGST || 0), 0);
      return sum + itemsGST;
    }, 0);
    const netGST = outputGST - inputGST;
    const tdsReceivable = invoices.reduce((sum: number, inv: any) => {
      const paymentTds = (inv.payments || []).reduce((pSum: number, p: any) => pSum + Number(p.tdsAmount || 0), 0);
      return sum + (paymentTds > 0 ? paymentTds : Number(inv.tdsAmount || 0));
    }, 0);
    const tdsPayable = expenses.reduce((sum: number, exp: any) => sum + Number(exp.tdsAmount || 0), 0);

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
      revenueCategories,
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
