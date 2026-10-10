"use client";

import { useState, useTransition } from "react";
import { approveExpenseAction, cancelExpenseAction, updatePaymentStatusAction } from "../actions";
import { RecordPaymentModal } from "../RecordPaymentModal";
import { PaymentStatus } from "@prisma/client";
import { useRouter } from "next/navigation";

export function ExpenseActions({
  expense,
  bankAccounts = [],
}: {
  expense: any;
  bankAccounts: any[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const status = expense.status;
  const paymentStatus = expense.paymentStatus;
  const remainingPayable = Number(expense.balancePayable || 0);
  const isReimbursement = expense.paidBy === "EMPLOYEE";

  const handleApprove = () => {
    if (
      confirm(
        "Are you sure you want to approve this expense? This action will generate the permanent journal voucher."
      )
    ) {
      startTransition(async () => {
        await approveExpenseAction(expense.id);
        router.refresh();
      });
    }
  };

  const handleCancel = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await cancelExpenseAction(expense.id, cancelReason);
      if (res.success) {
        setShowCancelModal(false);
        router.refresh();
      } else {
        alert(res.error || "Failed to cancel expense.");
      }
    });
  };

  const handlePaymentStatus = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as PaymentStatus;
    if (confirm(`Are you sure you want to mark this expense as ${newStatus.replace("_", " ")}?`)) {
      startTransition(async () => {
        await updatePaymentStatusAction(expense.id, newStatus);
        router.refresh();
      });
    }
  };

  return (
    <div className="flex gap-2 items-center">
      {/* Draft Approval */}
      {status === "DRAFT" && (
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="px-4 py-2 bg-[#1b5e4b] text-white rounded-xl text-xs font-bold hover:bg-[#136f58] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isPending ? "Processing..." : "Approve Expense"}
        </button>
      )}

      {/* Record Payment / Reimbursement Button */}
      {status === "APPROVED" && remainingPayable > 0.01 && (
        <button
          type="button"
          onClick={() => setShowPaymentModal(true)}
          className="px-4 py-2 bg-[#1b5e4b] hover:bg-[#136f58] text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          💳 {isReimbursement ? "Disburse Reimbursement" : "Record Payment"}
        </button>
      )}

      {/* Payment Status Dropdown for manual override */}
      {status === "APPROVED" && (
        <select
          value={paymentStatus}
          onChange={handlePaymentStatus}
          disabled={isPending}
          className="px-3 py-2 border border-[#D9E3DC] rounded-xl text-xs font-semibold bg-white text-[#17211B] focus:ring-2 focus:ring-[#1b5e4b] disabled:opacity-50"
        >
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Fully Paid</option>
        </select>
      )}

      {/* Cancel Expense Button */}
      {status !== "CANCELLED" && paymentStatus !== "PAID" && (
        <button
          onClick={() => setShowCancelModal(true)}
          disabled={isPending}
          className="px-3 py-2 border border-red-200 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
        >
          Cancel
        </button>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-[#D9E3DC] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E9EEE9] bg-[#F9FAF8]">
              <h3 className="text-sm font-bold text-[#17211B]">Cancel Expense</h3>
              <p className="text-xs text-[#68756C] mt-0.5">
                Provide a reason for cancelling this transaction.
              </p>
            </div>

            <form onSubmit={handleCancel} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#17211B] mb-1">
                  Cancellation Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  className="w-full border border-[#D9E3DC] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#1b5e4b]"
                  placeholder="e.g. Duplicate voucher, incorrect invoice received from vendor..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E9EEE9]">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#68756C] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {isPending ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <RecordPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          expense={expense}
          bankAccounts={bankAccounts}
          onSuccess={() => {
            setShowPaymentModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
