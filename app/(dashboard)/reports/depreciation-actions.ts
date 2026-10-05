"use server";

import { revalidatePath } from "next/cache";
import { DepreciationService, RecordDepreciationInput } from "@/services/depreciation.service";

export async function recordAssetDepreciationAction(data: RecordDepreciationInput) {
  try {
    const record = await DepreciationService.recordAssetDepreciation(data);
    revalidatePath("/reports");
    revalidatePath("/profit-loss");
    revalidatePath("/reports/balance-sheet");
    revalidatePath("/ledgers");
    revalidatePath("/dashboard");
    return { success: true, data: record };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to record asset depreciation." };
  }
}

export async function deleteAssetDepreciationAction(id: string) {
  try {
    await DepreciationService.deleteDepreciation(id);
    revalidatePath("/reports");
    revalidatePath("/profit-loss");
    revalidatePath("/reports/balance-sheet");
    revalidatePath("/ledgers");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete asset depreciation." };
  }
}
