"use server";

import { revalidatePath } from "next/cache";
import { AssetDisposalService, CreateDisposalInput } from "@/services/asset-disposal.service";
import { requireActionAdmin } from "@/lib/auth-utils";

export async function createAssetDisposalAction(data: CreateDisposalInput) {
  try {
    const session = await requireActionAdmin();
    const user = (session.user as any) || {};
    const actor = {
      id: user.id,
      name: user.name || "Admin",
      email: user.email || "admin@kvjfinledger.internal",
      role: user.role || "ADMIN",
    };
    const disposal = await AssetDisposalService.createDisposal(data, actor);
    revalidatePath("/reports");
    revalidatePath("/expenses");
    revalidatePath("/profit-loss");
    revalidatePath("/reports/balance-sheet");
    revalidatePath("/dashboard");
    return { success: true, data: disposal };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to record asset disposal." };
  }
}

export async function deleteAssetDisposalAction(id: string) {
  try {
    const session = await requireActionAdmin();
    const user = (session.user as any) || {};
    const actor = {
      id: user.id,
      name: user.name || "Admin",
      email: user.email || "admin@kvjfinledger.internal",
      role: user.role || "ADMIN",
    };
    await AssetDisposalService.deleteDisposal(id, actor);
    revalidatePath("/reports");
    revalidatePath("/expenses");
    revalidatePath("/profit-loss");
    revalidatePath("/reports/balance-sheet");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete asset disposal." };
  }
}
