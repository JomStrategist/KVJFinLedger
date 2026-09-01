"use client";

import { useState } from "react";
import { CancelInvoiceButton } from "./CancelInvoiceButton";
import { PrintButton } from "./PrintButton";
import { InvoicePaymentModal } from "../InvoicePaymentModal";
import { useRouter } from "next/navigation";

export function InvoiceDetailActions({ invoice }: { invoice: any }) {
  const router = useRouter();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {invoice.status !== "CANCELLED" && (
        <button
          type="button"
          onClick={() => setIsPaymentOpen(true)}
          className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
            invoice.status === "PAID"
              ? "bg-theme-surface-hover text-theme-text border border-theme-border"
              : "bg-theme-primary text-white hover:bg-theme-primary-dark"
          }`}
        >
          {invoice.status === "PAID" ? "View Payments" : "Record Payment"}
        </button>
      )}

      {invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
        <CancelInvoiceButton invoiceId={invoice.id} />
      )}

      <PrintButton />

      {isPaymentOpen && (
        <InvoicePaymentModal
          invoice={invoice}
          onClose={() => setIsPaymentOpen(false)}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
