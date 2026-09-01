"use server";

import { revalidatePath } from "next/cache";
import { TaxInvoiceService } from "@/services/tax-invoice.service";

export async function convertProformaToTaxInvoiceAction(proformaId: string) {
  try {
    const invoice = await TaxInvoiceService.convertProformaToTaxInvoice(proformaId);
    revalidatePath("/invoices");
    revalidatePath("/finance");
    revalidatePath("/dashboard");
    revalidatePath(`/proforma-invoices/${proformaId}`);
    return { success: true, data: invoice };
  } catch (error: any) {
    console.error("Failed to convert invoice:", error);
    return { success: false, error: error.message || "Unable to convert Proforma Invoice to Tax Invoice. Please try again." };
  }
}

export async function cancelTaxInvoiceAction(id: string, reason: string) {
  try {
    const invoice = await TaxInvoiceService.cancelTaxInvoice(id, reason);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return { success: true, data: invoice };
  } catch (error: any) {
    console.error("Failed to cancel invoice:", error);
    return { success: false, error: error.message || "Failed to cancel invoice." };
  }
}

export async function recordInvoicePaymentAction(
  invoiceId: string,
  payload: {
    paymentDate: string;
    paymentAmount: number;
    isTdsDeducted: boolean;
    tdsRate: number;
    tdsAmount: number;
    bankReceipt: number;
    reference?: string;
    remarks?: string;
  }
) {
  try {
    const payment = await TaxInvoiceService.recordPayment(invoiceId, payload);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/finance");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true, data: payment };
  } catch (error: any) {
    console.error("Failed to record invoice payment:", error);
    return { success: false, error: error.message || "Failed to record payment." };
  }
}
