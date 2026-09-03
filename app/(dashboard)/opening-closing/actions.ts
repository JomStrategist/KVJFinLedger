"use server";

import { revalidatePath } from "next/cache";
import { OpeningClosingService, SaveOpeningBalanceInput } from "@/services/opening-closing.service";
import { ExpenseCategoryService } from "@/services/expense-category.service";

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

export async function getCategoriesAction() {
  try {
    const cats = await ExpenseCategoryService.getExpenseCategories({ isActive: true });
    return { success: true, data: cats };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch categories." };
  }
}

export async function createCategoryForOpeningAction(data: {
  name: string;
  financialType: string;
  statementGroup?: string;
  accountNature?: string;
}) {
  try {
    const cat = await ExpenseCategoryService.createExpenseCategory({
      name: data.name,
      financialType: data.financialType,
      statementGroup: data.statementGroup || null,
      accountNature: data.accountNature || null,
      isActive: true,
    });
    revalidatePath("/opening-closing");
    revalidatePath("/masters");
    return { success: true, data: cat };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create category." };
  }
}

