"use server";

import { CustomerService, CreateCustomerInput, UpdateCustomerInput } from "@/services/customer.service";
import { revalidatePath } from "next/cache";

export async function toggleCustomerStatusAction(id: string, currentlyActive: boolean) {
  try {
    if (currentlyActive) {
      await CustomerService.deactivateCustomer(id);
    } else {
      await CustomerService.reactivateCustomer(id);
    }
    revalidatePath("/customers");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update status." };
  }
}

export async function createCustomerAction(data: CreateCustomerInput) {
  try {
    const customer = await CustomerService.createCustomer(data);
    revalidatePath("/customers");
    return { success: true, id: customer.id, customer };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create customer." };
  }
}

export async function updateCustomerAction(id: string, data: UpdateCustomerInput) {
  try {
    const customer = await CustomerService.updateCustomer(id, data);
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { success: true, id: customer.id, customer };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update customer." };
  }
}
