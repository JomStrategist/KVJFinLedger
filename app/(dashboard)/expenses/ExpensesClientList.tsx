"use client";

import { useState, useMemo } from "react";
import { ExpenseModal } from "./ExpenseModal";
import { useRouter } from "next/navigation";
import { markExpenseTdsPaidAction } from "../reports/tds-actions";

// ─── Date helpers ─────────────────────────────────────────────────────────────
function getMonthRange(offset: 0 | -1): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59);
  return { start, end };
}

type DatePreset = "ALL" | "CURRENT_MONTH" | "LAST_MONTH" | "RANGE";

export function ExpensesClientList({
  initialExpenses = [],
  categories = [],
  vendors = [],
  employees = [],
  showHeader = true,
}: {
  initialExpenses: any[];
  categories: any[];
  vendors: any[];
  employees: any[];
  showHeader?: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [payerFilter, setPayerFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");

  // Date Filter State
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);

  // Compute date bounds
  const dateBounds = useMemo<{ start: Date | null; end: Date | null }>(() => {
    if (datePreset === "CURRENT_MONTH") {
      const { start, end } = getMonthRange(0);
      return { start, end };
    }
    if (datePreset === "LAST_MONTH") {
      const { start, end } = getMonthRange(-1);
      return { start, end };
    }
    if (datePreset === "RANGE" && rangeStart && rangeEnd) {
      return { start: new Date(rangeStart), end: new Date(rangeEnd + "T23:59:59") };
    }
    return { start: null, end: null };
  }, [datePreset, rangeStart, rangeEnd]);

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

    let matchesDate = true;
    if (dateBounds.start && dateBounds.end) {
      const expDate = new Date(exp.expenseDate || exp.createdAt);
      matchesDate = expDate >= dateBounds.start && expDate <= dateBounds.end;
    }

    const matchesStatus =
      statusFilter === "ALL" || exp.paymentStatus === statusFilter;

    const matchesPayer =
      payerFilter === "ALL" ||
      (payerFilter === "COMPANY" ? exp.paidBy !== "EMPLOYEE" : exp.paidBy === "EMPLOYEE");

    const matchesEmployee =
      employeeFilter === "ALL" ||
      exp.employeeId === employeeFilter ||
      exp.userId === employeeFilter;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesVendor &&
      matchesDate &&
      matchesStatus &&
      matchesPayer &&
      matchesEmployee
    );
  });

  const handleOpenAddModal = () => {
    setSelectedExpense(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (expense: any) => {
    setSelectedExpense(expense);
    setIsModalOpen(true);
  };

  const DATE_PRESETS: { value: DatePreset; label: string }[] = [
    { value: "ALL", label: "All Dates" },
    { value: "CURRENT_MONTH", label: "Current Month" },
    { value: "LAST_MONTH", label: "Last Month" },
    { value: "RANGE", label: "Date Range" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header (if enabled) */}
      {showHeader && (
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
            className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#1b5e4b] hover:bg-[#136f58] shadow-xs transition-colors gap-1.5 shrink-0 cursor-pointer"
          >
            <span>+</span> Add Expense
          </button>
        </div>
      )}

      {/* Main Card Container */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6 space-y-5">
        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search expense / party"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[41px] px-3.5 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white placeholder-[#68756C]"
            />
          </div>

          {/* All Categories Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] min-w-[140px]"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* All Parties Dropdown */}
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] min-w-[140px]"
          >
            <option value="ALL">All Parties</option>
            {vendors.map((ven) => (
              <option key={ven.id} value={ven.id}>
                {ven.name}
              </option>
            ))}
          </select>

          {/* Payment Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] min-w-[130px]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>

          {/* Payer Filter */}
          <select
            value={payerFilter}
            onChange={(e) => setPayerFilter(e.target.value)}
            className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] min-w-[130px]"
          >
            <option value="ALL">All Payers</option>
            <option value="COMPANY">KVJ Paid (Company)</option>
            <option value="EMPLOYEE">Employee Paid</option>
          </select>

          {/* Employee Filter */}
          {employees.length > 0 && (
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] min-w-[140px]"
            >
              <option value="ALL">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Row 2: Date Filter */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[#F3F4F6] pt-3">
          <span className="text-[11px] font-bold text-[#738078] uppercase tracking-wider mr-1">Date:</span>
          {DATE_PRESETS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDatePreset(value)}
              className={`h-[33px] px-3.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                datePreset === value
                  ? "bg-[#177B55] text-white border-[#177B55] shadow-sm"
                  : "border-[#D9E3DC] text-[#4B5563] bg-white hover:bg-[#F4F7F3]"
              }`}
            >
              {label}
            </button>
          ))}

          {datePreset === "RANGE" && (
            <div className="flex items-center gap-2 ml-1">
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="h-[33px] px-2.5 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white"
              />
              <span className="text-[11px] text-[#738078] font-semibold">to</span>
              <input
                type="date"
                value={rangeEnd}
                min={rangeStart}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="h-[33px] px-2.5 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white"
              />
            </div>
          )}

          <span className="ml-auto text-[11px] text-[#738078] font-semibold">
            {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                <th className="py-3 px-2">DATE</th>
                <th className="py-3 px-3">PARTY / PAYEE</th>
                <th className="py-3 px-3">ITEM</th>
                <th className="py-3 px-3">CATEGORY</th>
                <th className="py-3 px-3">GST</th>
                <th className="py-3 px-3" title="TDS applicable only on specified payments under Sec 194C/194J/194I. Not all expenses attract TDS.">
                  TDS ℹ
                </th>
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

                  const vendorName = expense.vendor?.name || "Internal";
                  const firstItem = expense.items?.[0];
                  // Clean item name: use product name or first description only — avoid note duplication
                  const rawItemName =
                    firstItem?.product?.name ||
                    firstItem?.description ||
                    (expense.notes ? expense.notes.split(",")[0].trim() : null) ||
                    "Business Expense";
                  const itemName = rawItemName.length > 38 ? rawItemName.slice(0, 38) + "…" : rawItemName;
                  const categoryName = expense.category?.name || firstItem?.category?.name || "Operating Expense";

                  // GST: prefer stored totalGST; if zero/null, compute from items
                  let totalGst = Number(expense.totalGST || 0);
                  let gstRate = Number(firstItem?.gstRate || 0);
                  if (totalGst === 0 && gstRate > 0) {
                    const taxable = Number(firstItem?.taxableAmount || firstItem?.totalAmount || 0);
                    totalGst = taxable > 0 ? Math.round(taxable * (gstRate / 100) * 100) / 100 : 0;
                  }
                  const gstText =
                    totalGst > 0
                      ? `${gstRate > 0 ? gstRate + "% · " : ""}₹${totalGst.toLocaleString("en-IN", { minimumFractionDigits: 0 })} · ITC`
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
                        {expense.paidBy === "EMPLOYEE" ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 tracking-wider">
                              PAID BY EMPLOYEE
                            </span>
                            {expense.paymentStatus === "PAID" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-[#E5F3EC] text-[#0B5F46]">
                                FULLY REIMBURSED
                              </span>
                            ) : expense.paymentStatus === "PARTIALLY_PAID" ? (
                              <div className="flex flex-col items-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-[#FFF3D8] text-[#B27A17]">
                                  PARTIALLY REIMBURSED
                                </span>
                                <span className="text-[9px] font-semibold text-slate-500 mt-0.5">
                                  Due: ₹{(Math.max(0, amount - (Number(expense.paidAmount) || 0))).toLocaleString("en-IN")}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  NOT REIMBURSED
                                </span>
                                <span className="text-[9px] font-semibold text-slate-500 mt-0.5">
                                  Due: ₹{amount.toLocaleString("en-IN")}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : expense.paymentStatus === "PAID" ? (
                          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E5F3EC] text-[#0B5F46] tracking-wider">
                            PAID
                          </span>
                        ) : expense.paymentStatus === "PARTIALLY_PAID" ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFF3D8] text-[#B27A17] tracking-wider">
                              PARTIALLY PAID
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 mt-0.5 whitespace-nowrap">
                              ₹{(Number(expense.paidAmount) || 0).toLocaleString("en-IN")} / ₹{amount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FEE2E2] text-[#991B1B] tracking-wider">
                            NOT PAID
                          </span>
                        )}
                      </td>

                      {/* ACTION */}
                      <td className="py-4 px-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(expense.paymentStatus === "PARTIALLY_PAID" || expense.paymentStatus === "UNPAID") && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(expense)}
                              className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold text-amber-800 hover:bg-amber-100 transition-colors shadow-2xs whitespace-nowrap"
                              title="Record payment for outstanding balance"
                            >
                              💳 Pay Balance
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(expense)}
                            className="bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
                          >
                            Edit
                          </button>
                        </div>
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
