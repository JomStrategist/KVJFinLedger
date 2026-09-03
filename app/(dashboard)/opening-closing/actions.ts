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

// Only Balance Sheet categories are valid for opening balances.
// P&L types (INCOME, EXPENSE) are period-specific and never carry forward.
const BALANCE_SHEET_TYPES = ["ASSET", "LIABILITY", "EQUITY"];

export async function getBalanceSheetCategoriesAction() {
  try {
    const allCats = await ExpenseCategoryService.getExpenseCategories({ isActive: true });
    const bsCats = (allCats as any[]).filter((c) =>
      BALANCE_SHEET_TYPES.includes((c.financialType || "").toUpperCase())
    );
    return { success: true, data: bsCats };
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

