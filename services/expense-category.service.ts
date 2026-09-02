import { prisma } from "@/lib/prisma";
import { ChartOfAccountsService } from "./chart-of-accounts.service";

export type CreateCategoryInput = {
  name: string;
  code?: string | null;
  description?: string | null;
  parentId?: string | null;
  hierarchyLevel?: number;
  financialType?: "INCOME" | "EXPENSE" | "ASSET" | "LIABILITY" | "EQUITY" | string;
  financialStatement?: string | null;
  statementGroup?: string | null;
  accountNature?: string | null;
  normalBalance?: string | null;
  isActive?: boolean;
};

export function deriveFinancialStatement(financialType: string): string {
  const type = (financialType || "EXPENSE").toUpperCase();
  if (type === "INCOME" || type === "EXPENSE") {
    return "Profit & Loss";
  }
  return "Balance Sheet";
}

export function deriveNormalBalance(financialType: string): string {
  const type = (financialType || "EXPENSE").toUpperCase();
  if (type === "ASSET" || type === "EXPENSE") {
    return "Debit";
  }
  return "Credit";
}

export class ExpenseCategoryService {
  static async getExpenseCategories(params?: { search?: string; isActive?: boolean; financialType?: string }) {
    const { search, isActive, financialType } = params || {};
    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (financialType) {
      where.financialType = financialType.toUpperCase();
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { statementGroup: { contains: search, mode: "insensitive" } },
      ];
    }

    try {
      let cats = await prisma.expenseCategory.findMany({
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

      if (cats.length === 0 && !search && !financialType) {
        await ExpenseCategoryService.seedDefaultCategories();
        cats = await prisma.expenseCategory.findMany({
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
      }

      return cats;
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
    const name = data.name?.trim();
    if (!name) {
      throw new Error("Category name is required.");
    }

    const finTypeCode = (data.financialType || "EXPENSE").toUpperCase();
    
    // 1. Verify Financial Type exists in MongoDB
    const dbType = await prisma.financialType.findUnique({
      where: { code: finTypeCode }
    });
    if (!dbType) {
      throw new Error(`Financial Type "${finTypeCode}" is invalid or does not exist in database.`);
    }

    // 2. Verify Statement Group belongs to selected Financial Type
    let dbGroup = null;
    if (data.statementGroup) {
      dbGroup = await prisma.financialStatementGroup.findFirst({
        where: {
          financialTypeId: dbType.id,
          name: { equals: data.statementGroup.trim(), mode: "insensitive" }
        }
      });
      if (!dbGroup) {
        throw new Error(
          `Invalid Statement Group "${data.statementGroup}" for Financial Type "${dbType.name}". Statement group must belong to ${dbType.name}.`
        );
      }
    }

    // 3. Verify Account Nature belongs to selected Financial Type
    let dbNature = null;
    if (data.accountNature) {
      dbNature = await prisma.accountNature.findFirst({
        where: {
          financialTypeId: dbType.id,
          name: { equals: data.accountNature.trim(), mode: "insensitive" }
        }
      });
      if (!dbNature) {
        throw new Error(
          `Invalid Account Nature "${data.accountNature}" for Financial Type "${dbType.name}". Account nature must belong to ${dbType.name}.`
        );
      }
    }

    // 4. Verify Parent Category compatibility
    let level = data.hierarchyLevel || 1;
    if (data.parentId) {
      const parent = await prisma.expenseCategory.findUnique({ where: { id: data.parentId } });
      if (parent) {
        if (parent.financialType.toUpperCase() !== finTypeCode) {
          throw new Error(
            `Parent category "${parent.name}" (${parent.financialType}) is incompatible with financial type "${finTypeCode}".`
          );
        }
        level = (parent.hierarchyLevel || 1) + 1;
      }
    }

    let code = data.code?.trim();
    if (!code) {
      const prefixMap: Record<string, string> = {
        EXPENSE: "EXP",
        INCOME: "INC",
        ASSET: "AST",
        LIABILITY: "LIAB",
        EQUITY: "EQ",
      };
      const prefix = prefixMap[finTypeCode] || "CAT";
      const cleaned = name.replace(/[^a-zA-Z0-9\s]/g, "").trim();
      const words = cleaned.split(/\s+/).filter(Boolean);
      let abbr = "";
      if (words.length >= 2) {
        abbr = words.map((w) => w[0]).join("").slice(0, 4).toUpperCase();
      } else if (words.length === 1) {
        abbr = words[0].slice(0, 3).toUpperCase();
      }
      abbr = abbr || "GEN";

      let seq = 1;
      let candidate = `${prefix}-${abbr}-${String(seq).padStart(3, "0")}`;
      while (await prisma.expenseCategory.findUnique({ where: { code: candidate } })) {
        seq++;
        candidate = `${prefix}-${abbr}-${String(seq).padStart(3, "0")}`;
      }
      code = candidate;
    }

    const existingName = await prisma.expenseCategory.findUnique({
      where: { name }
    });
    if (existingName) {
      throw new Error(`Category name "${name}" already exists.`);
    }

    const existingCode = await prisma.expenseCategory.findUnique({
      where: { code }
    });
    if (existingCode) {
      throw new Error(`Category code "${code}" already exists.`);
    }

    return await prisma.expenseCategory.create({
      data: {
        name,
        code,
        description: data.description || null,
        parentId: data.parentId || null,
        hierarchyLevel: level,
        financialTypeId: dbType.id,
        financialType: dbType.code,
        statementGroupId: dbGroup?.id || null,
        statementGroup: dbGroup?.name || data.statementGroup || null,
        accountNatureId: dbNature?.id || null,
        accountNature: dbNature?.name || data.accountNature || null,
        financialStatement: dbType.financialStatement,
        normalBalance: dbType.normalBalance,
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
        throw new Error(`Another category with name "${data.name.trim()}" already exists.`);
      }
    }

    if (data.code) {
      const existingCode = await prisma.expenseCategory.findUnique({
        where: { code: data.code.trim() }
      });
      if (existingCode && existingCode.id !== id) {
        throw new Error(`Another category with code "${data.code.trim()}" already exists.`);
      }
    }

    if (data.parentId && data.parentId === id) {
      throw new Error("A category cannot be its own parent.");
    }

    let level = data.hierarchyLevel;
    if (data.parentId) {
      const parent = await prisma.expenseCategory.findUnique({ where: { id: data.parentId } });
      if (parent) {
        level = (parent.hierarchyLevel || 1) + 1;
      }
    }

    const current = await prisma.expenseCategory.findUnique({ where: { id } });
    const finType = (data.financialType || current?.financialType || "EXPENSE").toUpperCase();
    const statement = deriveFinancialStatement(finType);
    const balance = data.normalBalance || deriveNormalBalance(finType);

    return await prisma.expenseCategory.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        code: data.code ? data.code.trim() : undefined,
        description: data.description !== undefined ? data.description : undefined,
        parentId: data.parentId !== undefined ? (data.parentId || null) : undefined,
        hierarchyLevel: level,
        financialType: finType,
        financialStatement: statement,
        statementGroup: data.statementGroup || current?.statementGroup,
        accountNature: data.accountNature || current?.accountNature,
        normalBalance: balance,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
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
    await ChartOfAccountsService.seedAccountingMasters();

    const types = await prisma.financialType.findMany();
    const statementGroups = await prisma.financialStatementGroup.findMany();
    const accountNatures = await prisma.accountNature.findMany();

    const typeMap = new Map(types.map((t) => [t.code, t]));

    const defaults = [
      // INCOME
      { name: "Revenue from Services", code: "INC-REV-001", financialType: "INCOME", statementGroup: "Revenue from Operations", accountNature: "Operating Income" },
      { name: "Other Income", code: "INC-OTH-001", financialType: "INCOME", statementGroup: "Other Income", accountNature: "Other Income" },
      { name: "Interest Income", code: "INC-INT-001", financialType: "INCOME", statementGroup: "Other Income", accountNature: "Other Income" },

      // EXPENSES
      { name: "Printing", code: "EXP-PRT-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense" },
      { name: "Designing", code: "EXP-DES-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense" },
      { name: "Office Supplies", code: "EXP-OFF-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense" },
      { name: "Stationery", code: "EXP-STN-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense" },
      { name: "Cleaning & Maintenance", code: "EXP-CLN-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense" },
      { name: "Rent", code: "EXP-RNT-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense" },
      { name: "Electricity", code: "EXP-ELE-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense" },
      { name: "Internet & Telephone", code: "EXP-COMM-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense" },
      { name: "Software & Subscriptions", code: "EXP-SW-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense" },
      { name: "Professional & Consultancy", code: "EXP-PRF-001", financialType: "EXPENSE", statementGroup: "Professional & Consultancy", accountNature: "Operating Expense" },
      { name: "Travel", code: "EXP-TRV-001", financialType: "EXPENSE", statementGroup: "Selling & Marketing Expenses", accountNature: "Operating Expense" },
      { name: "Staff Welfare", code: "EXP-STF-001", financialType: "EXPENSE", statementGroup: "Employee Costs", accountNature: "Operating Expense" },
      { name: "Advertising & Marketing", code: "EXP-MKT-001", financialType: "EXPENSE", statementGroup: "Selling & Marketing Expenses", accountNature: "Operating Expense" },
      { name: "Bank Charges", code: "EXP-BNK-001", financialType: "EXPENSE", statementGroup: "Finance Costs", accountNature: "Finance Cost" },
      { name: "Insurance", code: "EXP-INS-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense" },
      { name: "Repairs & Maintenance", code: "EXP-RPM-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense" },
      { name: "Other Operating Expenses", code: "EXP-OTH-001", financialType: "EXPENSE", statementGroup: "Other Expenses", accountNature: "Other Expense" },

      // ASSETS
      { name: "Computer Equipment", code: "AST-CMP-001", financialType: "ASSET", statementGroup: "Fixed Assets", accountNature: "Fixed Asset" },
      { name: "Furniture & Fixtures", code: "AST-FUR-001", financialType: "ASSET", statementGroup: "Fixed Assets", accountNature: "Fixed Asset" },
      { name: "Office Equipment", code: "AST-OEQ-001", financialType: "ASSET", statementGroup: "Fixed Assets", accountNature: "Fixed Asset" },
      { name: "Other Fixed Assets", code: "AST-OFX-001", financialType: "ASSET", statementGroup: "Fixed Assets", accountNature: "Fixed Asset" },
      { name: "Trade Receivables", code: "AST-REC-001", financialType: "ASSET", statementGroup: "Trade Receivables", accountNature: "Trade Receivable" },
      { name: "Other Current Assets", code: "AST-OCA-001", financialType: "ASSET", statementGroup: "Other Current Assets", accountNature: "Current Asset" },

      // LIABILITIES
      { name: "Trade Payables", code: "LIAB-PAY-001", financialType: "LIABILITY", statementGroup: "Trade Payables", accountNature: "Trade Payable" },
      { name: "GST Payable", code: "LIAB-GST-001", financialType: "LIABILITY", statementGroup: "Statutory Liabilities", accountNature: "Statutory Liability" },
      { name: "TDS Payable", code: "LIAB-TDS-001", financialType: "LIABILITY", statementGroup: "Statutory Liabilities", accountNature: "Statutory Liability" },
      { name: "Other Statutory Payables", code: "LIAB-OST-001", financialType: "LIABILITY", statementGroup: "Statutory Liabilities", accountNature: "Statutory Liability" },
      { name: "Other Current Liabilities", code: "LIAB-OCL-001", financialType: "LIABILITY", statementGroup: "Other Current Liabilities", accountNature: "Current Liability" },
      { name: "Loans & Borrowings", code: "LIAB-LON-001", financialType: "LIABILITY", statementGroup: "Borrowings", accountNature: "Borrowing" },

      // EQUITY
      { name: "Owner Capital", code: "EQ-CAP-001", financialType: "EQUITY", statementGroup: "Capital", accountNature: "Capital" },
      { name: "Retained Earnings", code: "EQ-RET-001", financialType: "EQUITY", statementGroup: "Retained Earnings", accountNature: "Retained Earnings" },
      { name: "Reserves", code: "EQ-RES-001", financialType: "EQUITY", statementGroup: "Reserves", accountNature: "Reserve" },
    ];

    let created = 0;
    for (const item of defaults) {
      const existing = await prisma.expenseCategory.findFirst({
        where: { OR: [{ name: item.name }, { code: item.code }] }
      });

      if (!existing) {
        const ft = typeMap.get(item.financialType);
        const groupObj = statementGroups.find(
          (g) => g.financialTypeId === ft?.id && g.name.toLowerCase() === item.statementGroup.toLowerCase()
        );
        const natureObj = accountNatures.find(
          (n) => n.financialTypeId === ft?.id && n.name.toLowerCase() === item.accountNature.toLowerCase()
        );

        await prisma.expenseCategory.create({
          data: {
            name: item.name,
            code: item.code,
            financialTypeId: ft?.id || null,
            financialType: item.financialType,
            statementGroupId: groupObj?.id || null,
            statementGroup: groupObj?.name || item.statementGroup,
            accountNatureId: natureObj?.id || null,
            accountNature: natureObj?.name || item.accountNature,
            financialStatement: ft?.financialStatement || "Profit & Loss",
            normalBalance: ft?.normalBalance || "Debit",
            isActive: true,
          }
        });
        created++;
      }
    }
    return created;
  }
}
