import { prisma } from "@/lib/prisma";

export type CreateCategoryInput = {
  name: string;
  description?: string | null;
  parentId?: string | null;
  hierarchyLevel?: number;
  financialType?: string;
  statementGroup?: string | null;
  isActive?: boolean;
};

export class ExpenseCategoryService {
  static async getExpenseCategories(params?: { search?: string; isActive?: boolean }) {
    const { search, isActive } = params || {};
    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    try {
      return await prisma.expenseCategory.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          parent: true,
          children: true,
          _count: {
            select: { expenses: true }
          }
        }
      });
    } catch (error) {
      console.warn("ExpenseCategoryService.getExpenseCategories error:", error);
      return [];
    }
  }

  static async getExpenseCategoryById(id: string) {
    try {
      return await prisma.expenseCategory.findUnique({
        where: { id },
        include: {
          parent: true,
          children: true
        }
      });
    } catch (error) {
      console.warn("ExpenseCategoryService.getExpenseCategoryById error:", error);
      return null;
    }
  }

  static async createExpenseCategory(data: CreateCategoryInput) {
    if (!data.name || data.name.trim() === "") {
      throw new Error("Category name is required.");
    }

    const existing = await prisma.expenseCategory.findUnique({
      where: { name: data.name.trim() }
    });

    if (existing) {
      throw new Error("Category name already exists.");
    }

    let level = data.hierarchyLevel || 1;
    if (data.parentId) {
      const parent = await prisma.expenseCategory.findUnique({ where: { id: data.parentId } });
      if (parent) {
        level = (parent.hierarchyLevel || 1) + 1;
      }
    }

    return await prisma.expenseCategory.create({
      data: {
        name: data.name.trim(),
        description: data.description,
        parentId: data.parentId || null,
        hierarchyLevel: level,
        financialType: data.financialType || "EXPENSE",
        statementGroup: data.statementGroup || "P&L — Operating Expense",
        isActive: data.isActive ?? true,
      }
    });
  }

  static async updateExpenseCategory(id: string, data: Partial<CreateCategoryInput>) {
    if (data.name !== undefined && data.name.trim() === "") {
      throw new Error("Category name cannot be empty.");
    }

    if (data.name) {
      const existing = await prisma.expenseCategory.findUnique({
        where: { name: data.name.trim() }
      });
      if (existing && existing.id !== id) {
        throw new Error("Another category with this name already exists.");
      }
    }

    let level = data.hierarchyLevel;
    if (data.parentId) {
      const parent = await prisma.expenseCategory.findUnique({ where: { id: data.parentId } });
      if (parent) {
        level = (parent.hierarchyLevel || 1) + 1;
      }
    }

    return await prisma.expenseCategory.update({
      where: { id },
      data: {
        ...data,
        name: data.name?.trim(),
        hierarchyLevel: level,
      },
    });
  }

  static async toggleExpenseCategoryStatus(id: string, isActive: boolean) {
    return await prisma.expenseCategory.update({
      where: { id },
      data: { isActive },
    });
  }

  static async seedDefaultCategories() {
    const defaults = [
      { name: "Office Rent", financialType: "EXPENSE", statementGroup: "P&L — Operating Expense" },
      { name: "Salaries & Wages", financialType: "EXPENSE", statementGroup: "P&L — Operating Expense" },
      { name: "Utilities", financialType: "EXPENSE", statementGroup: "P&L — Operating Expense" },
      { name: "Internet & Telephone", financialType: "EXPENSE", statementGroup: "P&L — Operating Expense" },
      { name: "Travel & Transportation", financialType: "EXPENSE", statementGroup: "P&L — Operating Expense" },
      { name: "Office Supplies", financialType: "EXPENSE", statementGroup: "P&L — Operating Expense" },
      { name: "Software & Subscriptions", financialType: "EXPENSE", statementGroup: "P&L — Operating Expense" },
      { name: "Marketing & Advertising", financialType: "EXPENSE", statementGroup: "P&L — Operating Expense" },
      { name: "Professional Fees", financialType: "EXPENSE", statementGroup: "P&L — Operating Expense" },
      { name: "Training Income", financialType: "INCOME", statementGroup: "P&L — Operating Revenue" },
      { name: "Consulting Income", financialType: "INCOME", statementGroup: "P&L — Operating Revenue" },
      { name: "Bank Charges", financialType: "EXPENSE", statementGroup: "P&L — Operating Expense" },
      { name: "Other Expenses", financialType: "EXPENSE", statementGroup: "P&L — Operating Expense" }
    ];

    let created = 0;
    for (const item of defaults) {
      const existing = await prisma.expenseCategory.findUnique({ where: { name: item.name } });
      if (!existing) {
        await prisma.expenseCategory.create({
          data: {
            name: item.name,
            financialType: item.financialType,
            statementGroup: item.statementGroup,
          }
        });
        created++;
      }
    }
    return created;
  }
}
