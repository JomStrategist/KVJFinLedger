import { prisma } from "@/lib/prisma";
import { AccountingEngine } from "./accounting-engine.service";
import { BankingStatutoryAccountingService } from "./banking-statutory-accounting.service";
import { ActorContext } from "./journal-posting.service";
import { AuditService } from "./audit.service";
import { roundToPaisa } from "@/lib/utils/currency";

export interface CreateDisposalInput {
  expenseId: string;
  disposalDate?: Date | string;
  saleProceeds: number;
  bankAccountId?: string;
  buyerName?: string;
  notes?: string;
}

export class AssetDisposalService {
  static async getDisposals() {
    return prisma.assetDisposal.findMany({
      include: {
        expense: {
          include: { category: true },
        },
      },
      orderBy: { disposalDate: "desc" },
    });
  }

  static async getDisposalByExpenseId(expenseId: string) {
    return prisma.assetDisposal.findUnique({
      where: { expenseId },
      include: {
        expense: {
          include: { category: true },
        },
      },
    });
  }

  static async createDisposal(data: CreateDisposalInput, actor?: ActorContext) {
    const expense = await prisma.expense.findUnique({
      where: { id: data.expenseId },
      include: {
        depreciations: true,
      },
    });

    if (!expense) throw new Error("Asset purchase expense not found");
    if (!expense.isAsset) throw new Error("This expense is not classified as a Fixed Asset");

    const existingDisposal = await prisma.assetDisposal.findUnique({
      where: { expenseId: data.expenseId },
    });
    if (existingDisposal) throw new Error("This asset has already been recorded as disposed");

    // Frozen Rule: Gross capitalized cost is taxableAmount if ITC eligible, else grossAmount (inclusive of tax)
    const isItcEligible = expense.isItcEligible !== false;
    const grossCost = isItcEligible
      ? roundToPaisa(expense.taxableAmount || 0)
      : roundToPaisa(expense.grossAmount || (Number(expense.taxableAmount || 0) + Number(expense.totalInputGST || 0)));

    const accumDep = roundToPaisa(
      expense.depreciations.reduce((sum, d) => sum + Number(d.depreciationAmount || 0), 0)
    );
    const saleProceeds = roundToPaisa(data.saleProceeds || 0);
    const netBookValue = Math.max(0, roundToPaisa(grossCost - accumDep));
    const gainOrLoss = roundToPaisa(saleProceeds - netBookValue);

    return await prisma.$transaction(async (tx) => {
      const disposal = await tx.assetDisposal.create({
        data: {
          expenseId: data.expenseId,
          disposalDate: data.disposalDate ? new Date(data.disposalDate) : new Date(),
          saleProceeds,
          grossCost,
          accumulatedDepreciation: accumDep,
          netBookValue,
          gainOrLoss,
          bankAccountId: data.bankAccountId || null,
          buyerName: data.buyerName || null,
          notes: data.notes || null,
        },
      });

      // Post persistent General Ledger journal entry atomically
      await BankingStatutoryAccountingService.postAssetDisposal(disposal.id, actor, tx);

      // Audit Log
      await AuditService.logEvent(
        {
          actorId: actor?.id || null,
          actorName: actor?.name || "Asset Management",
          actorEmail: actor?.email || "system@kvjfinledger.internal",
          action: "CREATE_ASSET_DISPOSAL",
          entity: "AssetDisposal",
          entityId: disposal.id,
          afterState: {
            expenseId: disposal.expenseId,
            saleProceeds: disposal.saleProceeds,
            grossCost: disposal.grossCost,
            accumulatedDepreciation: disposal.accumulatedDepreciation,
            gainOrLoss: disposal.gainOrLoss,
          },
          changeSummary: `Recorded disposal of ${expense.expenseNumber} (Proceeds: ₹${saleProceeds}, Gain/Loss: ₹${gainOrLoss})`,
        },
        tx
      );

      AccountingEngine.invalidateCache();
      return disposal;
    });
  }

  static async deleteDisposal(id: string, actor?: ActorContext) {
    const existing = await prisma.assetDisposal.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`AssetDisposalNotFound: Disposal record '${id}' does not exist.`);
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Reverse persistent General Ledger journal entry cleanly
      await BankingStatutoryAccountingService.reverseAssetDisposal(
        id,
        "Asset disposal record deleted",
        actor,
        tx
      );

      const res = await tx.assetDisposal.delete({ where: { id } });

      // Audit Log
      await AuditService.logEvent(
        {
          actorId: actor?.id || null,
          actorName: actor?.name || "Asset Management",
          actorEmail: actor?.email || "system@kvjfinledger.internal",
          action: "DELETE_ASSET_DISPOSAL",
          entity: "AssetDisposal",
          entityId: id,
          beforeState: { id: existing.id, expenseId: existing.expenseId, saleProceeds: existing.saleProceeds },
          changeSummary: `Deleted disposal record ${id}`,
        },
        tx
      );

      AccountingEngine.invalidateCache();
      return res;
    });
  }
}
