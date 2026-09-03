"use client";

import { useState } from "react";
import { ExpenseModal } from "./ExpenseModal";
import { useRouter } from "next/navigation";
import { markExpenseTdsPaidAction } from "../reports/tds-actions";

export function ExpensesClientList({
  initialExpenses = [],
  categories = [],
  vendors = [],
  employees = [],
}: {
  initialExpenses: any[];
  categories: any[];
  vendors: any[];
  employees: any[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [vendorFilter, setVendorFilter] = useState("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);

  const handleMarkTdsPaid = async (expId: string) => {
    const challan = prompt("Enter ITNS 281 Challan / CIN Reference:", `ITNS281/0510001/${Math.floor(10000 + Math.random() * 90000)}`);
    if (!challan) return;
    const res = await markExpenseTdsPaidAction(expId, challan);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to mark TDS paid");
    }
  };

  const filteredExpenses = initialExpenses.filter((exp) => {
    const searchLower = search.toLowerCase().trim();
    const matchesSearch =
      !searchLower ||
      exp.notes?.toLowerCase().includes(searchLower) ||
      exp.vendor?.name?.toLowerCase().includes(searchLower) ||
      exp.expenseNumber?.toLowerCase().includes(searchLower) ||
      exp.category?.name?.toLowerCase().includes(searchLower);

    const matchesCategory =
      categoryFilter === "ALL" || exp.categoryId === categoryFilter;

    const matchesVendor =
      vendorFilter === "ALL" || exp.vendorId === vendorFilter;

    return matchesSearch && matchesCategory && matchesVendor;
  });

  const handleOpenAddModal = () => {
    setSelectedExpense(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (expense: any) => {
    setSelectedExpense(expense);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#17211B] tracking-tight">Expenses</h1>
          <p className="text-[#68756C] text-sm mt-0.5 font-normal">
            Record and categorise every business expense.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#1b5e4b] hover:bg-[#136f58] shadow-xs transition-colors gap-1.5 shrink-0"
        >
          <span>+</span> Add Expense
        </button>
      </div>

      {/* Main Card Container */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6 space-y-5">
        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search expense / vendor"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[41px] px-3.5 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white placeholder-[#68756C]"
            />
          </div>

          {/* All Categories Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] min-w-[150px]"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* All Vendors Dropdown */}
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] min-w-[150px]"
          >
            <option value="ALL">All Vendors</option>
            {vendors.map((ven) => (
              <option key={ven.id} value={ven.id}>
                {ven.name}
              </option>
            ))}
          </select>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                <th className="py-3 px-2">DATE</th>
                <th className="py-3 px-3">VENDOR</th>
                <th className="py-3 px-3">ITEM</th>
                <th className="py-3 px-3">CATEGORY</th>
                <th className="py-3 px-3">GST</th>
                <th className="py-3 px-3">TDS</th>
                <th className="py-3 px-3 text-right">AMOUNT</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-2 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EEE9] text-xs">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#68756C]">
                    No expenses found matching the criteria. Click &quot;+ Add Expense&quot; to record one.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const dateStr = new Date(expense.expenseDate || expense.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });

                  const vendorName = expense.vendor?.name || "—";
                  const firstItem = expense.items?.[0];
                  const itemName = firstItem?.description || firstItem?.product?.name || expense.notes || "Business Expense";
                  const categoryName = expense.category?.name || firstItem?.category?.name || "Operating Expense";

                  const totalGst = Number(expense.totalGST || 0);
                  const gstRate = Number(firstItem?.gstRate || 18);
                  const gstText = totalGst > 0 
                    ? `${gstRate}% · ₹${totalGst.toLocaleString("en-IN", { minimumFractionDigits: 0 })} · ITC` 
                    : "—";

                  const tdsAmount = Number(expense.tdsAmount || 0);
                  const tdsRate = Number(expense.tdsRate || firstItem?.tdsRate || 2);
                  const tdsText = tdsAmount > 0 
                    ? `${tdsRate > 0 ? `${tdsRate}% · ` : "2% · "}₹${tdsAmount.toLocaleString("en-IN", { minimumFractionDigits: 0 })}` 
                    : "—";

                  const amount = Number(expense.netAmount || expense.grossAmount || 0);
                  const isPaid = expense.paymentStatus === "PAID";

                  return (
                    <tr key={expense.id} className="hover:bg-[#F9FAF8] transition-colors">
                      {/* DATE */}
                      <td className="py-4 px-2 text-[#17211B] font-medium whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* VENDOR */}
                      <td className="py-4 px-3 font-semibold text-[#17211B]">
                        {vendorName}
                      </td>

                      {/* ITEM */}
                      <td className="py-4 px-3 text-[#17211B] font-medium">
                        {itemName}
                      </td>

                      {/* CATEGORY */}
                      <td className="py-4 px-3 text-[#17211B] font-medium">
                        {categoryName}
                      </td>

                      {/* GST */}
                      <td className="py-4 px-3 text-[#17211B] whitespace-nowrap">
                        {gstText}
                      </td>

                      {/* TDS */}
                      <td className="py-4 px-3 text-[#17211B] whitespace-nowrap">
                        <div className="font-medium">{tdsText}</div>
                        {tdsAmount > 0 && (
                          <div className="mt-1 flex items-center gap-1.5">
                            {expense.tdsPaymentStatus === "PAID" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#166534] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <span>✓</span> Paid
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleMarkTdsPaid(expense.id)}
                                className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#92400E] bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full cursor-pointer transition-colors shadow-2xs"
                                title="Click to record Challan ITNS 281 and pay TDS from Bank"
                              >
                                <span>⚠️</span> Pay TDS
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* AMOUNT */}
                      <td className="py-4 px-3 text-right font-bold text-[#17211B]">
                        ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                      </td>

                      {/* STATUS */}
                      <td className="py-4 px-3 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E5F3EC] text-[#0B5F46] tracking-wider">
                            PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFF3D8] text-[#B27A17] tracking-wider">
                            PAYABLE
                          </span>
                        )}
                      </td>

                      {/* ACTION */}
                      <td className="py-4 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(expense)}
                          className="bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <ExpenseModal
          expense={selectedExpense}
          vendors={vendors}
          categories={categories}
          employees={employees}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
