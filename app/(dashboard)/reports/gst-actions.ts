"use server";

import { revalidatePath } from "next/cache";
import { GstFilingService, RecordGstFilingInput } from "@/services/gst-filing.service";
import { GstSettlementService, CreateGstSettlementInput } from "@/services/gst-settlement.service";
import { requireActionAuth, requireActionAdmin } from "@/lib/auth-utils";

export async function recordGstFilingAction(data: RecordGstFilingInput) {
  try {
    await requireActionAuth();
    const result = await GstFilingService.recordGstFiling(data);
    revalidatePath("/reports");
    revalidatePath("/dashboard");
    revalidatePath("/finance");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error recording GST filing:", error);
    return { success: false, error: error.message || "Failed to record GST filing" };
  }
}

export async function deleteGstFilingAction(id: string) {
  try {
    await requireActionAdmin();
    await GstFilingService.deleteGstFiling(id);
    revalidatePath("/reports");
    revalidatePath("/dashboard");
    revalidatePath("/finance");
    return { success: true };
  } catch (error: any) {
    console.error("Error reopening GST filing:", error);
    return { success: false, error: error.message || "Failed to delete GST filing" };
  }
}

export async function createGstSettlementAction(data: CreateGstSettlementInput) {
  try {
    const session = await requireActionAuth();
    const user = (session.user as any) || {};
    const actor = {
      id: user.id,
      name: user.name || "User",
      email: user.email || "user@kvjfinledger.internal",
      role: user.role || "USER",
    };
    const result = await GstSettlementService.createSettlement(data, actor);
    revalidatePath("/reports");
    revalidatePath("/dashboard");
    revalidatePath("/finance");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error creating GST settlement:", error);
    return { success: false, error: error.message || "Failed to create GST settlement" };
  }
}

export async function deleteGstSettlementAction(id: string) {
  try {
    const session = await requireActionAdmin();
    const user = (session.user as any) || {};
    const actor = {
      id: user.id,
      name: user.name || "Admin",
      email: user.email || "admin@kvjfinledger.internal",
      role: user.role || "ADMIN",
    };
    await GstSettlementService.deleteSettlement(id, actor);
    revalidatePath("/reports");
    revalidatePath("/dashboard");
    revalidatePath("/finance");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting GST settlement:", error);
    return { success: false, error: error.message || "Failed to delete GST settlement" };
  }
}
