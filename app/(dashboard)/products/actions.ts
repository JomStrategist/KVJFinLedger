"use server";

import { ProductService, CreateProductInput, UpdateProductInput } from "@/services/product.service";
import { revalidatePath } from "next/cache";
import { requireActionAuth } from "@/lib/auth-utils";

export async function toggleProductStatusAction(id: string, currentlyActive: boolean) {
  try {
    await requireActionAuth();
    if (currentlyActive) {
      await ProductService.deactivateProduct(id);
    } else {
      await ProductService.reactivateProduct(id);
    }
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update status." };
  }
}

export async function createProductAction(data: CreateProductInput) {
  try {
    await requireActionAuth();
    const product = await ProductService.createProduct(data);
    revalidatePath("/products");
    return { success: true, id: product.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create product." };
  }
}

export async function updateProductAction(id: string, data: UpdateProductInput) {
  try {
    await requireActionAuth();
    const product = await ProductService.updateProduct(id, data);
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    return { success: true, id: product.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update product." };
  }
}
