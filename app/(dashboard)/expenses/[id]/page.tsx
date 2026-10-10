import { ExpenseService } from "@/services/expense.service";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ExpenseActions } from "./ExpenseActions";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const [expenseData, bankAccounts] = await Promise.all([
    ExpenseService.getExpenseById(id),
    prisma.bankAccount.findMany({ where: { isActive: true }, orderBy: { isPrimary: "desc" } }),
  ]);

  if (!expenseData) {
    notFound();
  }

  const expense = expenseData as any;
  const isReimbursement = expense.paidBy === "EMPLOYEE";
  const payments = expense.payments || [];
  const remainingPayable = Number(expense.balancePayable || 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12">
      <Link
        href="/expenses"
        className="mb-2 inline-flex items-center text-xs font-bold text-[#1b5e4b] hover:underline"
      >
        ← Back to Expenses Register
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-xs border border-[#D9E3DC]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-[#17211B]">{expense.expenseNumber}</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                expense.status === "APPROVED"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : expense.status === "DRAFT"
                  ? "bg-gray-100 text-gray-700 border border-gray-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {expense.status}
            </span>
            {expense.status !== "CANCELLED" && (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  expense.paymentStatus === "PAID"
                    ? "bg-[#E5F3EC] text-[#0B5F46]"
                    : expense.paymentStatus === "PARTIALLY_PAID"
                    ? "bg-[#FFF3D8] text-[#B27A17]"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {isReimbursement
                  ? expense.paymentStatus === "PAID"
                    ? "FULLY REIMBURSED"
                    : expense.paymentStatus === "PARTIALLY_PAID"
                    ? "PARTIALLY REIMBURSED"
                    : "REIMBURSEMENT PENDING"
                  : expense.paymentStatus.replace("_", " ")}
              </span>
            )}
            {expense.isAsset && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                CAPITALIZED ASSET (CAPEX)
              </span>
            )}
            {expense.isLoss && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                BUSINESS LOSS {expense.lossType ? `(${expense.lossType})` : ""}
              </span>
            )}
          </div>
          {expense.description && (
            <p className="text-[#68756C] text-sm mt-1">{expense.description}</p>
          )}
          {expense.billNumber && (
            <div className="text-xs text-[#738078] mt-0.5">
              Invoice / Bill Ref: <span className="font-semibold text-[#17211B]">{expense.billNumber}</span>
              {expense.financialYear && ` · ${expense.financialYear}`}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {expense.status === "DRAFT" && (
            <Link
              href={`/expenses/${expense.id}/edit`}
              className="inline-flex items-center justify-center px-4 py-2 bg-white hover:bg-gray-50 text-[#17211B] text-xs font-bold rounded-xl border border-[#D9E3DC] transition-colors gap-2"
            >
              Edit Draft
            </Link>
          )}
          <ExpenseActions
            expense={JSON.parse(JSON.stringify(expense))}
            bankAccounts={JSON.parse(JSON.stringify(bankAccounts))}
          />
        </div>
      </div>

      {expense.status === "CANCELLED" && expense.cancellationReason && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800 text-sm">
          <strong>Cancellation Reason:</strong> {expense.cancellationReason}
          <div className="text-xs text-red-600 mt-1">
            Cancelled at: {expense.cancelledAt ? new Date(expense.cancelledAt).toLocaleString() : ""}
          </div>
        </div>
      )}

      {/* Main Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-[#D9E3DC] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E9EEE9] bg-[#F9FAF8] flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#17211B]">Line Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D9E3DC] text-[#738078] uppercase text-[11px] font-bold tracking-wider bg-[#F9FAF8]">
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Vendor / Payee</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-right">GST %</th>
                    <th className="px-4 py-3 text-right">TDS %</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9EEE9]">
                  {(expense.items || []).map((item: any) => (
                    <tr key={item.id} className="hover:bg-[#F9FAF8]">
                      <td className="px-4 py-3.5 text-[#17211B] font-medium">
                        {item.description || "Expense Item"}
                        {item.hsnSacCode && (
                          <span className="block text-[10px] text-[#738078]">
                            HSN/SAC: {item.hsnSacCode}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[#68756C]">
                        {item.category?.name || expense.category?.name || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-[#68756C]">
                        {item.vendor?.name || expense.vendor?.name || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#68756C]">
                        {Number(item.quantity)} {item.unit || "Unit"}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#68756C]">
                        ₹{Number(item.unitPrice).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#68756C]">
                        {Number(item.gstRate)}%
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#68756C]">
                        {item.tdsRate ? `${Number(item.tdsRate)}%` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#17211B] font-bold">
                        ₹{Number(item.totalAmount).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments & Disbursements History (Zero Duplication Audit Trail) */}
          <div className="bg-white rounded-2xl shadow-xs border border-[#D9E3DC] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E9EEE9] bg-[#F9FAF8] flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-[#17211B]">
                  Payment Disbursements & Reimbursements ({payments.length})
                </h3>
                <p className="text-[11px] text-[#68756C] mt-0.5">
                  Actual bank transfers settling this liability without duplicating the P&L expense.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D9E3DC] text-[#738078] uppercase text-[11px] font-bold tracking-wider bg-[#F9FAF8]">
                    <th className="px-4 py-3">Payment Date</th>
                    <th className="px-4 py-3">Disbursing Bank</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Reference / UTR</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9EEE9]">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[#68756C]">
                        {expense.paymentStatus === "PAID" && Number(expense.paidAmount || 0) > 0 ? (
                          <span>
                            Settled via inline single-step payment of ₹{Number(expense.paidAmount).toLocaleString("en-IN")}.
                          </span>
                        ) : (
                          <span>
                            No separate payment disbursements recorded yet. Outstanding balance: ₹{remainingPayable.toLocaleString("en-IN")}.
                          </span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    payments.map((pmt: any) => (
                      <tr key={pmt.id} className="hover:bg-[#F9FAF8]">
                        <td className="px-4 py-3 font-medium text-[#17211B]">
                          {new Date(pmt.paymentDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-[#17211B]">
                          {pmt.bankAccount
                            ? `${pmt.bankAccount.bankName} (${pmt.bankAccount.accountName})`
                            : "Primary Bank Account"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#E5F3EC] text-[#0B5F46]">
                            {pmt.paymentMode || "BANK_TRANSFER"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#68756C]">
                          {pmt.referenceNumber || "—"}
                          {pmt.notes && <span className="block text-[10px] text-gray-400">{pmt.notes}</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-[#0B5F46]">
                          ₹{Number(pmt.amount).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xs border border-[#D9E3DC] p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#17211B] pb-3 border-b border-[#E9EEE9]">
              Financial Summary
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-[#68756C]">
                <span>Expense Date</span>
                <span className="font-semibold text-[#17211B]">
                  {new Date(expense.expenseDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between text-[#68756C]">
                <span>Paid By</span>
                <span className="font-semibold text-[#17211B]">
                  {isReimbursement ? (
                    <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-extrabold">
                      Employee: {expense.employee?.name || "Staff Member"}
                    </span>
                  ) : (
                    <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-extrabold">
                      Company Direct
                    </span>
                  )}
                </span>
              </div>
              {expense.category && (
                <div className="flex justify-between text-[#68756C]">
                  <span>Category</span>
                  <span className="font-semibold text-[#17211B]">{expense.category.name}</span>
                </div>
              )}
              {expense.vendor && (
                <div className="flex justify-between text-[#68756C]">
                  <span>Vendor</span>
                  <span className="font-semibold text-[#1b5e4b]">
                    <Link href={`/vendors/${expense.vendor.id}`}>{expense.vendor.name}</Link>
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-[#E9EEE9] space-y-2">
                <div className="flex justify-between text-[#68756C]">
                  <span>Taxable Subtotal</span>
                  <span className="font-semibold text-[#17211B]">
                    ₹{Number(expense.taxableAmount || expense.subtotal || 0).toLocaleString("en-IN")}
                  </span>
                </div>

                {Number(expense.totalInputGST) > 0 && (
                  <div className="pt-1 space-y-1">
                    <span className="text-[10px] font-bold text-[#738078] uppercase tracking-wider">
                      Input GST Credit (ITC)
                    </span>
                    {Number(expense.inputIGST) > 0 ? (
                      <div className="flex justify-between text-[#68756C] text-[11px]">
                        <span>IGST</span>
                        <span>₹{Number(expense.inputIGST).toLocaleString("en-IN")}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-[#68756C] text-[11px]">
                          <span>CGST</span>
                          <span>₹{Number(expense.inputCGST).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-[#68756C] text-[11px]">
                          <span>SGST</span>
                          <span>₹{Number(expense.inputSGST).toLocaleString("en-IN")}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="flex justify-between text-[#17211B] font-bold pt-2 border-t border-[#E9EEE9]">
                  <span>Gross Invoice Total</span>
                  <span>₹{Number(expense.grossAmount).toLocaleString("en-IN")}</span>
                </div>

                {Number(expense.tdsAmount) > 0 && (
                  <div className="flex justify-between text-red-600 font-semibold pt-1">
                    <span>Less TDS Withheld</span>
                    <span>-₹{Number(expense.tdsAmount).toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#E9EEE9]">
                <span className="font-bold text-[#17211B]">Net Bill Payable</span>
                <span className="text-base font-extrabold text-[#17211B]">
                  ₹{Number(expense.netAmount).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-[#68756C]">Amount Disbursed</span>
                <span className="font-bold text-[#0B5F46]">
                  ₹{Number(expense.paidAmount || 0).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs pt-1 border-t border-dashed border-[#E9EEE9]">
                <span className="font-bold text-[#B27A17]">Remaining Balance</span>
                <span className="text-sm font-extrabold text-[#B27A17]">
                  ₹{remainingPayable.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {expense.notes && (
            <div className="bg-amber-50/60 rounded-2xl border border-amber-200/80 p-5">
              <h3 className="text-xs font-bold text-amber-900 mb-1">Remarks & Notes</h3>
              <p className="text-xs text-amber-800 whitespace-pre-wrap">{expense.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
