import { prisma } from "@/lib/prisma";
import { AccountingEngine } from "./accounting-engine.service";

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
          include: { category: true }
        }
      },
      orderBy: { disposalDate: "desc" }
    });
  }

  static async getDisposalByExpenseId(expenseId: string) {
    return prisma.assetDisposal.findUnique({
      where: { expenseId },
      include: {
        expense: {
          include: { category: true }
        }
      }
    });
  }

  static async createDisposal(data: CreateDisposalInput) {
    const expense = await prisma.expense.findUnique({
      where: { id: data.expenseId },
      include: {
        depreciations: true
      }
    });

    if (!expense) throw new Error("Asset purchase expense not found");
    if (!expense.isAsset) throw new Error("This expense is not classified as a Fixed Asset");

    const existingDisposal = await prisma.assetDisposal.findUnique({
      where: { expenseId: data.expenseId }
    });
    if (existingDisposal) throw new Error("This asset has already been recorded as disposed");

    // Frozen Rule: Gross capitalized cost is taxableAmount if ITC eligible, else grossAmount (inclusive of tax)
    const isItcEligible = expense.isItcEligible !== false;
    const grossCost = isItcEligible 
      ? Number(expense.taxableAmount || 0) 
      : Number(expense.grossAmount || (Number(expense.taxableAmount || 0) + Number(expense.totalInputGST || 0)));

    const accumDep = expense.depreciations.reduce((sum, d) => sum + Number(d.depreciationAmount || 0), 0);
    const saleProceeds = Number(data.saleProceeds || 0);
    const netBookValue = Math.max(0, grossCost - accumDep);
    const gainOrLoss = Math.round((saleProceeds - netBookValue) * 100) / 100;

    const disposal = await prisma.assetDisposal.create({
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
        notes: data.notes || null
      }
    });

    AccountingEngine.invalidateCache();
    return disposal;
  }

  static async deleteDisposal(id: string) {
    const res = await prisma.assetDisposal.delete({ where: { id } });
    AccountingEngine.invalidateCache();
    return res;
  }
}
