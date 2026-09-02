"use server";

import { revalidatePath } from "next/cache";
import { CustomerService } from "@/services/customer.service";
import { VendorService } from "@/services/vendor.service";
import { ProductService } from "@/services/product.service";
import { ExpenseCategoryService } from "@/services/expense-category.service";
import { ChartOfAccountsService } from "@/services/chart-of-accounts.service";

export async function createCustomerMasterAction(data: any) {
  try {
    const cust = await CustomerService.createCustomer(data);
    revalidatePath("/masters");
    revalidatePath("/customers");
    return { success: true, data: cust };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create customer." };
  }
}

export async function updateCustomerMasterAction(id: string, data: any) {
  try {
    const cust = await CustomerService.updateCustomer(id, data);
    revalidatePath("/masters");
    revalidatePath("/customers");
    return { success: true, data: cust };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update customer." };
  }
}

export async function createVendorMasterAction(data: any) {
  try {
    const ven = await VendorService.createVendor(data);
    revalidatePath("/masters");
    revalidatePath("/vendors");
    return { success: true, data: ven };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create vendor." };
  }
}

export async function updateVendorMasterAction(id: string, data: any) {
  try {
    const ven = await VendorService.updateVendor(id, data);
    revalidatePath("/masters");
    revalidatePath("/vendors");
    return { success: true, data: ven };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update vendor." };
  }
}

export async function createProductMasterAction(data: any) {
  try {
    const prod = await ProductService.createProduct(data);
    revalidatePath("/masters");
    revalidatePath("/products");
    return { success: true, data: prod };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create product." };
  }
}

export async function updateProductMasterAction(id: string, data: any) {
  try {
    const prod = await ProductService.updateProduct(id, data);
    revalidatePath("/masters");
    revalidatePath("/products");
    return { success: true, data: prod };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update product." };
  }
}

export async function createCategoryMasterAction(data: any) {
  try {
    const cat = await ExpenseCategoryService.createExpenseCategory(data);
    revalidatePath("/masters");
    revalidatePath("/expenses");
    return { success: true, data: cat };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create category." };
  }
}

export async function updateCategoryMasterAction(id: string, data: any) {
  try {
    const cat = await ExpenseCategoryService.updateExpenseCategory(id, data);
    revalidatePath("/masters");
    revalidatePath("/expenses");
    return { success: true, data: cat };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update category." };
  }
}

export async function toggleCategoryStatusAction(id: string, isActive: boolean) {
  try {
    const cat = await ExpenseCategoryService.toggleExpenseCategoryStatus(id, isActive);
    revalidatePath("/masters");
    revalidatePath("/expenses");
    return { success: true, data: cat };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to toggle category status." };
  }
}

export async function getFinancialTypesAction() {
  try {
    const types = await ChartOfAccountsService.getFinancialTypes();
    return { success: true, data: types };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch financial types." };
  }
}

export async function getStatementGroupsAction(financialTypeCode?: string) {
  try {
    const groups = await ChartOfAccountsService.getStatementGroups(financialTypeCode);
    return { success: true, data: groups };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch statement groups." };
  }
}

export async function getAccountNaturesAction(financialTypeCode?: string) {
  try {
    const natures = await ChartOfAccountsService.getAccountNatures(financialTypeCode);
    return { success: true, data: natures };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch account natures." };
  }
}

export async function createStatementGroupAction(data: { name: string; financialTypeCode: string; code?: string }) {
  try {
    const grp = await ChartOfAccountsService.createStatementGroup(data);
    revalidatePath("/masters");
    return { success: true, data: grp };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create statement group." };
  }
}

export async function createAccountNatureAction(data: { name: string; financialTypeCode: string; code?: string }) {
  try {
    const nat = await ChartOfAccountsService.createAccountNature(data);
    revalidatePath("/masters");
    return { success: true, data: nat };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create account nature." };
  }
}
