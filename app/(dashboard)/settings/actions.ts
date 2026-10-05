"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DepreciationService, RecordDepreciationInput } from "@/services/depreciation.service";

export async function updateAssetAction(assetId: string, data: {
  notes?: string;
  assetType?: string;
  depreciationRate?: number;
  depreciationMethod?: "WDV" | "SLM";
  purchaseDate?: string;
}) {
  try {
    const updateData: any = {};
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.assetType !== undefined) updateData.assetType = data.assetType;
    if (data.depreciationRate !== undefined) updateData.depreciationRate = Number(data.depreciationRate);
    if (data.purchaseDate) updateData.expenseDate = new Date(data.purchaseDate);

    const updated = await prisma.expense.update({
      where: { id: assetId },
      data: updateData,
      include: { vendor: true, category: true, depreciations: true }
    });

    revalidatePath("/settings");
    revalidatePath("/reports");
    revalidatePath("/ledgers");
    revalidatePath("/expenses");
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update fixed asset." };
  }
}

export async function createAssetAction(data: {
  name: string;
  categoryName?: string;
  purchaseDate: string;
  cost: number;
  depreciationRate: number;
  method?: "WDV" | "SLM";
  vendorName?: string;
}) {
  try {
    // Find or create asset category
    let category = await prisma.expenseCategory.findFirst({
      where: { name: { equals: data.categoryName || "Fixed Assets", mode: "insensitive" } }
    });

    if (!category) {
      category = await prisma.expenseCategory.create({
        data: {
          name: data.categoryName || "Fixed Assets",
          financialType: "CAPEX",
          description: "Capital expenditure / Fixed Asset account"
        }
      });
    }

    const netAmount = Number(data.cost);
    const purchaseDate = new Date(data.purchaseDate);
    const year = new Date().getFullYear();
    const prefix = `EXP-${year}-`;
    const latestExpense = await prisma.expense.findFirst({
      where: { expenseNumber: { startsWith: prefix } },
      orderBy: { expenseNumber: 'desc' },
    });
    let expenseNumber = `${prefix}0001`;
    if (latestExpense) {
      const lastSeq = parseInt(latestExpense.expenseNumber.replace(prefix, ""), 10) || 0;
      expenseNumber = `${prefix}${(lastSeq + 1).toString().padStart(4, "0")}`;
    }

    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        expenseDate: purchaseDate,
        description: `Fixed Asset Acquisition: ${data.name}`,
        notes: data.name,
        categoryId: category.id,
        subtotal: netAmount,
        taxableAmount: netAmount,
        grossAmount: netAmount,
        netAmount,
        totalInputGST: 0,
        paidAmount: netAmount,
        balancePayable: 0,
        paymentStatus: "PAID",
        paidBy: "COMPANY",
        isAsset: true,
        assetType: data.categoryName || "Fixed Assets",
        depreciationRate: Number(data.depreciationRate || 0),
        status: "APPROVED",
        items: {
          create: [{
            hsnSacCode: "9983",
            quantity: 1,
            unitPrice: netAmount,
            taxableAmount: netAmount,
            gstRate: 0,
            totalAmount: netAmount,
            categoryId: category.id
          }]
        }
      },
      include: { vendor: true, category: true, depreciations: true }
    });

    revalidatePath("/settings");
    revalidatePath("/reports");
    revalidatePath("/ledgers");
    revalidatePath("/expenses");
    return { success: true, data: expense };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create fixed asset." };
  }
}

export async function deleteAssetAction(assetId: string) {
  try {
    await prisma.expense.delete({
      where: { id: assetId }
    });

    revalidatePath("/settings");
    revalidatePath("/reports");
    revalidatePath("/ledgers");
    revalidatePath("/expenses");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete fixed asset." };
  }
}

export async function recordAssetDepreciationSettingsAction(data: RecordDepreciationInput) {
  try {
    const record = await DepreciationService.recordAssetDepreciation(data);
    revalidatePath("/settings");
    revalidatePath("/reports");
    revalidatePath("/ledgers");
    return { success: true, data: record };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to record depreciation entry." };
  }
}
