"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { markExpenseTdsPaidAction } from "../reports/tds-actions";
import { deleteExpenseAction } from "./actions";

const ExpenseModal = dynamic(
  () => import("./ExpenseModal").then((mod) => mod.ExpenseModal),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
        <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl p-6 shadow-2xl flex items-center gap-3 text-slate-200">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Loading Record Expense form...</span>
        </div>
      </div>
    ),
    ssr: false,
  }
);

const RecordPaymentModal = dynamic(
  () => import("./RecordPaymentModal").then((mod) => mod.RecordPaymentModal),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
        <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl p-6 shadow-2xl flex items-center gap-3 text-slate-200">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Loading Payment Settlement...</span>
        </div>
      </div>
    ),
    ssr: false,
  }
);

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
  bankAccounts = [],
  showHeader = true,
}: {
  initialExpenses: any[];
  categories: any[];
  vendors: any[];
  employees: any[];
  bankAccounts?: any[];
  showHeader?: boolean;
}) {
  const router = useRouter();
  const [expensesList, setExpensesList] = useState<any[]>(initialExpenses);

  useEffect(() => {
    setExpensesList(initialExpenses);
  }, [initialExpenses]);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [payerFilter, setPayerFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");
  const [classificationFilter, setClassificationFilter] = useState("ALL");
  const [fyFilter, setFyFilter] = useState("ALL");

  // Date Filter State
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [paymentModalExpense, setPaymentModalExpense] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Compute date bounds
  const dateBounds = useMemo<{ start: Date | null; end: Date | null }>(() => {
    if (datePreset === "CURRENT_MONTH") {
      return getMonthRange(0);
    }
    if (datePreset === "LAST_MONTH") {
      return getMonthRange(-1);
    }
    if (datePreset === "RANGE" && rangeStart && rangeEnd) {
      return { start: new Date(rangeStart), end: new Date(rangeEnd + "T23:59:59") };
    }
    return { start: null, end: null };
  }, [datePreset, rangeStart, rangeEnd]);

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    return expensesList.filter((exp) => {
      const searchLower = search.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        exp.notes?.toLowerCase().includes(searchLower) ||
        exp.description?.toLowerCase().includes(searchLower) ||
        exp.billNumber?.toLowerCase().includes(searchLower) ||
        exp.vendor?.name?.toLowerCase().includes(searchLower) ||
        exp.employee?.name?.toLowerCase().includes(searchLower) ||
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

      const matchesFy =
        fyFilter === "ALL" || exp.financialYear === fyFilter;

      let matchesClassification = true;
      if (classificationFilter === "OPEX") {
        matchesClassification = !exp.isAsset && !exp.isLoss && !exp.employeeId && exp.category?.accountingClassification !== "EMPLOYEE_EXPENSE";
      } else if (classificationFilter === "PAYROLL") {
        matchesClassification = Boolean(exp.employeeId || exp.category?.accountingClassification === "EMPLOYEE_EXPENSE");
      } else if (classificationFilter === "CAPEX") {
        matchesClassification = Boolean(exp.isAsset || exp.category?.isCapitalAsset || exp.category?.accountingClassification === "FIXED_ASSET");
      } else if (classificationFilter === "LOSS") {
        matchesClassification = Boolean(exp.isLoss || exp.category?.isLossCategory || exp.category?.accountingClassification === "BUSINESS_LOSS");
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesVendor &&
        matchesDate &&
        matchesStatus &&
        matchesPayer &&
        matchesEmployee &&
        matchesFy &&
        matchesClassification
      );
    });
  }, [
    expensesList,
    search,
    categoryFilter,
    vendorFilter,
    dateBounds,
    statusFilter,
    payerFilter,
    employeeFilter,
    fyFilter,
    classificationFilter,
  ]);

  // Dynamically calculated KPI Dashboard Metrics for selected filter period
  const metrics = useMemo(() => {
    let totalOperating = 0;
    let totalEmployee = 0;
    let totalCapex = 0;
    let totalLoss = 0;
    let companyPaid = 0;
    let employeePaid = 0;
    let outstandingPayables = 0;
    let outstandingReimbursements = 0;

    for (const exp of filteredExpenses) {
      if (exp.status === "CANCELLED") continue;
      const net = Number(exp.netAmount || exp.grossAmount || 0);
      const paid = Number(exp.paidAmount || 0);
      const balance = Number(exp.balancePayable ?? Math.max(0, net - paid));

      const isAsset = Boolean(exp.isAsset || exp.category?.isCapitalAsset || exp.category?.accountingClassification === "FIXED_ASSET");
      const isLoss = Boolean(exp.isLoss || exp.category?.isLossCategory || exp.category?.accountingClassification === "BUSINESS_LOSS");
      const isEmpCost = Boolean(exp.employeeId || exp.category?.accountingClassification === "EMPLOYEE_EXPENSE");

      if (isAsset) {
        totalCapex += net;
      } else if (isLoss) {
        totalLoss += net;
      } else if (isEmpCost) {
        totalEmployee += net;
      } else {
        totalOperating += net;
      }

      if (exp.paidBy === "EMPLOYEE") {
        employeePaid += net;
        outstandingReimbursements += balance;
      } else {
        companyPaid += paid;
        outstandingPayables += balance;
      }
    }

    const totalRecognisedExpenses = totalOperating + totalEmployee + totalLoss;

    return {
      totalRecognisedExpenses,
      totalOperating,
      totalEmployee,
      totalCapex,
      totalLoss,
      companyPaid,
      employeePaid,
      outstandingPayables,
      outstandingReimbursements,
    };
  }, [filteredExpenses]);

  // Mark TDS Paid
  const handleMarkTdsPaid = async (expId: string) => {
    const challan = prompt(
      "Enter ITNS 281 Challan / CIN Reference:",
      `ITNS281/0510001/${Math.floor(10000 + Math.random() * 90000)}`
    );
    if (!challan) return;
    const res = await markExpenseTdsPaidAction(expId, challan);
    if (res.success) {
      setExpensesList((prev) =>
        prev.map((e) =>
          e.id === expId ? { ...e, isTdsPaid: true, tdsPaymentStatus: "PAID", tdsChallanNumber: challan } : e
        )
      );
      router.refresh();
    } else {
      alert(res.error || "Failed to mark TDS paid");
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (id: string) => {
    setIsDeleting(id);
    try {
      const res = await deleteExpenseAction(id);
      if (res.success) {
        setExpensesList((prev) => prev.filter((e) => e.id !== id));
        setDeleteConfirmId(null);
        router.refresh();
      } else {
        alert(res.error || "Failed to delete expense");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setIsDeleting(null);
    }
  };

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
    { value: "RANGE", label: "Custom Range" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#17211B] tracking-tight">Expenses Register</h1>
            <p className="text-[#68756C] text-sm mt-0.5 font-normal">
              Accrual accounting ledger of operating costs, vendor obligations, capex and staff reimbursements.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#1b5e4b] hover:bg-[#136f58] shadow-xs transition-colors gap-1.5 shrink-0 cursor-pointer"
          >
            <span>+</span> Record Expense
          </button>
        </div>
      )}

      {/* Dynamic Period KPI Summary Cards (ICAI Section 4.1 Compliant) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Recognised Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-[#738078] uppercase tracking-wider">
            Total Recognized Expenses
          </div>
          <div className="text-xl font-extrabold text-[#17211B] mt-1">
            ₹{Math.round(metrics.totalRecognisedExpenses).toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-[#68756C] mt-1 font-medium">
            Excludes capital assets
          </div>
        </div>

        {/* Card 2: Operating Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-[#738078] uppercase tracking-wider">
            Operating Expenses
          </div>
          <div className="text-xl font-extrabold text-[#1b5e4b] mt-1">
            ₹{Math.round(metrics.totalOperating).toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-[#68756C] mt-1 font-medium">
            Utilities, SaaS, rent, admin
          </div>
        </div>

        {/* Card 3: Employee & Payroll */}
        <div className="bg-white p-4 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-[#738078] uppercase tracking-wider">
            Employee & Payroll
          </div>
          <div className="text-xl font-extrabold text-blue-700 mt-1">
            ₹{Math.round(metrics.totalEmployee).toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-[#68756C] mt-1 font-medium">
            Salaries & staff benefits
          </div>
        </div>

        {/* Card 4: Outstanding Vendor Payables */}
        <div className="bg-white p-4 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
            Vendor Payables Due
          </div>
          <div className="text-xl font-extrabold text-[#B27A17] mt-1">
            ₹{Math.round(metrics.outstandingPayables).toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-[#68756C] mt-1 font-medium">
            Unpaid vendor bills
          </div>
        </div>

        {/* Card 5: Outstanding Reimbursements */}
        <div className="bg-white p-4 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
            Pending Reimbursements
          </div>
          <div className="text-xl font-extrabold text-indigo-800 mt-1">
            ₹{Math.round(metrics.outstandingReimbursements).toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-[#68756C] mt-1 font-medium">
            Owed to staff members
          </div>
        </div>

        {/* Card 6: Fixed Assets (Capex) */}
        <div className="bg-white p-4 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
            Fixed Assets (Capex)
          </div>
          <div className="text-xl font-extrabold text-purple-800 mt-1">
            ₹{Math.round(metrics.totalCapex).toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-[#68756C] mt-1 font-medium">
            Capitalized to Balance Sheet
          </div>
        </div>

        {/* Card 7: Business Losses */}
        <div className="bg-white p-4 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
            Business Losses
          </div>
          <div className="text-xl font-extrabold text-rose-800 mt-1">
            ₹{Math.round(metrics.totalLoss).toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-[#68756C] mt-1 font-medium">
            Separately recognized losses
          </div>
        </div>

        {/* Card 8: Company Disbursed */}
        <div className="bg-white p-4 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-[#738078] uppercase tracking-wider">
            Paid By Company
          </div>
          <div className="text-xl font-extrabold text-[#0B5F46] mt-1">
            ₹{Math.round(metrics.companyPaid).toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-[#68756C] mt-1 font-medium">
            Total bank disbursements
          </div>
        </div>

        {/* Card 9: Employee Disbursed */}
        <div className="bg-white p-4 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-[#738078] uppercase tracking-wider">
            Paid Personally by Staff
          </div>
          <div className="text-xl font-extrabold text-[#17211B] mt-1">
            ₹{Math.round(metrics.employeePaid).toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-[#68756C] mt-1 font-medium">
            Incurred before claim
          </div>
        </div>

        {/* Quick Action Button Card */}
        <div className="bg-[#F4F7F3] p-4 rounded-2xl border border-[#D9E3DC] shadow-xs flex flex-col justify-center items-center text-center">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="w-full py-2.5 bg-[#1b5e4b] hover:bg-[#136f58] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            + New Expense
          </button>
          <div className="text-[10px] text-[#68756C] mt-1.5 font-medium">
            Category-aware voucher entry
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6 space-y-5">
        {/* Row 1: Search & Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by expense #, bill ref, party or item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[41px] px-3.5 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1b5e4b] bg-white placeholder-[#68756C]"
            />
          </div>

          {/* Classification Filter */}
          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1b5e4b] bg-white text-[#17211B] min-w-[140px]"
          >
            <option value="ALL">All Classifications</option>
            <option value="OPEX">Operating Expenses (OPEX)</option>
            <option value="PAYROLL">Payroll & Employee Benefit</option>
            <option value="CAPEX">Fixed Assets (Capex)</option>
            <option value="LOSS">Business Losses</option>
          </select>

          {/* Categories Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1b5e4b] bg-white text-[#17211B] min-w-[140px]"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Parties Dropdown */}
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1b5e4b] bg-white text-[#17211B] min-w-[140px]"
          >
            <option value="ALL">All Vendors</option>
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
            className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1b5e4b] bg-white text-[#17211B] min-w-[130px]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Fully Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="UNPAID">Unpaid (Outstanding)</option>
          </select>

          {/* Payer Filter */}
          <select
            value={payerFilter}
            onChange={(e) => setPayerFilter(e.target.value)}
            className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1b5e4b] bg-white text-[#17211B] min-w-[130px]"
          >
            <option value="ALL">All Payers</option>
            <option value="COMPANY">Company Paid</option>
            <option value="EMPLOYEE">Employee Paid</option>
          </select>

          {/* Financial Year Filter */}
          <select
            value={fyFilter}
            onChange={(e) => setFyFilter(e.target.value)}
            className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1b5e4b] bg-white text-[#17211B] min-w-[130px]"
          >
            <option value="ALL">All Financial Years</option>
            <option value="FY 2026–27">FY 2026–27</option>
            <option value="FY 2025–26">FY 2025–26</option>
          </select>
        </div>

        {/* Row 2: Date Presets Filter */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[#F3F4F6] pt-3">
          <span className="text-[11px] font-bold text-[#738078] uppercase tracking-wider mr-1">Period:</span>
          {DATE_PRESETS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDatePreset(value)}
              className={`h-[33px] px-3.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                datePreset === value
                  ? "bg-[#1b5e4b] text-white border-[#1b5e4b] shadow-xs"
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
                className="h-[33px] px-2.5 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1b5e4b] bg-white"
              />
              <span className="text-[11px] text-[#738078] font-semibold">to</span>
              <input
                type="date"
                value={rangeEnd}
                min={rangeStart}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="h-[33px] px-2.5 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1b5e4b] bg-white"
              />
            </div>
          )}

          <span className="ml-auto text-[11px] text-[#738078] font-semibold">
            {filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Expenses Register Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1040px]">
            <thead>
              <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider bg-[#F9FAF8]">
                <th className="py-3 px-3">DATE</th>
                <th className="py-3 px-3">EXPENSE # / REF</th>
                <th className="py-3 px-3">PAYEE / PARTY</th>
                <th className="py-3 px-3">DESCRIPTION</th>
                <th className="py-3 px-3">CATEGORY & TYPE</th>
                <th className="py-3 px-3">GST (ITC)</th>
                <th className="py-3 px-3">TDS</th>
                <th className="py-3 px-3 text-right">NET AMOUNT</th>
                <th className="py-3 px-3 text-center">STATUS & BALANCE</th>
                <th className="py-3 px-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EEE9] text-xs">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#68756C]">
                    No expense transactions match the active criteria. Click &quot;+ Record Expense&quot; to book a transaction.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const dateStr = new Date(expense.expenseDate || expense.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });

                  const vendorName =
                    expense.vendor?.name ||
                    (expense.employee?.name ? `${expense.employee.name} (Employee)` : null) ||
                    "Internal / Self";

                  const firstItem = expense.items?.[0];
                  const rawItemName =
                    firstItem?.description ||
                    firstItem?.product?.name ||
                    expense.description ||
                    (expense.notes ? expense.notes.split(",")[0].trim() : null) ||
                    "Business Expense";
                  const itemName = rawItemName.length > 34 ? rawItemName.slice(0, 34) + "…" : rawItemName;

                  const categoryName = expense.category?.name || firstItem?.category?.name || "Operating Expense";

                  // Tax breakdown
                  const totalGst = Number(expense.totalInputGST || expense.totalGST || 0);
                  const gstText = totalGst > 0 ? `₹${totalGst.toLocaleString("en-IN")} · ITC` : "—";

                  const tdsAmount = Number(expense.tdsAmount || 0);
                  const tdsText = tdsAmount > 0
                    ? `₹${tdsAmount.toLocaleString("en-IN")}`
                    : "—";

                  const amount = Number(expense.netAmount || expense.grossAmount || 0);
                  const paid = Number(expense.paidAmount || 0);
                  const balance = Number(expense.balancePayable ?? Math.max(0, amount - paid));
                  const isReimb = expense.paidBy === "EMPLOYEE";

                  return (
                    <tr key={expense.id} className="hover:bg-[#F9FAF8] transition-colors">
                      {/* DATE */}
                      <td className="py-3.5 px-3 text-[#17211B] font-medium whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* EXPENSE NUMBER / BILL REF */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => router.push(`/expenses/${expense.id}`)}
                          className="font-bold text-[#1b5e4b] hover:underline cursor-pointer"
                        >
                          {expense.expenseNumber}
                        </button>
                        {expense.billNumber && (
                          <div className="text-[10px] text-[#738078]">
                            Bill: {expense.billNumber}
                          </div>
                        )}
                      </td>

                      {/* PAYEE */}
                      <td className="py-3.5 px-3 font-semibold text-[#17211B]">
                        {vendorName}
                      </td>

                      {/* DESCRIPTION */}
                      <td className="py-3.5 px-3 text-[#17211B] font-medium">
                        {itemName}
                      </td>

                      {/* CATEGORY & CLASSIFICATION */}
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-[#17211B]">{categoryName}</div>
                        {expense.isAsset ? (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                            CAPEX
                          </span>
                        ) : expense.isLoss ? (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                            LOSS
                          </span>
                        ) : isReimb ? (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                            STAFF CLAIM
                          </span>
                        ) : expense.employeeId ? (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                            PAYROLL
                          </span>
                        ) : null}
                      </td>

                      {/* GST */}
                      <td className="py-3.5 px-3 text-[#17211B] whitespace-nowrap">
                        {gstText}
                      </td>

                      {/* TDS */}
                      <td className="py-3.5 px-3 text-[#17211B] whitespace-nowrap">
                        <div>{tdsText}</div>
                        {tdsAmount > 0 && (
                          <div className="mt-1">
                            {expense.tdsPaymentStatus === "PAID" ? (
                              <span className="text-[9px] font-extrabold text-[#166534] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                ✓ Deposited
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleMarkTdsPaid(expense.id)}
                                className="text-[9px] font-extrabold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full cursor-pointer"
                              >
                                Pay TDS
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* NET AMOUNT */}
                      <td className="py-3.5 px-3 text-right font-extrabold text-[#17211B] whitespace-nowrap">
                        ₹{amount.toLocaleString("en-IN")}
                      </td>

                      {/* STATUS & BALANCE */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {isReimb ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                              STAFF PAID
                            </span>
                            {expense.paymentStatus === "PAID" ? (
                              <span className="text-[10px] font-bold text-[#0B5F46]">
                                REIMBURSED
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-[#B27A17]">
                                DUE: ₹{balance.toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                        ) : expense.paymentStatus === "PAID" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E5F3EC] text-[#0B5F46]">
                            PAID
                          </span>
                        ) : expense.paymentStatus === "PARTIALLY_PAID" ? (
                          <div className="flex flex-col items-center">
                            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-[#FFF3D8] text-[#B27A17]">
                              PARTIAL
                            </span>
                            <span className="text-[10px] font-bold text-[#B27A17] mt-0.5">
                              DUE: ₹{balance.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                              UNPAID
                            </span>
                            <span className="text-[10px] font-bold text-red-700 mt-0.5">
                              DUE: ₹{balance.toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Settle / Reimburse Button */}
                          {balance > 0.01 && expense.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => setPaymentModalExpense(expense)}
                              className="px-2.5 py-1.5 text-[10px] font-extrabold text-white bg-[#1b5e4b] hover:bg-[#136f58] rounded-lg shadow-2xs transition-colors cursor-pointer"
                              title={isReimb ? "Record staff reimbursement disbursement" : "Record vendor payment disbursement"}
                            >
                              💳 {isReimb ? "Reimburse" : "Pay"}
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(expense)}
                            className="bg-white border border-[#D9E3DC] rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs cursor-pointer"
                          >
                            Edit
                          </button>

                          {/* Delete */}
                          {deleteConfirmId === expense.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(expense.id)}
                                disabled={isDeleting === expense.id}
                                className="bg-red-600 text-white rounded-lg px-2 py-1 text-[10px] font-bold hover:bg-red-700 transition-colors cursor-pointer"
                              >
                                {isDeleting === expense.id ? "..." : "Confirm"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="bg-gray-100 text-gray-700 rounded-lg px-2 py-1 text-[10px] font-bold hover:bg-gray-200 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(expense.id)}
                              disabled={isDeleting === expense.id}
                              className="bg-white border border-red-200 rounded-lg px-2 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 transition-colors shadow-2xs cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
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

      {/* Record Payment / Reimbursement Modal */}
      {paymentModalExpense && (
        <RecordPaymentModal
          isOpen={Boolean(paymentModalExpense)}
          onClose={() => setPaymentModalExpense(null)}
          expense={paymentModalExpense}
          bankAccounts={bankAccounts}
          onSuccess={() => {
            setPaymentModalExpense(null);
            router.refresh();
          }}
        />
      )}

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <ExpenseModal
          expense={selectedExpense}
          vendors={vendors}
          categories={categories}
          employees={employees}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedExpense(null);
          }}
          onSuccess={(savedExp) => {
            if (savedExp) {
              setExpensesList((prev) => {
                const exists = prev.some((e) => e.id === savedExp.id);
                if (exists) {
                  return prev.map((e) => (e.id === savedExp.id ? { ...e, ...savedExp } : e));
                }
                return [savedExp, ...prev];
              });
            }
            setIsModalOpen(false);
            setSelectedExpense(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
