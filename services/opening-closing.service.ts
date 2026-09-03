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
    return await prisma.openingBalance.upsert({
      where: {
        financialYear_position: {
          financialYear: data.financialYear,
          position: data.position,
        },
      },
      update: {
        amount: data.amount,
        type: data.type,
      },
      create: {
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
