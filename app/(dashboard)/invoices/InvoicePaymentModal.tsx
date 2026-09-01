"use client";

import { useState, useTransition } from "react";
import { recordInvoicePaymentAction } from "./actions";

export function InvoicePaymentModal({
  invoice,
  onClose,
  onSuccess,
}: {
  invoice: any;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Existing payments calculation
  const payments: any[] = invoice.payments || [];
  const totalPaidAmount = payments.reduce((sum, p) => sum + Number(p.paymentAmount), 0);
  const totalTdsDeducted = payments.reduce((sum, p) => sum + Number(p.tdsAmount), 0);
  const totalSettled = totalPaidAmount + totalTdsDeducted;
  const invoiceTotal = Number(invoice.grossAmount || invoice.netAmount);
  const outstanding = Math.max(0, invoiceTotal - totalSettled);

  // Form State for new payment
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentAmount, setPaymentAmount] = useState<number>(outstanding);
  const [isTdsDeducted, setIsTdsDeducted] = useState(Number(invoice.tdsAmount) > 0);
  const [tdsRate, setTdsRate] = useState<number>(Number(invoice.tdsRate) || (isTdsDeducted ? 10 : 0));
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");

  // Calculated values
  const calculatedTdsAmount = isTdsDeducted ? (paymentAmount * tdsRate) / 100 : 0;
  const calculatedBankReceipt = Math.max(0, paymentAmount - calculatedTdsAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (paymentAmount <= 0) {
      setError("Payment amount must be greater than 0.");
      return;
    }

    if (paymentAmount > outstanding + 1) { // allow small 1 rupee tolerance
      setError(`Payment amount cannot exceed outstanding balance of ₹${outstanding.toFixed(2)}.`);
      return;
    }

    startTransition(async () => {
      const res = await recordInvoicePaymentAction(invoice.id, {
        paymentDate,
        paymentAmount,
        isTdsDeducted,
        tdsRate: isTdsDeducted ? tdsRate : 0,
        tdsAmount: calculatedTdsAmount,
        bankReceipt: calculatedBankReceipt,
        reference: reference.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });

      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="bg-theme-surface w-full max-w-2xl rounded-2xl shadow-xl border border-theme-border overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-theme-border flex justify-between items-center bg-theme-surface">
          <div>
            <span className="text-[11px] font-bold text-theme-primary uppercase tracking-wider">
              Payment Settlement
            </span>
            <h2 className="text-xl font-bold text-theme-text mt-0.5">
              Record Payment for {invoice.invoiceNumber}
            </h2>
            <p className="text-xs text-theme-text-muted">
              {invoice.customerNameSnapshot || invoice.customer?.legalName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-theme-text-muted hover:text-theme-text p-2 rounded-lg hover:bg-theme-surface-hover transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Invoice Summary 4-card row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-theme-surface-hover/70 p-3.5 rounded-xl border border-theme-border">
              <span className="text-[10px] font-bold uppercase text-theme-text-muted tracking-wider">
                Invoice Total
              </span>
              <p className="text-base font-bold text-theme-text mt-1">
                ₹{invoiceTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-theme-surface-hover/70 p-3.5 rounded-xl border border-theme-border">
              <span className="text-[10px] font-bold uppercase text-theme-text-muted tracking-wider">
                Total Received
              </span>
              <p className="text-base font-bold text-emerald-600 mt-1">
                ₹{totalPaidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-theme-surface-hover/70 p-3.5 rounded-xl border border-theme-border">
              <span className="text-[10px] font-bold uppercase text-theme-text-muted tracking-wider">
                Actual TDS
              </span>
              <p className="text-base font-bold text-theme-text mt-1">
                ₹{totalTdsDeducted.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-theme-surface-hover/70 p-3.5 rounded-xl border border-theme-border">
              <span className="text-[10px] font-bold uppercase text-theme-text-muted tracking-wider">
                Outstanding
              </span>
              <p className={`text-base font-bold mt-1 ${outstanding > 0 ? "text-red-600" : "text-emerald-600"}`}>
                ₹{outstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Payment History List if any */}
          {payments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-theme-text uppercase tracking-wider">
                Payment History ({payments.length})
              </h3>
              <div className="border border-theme-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-theme-surface-hover border-b border-theme-border text-theme-text-muted font-semibold uppercase">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2 text-right">Payment</th>
                      <th className="px-3 py-2 text-right">TDS Deducted</th>
                      <th className="px-3 py-2 text-right">Bank Receipt</th>
                      <th className="px-3 py-2">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border">
                    {payments.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-theme-surface-hover/40">
                        <td className="px-3 py-2 font-semibold text-theme-text">Payment {idx + 1}</td>
                        <td className="px-3 py-2 text-theme-text-muted">
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-theme-text">
                          ₹{Number(p.paymentAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right text-theme-text-muted">
                          ₹{Number(p.tdsAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                          ₹{Number(p.bankReceipt).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-theme-text-muted truncate max-w-[120px]">
                          {p.reference || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add Payment Form */}
          {outstanding > 0 ? (
            <form id="payment-form" onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-theme-border">
              <h3 className="text-xs font-bold text-theme-text uppercase tracking-wider">
                Record New Payment
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-theme-text mb-1">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-theme-text mb-1">
                    Payment Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={outstanding}
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface font-semibold"
                  />
                </div>
              </div>

              {/* TDS Actual Deduction */}
              <div className="bg-theme-surface-hover/50 p-3.5 rounded-xl border border-theme-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-theme-text">
                      Was TDS Deducted by Customer?
                    </label>
                    <p className="text-[11px] text-theme-text-muted">
                      Track actual TDS deducted for Form 26AS reconciliation.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsTdsDeducted(false)}
                      className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${
                        !isTdsDeducted
                          ? "bg-theme-surface text-theme-text font-bold border-theme-primary shadow-xs"
                          : "text-theme-text-muted border-theme-border"
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsTdsDeducted(true);
                        if (tdsRate === 0) setTdsRate(10);
                      }}
                      className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${
                        isTdsDeducted
                          ? "bg-theme-primary text-white font-bold border-theme-primary shadow-xs"
                          : "text-theme-text-muted border-theme-border"
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>

                {isTdsDeducted && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-theme-border">
                    <div>
                      <label className="block text-[11px] font-medium text-theme-text mb-1">
                        TDS Rate (%)
                      </label>
                      <select
                        value={tdsRate}
                        onChange={(e) => setTdsRate(Number(e.target.value))}
                        className="w-full border border-theme-border rounded-lg px-2.5 py-1.5 text-xs bg-theme-surface"
                      >
                        <option value="1">1% (Sec 194C Indiv)</option>
                        <option value="2">2% (Sec 194C / 194J tech)</option>
                        <option value="5">5% (Sec 194H)</option>
                        <option value="10">10% (Sec 194J Prof)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-theme-text mb-1">
                        TDS Amount (₹)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={`₹${calculatedTdsAmount.toFixed(2)}`}
                        className="w-full border border-theme-border rounded-lg px-2.5 py-1.5 text-xs bg-theme-surface-hover text-theme-text font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-theme-text mb-1">
                        Actual Bank Receipt (₹)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={`₹${calculatedBankReceipt.toFixed(2)}`}
                        className="w-full border border-theme-border rounded-lg px-2.5 py-1.5 text-xs bg-theme-surface-hover text-emerald-600 font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* UTR / Reference and Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-theme-text mb-1">
                    UTR / Bank Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-AXIS-98234"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-theme-text mb-1">
                    Remarks / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NEFT transfer received"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface"
                  />
                </div>
              </div>
            </form>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium text-center">
              ✓ This invoice is fully settled and paid in full.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-theme-border flex justify-end items-center gap-3 bg-theme-surface">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-theme-border rounded-lg text-xs font-medium hover:bg-theme-surface-hover text-theme-text"
          >
            Close
          </button>
          {outstanding > 0 && (
            <button
              type="submit"
              form="payment-form"
              disabled={isPending}
              className="px-5 py-2 bg-theme-primary hover:bg-theme-primary-dark text-white rounded-lg text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              {isPending ? "Recording Payment..." : "Save Payment"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
