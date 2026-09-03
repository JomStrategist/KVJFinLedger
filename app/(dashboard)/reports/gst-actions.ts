"use server";

import { revalidatePath } from "next/cache";
import { GstFilingService, RecordGstFilingInput } from "@/services/gst-filing.service";
import { requireAuth } from "@/lib/auth-utils";

export async function recordGstFilingAction(data: RecordGstFilingInput) {
  try {
    await requireAuth();
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
    await requireAuth();
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
