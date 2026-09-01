import Link from "next/link";
import { ExpenseService } from "@/services/expense.service";
import { ExpenseCategoryService } from "@/services/expense-category.service";
import { ExpenseStatus, PaymentStatus } from "@prisma/client";

export async function ExpensesList({
  searchParams,
}: {
  searchParams: { 
    q?: string; 
    status?: ExpenseStatus;
    paymentStatus?: PaymentStatus;
    categoryId?: string;
  };
}) {
  const [expenses, metrics, categories] = await Promise.all([
    ExpenseService.getExpenses(searchParams),
    ExpenseService.getDashboardMetrics(),
    ExpenseCategoryService.getExpenseCategories()
  ]);

  const getStatusColor = (status: ExpenseStatus) => {
    switch (status) {
      case "DRAFT": return "bg-theme-surface-hover text-theme-text";
      case "APPROVED": return "bg-theme-surface-hover text-blue-800";
      case "REJECTED": return "bg-red-100 text-red-800";
      case "CANCELLED": return "bg-theme-surface-hover text-theme-text-muted line-through";
      default: return "bg-theme-surface-hover text-theme-text";
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case "UNPAID": return "bg-red-900/20 text-red-700 border border-red-200";
      case "PARTIALLY_PAID": return "bg-orange-50 text-orange-700 border border-orange-200";
      case "PAID": return "bg-theme-surface-hover text-green-700 border border-green-200";
      default: return "bg-theme-surface-hover text-theme-text border border-theme-border";
    }
  };

  return (
    <div className="space-y-6 mt-6">
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
        <Link 
          href="/expenses/new" 
          className="px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:bg-theme-primary-dark transition-colors"
        >
          Record Expense
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-theme-surface p-4 rounded-xl border border-theme-border shadow-sm">
          <p className="text-sm font-medium text-theme-text-muted">Total Expenses</p>
          <p className="text-2xl font-bold text-theme-text mt-1">{metrics.totalCount}</p>
        </div>
        <div className="bg-theme-surface p-4 rounded-xl border border-theme-border shadow-sm">
          <p className="text-sm font-medium text-theme-text-muted">Approved</p>
          <p className="text-2xl font-bold text-theme-primary mt-1">{metrics.approvedCount}</p>
        </div>
        <div className="bg-theme-surface p-4 rounded-xl border border-theme-border shadow-sm">
          <p className="text-sm font-medium text-theme-text-muted">Unpaid</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{metrics.unpaidCount}</p>
        </div>
        <div className="bg-theme-surface p-4 rounded-xl border border-theme-border shadow-sm">
          <p className="text-sm font-medium text-theme-text-muted">Total Value</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">₹{metrics.totalValue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-theme-border bg-theme-surface-hover flex flex-col sm:flex-row gap-4 justify-between items-center">
          <form className="flex-1 w-full max-w-2xl flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={searchParams.q}
              placeholder="Search by ID, vendor or description..."
              className="flex-1 border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
            />
            <select
              name="categoryId"
              defaultValue={searchParams.categoryId || ""}
              className="border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={searchParams.status || ""}
              className="border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="APPROVED">Approved</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button type="submit" className="px-4 py-2 bg-theme-bg text-white rounded-lg text-sm font-medium hover:bg-theme-surface-hover">
              Filter
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-theme-surface-hover border-b border-theme-border text-xs uppercase text-theme-text-muted font-semibold">
                <th className="px-6 py-3">Expense Details</th>
                <th className="px-6 py-3">Vendor</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3 text-right">Net Amount</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-theme-text-muted">
                    No expenses found matching the criteria.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-theme-surface-hover/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/expenses/${expense.id}`} className="font-medium text-theme-primary hover:underline block">
                        {expense.expenseNumber}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-theme-text-muted">{new Date(expense.expenseDate).toLocaleDateString()}</span>
                        {expense.paidBy === "EMPLOYEE" && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-medium px-1.5 py-0.5 rounded border border-indigo-100">
                            Employee: {expense.employee?.name || "Paid"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-theme-text mt-1 truncate max-w-xs">{expense.description || <span className="italic text-theme-text-muted">Multiple items</span>}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-theme-text">
                      {expense.vendor?.name || <span className="text-theme-text-muted italic">No Vendor</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-theme-text-muted">
                      {expense.category?.name || <span className="text-theme-text-muted italic">Mixed/Various</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-medium text-theme-text">₹{expense.netAmount.toString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                          {expense.status}
                        </span>
                        {expense.status !== "CANCELLED" && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${getPaymentStatusColor(expense.paymentStatus)}`}>
                            {expense.paymentStatus}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <Link
                        href={`/expenses/${expense.id}`}
                        className="text-theme-primary hover:text-blue-900 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
