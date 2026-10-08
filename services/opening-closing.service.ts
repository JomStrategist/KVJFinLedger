import { prisma } from "@/lib/prisma";

export type SaveOpeningBalanceInput = {
  financialYear: string;
  position: string;
  amount: number;
  type: "Asset" | "Liability";
};

export class OpeningClosingService {
  /**
   * Fetch all opening balance components for a given financial year
   */
  static async getOpeningBalances(financialYear: string = "FY 2026–27") {
    return await prisma.openingBalance.findMany({
      where: { financialYear },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Fetch all opening balance components across all financial years
   */
  static async getAllOpeningBalances() {
    return await prisma.openingBalance.findMany({
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Upsert (add or update) an opening balance component
   */
  static async saveOpeningBalance(data: SaveOpeningBalanceInput) {
    const existing = await prisma.openingBalance.findFirst({
      where: {
        financialYear: data.financialYear,
        position: data.position,
      },
    });

    if (existing) {
      return await prisma.openingBalance.update({
        where: { id: existing.id },
        data: {
          amount: data.amount,
          type: data.type,
        },
      });
    }

    return await prisma.openingBalance.create({
      data: {
        financialYear: data.financialYear,
        position: data.position,
        amount: data.amount,
        type: data.type,
      },
    });
  }

  /**
   * Delete an opening balance component
   */
  static async deleteOpeningBalance(id: string) {
    return await prisma.openingBalance.delete({
      where: { id },
    });
  }
}
