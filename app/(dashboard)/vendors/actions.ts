"use server";

import { revalidatePath } from "next/cache";
import { VendorService } from "@/services/vendor.service";
import { requireActionAuth } from "@/lib/auth-utils";

export async function createVendorAction(data: any) {
  try {
    await requireActionAuth();
    const vendor = await VendorService.createVendor(data);
    revalidatePath("/vendors");
    return { success: true, data: vendor };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create vendor." };
  }
}

export async function updateVendorAction(id: string, data: any) {
  try {
    await requireActionAuth();
    const vendor = await VendorService.updateVendor(id, data);
    revalidatePath("/vendors");
    revalidatePath(`/vendors/${id}`);
    return { success: true, data: vendor };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update vendor." };
  }
}

export async function toggleVendorStatusAction(id: string, isActive: boolean) {
  try {
    await requireActionAuth();
    await VendorService.toggleVendorStatus(id, isActive);
    revalidatePath("/vendors");
    revalidatePath(`/vendors/${id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to toggle status." };
  }
}
