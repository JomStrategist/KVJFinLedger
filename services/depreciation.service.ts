import { prisma } from "@/lib/prisma";

export interface RecordDepreciationInput {
  expenseId: string;
  financialYear: string;
  method?: "WDV" | "SLM";
  rate?: number;
  depreciationAmount: number;
  effectiveDate?: Date | string;
  remarks?: string;
}

export class DepreciationService {
  /**
   * Upsert a depreciation entry for a specific Fixed Asset Expense and Financial Year.
   */
  static async recordAssetDepreciation(data: RecordDepreciationInput) {
    const expense = await prisma.expense.findUnique({
      where: { id: data.expenseId },
    });

    if (!expense) {
      throw new Error("Fixed Asset expense record not found.");
    }

    if (!expense.isAsset) {
      throw new Error("Selected transaction is not marked as a Fixed Asset.");
    }

    const effectiveDate = data.effectiveDate ? new Date(data.effectiveDate) : new Date();

    const result = await prisma.assetDepreciation.upsert({
      where: {
        expenseId_financialYear: {
          expenseId: data.expenseId,
          financialYear: data.financialYear,
        },
      },
      update: {
        method: data.method || "WDV",
        rate: Number(data.rate || 0),
        depreciationAmount: Number(data.depreciationAmount),
        effectiveDate,
        remarks: data.remarks || null,
      },
      create: {
        expenseId: data.expenseId,
        financialYear: data.financialYear,
        method: data.method || "WDV",
        rate: Number(data.rate || 0),
        depreciationAmount: Number(data.depreciationAmount),
        effectiveDate,
        remarks: data.remarks || null,
      },
      include: {
        expense: {
          include: {
            vendor: true,
            category: true,
          },
        },
      },
    });

    return result;
  }

  /**
   * Retrieve all recorded depreciation entries across all years or for a specific FY.
   */
  static async getAllDepreciations(financialYear?: string) {
    try {
      const where: any = {};
      if (financialYear) {
        where.financialYear = financialYear;
      }

      return await prisma.assetDepreciation.findMany({
        where,
        include: {
          expense: {
            include: {
              vendor: true,
              category: true,
            },
          },
        },
        orderBy: { effectiveDate: "desc" },
      });
    } catch (error) {
      console.warn("DepreciationService.getAllDepreciations error:", error);
      return [];
    }
  }

  /**
   * Delete a depreciation entry.
   */
  static async deleteDepreciation(id: string) {
    return await prisma.assetDepreciation.delete({
      where: { id },
    });
  }
}
