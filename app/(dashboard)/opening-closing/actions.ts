"use server";

import { revalidatePath } from "next/cache";
import { OpeningClosingService, SaveOpeningBalanceInput } from "@/services/opening-closing.service";

export async function saveOpeningBalanceAction(data: SaveOpeningBalanceInput) {
  try {
    const res = await OpeningClosingService.saveOpeningBalance(data);
    revalidatePath("/opening-closing");
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save opening balance." };
  }
}

export async function deleteOpeningBalanceAction(id: string) {
  try {
    await OpeningClosingService.deleteOpeningBalance(id);
    revalidatePath("/opening-closing");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete opening balance." };
  }
}
