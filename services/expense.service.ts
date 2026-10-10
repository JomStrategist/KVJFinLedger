import { prisma } from "@/lib/prisma";
import { PrismaClient, ExpenseStatus, PaymentStatus } from "@prisma/client";
import { FinancialTransactionService } from "./financial-transaction.service";
import { AccountingEngine } from "./accounting-engine.service";

export interface RecordExpensePaymentInput {
  amount: number;
  paymentDate: Date | string;
  bankAccountId: string;
  paymentMode?: string;
  referenceNumber?: string;
  notes?: string;
  isReimbursement?: boolean;
}

export class ExpenseService {
  private static async generateExpenseNumber(tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EXP-${year}-`;
    
    const latestExpense = await tx.expense.findFirst({
      where: { expenseNumber: { startsWith: prefix } },
      orderBy: { expenseNumber: 'desc' },
    });

    if (!latestExpense) {
      return `${prefix}0001`;
    }

    const lastSequenceStr = latestExpense.expenseNumber.replace(prefix, "");
    const nextSequence = parseInt(lastSequenceStr, 10) + 1;
    return `${prefix}${nextSequence.toString().padStart(4, "0")}`;
  }

  static getFinancialYear(date: Date = new Date()): string {
    const month = date.getMonth(); // 0-indexed (April is 3)
    const year = date.getFullYear();
    if (month >= 3) {
      return `FY ${year}–${(year + 1).toString().slice(-2)}`;
    } else {
      return `FY ${year - 1}–${year.toString().slice(-2)}`;
    }
  }

  static async getExpenses(params?: { 
    search?: string; 
    status?: ExpenseStatus; 
    paymentStatus?: PaymentStatus;
    categoryId?: string;
    vendorId?: string;
    employeeId?: string;
    paidBy?: "COMPANY" | "EMPLOYEE";
    isAsset?: boolean;
    financialYear?: string;
  }) {
    const { search, status, paymentStatus, categoryId, vendorId, employeeId, paidBy, isAsset, financialYear } = params || {};
    const where: any = {};

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (categoryId) where.categoryId = categoryId;
    if (vendorId) where.vendorId = vendorId;
    if (employeeId) where.employeeId = employeeId;
    if (paidBy) where.paidBy = paidBy;
    if (isAsset !== undefined) where.isAsset = isAsset;
    if (financialYear) where.financialYear = financialYear;

    if (search) {
      where.OR = [
        { expenseNumber: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { billNumber: { contains: search, mode: "insensitive" } },
        { vendor: { name: { contains: search, mode: "insensitive" } } },
        { employee: { name: { contains: search, mode: "insensitive" } } },
        { category: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    try {
      return await prisma.expense.findMany({
        where,
        orderBy: { expenseDate: "desc" },
        include: {
          vendor: true,
          category: true,
          employee: true,
          payments: {
            include: { bankAccount: true },
            orderBy: { paymentDate: "desc" },
          },
          items: {
            include: {
              category: true,
              product: true,
            }
          }
        }
      });
    } catch (error) {
      console.warn("ExpenseService.getExpenses DB fetch error:", error);
      return [];
    }
  }

  static async getExpenseById(id: string) {
    try {
      return await prisma.expense.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              category: true,
              vendor: true,
            }
          },
          vendor: true,
          category: true,
          employee: true,
          payments: {
            include: { bankAccount: true },
            orderBy: { paymentDate: "desc" },
          },
        },
      });
    } catch (error) {
      console.warn("ExpenseService.getExpenseById DB fetch error:", error);
      return null;
    }
  }

  static async getDashboardMetrics() {
    try {
      const expenses = await prisma.expense.findMany({
        where: { status: { not: "CANCELLED" } },
        include: {
          category: true,
          payments: true,
        }
      });

      let totalExpenses = 0;
      let operatingExpenses = 0;
      let employeeExpenses = 0;
      let capitalExpenditure = 0;
      let businessLosses = 0;
      let companyPaidExpenses = 0;
      let employeePaidExpenses = 0;
      let outstandingPayables = 0;
      let outstandingReimbursements = 0;

      for (const exp of expenses) {
        const net = Number(exp.netAmount || 0);
        const bal = Number(exp.balancePayable || 0);
        const catAny = exp.category as any;
        const isAsset = Boolean(exp.isAsset || catAny?.isCapitalAsset || catAny?.accountingClassification === "FIXED_ASSET");
        const isLoss = Boolean(exp.isLoss || catAny?.isLossCategory || catAny?.accountingClassification === "BUSINESS_LOSS");
        const isEmployee = Boolean(exp.employeeId || catAny?.accountingClassification === "EMPLOYEE_EXPENSE");

        if (isAsset) {
          capitalExpenditure += net;
        } else if (isLoss) {
          businessLosses += net;
          totalExpenses += net;
        } else if (isEmployee) {
          employeeExpenses += net;
          totalExpenses += net;
        } else {
          operatingExpenses += net;
          totalExpenses += net;
        }

        if (exp.paidBy === "COMPANY") {
          companyPaidExpenses += Number(exp.paidAmount || 0);
          outstandingPayables += bal;
        } else if (exp.paidBy === "EMPLOYEE") {
          employeePaidExpenses += net;
          outstandingReimbursements += bal;
        }
      }

      // Check recurring expenses due
      let recurringDueCount = 0;
      try {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        recurringDueCount = await prisma.recurringExpense.count({
          where: {
            isActive: true,
            nextDueDate: { lte: now }
          }
        });
      } catch (e) {
        // Safe fallback
      }

      return {
        totalCount: expenses.length,
        approvedCount: expenses.filter(e => e.status === "APPROVED").length,
        draftCount: expenses.filter(e => e.status === "DRAFT").length,
        unpaidCount: expenses.filter(e => e.paymentStatus === "UNPAID").length,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        operatingExpenses: Math.round(operatingExpenses * 100) / 100,
        employeeExpenses: Math.round(employeeExpenses * 100) / 100,
        capitalExpenditure: Math.round(capitalExpenditure * 100) / 100,
        businessLosses: Math.round(businessLosses * 100) / 100,
        companyPaidExpenses: Math.round(companyPaidExpenses * 100) / 100,
        employeePaidExpenses: Math.round(employeePaidExpenses * 100) / 100,
        outstandingPayables: Math.round(outstandingPayables * 100) / 100,
        outstandingReimbursements: Math.round(outstandingReimbursements * 100) / 100,
        recurringDueCount,
        totalValue: Math.round((totalExpenses + capitalExpenditure) * 100) / 100,
      };
    } catch (error) {
      console.warn("ExpenseService.getDashboardMetrics DB fetch error:", error);
      return {
        totalCount: 0,
        approvedCount: 0,
        draftCount: 0,
        unpaidCount: 0,
        totalExpenses: 0,
        operatingExpenses: 0,
        employeeExpenses: 0,
        capitalExpenditure: 0,
        businessLosses: 0,
        companyPaidExpenses: 0,
        employeePaidExpenses: 0,
        outstandingPayables: 0,
        outstandingReimbursements: 0,
        recurringDueCount: 0,
        totalValue: 0,
      };
    }
  }

  static async createExpense(data: any) {
    const res = await prisma.$transaction(async (tx) => {
      const expenseNumber = await this.generateExpenseNumber(tx);
      const expenseDate = new Date(data.expenseDate);
      const financialYear = data.financialYear || this.getFinancialYear(expenseDate);

      // Check category details if available
      let isCategoryAsset = false;
      let isCategoryLoss = false;
      if (data.categoryId) {
        const cat = await tx.expenseCategory.findUnique({ where: { id: data.categoryId } });
        if (cat) {
          const catAny = cat as any;
          if (catAny.isCapitalAsset || catAny.accountingClassification === "FIXED_ASSET") isCategoryAsset = true;
          if (catAny.isLossCategory || catAny.accountingClassification === "BUSINESS_LOSS") isCategoryLoss = true;
        }
      }

      const isAsset = Boolean(data.isAsset || isCategoryAsset || data.expenseTreatment === "Fixed Asset");
      const isLoss = Boolean(data.isLoss || isCategoryLoss || data.expenseTreatment === "Business Loss");

      const netAmount = Number(data.netAmount ?? data.grossAmount ?? (Number(data.taxableAmount || 0) + Number(data.totalGST || 0) - Number(data.tdsAmount || 0)));
      const paymentStatus = (data.paymentStatus || (data.paidBy === "EMPLOYEE" ? "UNPAID" : "PAID")) as PaymentStatus;
      let paidAmount = 0;
      if (paymentStatus === "PAID") {
        paidAmount = netAmount;
      } else if (paymentStatus === "PARTIALLY_PAID") {
        paidAmount = Math.min(netAmount, Math.max(0, Number(data.paidAmount || 0)));
      }
      const balancePayable = Math.max(0, netAmount - paidAmount);

      const items = Array.isArray(data.items) && data.items.length > 0 
        ? data.items 
        : [{
            categoryId: data.categoryId || null,
            description: data.description || "Expense Item",
            quantity: 1,
            unit: "Unit",
            unitPrice: Number(data.taxableAmount || data.grossAmount || netAmount),
            taxableAmount: Number(data.taxableAmount || data.grossAmount || netAmount),
            gstRate: Number(data.gstRate || 0),
            cgstRate: Number(data.cgstRate || 0),
            cgstAmount: Number(data.inputCGST || data.cgstAmount || 0),
            sgstRate: Number(data.sgstRate || 0),
            sgstAmount: Number(data.inputSGST || data.sgstAmount || 0),
            igstRate: Number(data.igstRate || 0),
            igstAmount: Number(data.inputIGST || data.igstAmount || 0),
            totalGST: Number(data.totalInputGST || data.totalGST || 0),
            tdsRate: Number(data.tdsRate || 0),
            tdsAmount: Number(data.tdsAmount || 0),
            isAsset,
            totalAmount: Number(data.grossAmount || netAmount),
          }];

      const expense = await tx.expense.create({
        data: {
          expenseNumber,
          expenseDate,
          financialYear,
          billNumber: data.billNumber || null,
          description: data.description || null,
          vendorId: data.vendorId || null,
          categoryId: data.categoryId || null,
          paidBy: data.paidBy || "COMPANY",
          employeeId: data.employeeId || null,
          bankAccountId: data.bankAccountId || null,
          status: data.status || "APPROVED",
          paymentStatus,
          paidAmount,
          balancePayable,

          subtotal: Number(data.subtotal ?? data.taxableAmount ?? 0),
          discountAmount: Number(data.discountAmount || 0),
          taxableAmount: Number(data.taxableAmount ?? data.subtotal ?? 0),

          inputCGST: Number(data.inputCGST ?? data.cgstAmount ?? 0),
          inputSGST: Number(data.inputSGST ?? data.sgstAmount ?? 0),
          inputIGST: Number(data.inputIGST ?? data.igstAmount ?? 0),
          totalInputGST: Number(data.totalInputGST ?? data.totalGST ?? 0),

          tdsRate: Number(data.tdsRate || 0),
          tdsAmount: Number(data.tdsAmount || 0),
          tdsPaymentStatus: data.tdsPaymentStatus || (Number(data.tdsAmount || 0) > 0 ? "UNPAID" : "NA"),
          tdsPaidDate: data.tdsPaidDate ? new Date(data.tdsPaidDate) : null,
          tdsChallanNumber: data.tdsChallanNumber || null,
          tdsSection: data.tdsSection || (Number(data.tdsRate) === 10 ? "194J" : Number(data.tdsRate) === 2 ? "194C" : "194J"),

          grossAmount: Number(data.grossAmount ?? data.taxableAmount ?? 0),
          netAmount,
          isAsset,
          assetType: data.assetType || null,
          depreciationRate: Number(data.depreciationRate || 0),
          isLoss,
          lossType: data.lossType || null,
          isRecurring: Boolean(data.isRecurring),
          recurringScheduleId: data.recurringScheduleId || null,
          notes: data.notes,

          items: {
            create: items.map((item: any) => ({
              productId: item.productId || null,
              hsnSacCode: item.hsnSacCode,
              vendorId: item.vendorId || null,
              categoryId: item.categoryId || null,
              date: item.date ? new Date(item.date) : null,
              quantity: Number(item.quantity || 1),
              unit: item.unit || "Unit",
              unitPrice: Number(item.unitPrice || 0),
              gstRate: Number(item.gstRate || 0),
              taxableAmount: Number(item.taxableAmount || 0),
              cgstRate: Number(item.cgstRate || 0),
              cgstAmount: Number(item.cgstAmount || 0),
              sgstRate: Number(item.sgstRate || 0),
              sgstAmount: Number(item.sgstAmount || 0),
              igstRate: Number(item.igstRate || 0),
              igstAmount: Number(item.igstAmount || 0),
              totalGST: Number(item.totalGST || 0),
              tdsRate: Number(item.tdsRate || 0),
              tdsAmount: Number(item.tdsAmount || 0),
              isAsset: Boolean(item.isAsset ?? isAsset),
              depreciationRate: Number(item.depreciationRate ?? data.depreciationRate ?? 0),
              totalAmount: Number(item.totalAmount || 0)
            }))
          }
        }
      });

      // If initial payment was made and bankAccountId provided, record the initial ExpensePayment
      if (paidAmount > 0 && data.bankAccountId) {
        await tx.expensePayment.create({
          data: {
            expenseId: expense.id,
            amount: paidAmount,
            paymentDate: expenseDate,
            bankAccountId: data.bankAccountId,
            paymentMode: data.paymentMode || (data.paidBy === "EMPLOYEE" ? "REIMBURSEMENT" : "BANK_TRANSFER"),
            referenceNumber: data.paymentReference || data.billNumber || null,
            notes: data.paymentNotes || (data.paidBy === "EMPLOYEE" ? "Initial employee reimbursement" : "Initial direct settlement"),
            isReimbursement: data.paidBy === "EMPLOYEE",
          }
        });
      }

      if (expense.status === "APPROVED") {
        await FinancialTransactionService.upsertExpenseTransaction(tx, {
          sourceId: expense.id,
          transactionDate: expense.expenseDate,
          description: expense.description || `Expense ${expense.expenseNumber}`,
          amount: expense.grossAmount,
          taxableAmount: expense.taxableAmount,
          totalGST: expense.totalInputGST,
          tdsAmount: expense.tdsAmount,
          netAmount: expense.netAmount,
          paymentStatus: expense.paymentStatus,
          paidAmount: expense.paidAmount || 0,
        });
      }

      return expense;
    });

    AccountingEngine.invalidateCache();
    return res;
  }

  static async updateExpense(id: string, data: any) {
    const current = await prisma.expense.findUnique({ 
      where: { id },
      include: { payments: true }
    });
    if (!current) throw new Error("Expense not found");
    if (current.status === "CANCELLED") throw new Error("Cannot edit a cancelled expense.");

    const res = await prisma.$transaction(async (tx) => {
      // Delete existing items
      await tx.expenseItem.deleteMany({ where: { expenseId: id } });

      const expenseDate = new Date(data.expenseDate || current.expenseDate);
      const financialYear = data.financialYear || current.financialYear || this.getFinancialYear(expenseDate);

      const netAmount = Number(data.netAmount ?? data.grossAmount ?? (Number(data.taxableAmount || 0) + Number(data.totalGST || 0) - Number(data.tdsAmount || 0)));
      
      // Calculate paidAmount considering existing payments
      const existingPaymentsTotal = current.payments.reduce((s, p) => s + Number(p.amount), 0);
      let paidAmount = existingPaymentsTotal;
      let paymentStatus = current.paymentStatus;

      if (existingPaymentsTotal === 0) {
        paymentStatus = (data.paymentStatus || current.paymentStatus || "UNPAID") as PaymentStatus;
        if (paymentStatus === "PAID") {
          paidAmount = netAmount;
        } else if (paymentStatus === "PARTIALLY_PAID") {
          paidAmount = Math.min(netAmount, Math.max(0, Number(data.paidAmount ?? current.paidAmount ?? 0)));
        }
      } else {
        paymentStatus = paidAmount >= netAmount ? "PAID" : paidAmount > 0 ? "PARTIALLY_PAID" : "UNPAID";
      }

      const balancePayable = Math.max(0, netAmount - paidAmount);

      const isAsset = Boolean(data.isAsset ?? current.isAsset);
      const isLoss = Boolean(data.isLoss ?? current.isLoss);

      const items = Array.isArray(data.items) && data.items.length > 0 
        ? data.items 
        : [{
            categoryId: data.categoryId || current.categoryId,
            description: data.description || current.description || "Expense Item",
            quantity: 1,
            unit: "Unit",
            unitPrice: Number(data.taxableAmount || data.grossAmount || netAmount),
            taxableAmount: Number(data.taxableAmount || data.grossAmount || netAmount),
            gstRate: Number(data.gstRate || 0),
            cgstRate: Number(data.cgstRate || 0),
            cgstAmount: Number(data.inputCGST || data.cgstAmount || 0),
            sgstRate: Number(data.sgstRate || 0),
            sgstAmount: Number(data.inputSGST || data.sgstAmount || 0),
            igstRate: Number(data.igstRate || 0),
            igstAmount: Number(data.inputIGST || data.igstAmount || 0),
            totalGST: Number(data.totalInputGST || data.totalGST || 0),
            tdsRate: Number(data.tdsRate || 0),
            tdsAmount: Number(data.tdsAmount || 0),
            isAsset,
            totalAmount: Number(data.grossAmount || netAmount),
          }];

      const updatedExpense = await tx.expense.update({
        where: { id },
        data: {
          expenseDate,
          financialYear,
          billNumber: data.billNumber !== undefined ? (data.billNumber || null) : current.billNumber,
          description: data.description !== undefined ? (data.description || null) : current.description,
          vendorId: data.vendorId !== undefined ? (data.vendorId || null) : current.vendorId,
          categoryId: data.categoryId !== undefined ? (data.categoryId || null) : current.categoryId,
          paidBy: data.paidBy || current.paidBy,
          employeeId: data.employeeId !== undefined ? (data.employeeId || null) : current.employeeId,
          bankAccountId: data.bankAccountId !== undefined ? (data.bankAccountId || null) : current.bankAccountId,
          paymentStatus,
          paidAmount,
          balancePayable,

          subtotal: Number(data.subtotal ?? data.taxableAmount ?? current.subtotal),
          discountAmount: Number(data.discountAmount ?? current.discountAmount ?? 0),
          taxableAmount: Number(data.taxableAmount ?? current.taxableAmount),

          inputCGST: Number(data.inputCGST ?? data.cgstAmount ?? current.inputCGST),
          inputSGST: Number(data.inputSGST ?? data.sgstAmount ?? current.inputSGST),
          inputIGST: Number(data.inputIGST ?? data.igstAmount ?? current.inputIGST),
          totalInputGST: Number(data.totalInputGST ?? data.totalGST ?? current.totalInputGST),

          tdsRate: Number(data.tdsRate ?? current.tdsRate),
          tdsAmount: Number(data.tdsAmount ?? current.tdsAmount),
          tdsPaymentStatus: data.tdsPaymentStatus || current.tdsPaymentStatus,
          tdsPaidDate: data.tdsPaidDate ? new Date(data.tdsPaidDate) : current.tdsPaidDate,
          tdsChallanNumber: data.tdsChallanNumber !== undefined ? data.tdsChallanNumber : current.tdsChallanNumber,
          tdsSection: data.tdsSection || current.tdsSection,

          grossAmount: Number(data.grossAmount ?? current.grossAmount),
          netAmount,
          isAsset,
          assetType: data.assetType || current.assetType,
          depreciationRate: Number(data.depreciationRate ?? current.depreciationRate),
          isLoss,
          lossType: data.lossType !== undefined ? data.lossType : current.lossType,
          notes: data.notes !== undefined ? data.notes : current.notes,

          items: {
            create: items.map((item: any) => ({
              productId: item.productId || null,
              hsnSacCode: item.hsnSacCode,
              vendorId: item.vendorId || null,
              categoryId: item.categoryId || null,
              date: item.date ? new Date(item.date) : null,
              quantity: Number(item.quantity || 1),
              unit: item.unit || "Unit",
              unitPrice: Number(item.unitPrice || 0),
              gstRate: Number(item.gstRate || 0),
              taxableAmount: Number(item.taxableAmount || 0),
              cgstRate: Number(item.cgstRate || 0),
              cgstAmount: Number(item.cgstAmount || 0),
              sgstRate: Number(item.sgstRate || 0),
              sgstAmount: Number(item.sgstAmount || 0),
              igstRate: Number(item.igstRate || 0),
              igstAmount: Number(item.igstAmount || 0),
              totalGST: Number(item.totalGST || 0),
              tdsRate: Number(item.tdsRate || 0),
              tdsAmount: Number(item.tdsAmount || 0),
              isAsset: Boolean(item.isAsset ?? isAsset),
              depreciationRate: Number(item.depreciationRate ?? 0),
              totalAmount: Number(item.totalAmount || 0)
            }))
          }
        }
      });

      if (updatedExpense.status === "APPROVED") {
        await FinancialTransactionService.upsertExpenseTransaction(tx, {
          sourceId: updatedExpense.id,
          transactionDate: updatedExpense.expenseDate,
          description: updatedExpense.description || `Expense ${updatedExpense.expenseNumber}`,
          amount: updatedExpense.grossAmount,
          taxableAmount: updatedExpense.taxableAmount,
          totalGST: updatedExpense.totalInputGST,
          tdsAmount: updatedExpense.tdsAmount,
          netAmount: updatedExpense.netAmount,
          paymentStatus: updatedExpense.paymentStatus,
          paidAmount: updatedExpense.paidAmount || 0,
        });
      }

      return updatedExpense;
    });

    AccountingEngine.invalidateCache();
    return res;
  }

  /**
   * RECORD PAYMENT OR REIMBURSEMENT AGAINST AN EXPENSE
   * Enforces business rules:
   * - Positive payment amount
   * - Amount cannot exceed remaining balance payable
   * - Accurate debit to Trade Payable / Employee Payable, credit to Bank Account
   * - Never creates duplicate P&L expense
   */
  static async recordExpensePayment(expenseId: string, data: RecordExpensePaymentInput) {
    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }

    if (!data.bankAccountId) {
      throw new Error("Please select a company bank account for payment disbursement.");
    }

    const current = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { payments: true }
    });

    if (!current) throw new Error("Expense not found.");
    if (current.status === "CANCELLED") throw new Error("Cannot record payment for a cancelled expense.");

    const remainingPayable = Number(current.balancePayable || 0);
    // Tolerance of ₹0.01 for floating point rounding
    if (amount > remainingPayable + 0.01) {
      throw new Error(`Payment amount (₹${amount.toLocaleString("en-IN")}) exceeds remaining balance payable (₹${remainingPayable.toLocaleString("en-IN")}).`);
    }

    const res = await prisma.$transaction(async (tx) => {
      // 1. Create payment record
      const payment = await tx.expensePayment.create({
        data: {
          expenseId,
          amount,
          paymentDate: new Date(data.paymentDate || new Date()),
          bankAccountId: data.bankAccountId,
          paymentMode: data.paymentMode || (current.paidBy === "EMPLOYEE" ? "REIMBURSEMENT" : "BANK_TRANSFER"),
          referenceNumber: data.referenceNumber || null,
          notes: data.notes || null,
          isReimbursement: Boolean(data.isReimbursement || current.paidBy === "EMPLOYEE"),
        },
        include: { bankAccount: true }
      });

      // 2. Recalculate paidAmount and balancePayable
      const allPayments = await tx.expensePayment.findMany({ where: { expenseId } });
      const newPaidAmount = allPayments.reduce((s, p) => s + Number(p.amount), 0);
      const netAmount = Number(current.netAmount);
      const newBalancePayable = Math.max(0, netAmount - newPaidAmount);
      const newPaymentStatus: PaymentStatus = newBalancePayable <= 0.01 ? "PAID" : "PARTIALLY_PAID";

      // 3. Update expense record
      const updatedExpense = await tx.expense.update({
        where: { id: expenseId },
        data: {
          paidAmount: Math.min(netAmount, newPaidAmount),
          balancePayable: newBalancePayable,
          paymentStatus: newPaymentStatus,
        }
      });

      // 4. Update FinancialTransaction ledger cache
      await FinancialTransactionService.upsertExpenseTransaction(tx, {
        sourceId: updatedExpense.id,
        transactionDate: updatedExpense.expenseDate,
        description: updatedExpense.description || `Expense ${updatedExpense.expenseNumber}`,
        amount: updatedExpense.grossAmount,
        taxableAmount: updatedExpense.taxableAmount,
        totalGST: updatedExpense.totalInputGST,
        tdsAmount: updatedExpense.tdsAmount,
        netAmount: updatedExpense.netAmount,
        paymentStatus: updatedExpense.paymentStatus,
        paidAmount: updatedExpense.paidAmount || 0,
      });

      return { payment, updatedExpense };
    });

    AccountingEngine.invalidateCache();
    return res;
  }

  static async getExpensePayments(expenseId: string) {
    try {
      return await prisma.expensePayment.findMany({
        where: { expenseId },
        include: { bankAccount: true },
        orderBy: { paymentDate: "desc" },
      });
    } catch (e) {
      console.warn("ExpenseService.getExpensePayments error:", e);
      return [];
    }
  }

  static async deleteExpensePayment(paymentId: string) {
    const payment = await prisma.expensePayment.findUnique({
      where: { id: paymentId },
      include: { expense: true }
    });

    if (!payment) throw new Error("Payment record not found.");

    const expenseId = payment.expenseId;

    const res = await prisma.$transaction(async (tx) => {
      await tx.expensePayment.delete({ where: { id: paymentId } });

      const allPayments = await tx.expensePayment.findMany({ where: { expenseId } });
      const newPaidAmount = allPayments.reduce((s, p) => s + Number(p.amount), 0);
      const netAmount = Number(payment.expense.netAmount);
      const newBalancePayable = Math.max(0, netAmount - newPaidAmount);
      const newPaymentStatus: PaymentStatus = newPaidAmount === 0 ? "UNPAID" : (newBalancePayable <= 0.01 ? "PAID" : "PARTIALLY_PAID");

      const updatedExpense = await tx.expense.update({
        where: { id: expenseId },
        data: {
          paidAmount: newPaidAmount,
          balancePayable: newBalancePayable,
          paymentStatus: newPaymentStatus,
        }
      });

      await FinancialTransactionService.upsertExpenseTransaction(tx, {
        sourceId: updatedExpense.id,
        transactionDate: updatedExpense.expenseDate,
        description: updatedExpense.description || `Expense ${updatedExpense.expenseNumber}`,
        amount: updatedExpense.grossAmount,
        taxableAmount: updatedExpense.taxableAmount,
        totalGST: updatedExpense.totalInputGST,
        tdsAmount: updatedExpense.tdsAmount,
        netAmount: updatedExpense.netAmount,
        paymentStatus: updatedExpense.paymentStatus,
        paidAmount: updatedExpense.paidAmount || 0,
      });

      return updatedExpense;
    });

    AccountingEngine.invalidateCache();
    return res;
  }

  static async approveExpense(id: string) {
    const current = await prisma.expense.findUnique({ where: { id } });
    if (!current) throw new Error("Expense not found");
    if (current.status !== "DRAFT") throw new Error("Only draft expenses can be approved.");

    const res = await prisma.$transaction(async (tx) => {
      const updatedExpense = await tx.expense.update({
        where: { id },
        data: { status: "APPROVED" }
      });

      await FinancialTransactionService.createExpenseTransaction(tx, {
        sourceId: updatedExpense.id,
        transactionDate: updatedExpense.expenseDate,
        description: `Expense ${updatedExpense.expenseNumber}`,
        amount: updatedExpense.grossAmount,
        taxableAmount: updatedExpense.taxableAmount,
        totalGST: updatedExpense.totalInputGST,
        tdsAmount: updatedExpense.tdsAmount,
        netAmount: updatedExpense.netAmount,
        paymentStatus: updatedExpense.paymentStatus,
        paidAmount: updatedExpense.paidAmount || 0,
      });

      return updatedExpense;
    });

    AccountingEngine.invalidateCache();
    return res;
  }

  static async cancelExpense(id: string, reason: string) {
    if (!reason || reason.trim() === "") throw new Error("Cancellation reason is required.");
    const current = await prisma.expense.findUnique({ 
      where: { id },
      include: { payments: true }
    });
    if (!current) throw new Error("Expense not found");
    if (current.status === "CANCELLED") throw new Error("Expense is already cancelled.");
    if (current.payments && current.payments.length > 0) {
      throw new Error("Cannot cancel an expense with recorded payments. Please remove or reverse payments first.");
    }
    if (current.paymentStatus === "PAID" && Number(current.paidAmount || 0) > 0) {
      throw new Error("Cannot cancel a paid expense.");
    }

    const res = await prisma.$transaction(async (tx) => {
      const updatedExpense = await tx.expense.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancellationReason: reason,
          cancelledAt: new Date(),
        }
      });

      await FinancialTransactionService.deleteTransactionBySource(tx, "EXPENSE", id);

      return updatedExpense;
    });

    AccountingEngine.invalidateCache();
    return res;
  }

  static async updatePaymentStatus(id: string, status: PaymentStatus, paidAmount?: number) {
    const current = await prisma.expense.findUnique({ where: { id } });
    if (!current) throw new Error("Expense not found");
    if (current.status === "CANCELLED") throw new Error("Cannot update payment status of a cancelled expense.");

    const netAmount = Number(current.netAmount);
    let resolvedPaidAmount = 0;
    if (status === "PAID") {
      resolvedPaidAmount = netAmount;
    } else if (status === "PARTIALLY_PAID") {
      resolvedPaidAmount = paidAmount !== undefined ? Math.min(netAmount, Math.max(0, Number(paidAmount))) : Number(current.paidAmount || 0);
    }
    const balancePayable = Math.max(0, netAmount - resolvedPaidAmount);

    const res = await prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id },
        data: { 
          paymentStatus: status,
          paidAmount: resolvedPaidAmount,
          balancePayable
        }
      });

      if (updated.status === "APPROVED") {
        await FinancialTransactionService.upsertExpenseTransaction(tx, {
          sourceId: updated.id,
          transactionDate: updated.expenseDate,
          description: updated.description || `Expense ${updated.expenseNumber}`,
          amount: updated.grossAmount,
          taxableAmount: updated.taxableAmount,
          totalGST: updated.totalInputGST,
          tdsAmount: updated.tdsAmount,
          netAmount: updated.netAmount,
          paymentStatus: updated.paymentStatus,
          paidAmount: updated.paidAmount || 0,
        });
      }

      return updated;
    });

    AccountingEngine.invalidateCache();
    return res;
  }

  static async deleteExpense(id: string) {
    const current = await prisma.expense.findUnique({ where: { id } });
    if (!current) throw new Error("Expense not found");

    const res = await prisma.$transaction(async (tx) => {
      await tx.assetDepreciation.deleteMany({ where: { expenseId: id } });
      await tx.assetDisposal.deleteMany({ where: { expenseId: id } });
      await tx.expensePayment.deleteMany({ where: { expenseId: id } });
      await tx.expenseItem.deleteMany({ where: { expenseId: id } });
      await FinancialTransactionService.deleteTransactionBySource(tx, "EXPENSE", id);
      return await tx.expense.delete({ where: { id } });
    });

    AccountingEngine.invalidateCache();
    return res;
  }
}
