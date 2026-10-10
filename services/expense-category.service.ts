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
  isTaxApplicable?: boolean;
  defaultGstRate?: number;
  isCapitalAsset?: boolean;
  isLossCategory?: boolean;
  isRecurringDefault?: boolean;
  accountingClassification?: string | null;
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
  static canManageCategories(role?: string): boolean {
    if (!role) return false;
    const normalized = role.toUpperCase();
    return normalized === "ADMIN" || normalized === "SUPER_ADMIN" || normalized === "CEO" || normalized === "OWNER";
  }

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
    const dbType = (prisma as any).financialType?.findUnique
      ? await (prisma as any).financialType.findUnique({
          where: { code: finTypeCode }
        }).catch(() => null)
      : null;

    // 2. Verify Statement Group belongs to selected Financial Type
    let dbGroup = null;
    if (data.statementGroup && (prisma as any).financialStatementGroup?.findFirst) {
      dbGroup = await (prisma as any).financialStatementGroup.findFirst({
        where: {
          financialTypeId: dbType?.id,
          name: { equals: data.statementGroup.trim(), mode: "insensitive" }
        }
      }).catch(() => null);
    }

    // 3. Verify Account Nature belongs to selected Financial Type
    let dbNature = null;
    if (data.accountNature && (prisma as any).accountNature?.findFirst) {
      dbNature = await (prisma as any).accountNature.findFirst({
        where: {
          financialTypeId: dbType?.id,
          name: { equals: data.accountNature.trim(), mode: "insensitive" }
        }
      }).catch(() => null);
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
      while (await prisma.expenseCategory.findFirst({ where: { code: candidate } })) {
        seq++;
        candidate = `${prefix}-${abbr}-${String(seq).padStart(3, "0")}`;
      }
      code = candidate;
    }

    const existingName = await prisma.expenseCategory.findFirst({
      where: { name: { equals: name, mode: "insensitive" } }
    });
    if (existingName) {
      throw new Error(`Category name "${name}" already exists.`);
    }

    const existingCode = await prisma.expenseCategory.findFirst({
      where: { code: { equals: code, mode: "insensitive" } }
    });
    if (existingCode) {
      throw new Error(`Category code "${code}" already exists.`);
    }

    const isCapital = data.isCapitalAsset ?? (finTypeCode === "ASSET");
    const isLoss = data.isLossCategory ?? (name.toLowerCase().includes("loss"));
    const classification = data.accountingClassification || (isCapital ? "FIXED_ASSET" : isLoss ? "BUSINESS_LOSS" : name.toLowerCase().includes("salary") ? "EMPLOYEE_EXPENSE" : "OPERATING_EXPENSE");

    return await prisma.expenseCategory.create({
      data: {
        name,
        code,
        description: data.description || null,
        parentId: data.parentId || null,
        hierarchyLevel: level,
        financialTypeId: dbType?.id || null,
        financialType: dbType?.code || finTypeCode,
        statementGroupId: dbGroup?.id || null,
        statementGroup: dbGroup?.name || data.statementGroup || null,
        accountNatureId: dbNature?.id || null,
        accountNature: dbNature?.name || data.accountNature || null,
        financialStatement: dbType?.financialStatement || (finTypeCode === "INCOME" || finTypeCode === "EXPENSE" ? "Profit & Loss" : "Balance Sheet"),
        normalBalance: dbType?.normalBalance || (finTypeCode === "ASSET" || finTypeCode === "EXPENSE" ? "Debit" : "Credit"),
        isActive: data.isActive ?? true,
        isTaxApplicable: data.isTaxApplicable ?? (finTypeCode !== "INCOME" && !name.toLowerCase().includes("salary") && !isLoss),
        defaultGstRate: Number(data.defaultGstRate || 0),
        isCapitalAsset: isCapital,
        isLossCategory: isLoss,
        isRecurringDefault: data.isRecurringDefault ?? false,
        accountingClassification: classification,
      }
    });
  }

  static async updateExpenseCategory(id: string, data: Partial<CreateCategoryInput>) {
    if (data.name !== undefined && data.name.trim() === "") {
      throw new Error("Category name cannot be empty.");
    }

    if (data.name) {
      const existing = await prisma.expenseCategory.findFirst({
        where: { 
          name: { equals: data.name.trim(), mode: "insensitive" },
          id: { not: id }
        }
      });
      if (existing) {
        throw new Error(`Another category with name "${data.name.trim()}" already exists.`);
      }
    }

    if (data.code) {
      const existingCode = await prisma.expenseCategory.findFirst({
        where: { 
          code: { equals: data.code.trim(), mode: "insensitive" },
          id: { not: id }
        }
      });
      if (existingCode) {
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
        isTaxApplicable: data.isTaxApplicable !== undefined ? data.isTaxApplicable : undefined,
        defaultGstRate: data.defaultGstRate !== undefined ? Number(data.defaultGstRate) : undefined,
        isCapitalAsset: data.isCapitalAsset !== undefined ? data.isCapitalAsset : undefined,
        isLossCategory: data.isLossCategory !== undefined ? data.isLossCategory : undefined,
        isRecurringDefault: data.isRecurringDefault !== undefined ? data.isRecurringDefault : undefined,
        accountingClassification: data.accountingClassification !== undefined ? data.accountingClassification : undefined,
      },
    });
  }

  static async toggleExpenseCategoryStatus(id: string, isActive: boolean) {
    return await prisma.expenseCategory.update({
      where: { id },
      data: { isActive },
    });
  }

  static async deleteExpenseCategory(id: string) {
    const expenseUsage = await prisma.expense.count({ where: { categoryId: id } });
    const itemUsage = await prisma.expenseItem.count({ where: { categoryId: id } });
    const recurringUsage = await prisma.recurringExpense.count({ where: { categoryId: id } });
    if (expenseUsage > 0 || itemUsage > 0 || recurringUsage > 0) {
      throw new Error("Cannot delete category referenced by historical transactions or recurring schedules. Deactivate the category instead to preserve historical accounting integrity.");
    }

    const childrenCount = await prisma.expenseCategory.count({ where: { parentId: id } });
    if (childrenCount > 0) {
      throw new Error("Cannot delete category with subcategories. Reassign or delete subcategories first.");
    }

    return await prisma.expenseCategory.delete({ where: { id } });
  }

  static async seedDefaultCategories() {
    await ChartOfAccountsService.seedAccountingMasters();

    const types = await prisma.financialType.findMany();
    const statementGroups = await prisma.financialStatementGroup.findMany();
    const accountNatures = await prisma.accountNature.findMany();

    const typeMap = new Map(types.map((t) => [t.code, t]));

    // Parent Categories & Defaults
    const defaults = [
      // INCOME
      { name: "Revenue from Services", code: "INC-REV-001", financialType: "INCOME", statementGroup: "Revenue from Operations", accountNature: "Operating Income", isTax: true, defaultGst: 18 },
      { name: "Other Income", code: "INC-OTH-001", financialType: "INCOME", statementGroup: "Other Income", accountNature: "Other Income", isTax: false, defaultGst: 0 },
      { name: "Interest Income", code: "INC-INT-001", financialType: "INCOME", statementGroup: "Other Income", accountNature: "Other Income", isTax: false, defaultGst: 0 },

      // CORE EXPENSE HEADS WITH INDIAN ACCOUNTING MAPPING
      { name: "Employee Costs", code: "EXP-EMP-001", financialType: "EXPENSE", statementGroup: "Employee Costs", accountNature: "Operating Expense", isTax: false, defaultGst: 0, isRecurring: true },
      { name: "Rent and Occupancy", code: "EXP-RNT-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense", isTax: true, defaultGst: 18, isRecurring: true },
      { name: "Utilities", code: "EXP-UTL-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense", isTax: true, defaultGst: 18, isRecurring: true },
      { name: "Communication", code: "EXP-COMM-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense", isTax: true, defaultGst: 18, isRecurring: true },
      { name: "Software and Subscriptions", code: "EXP-SW-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense", isTax: true, defaultGst: 18, isRecurring: true },
      { name: "Office Administration", code: "EXP-OFF-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense", isTax: true, defaultGst: 18 },
      { name: "Travel and Accommodation", code: "EXP-TRV-001", financialType: "EXPENSE", statementGroup: "Selling & Marketing Expenses", accountNature: "Operating Expense", isTax: true, defaultGst: 18 },
      { name: "Repairs and Maintenance", code: "EXP-RPM-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense", isTax: true, defaultGst: 18 },
      { name: "Professional Services", code: "EXP-PRF-001", financialType: "EXPENSE", statementGroup: "Professional & Consultancy", accountNature: "Operating Expense", isTax: true, defaultGst: 18 },
      { name: "Bank and Finance Charges", code: "EXP-BNK-001", financialType: "EXPENSE", statementGroup: "Finance Costs", accountNature: "Finance Cost", isTax: true, defaultGst: 18 },
      { name: "Voucher Purchases", code: "EXP-VCH-001", financialType: "EXPENSE", statementGroup: "Administrative Expenses", accountNature: "Operating Expense", isTax: true, defaultGst: 18 },
      { name: "Losses", code: "EXP-LOS-001", financialType: "EXPENSE", statementGroup: "Other Expenses", accountNature: "Other Expense", isTax: false, defaultGst: 0, isLoss: true },
      { name: "Other Operating Expenses", code: "EXP-OTH-001", financialType: "EXPENSE", statementGroup: "Other Expenses", accountNature: "Other Expense", isTax: true, defaultGst: 18 },

      // ASSETS / CAPEX
      { name: "Fixed Assets", code: "AST-FXA-001", financialType: "ASSET", statementGroup: "Fixed Assets", accountNature: "Fixed Asset", isTax: true, defaultGst: 18, isAsset: true },
      { name: "Computer Equipment", code: "AST-CMP-001", financialType: "ASSET", statementGroup: "Fixed Assets", accountNature: "Fixed Asset", isTax: true, defaultGst: 18, isAsset: true },
      { name: "Furniture & Fixtures", code: "AST-FUR-001", financialType: "ASSET", statementGroup: "Fixed Assets", accountNature: "Fixed Asset", isTax: true, defaultGst: 18, isAsset: true },
      { name: "Office Equipment", code: "AST-OEQ-001", financialType: "ASSET", statementGroup: "Fixed Assets", accountNature: "Fixed Asset", isTax: true, defaultGst: 18, isAsset: true },
      { name: "Trade Receivables", code: "AST-REC-001", financialType: "ASSET", statementGroup: "Trade Receivables", accountNature: "Trade Receivable" },

      // LIABILITIES
      { name: "Trade Payables", code: "LIAB-PAY-001", financialType: "LIABILITY", statementGroup: "Trade Payables", accountNature: "Trade Payable" },
      { name: "GST Payable", code: "LIAB-GST-001", financialType: "LIABILITY", statementGroup: "Statutory Liabilities", accountNature: "Statutory Liability" },
      { name: "TDS Payable", code: "LIAB-TDS-001", financialType: "LIABILITY", statementGroup: "Statutory Liabilities", accountNature: "Statutory Liability" },
      { name: "Employee Payable", code: "LIAB-EMP-001", financialType: "LIABILITY", statementGroup: "Employee Payables", accountNature: "Current Liability" },

      // EQUITY
      { name: "Owner Capital", code: "EQ-CAP-001", financialType: "EQUITY", statementGroup: "Capital", accountNature: "Capital" },
      { name: "Retained Earnings", code: "EQ-RET-001", financialType: "EQUITY", statementGroup: "Retained Earnings", accountNature: "Retained Earnings" },
    ];

    let created = 0;
    const createdMap = new Map<string, string>();

    for (const item of defaults) {
      const existing = await prisma.expenseCategory.findFirst({
        where: { 
          OR: [
            { name: { equals: item.name, mode: "insensitive" } },
            { code: { equals: item.code, mode: "insensitive" } }
          ]
        }
      });

      if (!existing) {
        const ft = typeMap.get(item.financialType);
        const groupObj = statementGroups.find(
          (g) => g.financialTypeId === ft?.id && g.name.toLowerCase() === item.statementGroup.toLowerCase()
        );
        const natureObj = accountNatures.find(
          (n) => n.financialTypeId === ft?.id && n.name.toLowerCase() === item.accountNature.toLowerCase()
        );

        const newCat = await prisma.expenseCategory.create({
          data: {
            name: item.name,
            code: item.code,
            financialTypeId: ft?.id || null,
            financialType: item.financialType,
            statementGroupId: groupObj?.id || null,
            statementGroup: groupObj?.name || item.statementGroup,
            accountNatureId: natureObj?.id || null,
            accountNature: natureObj?.name || item.accountNature,
            financialStatement: ft?.financialStatement || (item.financialType === "INCOME" || item.financialType === "EXPENSE" ? "Profit & Loss" : "Balance Sheet"),
            normalBalance: ft?.normalBalance || (item.financialType === "ASSET" || item.financialType === "EXPENSE" ? "Debit" : "Credit"),
            isActive: true,
            isTaxApplicable: (item as any).isTax ?? true,
            defaultGstRate: (item as any).defaultGst ?? 0,
            isCapitalAsset: (item as any).isAsset ?? (item.financialType === "ASSET"),
            isLossCategory: (item as any).isLoss ?? false,
            isRecurringDefault: (item as any).isRecurring ?? false,
          }
        });
        createdMap.set(item.name.toLowerCase(), newCat.id);
        created++;
      } else {
        createdMap.set(existing.name.toLowerCase(), existing.id);
      }
    }

    // Recommended Subcategories
    const subcategories = [
      // Under Employee Costs
      { parent: "employee costs", name: "Salaries & Wages", code: "EXP-EMP-SAL", isRecurring: true },
      { parent: "employee costs", name: "Salary", code: "EXP-EMP-SLR", isRecurring: true },
      { parent: "employee costs", name: "Staff Bonus & Incentives", code: "EXP-EMP-BON" },
      { parent: "employee costs", name: "Bonus and Incentives", code: "EXP-EMP-BNI" },
      { parent: "employee costs", name: "Employee Benefits", code: "EXP-EMP-BNF" },
      { parent: "employee costs", name: "Employer Contributions", code: "EXP-EMP-CNT", isRecurring: true },
      { parent: "employee costs", name: "Employer PF & ESI Contributions", code: "EXP-EMP-CON", isRecurring: true },
      { parent: "employee costs", name: "Staff Welfare & Reimbursements", code: "EXP-EMP-WLF" },
      { parent: "employee costs", name: "Other Employee Expenses", code: "EXP-EMP-OTH" },

      // Under Rent and Occupancy
      { parent: "rent and occupancy", name: "Office Rent", code: "EXP-RNT-OFF", isRecurring: true },
      { parent: "rent and occupancy", name: "Premises Maintenance Charges", code: "EXP-RNT-MNT", isRecurring: true },

      // Under Utilities
      { parent: "utilities", name: "Electricity Expenses", code: "EXP-UTL-ELE", isRecurring: true },
      { parent: "utilities", name: "Electricity Bill", code: "EXP-UTL-ELB", isRecurring: true },
      { parent: "utilities", name: "Water Charges", code: "EXP-UTL-WTR", isRecurring: true },
      { parent: "utilities", name: "Water Bill", code: "EXP-UTL-WTB", isRecurring: true },

      // Under Communication
      { parent: "communication", name: "Internet Expenses", code: "EXP-COMM-INT", isRecurring: true },
      { parent: "communication", name: "Internet Bill", code: "EXP-COMM-INB", isRecurring: true },
      { parent: "communication", name: "Telephone & Mobile Bills", code: "EXP-COMM-TEL", isRecurring: true },
      { parent: "communication", name: "Telephone and Mobile Bill", code: "EXP-COMM-TMB", isRecurring: true },

      // Under Software and Subscriptions
      { parent: "software and subscriptions", name: "Software Subscriptions", code: "EXP-SW-SUB", isRecurring: true },
      { parent: "software and subscriptions", name: "SaaS & Cloud Licences", code: "EXP-SW-LIC", isRecurring: true },
      { parent: "software and subscriptions", name: "Hosting & Infrastructure", code: "EXP-SW-HST", isRecurring: true },
      { parent: "software and subscriptions", name: "Online Tools & Services", code: "EXP-SW-TLS", isRecurring: true },
      { parent: "software and subscriptions", name: "Online Service Subscriptions", code: "EXP-SW-OSS", isRecurring: true },
      { parent: "software and subscriptions", name: "Maintenance Contracts", code: "EXP-SW-MNC", isRecurring: true },

      // Under Office Administration
      { parent: "office administration", name: "Stationery & Printing", code: "EXP-OFF-STN" },
      { parent: "office administration", name: "Stationery", code: "EXP-OFF-ST1" },
      { parent: "office administration", name: "Office Supplies & Pantry", code: "EXP-OFF-SUP" },
      { parent: "office administration", name: "Office Supplies", code: "EXP-OFF-SP1" },

      // Under Travel and Accommodation
      { parent: "travel and accommodation", name: "Business Travel & Airfare", code: "EXP-TRV-AIR" },
      { parent: "travel and accommodation", name: "Hotel & Lodging", code: "EXP-TRV-HTL" },
      { parent: "travel and accommodation", name: "Local Conveyance & Taxi", code: "EXP-TRV-LOC" },
      { parent: "travel and accommodation", name: "Travel", code: "EXP-TRV-TRV" },
      { parent: "travel and accommodation", name: "Accommodation", code: "EXP-TRV-ACC" },
      { parent: "travel and accommodation", name: "Transportation", code: "EXP-TRV-TRN" },

      // Under Professional Services
      { parent: "professional services", name: "Legal & Professional Fees", code: "EXP-PRF-LGL" },
      { parent: "professional services", name: "Professional Fees", code: "EXP-PRF-PF1" },
      { parent: "professional services", name: "Consultancy Charges", code: "EXP-PRF-CNS" },

      // Under Other Operating Expenses
      { parent: "other operating expenses", name: "Marketing and Advertising", code: "EXP-OTH-MKT" },
      { parent: "other operating expenses", name: "Training Expenses", code: "EXP-OTH-TRN" },
      { parent: "other operating expenses", name: "Insurance", code: "EXP-OTH-INS", isRecurring: true },
      { parent: "other operating expenses", name: "Repairs and Maintenance", code: "EXP-OTH-RPM" },

      // Under Voucher Purchases
      { parent: "voucher purchases", name: "Certification Vouchers", code: "EXP-VCH-CRT" },
      { parent: "voucher purchases", name: "Training Exam Vouchers", code: "EXP-VCH-EXM" },

      // Under Losses
      { parent: "losses", name: "Approved Business Loss", code: "EXP-LOS-BIZ", isLoss: true },
      { parent: "losses", name: "Business Loss", code: "EXP-LOS-BZ1", isLoss: true },
      { parent: "losses", name: "Asset Disposal Loss", code: "EXP-LOS-AST", isLoss: true },
      { parent: "losses", name: "Other Approved Losses", code: "EXP-LOS-OAL", isLoss: true },

      // Under Fixed Assets
      { parent: "fixed assets", name: "Computers & Laptops", code: "AST-FXA-CMP", isAsset: true },
      { parent: "fixed assets", name: "Computers and Equipment", code: "AST-FXA-CE1", isAsset: true },
      { parent: "fixed assets", name: "Office Furniture", code: "AST-FXA-FUR", isAsset: true },
      { parent: "fixed assets", name: "Furniture", code: "AST-FXA-FR1", isAsset: true },
      { parent: "fixed assets", name: "Other Fixed Assets", code: "AST-FXA-OFA", isAsset: true },
    ];

    for (const sub of subcategories) {
      const parentId = createdMap.get(sub.parent.toLowerCase());
      if (parentId) {
        const existingSub = await prisma.expenseCategory.findFirst({
          where: { 
            OR: [
              { name: { equals: sub.name, mode: "insensitive" } },
              { code: { equals: sub.code, mode: "insensitive" } }
            ]
          }
        });

        if (!existingSub) {
          const parent = await prisma.expenseCategory.findUnique({ where: { id: parentId } });
          await prisma.expenseCategory.create({
            data: {
              name: sub.name,
              code: sub.code,
              parentId: parentId,
              hierarchyLevel: 2,
              financialTypeId: parent?.financialTypeId || null,
              financialType: parent?.financialType || "EXPENSE",
              statementGroupId: parent?.statementGroupId || null,
              statementGroup: parent?.statementGroup || null,
              accountNatureId: parent?.accountNatureId || null,
              accountNature: parent?.accountNature || null,
              financialStatement: parent?.financialStatement || "Profit & Loss",
              normalBalance: parent?.normalBalance || "Debit",
              isActive: true,
              isTaxApplicable: parent?.isTaxApplicable ?? true,
              defaultGstRate: parent?.defaultGstRate ?? 18,
              isCapitalAsset: (sub as any).isAsset ?? parent?.isCapitalAsset ?? false,
              isLossCategory: (sub as any).isLoss ?? parent?.isLossCategory ?? false,
              isRecurringDefault: (sub as any).isRecurring ?? parent?.isRecurringDefault ?? false,
            }
          });
          created++;
        }
      }
    }

    return created;
  }
}
