import { prisma } from "@/lib/prisma";
import { ExpenseService } from "./expense.service";
import { AccountingEngine } from "./accounting-engine.service";

export interface CreateRecurringInput {
  title: string;
  frequency: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | string;
  categoryId?: string | null;
  vendorId?: string | null;
  employeeId?: string | null;
  expectedAmount: number;
  startDate: Date | string;
  endDate?: Date | string | null;
  nextDueDate?: Date | string;
  billingCycle?: string | null;
  autoRemind?: boolean;
  notes?: string | null;
}

export class RecurringExpenseService {
  /**
   * Helper to compute next due date based on frequency
   */
  static calculateNextDate(currentDate: Date, frequency: string): Date {
    const d = new Date(currentDate);
    const f = frequency.toUpperCase();
    if (f === "WEEKLY") {
      d.setDate(d.getDate() + 7);
    } else if (f === "MONTHLY") {
      d.setMonth(d.getMonth() + 1);
    } else if (f === "QUARTERLY") {
      d.setMonth(d.getMonth() + 3);
    } else if (f === "ANNUALLY") {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    return d;
  }

  /**
   * Period string helper e.g. "2026-10" or "2026-W41"
   */
  static getPeriodKey(date: Date, frequency: string): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    if (frequency.toUpperCase() === "WEEKLY") {
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      return `${y}-W${weekNum}`;
    }
    if (frequency.toUpperCase() === "ANNUALLY") {
      return `${y}`;
    }
    return `${y}-${m}`;
  }

  static async getSchedules(params?: { isActive?: boolean; search?: string }) {
    const where: any = {};
    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { vendor: { name: { contains: params.search, mode: "insensitive" } } },
        { employee: { name: { contains: params.search, mode: "insensitive" } } },
        { category: { name: { contains: params.search, mode: "insensitive" } } },
      ];
    }

    try {
      return await prisma.recurringExpense.findMany({
        where,
        orderBy: { nextDueDate: "asc" },
        include: {
          category: true,
          vendor: true,
          employee: true,
        },
      });
    } catch (e) {
      console.warn("RecurringExpenseService.getSchedules fetch error:", e);
      return [];
    }
  }

  static async getDueItems(asOfDate: Date = new Date()) {
    try {
      const endOfDay = new Date(asOfDate);
      endOfDay.setHours(23, 59, 59, 999);

      return await prisma.recurringExpense.findMany({
        where: {
          isActive: true,
          nextDueDate: { lte: endOfDay },
          OR: [
            { endDate: null },
            { endDate: { gte: asOfDate } }
          ]
        },
        include: {
          category: true,
          vendor: true,
          employee: true,
        },
        orderBy: { nextDueDate: "asc" }
      });
    } catch (e) {
      console.warn("RecurringExpenseService.getDueItems error:", e);
      return [];
    }
  }

  static async createSchedule(data: CreateRecurringInput) {
    if (!data.title?.trim()) throw new Error("Recurring schedule title is required.");
    if (Number(data.expectedAmount) <= 0) throw new Error("Expected amount must be greater than zero.");

    const start = new Date(data.startDate);
    const nextDue = data.nextDueDate ? new Date(data.nextDueDate) : start;

    return await prisma.recurringExpense.create({
      data: {
        title: data.title.trim(),
        frequency: data.frequency || "MONTHLY",
        categoryId: data.categoryId || null,
        vendorId: data.vendorId || null,
        employeeId: data.employeeId || null,
        expectedAmount: Number(data.expectedAmount),
        startDate: start,
        endDate: data.endDate ? new Date(data.endDate) : null,
        nextDueDate: nextDue,
        billingCycle: data.billingCycle || `${data.frequency || "Monthly"} schedule`,
        autoRemind: data.autoRemind ?? true,
        isActive: true,
        notes: data.notes || null,
      },
      include: {
        category: true,
        vendor: true,
        employee: true,
      }
    });
  }

  static async updateSchedule(id: string, data: Partial<CreateRecurringInput>) {
    const current = await prisma.recurringExpense.findUnique({ where: { id } });
    if (!current) throw new Error("Recurring schedule not found.");

    return await prisma.recurringExpense.update({
      where: { id },
      data: {
        title: data.title ? data.title.trim() : undefined,
        frequency: data.frequency || undefined,
        categoryId: data.categoryId !== undefined ? (data.categoryId || null) : undefined,
        vendorId: data.vendorId !== undefined ? (data.vendorId || null) : undefined,
        employeeId: data.employeeId !== undefined ? (data.employeeId || null) : undefined,
        expectedAmount: data.expectedAmount !== undefined ? Number(data.expectedAmount) : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
        nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : undefined,
        billingCycle: data.billingCycle !== undefined ? data.billingCycle : undefined,
        autoRemind: data.autoRemind !== undefined ? data.autoRemind : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
      },
      include: {
        category: true,
        vendor: true,
        employee: true,
      }
    });
  }

  static async toggleSchedule(id: string, isActive: boolean) {
    return await prisma.recurringExpense.update({
      where: { id },
      data: { isActive },
    });
  }

  static async deleteSchedule(id: string) {
    return await prisma.recurringExpense.delete({ where: { id } });
  }

  /**
   * CONFIRM & GENERATE EXPENSE TRANSACTION FROM SCHEDULE
   * Critical rule: Idempotency protection prevents duplicate transaction generation
   * for the same schedule in the same period.
   */
  static async confirmAndGenerateExpense(
    scheduleId: string, 
    options?: {
      actualAmount?: number;
      expenseDate?: Date | string;
      billNumber?: string;
      notes?: string;
      paidBy?: "COMPANY" | "EMPLOYEE";
      paymentStatus?: "PAID" | "UNPAID" | "PARTIALLY_PAID";
      paidAmount?: number;
      bankAccountId?: string;
    }
  ) {
    const schedule = await prisma.recurringExpense.findUnique({
      where: { id: scheduleId },
      include: {
        category: true,
        vendor: true,
        employee: true,
      }
    });

    if (!schedule) throw new Error("Recurring schedule not found.");
    if (!schedule.isActive) throw new Error("Cannot generate expense from an inactive recurring schedule.");

    const expenseDate = options?.expenseDate ? new Date(options.expenseDate) : new Date(schedule.nextDueDate);
    const periodKey = this.getPeriodKey(expenseDate, schedule.frequency);

    // IDEMPOTENCY CHECK: Ensure no duplicate expense for this schedule & period
    if (schedule.lastGeneratedPeriod === periodKey) {
      // Check if an expense actually exists for this schedule in this period
      const existingExp = await prisma.expense.findFirst({
        where: {
          recurringScheduleId: schedule.id,
          expenseDate: {
            gte: new Date(expenseDate.getFullYear(), expenseDate.getMonth(), 1),
            lte: new Date(expenseDate.getFullYear(), expenseDate.getMonth() + 1, 0, 23, 59, 59),
          }
        }
      });
      if (existingExp) {
        throw new Error(
          `Expense for recurring schedule "${schedule.title}" has already been confirmed and booked for period ${periodKey} (${existingExp.expenseNumber}). Duplicate booking prevented.`
        );
      }
    }

    const amount = Number(options?.actualAmount ?? schedule.expectedAmount);
    if (amount <= 0) throw new Error("Transaction amount must be greater than zero.");

    // GST Determination from Category
    const gstRate = schedule.category?.isTaxApplicable ? Number(schedule.category?.defaultGstRate || 18) : 0;
    const taxableAmount = Math.round((amount / (1 + gstRate / 100)) * 100) / 100;
    const totalGst = Math.round((amount - taxableAmount) * 100) / 100;

    const vendorState = schedule.vendor?.state || "Kerala";
    const isInterstate = vendorState !== "Kerala" && vendorState !== "KL" && vendorState !== "32";
    const cgst = isInterstate ? 0 : totalGst / 2;
    const sgst = isInterstate ? 0 : totalGst / 2;
    const igst = isInterstate ? totalGst : 0;

    const paidBy = options?.paidBy || (schedule.employeeId ? "EMPLOYEE" : "COMPANY");
    const paymentStatus = options?.paymentStatus || "PAID";
    const paidAmount = paymentStatus === "PAID" ? amount : Number(options?.paidAmount || 0);

    // Create the actual expense transaction
    const expense = await ExpenseService.createExpense({
      expenseDate,
      description: `${schedule.title} (${periodKey})`,
      categoryId: schedule.categoryId || null,
      vendorId: schedule.vendorId || null,
      employeeId: schedule.employeeId || null,
      billNumber: options?.billNumber || null,
      notes: options?.notes || `Auto-confirmed from recurring schedule: ${schedule.title} [Period: ${periodKey}]`,
      paidBy,
      paymentStatus,
      paidAmount,
      balancePayable: Math.max(0, amount - paidAmount),
      taxableAmount,
      subtotal: taxableAmount,
      inputCGST: cgst,
      inputSGST: sgst,
      inputIGST: igst,
      totalInputGST: totalGst,
      tdsRate: 0,
      tdsAmount: 0,
      grossAmount: amount,
      netAmount: amount,
      isAsset: Boolean(schedule.category?.isCapitalAsset),
      isRecurring: true,
      recurringScheduleId: schedule.id,
      bankAccountId: options?.bankAccountId || null,
      items: [
        {
          categoryId: schedule.categoryId || null,
          description: schedule.title,
          quantity: 1,
          unit: "Month",
          unitPrice: taxableAmount,
          gstRate,
          taxableAmount,
          cgstRate: isInterstate ? 0 : gstRate / 2,
          cgstAmount: cgst,
          sgstRate: isInterstate ? 0 : gstRate / 2,
          sgstAmount: sgst,
          igstRate: isInterstate ? gstRate : 0,
          igstAmount: igst,
          totalGST: totalGst,
          totalAmount: amount,
          isAsset: Boolean(schedule.category?.isCapitalAsset),
        }
      ]
    });

    // Advance schedule next due date and mark period generated
    const nextDue = this.calculateNextDate(new Date(schedule.nextDueDate), schedule.frequency);
    await prisma.recurringExpense.update({
      where: { id: scheduleId },
      data: {
        lastGeneratedPeriod: periodKey,
        lastExpenseId: expense.id,
        nextDueDate: nextDue,
      }
    });

    AccountingEngine.invalidateCache();
    return expense;
  }
}
