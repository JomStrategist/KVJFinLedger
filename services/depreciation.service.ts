import { prisma } from "@/lib/prisma";
import { BankingStatutoryAccountingService } from "./banking-statutory-accounting.service";
import { ActorContext } from "./journal-posting.service";
import { AuditService } from "./audit.service";
import { AccountingEngine } from "./accounting-engine.service";

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
  static async recordAssetDepreciation(data: RecordDepreciationInput, actor?: ActorContext) {
    const expense = await prisma.expense.findUnique({
      where: { id: data.expenseId },
      include: { depreciations: true },
    });

    if (!expense) {
      throw new Error("Fixed Asset expense record not found.");
    }

    if (!expense.isAsset) {
      throw new Error("Selected transaction is not marked as a Fixed Asset.");
    }

    // Verify calculation basis and ensure NBV never becomes negative
    const method = data.method || "WDV";
    const rate = Number(data.rate || 0);
    const calc = await BankingStatutoryAccountingService.calculateDepreciation(
      data.expenseId,
      method,
      rate,
      data.financialYear,
      0,
      prisma
    );

    // If caller provided explicit amount, cap it to available current NBV
    let depreciationAmount = Number(data.depreciationAmount);
    if (!depreciationAmount || depreciationAmount <= 0) {
      depreciationAmount = calc.depreciationAmount;
    }
    depreciationAmount = Math.min(depreciationAmount, calc.currentNBV);

    if (depreciationAmount <= 0) {
      throw new Error("ZeroDepreciationError: Net Book Value is already zero or salvage value reached.");
    }

    const effectiveDate = data.effectiveDate ? new Date(data.effectiveDate) : new Date();

    return await prisma.$transaction(async (tx) => {
      const result = await tx.assetDepreciation.upsert({
        where: {
          expenseId_financialYear: {
            expenseId: data.expenseId,
            financialYear: data.financialYear,
          },
        },
        update: {
          method,
          rate,
          depreciationAmount,
          effectiveDate,
          remarks: data.remarks || null,
        },
        create: {
          expenseId: data.expenseId,
          financialYear: data.financialYear,
          method,
          rate,
          depreciationAmount,
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

      // Post persistent General Ledger journal entry atomically
      await BankingStatutoryAccountingService.postAssetDepreciation(result.id, actor, tx);

      // Audit Log
      await AuditService.logEvent(
        {
          actorId: actor?.id || null,
          actorName: actor?.name || "Depreciation Engine",
          actorEmail: actor?.email || "system@kvjfinledger.internal",
          action: "RECORD_ASSET_DEPRECIATION",
          entity: "AssetDepreciation",
          entityId: result.id,
          afterState: {
            expenseId: result.expenseId,
            financialYear: result.financialYear,
            method: result.method,
            rate: result.rate,
            depreciationAmount: result.depreciationAmount,
          },
          changeSummary: `Recorded annual ${result.method} depreciation of ₹${result.depreciationAmount} on ${expense.expenseNumber} for ${result.financialYear}`,
        },
        tx
      );

      AccountingEngine.invalidateCache();
      return result;
    });
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
  static async deleteDepreciation(id: string, actor?: ActorContext) {
    const existing = await prisma.assetDepreciation.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`AssetDepreciationNotFound: Depreciation record '${id}' does not exist.`);
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Reverse persistent General Ledger journal entry cleanly
      await BankingStatutoryAccountingService.reverseAssetDepreciation(
        id,
        "Depreciation entry deleted",
        actor,
        tx
      );

      // 2. Delete the depreciation record
      const deleted = await tx.assetDepreciation.delete({
        where: { id },
      });

      // Audit Log
      await AuditService.logEvent(
        {
          actorId: actor?.id || null,
          actorName: actor?.name || "Depreciation Engine",
          actorEmail: actor?.email || "system@kvjfinledger.internal",
          action: "DELETE_ASSET_DEPRECIATION",
          entity: "AssetDepreciation",
          entityId: id,
          beforeState: { id: existing.id, amount: existing.depreciationAmount, financialYear: existing.financialYear },
          changeSummary: `Deleted depreciation record ${id} of ₹${existing.depreciationAmount}`,
        },
        tx
      );

      AccountingEngine.invalidateCache();
      return deleted;
    });
  }
}
