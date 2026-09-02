import { prisma } from "@/lib/prisma";

export class ChartOfAccountsService {
  /**
   * Seed Canonical Accounting Masters into MongoDB Atlas if database is uninitialized
   */
  static async seedAccountingMasters() {
    try {
      // 1. Financial Types
      const financialTypes = [
        { code: "INCOME", name: "Income", financialStatement: "Profit & Loss", normalBalance: "Credit", sortOrder: 1 },
        { code: "EXPENSE", name: "Expense", financialStatement: "Profit & Loss", normalBalance: "Debit", sortOrder: 2 },
        { code: "ASSET", name: "Asset", financialStatement: "Balance Sheet", normalBalance: "Debit", sortOrder: 3 },
        { code: "LIABILITY", name: "Liability", financialStatement: "Balance Sheet", normalBalance: "Credit", sortOrder: 4 },
        { code: "EQUITY", name: "Equity", financialStatement: "Balance Sheet", normalBalance: "Credit", sortOrder: 5 },
      ];

      for (const ft of financialTypes) {
        const existing = await prisma.financialType.findUnique({ where: { code: ft.code } });
        if (!existing) {
          await prisma.financialType.create({ data: ft });
        }
      }

      // Load types dictionary
      const dbTypes = await prisma.financialType.findMany();
      const typeMap = new Map(dbTypes.map((t) => [t.code, t.id]));

      // 2. Financial Statement Groups per Financial Type
      const statementGroups: Array<{ typeCode: string; name: string; code: string; sortOrder: number }> = [
        // INCOME
        { typeCode: "INCOME", name: "Revenue from Operations", code: "GRP-INC-REV", sortOrder: 1 },
        { typeCode: "INCOME", name: "Other Income", code: "GRP-INC-OTH", sortOrder: 2 },

        // EXPENSE
        { typeCode: "EXPENSE", name: "Administrative Expenses", code: "GRP-EXP-ADM", sortOrder: 1 },
        { typeCode: "EXPENSE", name: "Employee Costs", code: "GRP-EXP-EMP", sortOrder: 2 },
        { typeCode: "EXPENSE", name: "Professional & Consultancy", code: "GRP-EXP-PRF", sortOrder: 3 },
        { typeCode: "EXPENSE", name: "Selling & Marketing Expenses", code: "GRP-EXP-MKT", sortOrder: 4 },
        { typeCode: "EXPENSE", name: "Finance Costs", code: "GRP-EXP-FIN", sortOrder: 5 },
        { typeCode: "EXPENSE", name: "Depreciation & Amortisation", code: "GRP-EXP-DEP", sortOrder: 6 },
        { typeCode: "EXPENSE", name: "Other Expenses", code: "GRP-EXP-OTH", sortOrder: 7 },

        // ASSET
        { typeCode: "ASSET", name: "Fixed Assets", code: "GRP-AST-FIX", sortOrder: 1 },
        { typeCode: "AST", name: "Current Assets", code: "GRP-AST-CUR", sortOrder: 2 },
        { typeCode: "ASSET", name: "Cash & Cash Equivalents", code: "GRP-AST-CSH", sortOrder: 3 },
        { typeCode: "ASSET", name: "Trade Receivables", code: "GRP-AST-REC", sortOrder: 4 },
        { typeCode: "ASSET", name: "Other Current Assets", code: "GRP-AST-OCA", sortOrder: 5 },

        // LIABILITY
        { typeCode: "LIABILITY", name: "Current Liabilities", code: "GRP-LIAB-CUR", sortOrder: 1 },
        { typeCode: "LIABILITY", name: "Trade Payables", code: "GRP-LIAB-PAY", sortOrder: 2 },
        { typeCode: "LIABILITY", name: "Statutory Liabilities", code: "GRP-LIAB-STAT", sortOrder: 3 },
        { typeCode: "LIABILITY", name: "Other Current Liabilities", code: "GRP-LIAB-OCL", sortOrder: 4 },
        { typeCode: "LIABILITY", name: "Borrowings", code: "GRP-LIAB-BOR", sortOrder: 5 },

        // EQUITY
        { typeCode: "EQUITY", name: "Capital", code: "GRP-EQ-CAP", sortOrder: 1 },
        { typeCode: "EQUITY", name: "Retained Earnings", code: "GRP-EQ-RET", sortOrder: 2 },
        { typeCode: "EQUITY", name: "Reserves", code: "GRP-EQ-RES", sortOrder: 3 },
      ];

      for (const sg of statementGroups) {
        const typeId = typeMap.get(sg.typeCode);
        if (typeId) {
          const existing = await prisma.financialStatementGroup.findFirst({
            where: { OR: [{ code: sg.code }, { name: sg.name, financialTypeId: typeId }] }
          });
          if (!existing) {
            await prisma.financialStatementGroup.create({
              data: {
                financialTypeId: typeId,
                name: sg.name,
                code: sg.code,
                sortOrder: sg.sortOrder,
              }
            });
          }
        }
      }

      // 3. Account Natures per Financial Type
      const accountNatures: Array<{ typeCode: string; name: string; code: string; sortOrder: number }> = [
        // INCOME
        { typeCode: "INCOME", name: "Operating Income", code: "NAT-INC-OP", sortOrder: 1 },
        { typeCode: "INCOME", name: "Other Income", code: "NAT-INC-OTH", sortOrder: 2 },

        // EXPENSE
        { typeCode: "EXPENSE", name: "Operating Expense", code: "NAT-EXP-OP", sortOrder: 1 },
        { typeCode: "EXPENSE", name: "Finance Cost", code: "NAT-EXP-FIN", sortOrder: 2 },
        { typeCode: "EXPENSE", name: "Depreciation", code: "NAT-EXP-DEP", sortOrder: 3 },
        { typeCode: "EXPENSE", name: "Other Expense", code: "NAT-EXP-OTH", sortOrder: 4 },

        // ASSET
        { typeCode: "ASSET", name: "Fixed Asset", code: "NAT-AST-FIX", sortOrder: 1 },
        { typeCode: "ASSET", name: "Current Asset", code: "NAT-AST-CUR", sortOrder: 2 },
        { typeCode: "ASSET", name: "Non-Current Asset", code: "NAT-AST-NON", sortOrder: 3 },
        { typeCode: "ASSET", name: "Cash & Bank", code: "NAT-AST-CSH", sortOrder: 4 },
        { typeCode: "ASSET", name: "Trade Receivable", code: "NAT-AST-REC", sortOrder: 5 },
        { typeCode: "ASSET", name: "Other Asset", code: "NAT-AST-OTH", sortOrder: 6 },

        // LIABILITY
        { typeCode: "LIABILITY", name: "Current Liability", code: "NAT-LIAB-CUR", sortOrder: 1 },
        { typeCode: "LIABILITY", name: "Non-Current Liability", code: "NAT-LIAB-NON", sortOrder: 2 },
        { typeCode: "LIABILITY", name: "Trade Payable", code: "NAT-LIAB-PAY", sortOrder: 3 },
        { typeCode: "LIABILITY", name: "Statutory Liability", code: "NAT-LIAB-STAT", sortOrder: 4 },
        { typeCode: "LIABILITY", name: "Borrowing", code: "NAT-LIAB-BOR", sortOrder: 5 },
        { typeCode: "LIABILITY", name: "Other Liability", code: "NAT-LIAB-OTH", sortOrder: 6 },

        // EQUITY
        { typeCode: "EQUITY", name: "Capital", code: "NAT-EQ-CAP", sortOrder: 1 },
        { typeCode: "EQUITY", name: "Retained Earnings", code: "NAT-EQ-RET", sortOrder: 2 },
        { typeCode: "EQUITY", name: "Reserve", code: "NAT-EQ-RES", sortOrder: 3 },
      ];

      for (const an of accountNatures) {
        const typeId = typeMap.get(an.typeCode);
        if (typeId) {
          const existing = await prisma.accountNature.findFirst({
            where: { OR: [{ code: an.code }, { name: an.name, financialTypeId: typeId }] }
          });
          if (!existing) {
            await prisma.accountNature.create({
              data: {
                financialTypeId: typeId,
                name: an.name,
                code: an.code,
                sortOrder: an.sortOrder,
              }
            });
          }
        }
      }
    } catch (error) {
      console.warn("ChartOfAccountsService.seedAccountingMasters error:", error);
    }
  }

  /**
   * Fetch all Financial Types from MongoDB Atlas
   */
  static async getFinancialTypes() {
    try {
      let types = await prisma.financialType.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      });

      if (types.length === 0) {
        await ChartOfAccountsService.seedAccountingMasters();
        types = await prisma.financialType.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        });
      }

      return types;
    } catch (error) {
      console.warn("ChartOfAccountsService.getFinancialTypes error:", error);
      return [];
    }
  }

  /**
   * Fetch Financial Statement Groups filtered by Financial Type (code or id)
   */
  static async getStatementGroups(financialTypeCode?: string) {
    try {
      const where: any = { isActive: true };
      if (financialTypeCode) {
        where.financialType = { code: financialTypeCode.toUpperCase() };
      }

      let groups = await prisma.financialStatementGroup.findMany({
        where,
        include: { financialType: true },
        orderBy: { sortOrder: "asc" },
      });

      if (groups.length === 0 && !financialTypeCode) {
        await ChartOfAccountsService.seedAccountingMasters();
        groups = await prisma.financialStatementGroup.findMany({
          where,
          include: { financialType: true },
          orderBy: { sortOrder: "asc" },
        });
      }

      return groups;
    } catch (error) {
      console.warn("ChartOfAccountsService.getStatementGroups error:", error);
      return [];
    }
  }

  /**
   * Fetch Account Natures filtered by Financial Type (code or id)
   */
  static async getAccountNatures(financialTypeCode?: string) {
    try {
      const where: any = { isActive: true };
      if (financialTypeCode) {
        where.financialType = { code: financialTypeCode.toUpperCase() };
      }

      let natures = await prisma.accountNature.findMany({
        where,
        include: { financialType: true },
        orderBy: { sortOrder: "asc" },
      });

      if (natures.length === 0 && !financialTypeCode) {
        await ChartOfAccountsService.seedAccountingMasters();
        natures = await prisma.accountNature.findMany({
          where,
          include: { financialType: true },
          orderBy: { sortOrder: "asc" },
        });
      }

      return natures;
    } catch (error) {
      console.warn("ChartOfAccountsService.getAccountNatures error:", error);
      return [];
    }
  }

  /**
   * Admin Creation of a custom Financial Statement Group in MongoDB Atlas
   */
  static async createStatementGroup(data: { name: string; financialTypeCode: string; code?: string }) {
    const finType = await prisma.financialType.findUnique({
      where: { code: data.financialTypeCode.toUpperCase() },
    });

    if (!finType) {
      throw new Error(`Financial Type "${data.financialTypeCode}" does not exist.`);
    }

    const code = data.code?.trim() || `GRP-${data.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8)}`;
    const existing = await prisma.financialStatementGroup.findFirst({
      where: { OR: [{ code }, { name: data.name.trim(), financialTypeId: finType.id }] }
    });

    if (existing) {
      throw new Error(`Statement group "${data.name}" already exists for ${finType.name}.`);
    }

    return await prisma.financialStatementGroup.create({
      data: {
        financialTypeId: finType.id,
        name: data.name.trim(),
        code,
        isActive: true,
      }
    });
  }

  /**
   * Admin Creation of a custom Account Nature in MongoDB Atlas
   */
  static async createAccountNature(data: { name: string; financialTypeCode: string; code?: string }) {
    const finType = await prisma.financialType.findUnique({
      where: { code: data.financialTypeCode.toUpperCase() },
    });

    if (!finType) {
      throw new Error(`Financial Type "${data.financialTypeCode}" does not exist.`);
    }

    const code = data.code?.trim() || `NAT-${data.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8)}`;
    const existing = await prisma.accountNature.findFirst({
      where: { OR: [{ code }, { name: data.name.trim(), financialTypeId: finType.id }] }
    });

    if (existing) {
      throw new Error(`Account nature "${data.name}" already exists for ${finType.name}.`);
    }

    return await prisma.accountNature.create({
      data: {
        financialTypeId: finType.id,
        name: data.name.trim(),
        code,
        isActive: true,
      }
    });
  }
}
