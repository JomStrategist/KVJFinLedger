"use server";

import { revalidatePath } from "next/cache";
import { DepreciationService, RecordDepreciationInput } from "@/services/depreciation.service";
import { requireActionAdmin } from "@/lib/auth-utils";

export async function recordAssetDepreciationAction(data: RecordDepreciationInput) {
  try {
    const session = await requireActionAdmin();
    const user = (session.user as any) || {};
    const actor = {
      id: user.id,
      name: user.name || "Admin",
      email: user.email || "admin@kvjfinledger.internal",
      role: user.role || "ADMIN",
    };
    const record = await DepreciationService.recordAssetDepreciation(data, actor);
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
    const session = await requireActionAdmin();
    const user = (session.user as any) || {};
    const actor = {
      id: user.id,
      name: user.name || "Admin",
      email: user.email || "admin@kvjfinledger.internal",
      role: user.role || "ADMIN",
    };
    await DepreciationService.deleteDepreciation(id, actor);
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
