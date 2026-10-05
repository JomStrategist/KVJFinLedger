"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { AccountDescriptor, LedgerStatement } from "@/services/ledger.service";
import { formatCurrency } from "@/lib/utils/currency";

interface Props {
  accountList: AccountDescriptor[];
  initialStatement: LedgerStatement | null;
  selectedAccountId: string;
  initialFromDate: string;
  initialToDate: string;
}

type ViewMode = "TABLE" | "STATEMENT";
type CategoryFilter = "ALL" | "DEBTORS" | "CREDITORS" | "BANK_CASH" | "TAXES" | "CAPITAL" | "INCOME" | "EXPENSE";
type SortField = "name" | "code" | "group" | "balance" | "drCr";

export default function LedgerClient({
  accountList,
  initialStatement,
  selectedAccountId,
  initialFromDate,
  initialToDate,
}: Props) {
  // Primary default view mode is now TABLE as requested
  const [viewMode, setViewMode] = useState<ViewMode>("TABLE");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Sorting & Pagination
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());

  // Statement View parameters
  const [accountId, setAccountId] = useState(selectedAccountId || accountList[0]?.id || "");
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  const [statement, setStatement] = useState<LedgerStatement | null>(initialStatement);
  const [isLoading, setIsLoading] = useState(false);

  // Code generator helper matching ERP conventions
  const accountCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    let cCount = 1, vCount = 1, bCount = 1, tCount = 1, aCount = 1, oCount = 1;

    for (const acc of accountList) {
      if (acc.type === "CUSTOMER") {
        map.set(acc.id, `CUST${String(cCount++).padStart(4, "0")}`);
      } else if (acc.type === "VENDOR") {
        map.set(acc.id, `VEND${String(vCount++).padStart(4, "0")}`);
      } else if (acc.type === "BANK") {
        map.set(acc.id, `BANK${String(bCount++).padStart(4, "0")}`);
      } else if (acc.type === "CASH") {
        map.set(acc.id, `CASH0001`);
      } else if (acc.type === "STATUTORY_GST" || acc.type === "STATUTORY_TDS") {
        map.set(acc.id, `TAX${String(tCount++).padStart(4, "0")}`);
      } else if (acc.type === "FIXED_ASSET") {
        map.set(acc.id, `ASST${String(aCount++).padStart(4, "0")}`);
      } else {
        map.set(acc.id, `LEDG${String(oCount++).padStart(4, "0")}`);
      }
    }
    return map;
  }, [accountList]);

  // Initials generator
  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "AC";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Avatar pastel background colors
  const getAvatarColor = (initials: string) => {
    const colors = [
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-indigo-100 text-indigo-700 border-indigo-200",
      "bg-purple-100 text-purple-700 border-purple-200",
      "bg-rose-100 text-rose-700 border-rose-200",
      "bg-sky-100 text-sky-700 border-sky-200",
      "bg-teal-100 text-teal-700 border-teal-200",
      "bg-emerald-100 text-emerald-700 border-emerald-200",
      "bg-amber-100 text-amber-700 border-amber-200",
    ];
    let sum = 0;
    for (let i = 0; i < initials.length; i++) {
      sum += initials.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  // Group badge styling
  const renderGroupBadge = (group: string) => {
    const g = (group || "").toLowerCase();
    if (g.includes("debtor") || g.includes("customer") || g.includes("receivable")) {
      return (
        <span className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
          Sundry Debtors
        </span>
      );
    }
    if (g.includes("creditor") || g.includes("vendor") || g.includes("payable")) {
      return (
        <span className="bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
          Sundry Creditors
        </span>
      );
    }
    if (g.includes("bank") || g.includes("cash")) {
      return (
        <span className="bg-sky-50 text-sky-600 border border-sky-100 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
          Cash & Bank
        </span>
      );
    }
    if (g.includes("tax") || g.includes("duties") || g.includes("gst") || g.includes("tds")) {
      return (
        <span className="bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
          Duties & Taxes
        </span>
      );
    }
    if (g.includes("asset") || g.includes("capital") || g.includes("equity")) {
      return (
        <span className="bg-purple-50 text-purple-600 border border-purple-100 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
          Capital & Assets
        </span>
      );
    }
    if (g.includes("income") || g.includes("revenue")) {
      return (
        <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
          Income
        </span>
      );
    }
    return (
      <span className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
        {group}
      </span>
    );
  };

  const fetchStatement = async (accId: string, from: string, to: string) => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (accId) query.set("accountId", accId);
      if (from) query.set("fromDate", from);
      if (to) query.set("toDate", to);

      window.history.replaceState(null, "", `/ledgers?${query.toString()}`);

      const res = await fetch(`/api/ledgers/statement?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStatement(data);
      }
    } catch (err) {
      console.error("Failed to fetch ledger statement:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountSelect = (newAccId: string) => {
    setAccountId(newAccId);
    setViewMode("STATEMENT");
    fetchStatement(newAccId, fromDate, toDate);
  };

  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStatement(accountId, fromDate, toDate);
  };

  const handleQuickPeriod = (preset: "CURRENT_MONTH" | "LAST_MONTH" | "THIS_FY" | "ALL") => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    let start = "";
    let end = "";

    if (preset === "CURRENT_MONTH") {
      start = fmt(new Date(year, month, 1));
      end = fmt(new Date(year, month + 1, 0));
    } else if (preset === "LAST_MONTH") {
      start = fmt(new Date(year, month - 1, 1));
      end = fmt(new Date(year, month, 0));
    } else if (preset === "THIS_FY") {
      const fyStartYear = month >= 3 ? year : year - 1;
      start = fmt(new Date(fyStartYear, 3, 1));
      end = fmt(new Date(fyStartYear + 1, 2, 31));
    } else if (preset === "ALL") {
      start = "";
      end = "";
    }

    setFromDate(start);
    setToDate(end);
    fetchStatement(accountId, start, end);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (viewMode === "STATEMENT" && statement) {
      const rows = [
        ["Date", "Voucher No", "Particulars", "Debit (Dr)", "Credit (Cr)", "Running Balance", "Type"],
        ["", "", "To Opening Balance b/f", "", "", statement.openingBalance, statement.openingBalanceType],
        ...statement.entries.map((e) => [
          new Date(e.date).toLocaleDateString("en-IN"),
          e.voucherNo,
          `"${e.particulars}"`,
          e.debit,
          e.credit,
          e.runningBalance,
          e.balanceType,
        ]),
        ["", "", "Closing Balance c/d", statement.totalDebit, statement.totalCredit, statement.closingBalance, statement.closingBalanceType],
      ];

      const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Ledger_${statement.account.name.replace(/[^a-zA-Z0-9]/g, "_")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Export current filtered accounts table
      const rows = [
        ["Account Code", "Account Name", "GSTIN", "Group", "Normal Balance", "Current Balance", "Dr/Cr"],
        ...filteredAccounts.map((a) => [
          accountCodeMap.get(a.id) || "",
          `"${a.name}"`,
          a.gstin || "",
          `"${a.group}"`,
          a.normalBalance,
          a.currentBalance || 0,
          a.currentBalanceType || "Dr",
        ]),
      ];
      const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Ledger_Accounts_List.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Group accounts for Statement dropdown
  const groupedAccounts = useMemo(() => {
    return accountList.reduce((acc, account) => {
      const grp = account.group;
      if (!acc[grp]) acc[grp] = [];
      acc[grp].push(account);
      return acc;
    }, {} as Record<string, AccountDescriptor[]>);
  }, [accountList]);

  // Unique groups list for the dropdown
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    accountList.forEach((a) => set.add(a.group));
    return Array.from(set);
  }, [accountList]);

  // Unique types list for the dropdown
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    accountList.forEach((a) => set.add(a.type));
    return Array.from(set);
  }, [accountList]);

  // Filtered accounts for Table View
  const filteredAccounts = useMemo(() => {
    return accountList.filter((acc) => {
      const code = accountCodeMap.get(acc.id) || "";
      const matchesSearch =
        !searchQuery.trim() ||
        acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.group.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (acc.gstin && acc.gstin.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (acc.pan && acc.pan.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Category Pill filter
      if (selectedCategory === "BANK_CASH" && !(acc.type === "BANK" || acc.type === "CASH")) return false;
      if (selectedCategory === "DEBTORS" && acc.type !== "CUSTOMER") return false;
      if (selectedCategory === "CREDITORS" && acc.type !== "VENDOR") return false;
      if (selectedCategory === "TAXES" && !(acc.type === "STATUTORY_GST" || acc.type === "STATUTORY_TDS")) return false;
      if (selectedCategory === "CAPITAL" && !(acc.type === "CAPITAL" || acc.type === "FIXED_ASSET")) return false;
      if (selectedCategory === "INCOME" && acc.type !== "INCOME_CATEGORY") return false;
      if (selectedCategory === "EXPENSE" && acc.type !== "EXPENSE_CATEGORY") return false;

      // Group Dropdown filter
      if (selectedGroup !== "ALL" && acc.group !== selectedGroup) return false;

      // Type Dropdown filter
      if (selectedType !== "ALL" && acc.type !== selectedType) return false;

      return true;
    });
  }, [accountList, searchQuery, selectedCategory, selectedGroup, selectedType, accountCodeMap]);

  // Sorted accounts
  const sortedAccounts = useMemo(() => {
    return [...filteredAccounts].sort((a, b) => {
      let comp = 0;
      if (sortField === "name") {
        comp = a.name.localeCompare(b.name);
      } else if (sortField === "code") {
        const codeA = accountCodeMap.get(a.id) || "";
        const codeB = accountCodeMap.get(b.id) || "";
        comp = codeA.localeCompare(codeB);
      } else if (sortField === "group") {
        comp = a.group.localeCompare(b.group);
      } else if (sortField === "balance") {
        comp = (a.currentBalance || 0) - (b.currentBalance || 0);
      } else if (sortField === "drCr") {
        comp = (a.currentBalanceType || "").localeCompare(b.currentBalanceType || "");
      }
      return sortOrder === "asc" ? comp : -comp;
    });
  }, [filteredAccounts, sortField, sortOrder, accountCodeMap]);

  // Paginated accounts
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAccounts.slice(start, start + pageSize);
  }, [sortedAccounts, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedAccounts.length / pageSize) || 1;

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedAccountIds(new Set(paginatedAccounts.map((a) => a.id)));
    } else {
      setSelectedAccountIds(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    const next = new Set(selectedAccountIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedAccountIds(next);
  };

  // Quick summary numbers for KPI cards
  const totalDebtors = useMemo(() => {
    return accountList
      .filter((a) => a.type === "CUSTOMER")
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  }, [accountList]);

  const totalCreditors = useMemo(() => {
    return accountList
      .filter((a) => a.type === "VENDOR")
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  }, [accountList]);

  const totalDrawings = useMemo(() => {
    const d = accountList.find((a) => a.id === "eq_drawings");
    return d?.currentBalance || 0;
  }, [accountList]);

  const totalLiquidCash = useMemo(() => {
    return accountList
      .filter((a) => a.type === "BANK" || a.type === "CASH")
      .reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  }, [accountList]);

  return (
    <div className="space-y-6 pb-16">
      {/* ========================================================================= */}
      {/* 1. TOP SUMMARY KPI CARDS (Matching Screenshot) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {/* Card 1: Sundry Debtors (Receivables) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Sundry Debtors (Receivables)</div>
              <div className="text-2xl font-black font-tabular text-emerald-600 mt-0.5 tracking-tight">
                {formatCurrency(totalDebtors)}
                <span className="text-xs font-bold ml-1.5 text-slate-500">[Dr]</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            title="Filter Sundry Debtors"
            onClick={() => {
              setSelectedCategory("DEBTORS");
              setViewMode("TABLE");
            }}
            className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

        {/* Card 2: Sundry Creditors (Payables) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Sundry Creditors (Payables)</div>
              <div className="text-2xl font-black font-tabular text-rose-600 mt-0.5 tracking-tight">
                {formatCurrency(totalCreditors)}
                <span className="text-xs font-bold ml-1.5 text-slate-500">[Cr]</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            title="Filter Sundry Creditors"
            onClick={() => {
              setSelectedCategory("CREDITORS");
              setViewMode("TABLE");
            }}
            className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

        {/* Card 3: Total Cash & Bank */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Total Cash & Bank</div>
              <div className="text-2xl font-black font-tabular text-slate-900 mt-0.5 tracking-tight">
                {formatCurrency(totalLiquidCash)}
                <span className="text-xs font-bold ml-1.5 text-slate-500">[Dr]</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            title="Filter Cash & Bank"
            onClick={() => {
              setSelectedCategory("BANK_CASH");
              setViewMode("TABLE");
            }}
            className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

        {/* Card 4: Owner Drawings / Withdrawals */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Owner Drawings / Withdrawals</div>
              <div className="text-2xl font-black font-tabular text-amber-600 mt-0.5 tracking-tight">
                {formatCurrency(totalDrawings)}
                <span className="text-xs font-bold ml-1.5 text-slate-500">[Dr]</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            title="View Drawings"
            onClick={() => {
              setSelectedCategory("CAPITAL");
              setViewMode("TABLE");
            }}
            className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEARCH & FILTER BAR (Matching Screenshot) */}
      {/* ========================================================================= */}
      {viewMode === "TABLE" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center gap-3">
            {/* Search input with magnifying glass */}
            <div className="relative flex-1 min-w-[280px]">
              <input
                type="text"
                placeholder="Search account name, GSTIN, PAN or code..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-11 bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0D7A53] focus:border-transparent outline-none transition-all"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Account Group dropdown */}
            <div className="w-44">
              <select
                value={selectedGroup}
                onChange={(e) => {
                  setSelectedGroup(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-11 bg-slate-50/80 border border-slate-200 rounded-xl px-3 text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#0D7A53] outline-none transition-all cursor-pointer"
              >
                <option value="ALL">All Groups</option>
                {availableGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Type dropdown */}
            <div className="w-40">
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-11 bg-slate-50/80 border border-slate-200 rounded-xl px-3 text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#0D7A53] outline-none transition-all cursor-pointer"
              >
                <option value="ALL">All Types</option>
                {availableTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Status dropdown */}
            <div className="w-32">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-11 bg-slate-50/80 border border-slate-200 rounded-xl px-3 text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#0D7A53] outline-none transition-all cursor-pointer"
              >
                <option value="ACTIVE">Active</option>
                <option value="ALL">All</option>
              </select>
            </div>

            {/* More Filters button */}
            <button
              type="button"
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className="h-11 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>More Filters</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* 3. CATEGORY PILLS & ACTIONS (Matching Screenshot) */}
          {/* ========================================================================= */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "ALL", label: "All Accounts" },
                { id: "DEBTORS", label: "Sundry Debtors" },
                { id: "CREDITORS", label: "Sundry Creditors" },
                { id: "BANK_CASH", label: "Cash & Bank" },
                { id: "TAXES", label: "Duties & Taxes" },
                { id: "CAPITAL", label: "Capital & Assets" },
                { id: "INCOME", label: "Income" },
                { id: "EXPENSE", label: "Expenses" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedCategory(tab.id as CategoryFilter);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === tab.id
                      ? "bg-[#0D7A53] text-white shadow-2xs"
                      : "bg-slate-100/90 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Export & Print actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. MAIN ACCOUNTS TABLE VIEW (Matching Screenshot) */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={paginatedAccounts.length > 0 && selectedAccountIds.size === paginatedAccounts.length}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-[#0D7A53] focus:ring-[#0D7A53] w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th
                      onClick={() => handleSort("name")}
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>ACCOUNT NAME</span>
                        <span className="text-slate-400 text-xs">⇅</span>
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("code")}
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition-colors select-none w-32"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>CODE</span>
                        <span className="text-slate-400 text-xs">⇅</span>
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("group")}
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition-colors select-none w-44"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>GROUP</span>
                        <span className="text-slate-400 text-xs">⇅</span>
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("balance")}
                      className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors select-none w-44"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>CURRENT BALANCE (₹)</span>
                        <span className="text-slate-400 text-xs">⇅</span>
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("drCr")}
                      className="py-3.5 px-4 text-center cursor-pointer hover:text-slate-900 transition-colors select-none w-24"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>DR / CR</span>
                        <span className="text-slate-400 text-xs">⇅</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-center w-36">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        No ledger accounts match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedAccounts.map((acc) => {
                      const initials = getInitials(acc.name);
                      const avatarClass = getAvatarColor(initials);
                      const code = accountCodeMap.get(acc.id) || "—";
                      const isSelected = selectedAccountIds.has(acc.id);

                      return (
                        <tr
                          key={acc.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isSelected ? "bg-emerald-50/30" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(acc.id)}
                              className="rounded border-slate-300 text-[#0D7A53] focus:ring-[#0D7A53] w-4 h-4 cursor-pointer"
                            />
                          </td>

                          {/* Account Name with Initials & GSTIN / PAN */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 border ${avatarClass}`}
                              >
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleAccountSelect(acc.id)}
                                  className="font-bold text-slate-900 text-sm hover:text-[#0D7A53] transition-colors text-left line-clamp-1 cursor-pointer"
                                >
                                  {acc.name}
                                </button>
                                {(acc.gstin || acc.pan) && (
                                  <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex flex-wrap gap-x-2">
                                    {acc.gstin && (
                                      <span>
                                        GSTIN: <span className="text-slate-600 font-semibold">{acc.gstin}</span>
                                      </span>
                                    )}
                                    {acc.pan && !acc.gstin && (
                                      <span>
                                        PAN: <span className="text-slate-600 font-semibold">{acc.pan}</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Code */}
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-600 whitespace-nowrap">
                            {code}
                          </td>

                          {/* Group badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {renderGroupBadge(acc.group)}
                          </td>

                          {/* Current Balance */}
                          <td className="py-3.5 px-4 text-right font-black font-tabular text-slate-900 text-sm whitespace-nowrap">
                            {formatCurrency(acc.currentBalance || 0).replace("₹", "").trim()}
                          </td>

                          {/* Dr / Cr */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block ${
                                acc.currentBalanceType === "Dr"
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                  : "bg-rose-50 text-rose-600 border border-rose-200"
                              }`}
                            >
                              {acc.currentBalanceType || "Dr"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAccountSelect(acc.id)}
                                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer"
                              >
                                View Statement
                              </button>
                              <button
                                type="button"
                                title="Account Options"
                                onClick={() => handleAccountSelect(acc.id)}
                                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                •••
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

            {/* ========================================================================= */}
            {/* 5. TABLE FOOTER / PAGINATION (Matching Screenshot) */}
            {/* ========================================================================= */}
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
              <div>
                Showing{" "}
                <span className="font-bold text-slate-700">
                  {sortedAccounts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </span>
                –
                <span className="font-bold text-slate-700">
                  {Math.min(currentPage * pageSize, sortedAccounts.length)}
                </span>{" "}
                of <span className="font-bold text-slate-700">{sortedAccounts.length}</span> accounts
              </div>

              <div className="flex items-center gap-4">
                {/* Pagination Controls */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center cursor-pointer transition-colors"
                  >
                    ‹
                  </button>

                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(pageNum - currentPage) <= 1
                    ) {
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentPage === pageNum
                              ? "bg-[#0D7A53] text-white shadow-2xs"
                              : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return (
                        <span key={pageNum} className="px-1 text-slate-400">
                          …
                        </span>
                      );
                    }
                    return null;
                  })}

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center cursor-pointer transition-colors"
                  >
                    ›
                  </button>
                </div>

                {/* Page Size Selector */}
                <div className="flex items-center gap-1.5">
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-bold text-slate-700 focus:ring-1 focus:ring-[#0D7A53] outline-none cursor-pointer"
                  >
                    <option value={8}>8</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span>per page</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. STATEMENT VIEW MODE (Accessible via 'View Statement') */}
      {/* ========================================================================= */}
      {viewMode === "STATEMENT" && (
        <div className="space-y-6">
          {/* Top Bar with 'Back to Table View' */}
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs print:hidden">
            <button
              onClick={() => setViewMode("TABLE")}
              className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Accounts Table</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
              >
                CSV
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#0D7A53] hover:bg-[#09593C] px-3.5 py-2 rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                Print Statement
              </button>
            </div>
          </div>

          {/* Account Selector & Date Filter Panel */}
          <div className="bg-white p-5 rounded-2xl shadow-2xs border border-slate-200/90 space-y-4 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700">Quick Period Presets:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: "This Month", key: "CURRENT_MONTH" as const },
                  { label: "Last Month", key: "LAST_MONTH" as const },
                  { label: "Current FY", key: "THIS_FY" as const },
                  { label: "All Records", key: "ALL" as const },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handleQuickPeriod(preset.key)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-[#0D7A53] hover:text-white transition-all cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleDateSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Account Selector */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Select Account Ledger
                </label>
                <select
                  value={accountId}
                  onChange={(e) => {
                    setAccountId(e.target.value);
                    fetchStatement(e.target.value, fromDate, toDate);
                  }}
                  className="w-full bg-slate-50/80 border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#0D7A53] focus:bg-white transition-all outline-none"
                >
                  {Object.entries(groupedAccounts).map(([groupName, accs]) => (
                    <optgroup key={groupName} label={`── ${groupName.toUpperCase()} ──`}>
                      {accs.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.normalBalance === "DEBIT" ? "Dr" : "Cr"})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* From Date */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200/90 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#0D7A53] focus:bg-white transition-all outline-none font-medium"
                />
              </div>

              {/* To Date & Filter Action */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  To Date
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200/90 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#0D7A53] focus:bg-white transition-all outline-none font-medium"
                  />
                  <button
                    type="submit"
                    className="bg-[#0D7A53] hover:bg-[#09593C] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Statement Sheet */}
          {statement && (
            <div className={`space-y-6 transition-opacity duration-200 ${isLoading ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
              {/* Account Statement Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Opening Balance</div>
                  <div className="text-2xl font-black font-tabular text-slate-900 mt-1 tracking-tight">
                    {formatCurrency(statement.openingBalance)}
                    <span className="text-xs font-bold ml-1.5 text-slate-500">[{statement.openingBalanceType}]</span>
                  </div>
                </div>

                <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Period Debit (Dr)</div>
                  <div className="text-2xl font-black font-tabular text-emerald-600 mt-1 tracking-tight">
                    {formatCurrency(statement.totalDebit)}
                  </div>
                </div>

                <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Period Credit (Cr)</div>
                  <div className="text-2xl font-black font-tabular text-rose-600 mt-1 tracking-tight">
                    {formatCurrency(statement.totalCredit)}
                  </div>
                </div>

                <div className="glass-card glass-card-hover p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Closing Net Balance</div>
                  <div className="text-2xl font-black font-tabular text-slate-900 mt-1 tracking-tight">
                    {formatCurrency(statement.closingBalance)}
                    <span className="text-xs font-bold ml-1.5 text-slate-600">[{statement.closingBalanceType}]</span>
                  </div>
                </div>
              </div>

              {/* CA-Standard Account Ledger Statement Sheet */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6 print:border-none print:shadow-none print:p-0">
                {/* Printable Statement Header */}
                <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{statement.account.name}</h2>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">
                      Group: <span className="text-slate-800">{statement.account.group}</span> | Normal Balance:{" "}
                      <span className="text-slate-800">{statement.account.normalBalance}</span>
                    </div>
                    {(statement.account.gstin || statement.account.pan) && (
                      <div className="text-xs font-semibold text-slate-500 mt-0.5">
                        {statement.account.gstin && (
                          <span>
                            GSTIN: <strong className="text-slate-800 font-mono">{statement.account.gstin}</strong>{" "}
                          </span>
                        )}
                        {statement.account.pan && (
                          <span className="ml-2">
                            PAN: <strong className="text-slate-800 font-mono">{statement.account.pan}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-extrabold text-emerald-800 uppercase tracking-tight">Account Ledger Statement</div>
                    <div className="text-xs font-medium text-slate-500">
                      Period: {new Date(statement.fromDate).toLocaleDateString("en-IN")} –{" "}
                      {new Date(statement.toDate).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-y border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Voucher / Ref No.</th>
                        <th className="px-3 py-2.5">Particulars / Transaction Details</th>
                        <th className="px-3 py-2.5 text-right">Debit (Dr - ₹)</th>
                        <th className="px-3 py-2.5 text-right">Credit (Cr - ₹)</th>
                        <th className="px-3 py-2.5 text-right">Running Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {/* Opening Balance Row */}
                      <tr className="bg-slate-50/80 font-bold text-slate-800 font-sans">
                        <td className="px-3 py-2.5 font-mono text-slate-600">{new Date(statement.fromDate).toLocaleDateString("en-IN")}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-400">—</td>
                        <td className="px-3 py-2.5 text-slate-700">To Opening Balance b/f</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-400">—</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-400">—</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(statement.openingBalance)} [{statement.openingBalanceType}]
                        </td>
                      </tr>

                      {/* Transaction Rows */}
                      {statement.entries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-slate-400 font-sans italic">
                            No financial transactions recorded for this account during the selected period.
                          </td>
                        </tr>
                      ) : (
                        statement.entries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50 font-sans transition-colors">
                            <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-600">
                              {new Date(entry.date).toLocaleDateString("en-IN")}
                            </td>
                            <td className="px-3 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                              <Link
                                href={
                                  entry.sourceType === "TAX_INVOICE"
                                    ? `/invoices/${entry.sourceId}`
                                    : entry.sourceType === "EXPENSE"
                                    ? `/expenses/${entry.sourceId}`
                                    : "#"
                                }
                                className="text-emerald-700 hover:underline"
                              >
                                {entry.voucherNo}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5 text-slate-800">
                              <div className="font-medium text-slate-900">{entry.particulars}</div>
                              {entry.reference && (
                                <span className="text-[11px] text-slate-400 font-mono">Ref: {entry.reference}</span>
                              )}
                            </td>
                            <td className={`px-3 py-2.5 text-right font-mono ${entry.debit > 0 ? "font-bold text-emerald-700" : "text-slate-300"}`}>
                              {entry.debit > 0 ? formatCurrency(entry.debit) : "—"}
                            </td>
                            <td className={`px-3 py-2.5 text-right font-mono ${entry.credit > 0 ? "font-bold text-rose-700" : "text-slate-300"}`}>
                              {entry.credit > 0 ? formatCurrency(entry.credit) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              {formatCurrency(entry.runningBalance)}{" "}
                              <span className="text-[11px] font-semibold text-slate-500">[{entry.balanceType}]</span>
                            </td>
                          </tr>
                        ))
                      )}

                      {/* Closing Balance Row */}
                      <tr className="bg-slate-100/90 font-bold text-slate-900 font-sans border-t-2 border-slate-300">
                        <td className="px-3 py-3 font-mono">{new Date(statement.toDate).toLocaleDateString("en-IN")}</td>
                        <td className="px-3 py-3 font-mono text-slate-400">—</td>
                        <td className="px-3 py-3 font-bold">Total Period Movement & Closing Balance c/d</td>
                        <td className="px-3 py-3 text-right font-mono text-emerald-800">{formatCurrency(statement.totalDebit)}</td>
                        <td className="px-3 py-3 text-right font-mono text-rose-800">{formatCurrency(statement.totalCredit)}</td>
                        <td className="px-3 py-3 text-right font-mono text-base font-extrabold text-slate-900">
                          {formatCurrency(statement.closingBalance)} [{statement.closingBalanceType}]
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
