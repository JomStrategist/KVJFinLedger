"use client";

import { useState, useEffect } from "react";
import { recordExpensePaymentAction } from "./actions";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: any;
  bankAccounts: any[];
  onSuccess: () => void;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  expense,
  bankAccounts = [],
  onSuccess,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<string>("BANK_TRANSFER");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReimbursement = Boolean(expense?.paidBy === "EMPLOYEE");
  const remainingPayable = Number(expense?.balancePayable || 0);

  const [isTdsDeducted, setIsTdsDeducted] = useState<boolean>(false);
  const [tdsSection, setTdsSection] = useState<string>("194J");
  const [tdsRate, setTdsRate] = useState<string>("10");
  const [tdsAmount, setTdsAmount] = useState<string>("0");

  useEffect(() => {
    if (expense) {
      setAmount(remainingPayable.toString());
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setReferenceNumber("");
      setNotes("");
      setError(null);

      const hasInitialTds = Number(expense.tdsRate || 0) > 0 || Number(expense.tdsAmount || 0) > 0;
      setIsTdsDeducted(hasInitialTds);
      setTdsSection(expense.tdsSection || "194J");
      const defaultRate = expense.tdsRate ? expense.tdsRate.toString() : "10";
      setTdsRate(defaultRate);
      if (hasInitialTds) {
        const computed = Math.round(remainingPayable * (Number(defaultRate) / 100) * 100) / 100;
        setTdsAmount(computed.toString());
      } else {
        setTdsAmount("0");
      }

      // Select primary bank or first available
      const primary = bankAccounts.find((b) => b.isPrimary) || bankAccounts[0];
      if (primary) {
        setBankAccountId(primary.id);
      }
    }
  }, [expense, remainingPayable, bankAccounts]);

  const handleTdsToggle = (checked: boolean) => {
    setIsTdsDeducted(checked);
    if (checked) {
      const rate = Number(tdsRate) || 10;
      const computed = Math.round(Number(amount || 0) * (rate / 100) * 100) / 100;
      setTdsAmount(computed.toString());
    } else {
      setTdsAmount("0");
    }
  };

  const handleTdsRateChange = (newRate: string) => {
    setTdsRate(newRate);
    const rate = Number(newRate) || 0;
    const computed = Math.round(Number(amount || 0) * (rate / 100) * 100) / 100;
    setTdsAmount(computed.toString());
  };

  if (!isOpen || !expense) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }

    if (numAmount > remainingPayable + 0.01) {
      setError(
        `Payment amount (₹${numAmount.toLocaleString(
          "en-IN"
        )}) cannot exceed remaining payable (₹${remainingPayable.toLocaleString(
          "en-IN"
        )}).`
      );
      return;
    }

    if (!bankAccountId) {
      setError("Please select a disbursement bank account.");
      return;
    }

    const numTdsAmount = isTdsDeducted ? Number(tdsAmount || 0) : 0;
    if (isTdsDeducted && (numTdsAmount < 0 || numTdsAmount >= numAmount)) {
      setError("TDS deduction must be greater than zero and less than the total payment settlement amount.");
      return;
    }

    const bankPayment = isTdsDeducted ? Math.max(0, numAmount - numTdsAmount) : numAmount;

    setIsSubmitting(true);
    try {
      const res = await recordExpensePaymentAction({
        expenseId: expense.id,
        amount: numAmount,
        paymentDate,
        bankAccountId,
        paymentMode,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        isReimbursement,
        isTdsDeducted,
        tdsRate: isTdsDeducted ? Number(tdsRate || 0) : 0,
        tdsAmount: numTdsAmount,
        tdsSection: isTdsDeducted ? tdsSection : undefined,
        bankPayment,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Failed to record payment.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const payeeName =
    expense.vendor?.name ||
    expense.employee?.name ||
    (expense.paidBy === "EMPLOYEE" ? "Employee" : "Vendor");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-[#D9E3DC] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E9EEE9] flex justify-between items-center bg-[#F9FAF8]">
          <div>
            <h2 className="text-base font-bold text-[#17211B] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1b5e4b]" />
              {isReimbursement
                ? "Disburse Employee Reimbursement"
                : "Record Vendor Expense Payment"}
            </h2>
            <p className="text-xs text-[#68756C] mt-0.5">
              Ref: <span className="font-semibold text-[#17211B]">{expense.expenseNumber}</span> · Payee:{" "}
              <span className="font-semibold text-[#17211B]">{payeeName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Balance Summary Card */}
        <div className="p-6 pb-2">
          <div className="grid grid-cols-3 gap-3 bg-[#F4F7F3] p-3.5 rounded-xl border border-[#E0E7E2] text-center">
            <div>
              <div className="text-[10px] font-bold text-[#738078] uppercase">Net Expense</div>
              <div className="text-xs font-bold text-[#17211B] mt-0.5">
                ₹{Number(expense.netAmount || 0).toLocaleString("en-IN")}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#738078] uppercase">Paid So Far</div>
              <div className="text-xs font-bold text-[#0B5F46] mt-0.5">
                ₹{Number(expense.paidAmount || 0).toLocaleString("en-IN")}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#B27A17] uppercase">Outstanding</div>
              <div className="text-xs font-extrabold text-[#B27A17] mt-0.5">
                ₹{remainingPayable.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="p-6 pt-3 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              ⚠️ {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#17211B] mb-1">
                Disbursement Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remainingPayable}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1b5e4b]"
                placeholder="Enter amount"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#17211B] mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1b5e4b]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#17211B] mb-1">
              Disbursing Bank Account <span className="text-red-500">*</span>
            </label>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              required
              className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1b5e4b] bg-white text-[#17211B]"
            >
              <option value="">-- Select Bank Account --</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bankName} ({b.accountName}) · A/c {b.accountNumber ? `••••${b.accountNumber.slice(-4)}` : ""}
                  {b.isPrimary ? " [Primary]" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#17211B] mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1b5e4b] bg-white text-[#17211B]"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CORPORATE_CARD">Corporate Card</option>
                <option value="REIMBURSEMENT">Direct Reimbursement</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#17211B] mb-1">
                UTR / Reference No.
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UTR10293848"
                className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1b5e4b]"
              />
            </div>
          </div>

          {!isReimbursement && (
            <div className="p-3 bg-[#F4F7F3] rounded-xl border border-[#E0E7E2] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#17211B] flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTdsDeducted}
                    onChange={(e) => handleTdsToggle(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1b5e4b] focus:ring-[#1b5e4b]"
                  />
                  <span>Deduct Vendor TDS at Payment</span>
                </label>
                {isTdsDeducted && (
                  <span className="text-[10px] font-bold text-[#1b5e4b] bg-[#E2ECE6] px-2 py-0.5 rounded-full">
                    Withholding Active
                  </span>
                )}
              </div>

              {isTdsDeducted && (
                <div className="pt-2 border-t border-[#D9E3DC] space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[#68756C] mb-1">
                        TDS Section
                      </label>
                      <select
                        value={tdsSection}
                        onChange={(e) => {
                          const sec = e.target.value;
                          setTdsSection(sec);
                          if (sec === "194C") handleTdsRateChange("2");
                          else if (sec === "194J") handleTdsRateChange("10");
                          else if (sec === "194I") handleTdsRateChange("10");
                          else if (sec === "194H") handleTdsRateChange("5");
                        }}
                        className="w-full h-8 px-2 border border-[#D9E3DC] rounded-lg text-xs font-semibold bg-white"
                      >
                        <option value="194J">194J (Prof./Tech - 10%)</option>
                        <option value="194C">194C (Contractors - 2%)</option>
                        <option value="194I">194I (Rent - 10%)</option>
                        <option value="194H">194H (Commission - 5%)</option>
                        <option value="OTHER">Other / Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#68756C] mb-1">
                        TDS Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={tdsRate}
                        onChange={(e) => handleTdsRateChange(e.target.value)}
                        className="w-full h-8 px-2 border border-[#D9E3DC] rounded-lg text-xs font-semibold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#68756C] mb-1">
                        TDS Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={tdsAmount}
                        onChange={(e) => setTdsAmount(e.target.value)}
                        className="w-full h-8 px-2 border border-[#D9E3DC] rounded-lg text-xs font-semibold bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1 text-[#45544A]">
                    <span>Net Bank Outflow:</span>
                    <span className="font-bold text-[#17211B]">
                      ₹{Math.max(0, Number(amount || 0) - Number(tdsAmount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#17211B] mb-1">
              Internal Notes / Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid via HDFC net banking batch"
              className="w-full h-10 px-3 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1b5e4b]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-[#E9EEE9]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-[#68756C] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[#1b5e4b] hover:bg-[#136f58] rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>Recording...</>
              ) : (
                <>
                  Confirm & Disburse ₹
                  {(isTdsDeducted
                    ? Math.max(0, Number(amount || 0) - Number(tdsAmount || 0))
                    : Number(amount || 0)
                  ).toLocaleString("en-IN")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
