"use server";

import { ProformaInvoiceService, CreateProformaInvoiceInput } from "@/services/proforma-invoice.service";
import { ProformaInvoiceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireActionAuth } from "@/lib/auth-utils";

export async function createProformaInvoiceAction(data: any) {
  try {
    await requireActionAuth();
    const invoice = await ProformaInvoiceService.createProformaInvoiceWithUnits(data);
    revalidatePath("/invoices");
    return { success: true, id: invoice.id };
  } catch (error: any) {
    console.error("Create Invoice Error:", error);
    return { success: false, error: error.message || "Failed to create invoice." };
  }
}

export async function updateProformaInvoiceAction(id: string, data: any) {
  try {
    await requireActionAuth();
    const invoice = await ProformaInvoiceService.updateProformaInvoice(id, data);
    revalidatePath("/invoices");
    revalidatePath(`/proforma-invoices/${id}`);
    return { success: true, id: invoice.id };
  } catch (error: any) {
    console.error("Update Invoice Error:", error);
    return { success: false, error: error.message || "Failed to update invoice." };
  }
}

export async function updateProformaInvoiceStatusAction(id: string, status: ProformaInvoiceStatus) {
  try {
    await requireActionAuth();
    await ProformaInvoiceService.updateStatus(id, status);
    revalidatePath("/invoices");
    revalidatePath(`/proforma-invoices/${id}`);
    return { success: true };
  } catch (error: any) {
    console.error("Update Status Error:", error);
    return { success: false, error: error.message || "Failed to update invoice status." };
  }
}
