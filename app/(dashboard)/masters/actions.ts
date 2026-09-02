"use server";

import { revalidatePath } from "next/cache";
import { CustomerService } from "@/services/customer.service";
import { VendorService } from "@/services/vendor.service";
import { ProductService } from "@/services/product.service";
import { ExpenseCategoryService } from "@/services/expense-category.service";

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
