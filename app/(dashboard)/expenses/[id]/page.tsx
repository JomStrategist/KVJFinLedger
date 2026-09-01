import { ExpenseService } from "@/services/expense.service";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ExpenseActions } from "./ExpenseActions";
import { BUSINESS_LOCATION } from "@/lib/config/business";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const expense = await ExpenseService.getExpenseById(id);

  if (!expense) {
    notFound();
  }



  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12">
      <Link href="/expenses" className="mb-2 inline-flex items-center text-sm font-medium text-theme-primary hover:text-theme-primary-dark">
        ← Back to Expenses
      </Link>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-theme-surface p-6 rounded-xl shadow-sm border border-theme-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-theme-text">{expense.expenseNumber}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
              ${expense.status === 'APPROVED' ? 'bg-theme-surface-hover text-blue-800' : 
                expense.status === 'DRAFT' ? 'bg-theme-surface-hover text-theme-text' : 
                expense.status === 'CANCELLED' ? 'bg-theme-surface-hover text-theme-text-muted' : 
                'bg-red-100 text-red-800'}`}>
              {expense.status}
            </span>
            {expense.status !== "CANCELLED" && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                ${expense.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 
                  expense.paymentStatus === 'PARTIALLY_PAID' ? 'bg-orange-100 text-orange-800' : 
                  'bg-red-100 text-red-800'}`}>
                {expense.paymentStatus}
              </span>
            )}
          </div>
          {expense.description && (
            <p className="text-theme-text-muted mt-1">{expense.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {expense.status === "DRAFT" && (
            <Link
              href={`/expenses/${expense.id}/edit`}
              className="inline-flex items-center justify-center px-4 py-2 bg-theme-surface hover:bg-theme-surface-hover text-theme-text text-sm font-medium rounded-lg border border-theme-border transition-colors gap-2"
            >
              Edit Draft
            </Link>
          )}
          <ExpenseActions expenseId={expense.id} status={expense.status} paymentStatus={expense.paymentStatus} />
        </div>
      </div>

      {expense.status === "CANCELLED" && expense.cancellationReason && (
        <div className="bg-red-900/20 border border-red-200 rounded-xl p-4 text-red-800 text-sm">
          <strong>Cancellation Reason:</strong> {expense.cancellationReason}
          <div className="text-xs text-red-600 mt-1">Cancelled at: {expense.cancelledAt?.toLocaleString()}</div>
        </div>
      )}

      {/* Main Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border overflow-hidden">
            <div className="px-6 py-4 border-b border-theme-border bg-theme-surface-hover flex justify-between items-center">
              <h3 className="text-sm font-bold text-theme-text">Line Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-theme-border text-theme-text-muted bg-theme-surface">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Vendor</th>
                    <th className="px-4 py-3 font-semibold text-right">Qty</th>
                    <th className="px-4 py-3 font-semibold text-right">Rate</th>
                    <th className="px-4 py-3 font-semibold text-right">GST %</th>
                    <th className="px-4 py-3 font-semibold text-right">TDS %</th>
                    <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expense.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 text-theme-text">{item.date ? new Date(item.date).toLocaleDateString() : "-"}</td>
                      <td className="px-4 py-4 text-theme-text-muted">{item.category?.name || "-"}</td>
                      <td className="px-4 py-4 text-theme-text-muted">{item.vendor?.name || "-"}</td>
                      <td className="px-4 py-4 text-right text-theme-text-muted">{Number(item.quantity)} {item.unit}</td>
                      <td className="px-4 py-4 text-right text-theme-text-muted">₹{Number(item.unitPrice).toFixed(2)}</td>
                      <td className="px-4 py-4 text-right text-theme-text-muted">{Number(item.gstRate)}%</td>
                      <td className="px-4 py-4 text-right text-theme-text-muted">{item.tdsRate ? `${Number(item.tdsRate)}%` : "-"}</td>
                      <td className="px-4 py-4 text-right text-theme-text font-medium">₹{Number(item.totalAmount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border p-6">
            <h3 className="text-sm font-bold text-theme-text mb-4 pb-3 border-b border-theme-border">Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-theme-text-muted">
                <span>Expense Date</span>
                <span className="font-medium text-theme-text">{new Date(expense.expenseDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-theme-text-muted">
                <span>Paid By</span>
                <span className="font-medium text-theme-text">
                  {expense.paidBy === "EMPLOYEE" ? (
                    <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">
                      Employee: {expense.employee?.name || "Employee"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-theme-text bg-theme-surface-hover px-2 py-0.5 rounded text-xs">
                      Company
                    </span>
                  )}
                </span>
              </div>
              {expense.category && (
                <div className="flex justify-between text-theme-text-muted">
                  <span>Category</span>
                  <span className="font-medium text-theme-text">{expense.category.name}</span>
                </div>
              )}
              {expense.vendor && (
                <div className="flex justify-between text-theme-text-muted">
                  <span>Vendor</span>
                  <span className="font-medium text-theme-primary">
                    <Link href={`/vendors/${expense.vendor.id}`}>{expense.vendor.name}</Link>
                  </span>
                </div>
              )}

              <div className="pt-4 mt-2 border-t border-theme-border space-y-2">
                <div className="flex justify-between text-theme-text-muted">
                  <span>Subtotal</span>
                  <span>₹{Number(expense.subtotal).toFixed(2)}</span>
                </div>
                
                {Number(expense.totalInputGST) > 0 && (
                  <div className="pt-2 space-y-1">
                    <span className="text-xs font-semibold text-theme-text-muted uppercase tracking-wider">Input Taxes</span>
                    {Number(expense.inputIGST) > 0 ? (
                      <div className="flex justify-between text-theme-text-muted text-xs">
                        <span>IGST</span>
                        <span>₹{Number(expense.inputIGST).toFixed(2)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-theme-text-muted text-xs">
                          <span>CGST</span>
                          <span>₹{Number(expense.inputCGST).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-theme-text-muted text-xs">
                          <span>SGST</span>
                          <span>₹{Number(expense.inputSGST).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between text-theme-text font-medium pt-2 border-t border-theme-border">
                  <span>Gross Amount</span>
                  <span>₹{Number(expense.grossAmount).toFixed(2)}</span>
                </div>

                {Number(expense.tdsAmount) > 0 && (
                  <div className="flex justify-between text-red-600 font-medium pt-1">
                    <span>Less TDS</span>
                    <span>-₹{Number(expense.tdsAmount).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 mt-2 border-t border-theme-border">
                <span className="font-bold text-theme-text">Net Payable</span>
                <span className="text-xl font-bold text-emerald-600">₹{Number(expense.netAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {expense.notes && (
            <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 p-6">
              <h3 className="text-sm font-bold text-yellow-900 mb-2">Notes</h3>
              <p className="text-sm text-yellow-800 whitespace-pre-wrap">{expense.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
