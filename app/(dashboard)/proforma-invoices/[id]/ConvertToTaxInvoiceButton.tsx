"use client";

import { useState, useTransition } from "react";
import { convertProformaToTaxInvoiceAction } from "@/app/(dashboard)/invoices/actions";
import { useRouter } from "next/navigation";

export function ConvertToTaxInvoiceButton({ proformaId }: { proformaId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleConvert = () => {
    setError(null);
    startTransition(async () => {
      const res = await convertProformaToTaxInvoiceAction(proformaId);
      if (res.success && res.data) {
        // Redirect to the newly generated Tax Invoice
        router.push(`/invoices/${res.data.id}`);
      } else {
        setError(res.error || "An error occurred");
      }
    });
  };

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={() => { setShowConfirm(true); setError(null); }}
          className="px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:bg-theme-primary-dark transition-colors shadow-sm"
        >
          Convert to Tax Invoice
        </button>
        {error && !showConfirm && <p className="text-xs text-red-600 font-medium max-w-xs text-right">{error}</p>}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-theme-surface rounded-xl border border-theme-border p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-theme-border pb-3">
              <h3 className="text-lg font-bold text-theme-text">Confirm and Finalize</h3>
              <button
                onClick={() => { setShowConfirm(false); setError(null); }}
                disabled={isPending}
                className="text-theme-text-muted hover:text-theme-text p-1 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 text-sm text-theme-text">
              <p className="leading-relaxed">
                Are you sure you want to convert this Proforma Invoice into a Tax Invoice? Once finalized, the invoice will be confirmed and cannot be edited normally.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-theme-border">
              <button
                type="button"
                onClick={() => { setShowConfirm(false); setError(null); }}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-theme-text bg-theme-surface border border-theme-border rounded-lg hover:bg-theme-surface-hover disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConvert}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-theme-primary hover:bg-theme-primary-dark rounded-lg flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {isPending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Confirm and Finalize
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
