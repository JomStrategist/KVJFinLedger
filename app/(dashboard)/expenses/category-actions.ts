"use server";

import { revalidatePath } from "next/cache";
import { ExpenseCategoryService, CreateCategoryInput } from "@/services/expense-category.service";

function revalidateCategoryRoutes() {
  revalidatePath("/expenses");
  revalidatePath("/expenses?tab=categories");
  revalidatePath("/masters");
  revalidatePath("/reports");
}

export async function createExpenseCategoryAction(data: CreateCategoryInput) {
  try {
    const category = await ExpenseCategoryService.createExpenseCategory(data);
    revalidateCategoryRoutes();
    return { success: true, data: JSON.parse(JSON.stringify(category)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create category." };
  }
}

export async function updateExpenseCategoryAction(id: string, data: Partial<CreateCategoryInput>) {
  try {
    const category = await ExpenseCategoryService.updateExpenseCategory(id, data);
    revalidateCategoryRoutes();
    return { success: true, data: JSON.parse(JSON.stringify(category)) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update category." };
  }
}

export async function toggleExpenseCategoryStatusAction(id: string, isActive: boolean) {
  try {
    await ExpenseCategoryService.toggleExpenseCategoryStatus(id, isActive);
    revalidateCategoryRoutes();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to toggle status." };
  }
}

export async function deleteExpenseCategoryAction(id: string) {
  try {
    await ExpenseCategoryService.deleteExpenseCategory(id);
    revalidateCategoryRoutes();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete category." };
  }
}

export async function seedCategoriesAction() {
  try {
    const count = await ExpenseCategoryService.seedDefaultCategories();
    revalidateCategoryRoutes();
    return { success: true, data: count };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to seed categories." };
  }
}

