"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { AddMasterRecordModal } from "./AddMasterRecordModal";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils/currency";
import { toggleCategoryStatusAction, toggleEmployeeStatusAction, deleteEmployeeMasterAction } from "./actions";
import { BankAccountsMasterTab } from "../settings/BankAccountsMasterTab";
import { SalaryPaymentModal } from "../expenses/SalaryPaymentModal";

export function MastersClient({
  customers = [],
  vendors = [],
  employees = [],
  products = [],
  categories = [],
  financialTypes = [],
  statementGroups = [],
  accountNatures = [],
  initialTab,
}: {
  customers: any[];
  vendors: any[];
  employees?: any[];
  products: any[];
  categories: any[];
  financialTypes?: any[];
  statementGroups?: any[];
  accountNatures?: any[];
  initialTab?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const actionParam = searchParams?.get("action");
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"customers" | "vendors" | "employees" | "products" | "categories" | "bank_accounts">(
    initialTab === "employees" || initialTab === "vendors" || initialTab === "products" || initialTab === "categories" || initialTab === "bank_accounts"
      ? initialTab
      : "customers"
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");
  const [financialTypeFilter, setFinancialTypeFilter] = useState<string>("ALL");

  const [isAddModalOpen, setIsAddModalOpen] = useState(actionParam === "new");
  const [editingRecord, setEditingRecord] = useState<{ type: string; data: any } | null>(null);

  const [customersList, setCustomersList] = useState<any[]>(customers);
  const [vendorsList, setVendorsList] = useState<any[]>(vendors);
  const [employeesList, setEmployeesList] = useState<any[]>(employees);
  const [productsList, setProductsList] = useState<any[]>(products);
  const [categoriesList, setCategoriesList] = useState<any[]>(categories);

  const [salaryEmployee, setSalaryEmployee] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => { setCustomersList(customers); }, [customers]);
  useEffect(() => { setVendorsList(vendors); }, [vendors]);
  useEffect(() => { setEmployeesList(employees); }, [employees]);
  useEffect(() => { setProductsList(products); }, [products]);
  useEffect(() => { setCategoriesList(categories); }, [categories]);

  const handleDeleteEmployee = async (id: string) => {
    setIsDeleting(id);
    try {
      const res = await deleteEmployeeMasterAction(id);
      if (res.success) {
        setEmployeesList((prev) => prev.filter((e) => e.id !== id));
        setDeleteConfirmId(null);
        router.refresh();
      } else {
        alert(res.error || "Failed to delete employee.");
      }
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred while deleting.");
    } finally {
      setIsDeleting(null);
    }
  };

  // Filter helper
  const filterRecord = (name: string, extra: string, isActive: boolean = true) => {
    const s = search.toLowerCase().trim();
    const matchSearch = !s || name.toLowerCase().includes(s) || extra.toLowerCase().includes(s);
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && isActive) ||
      (statusFilter === "INACTIVE" && !isActive);
    return matchSearch && matchStatus;
  };

  const filteredCustomers = customersList.filter((c) =>
    filterRecord(c.tradeName || c.legalName || "", c.gstin || "", c.isActive ?? true)
  );

  const filteredVendors = vendorsList.filter((v) =>
    filterRecord(v.name || "", v.gstin || "", v.isActive ?? true)
  );

  const filteredEmployees = employeesList.filter((e) =>
    filterRecord(
      e.name || "",
      `${e.employeeCode || ""} ${e.designation || ""} ${e.department || ""} ${e.email || ""} ${e.phone || ""}`,
      e.isActive ?? true
    )
  );

  const filteredProducts = productsList.filter((p) =>
    filterRecord(p.name || "", p.hsnSacCode || "", p.isActive ?? true)
  );

  const filteredCategories = categoriesList.filter((c) => {
    const s = search.toLowerCase().trim();
    const matchSearch =
      !s ||
      (c.name || "").toLowerCase().includes(s) ||
      (c.code || "").toLowerCase().includes(s) ||
      (c.statementGroup || "").toLowerCase().includes(s) ||
      (c.accountNature || "").toLowerCase().includes(s) ||
      (c.financialType || "").toLowerCase().includes(s);

    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && (c.isActive ?? true)) ||
      (statusFilter === "INACTIVE" && !(c.isActive ?? true));

    const matchType =
      financialTypeFilter === "ALL" ||
      (c.financialType || "").toUpperCase() === financialTypeFilter.toUpperCase();

    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#17211B] tracking-tight">Masters</h1>
          <p className="text-[#68756C] text-sm mt-0.5 font-normal">
            Maintain customers, parties, products/services and categories in a clean table workflow.
          </p>
        </div>
        {activeTab !== "bank_accounts" && (
          <button
            type="button"
            onClick={() => {
              setEditingRecord(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#177B55] hover:bg-[#136f4e] shadow-xs transition-colors gap-1.5 shrink-0 cursor-pointer"
          >
            <span>+</span> Add Record
          </button>
        )}
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6 space-y-5">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-6 border-b border-[#D9E3DC]">
          {[
            { id: "customers", label: `Customers (${filteredCustomers.length})` },
            { id: "vendors", label: `Vendors (${filteredVendors.length})` },
            { id: "employees", label: `Employees (${filteredEmployees.length})` },
            { id: "products", label: `Products & Services (${filteredProducts.length})` },
            { id: "categories", label: `Chart of Accounts (${filteredCategories.length})` },
            { id: "bank_accounts", label: "Bank Accounts" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? "border-[#177B55] text-[#177B55]"
                  : "border-transparent text-[#68756C] hover:text-[#17211B]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters Row */}
        {activeTab !== "bank_accounts" && (
          <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder={
                activeTab === "categories"
                  ? "Search category name, code, group, nature..."
                  : activeTab === "employees"
                  ? "Search employee name, code, designation, department..."
                  : "Search by name, GSTIN, HSN/SAC..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[41px] px-3.5 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white placeholder-[#68756C]"
            />
          </div>

          {activeTab === "categories" && (
            <select
              value={financialTypeFilter}
              onChange={(e) => setFinancialTypeFilter(e.target.value)}
              className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] min-w-[140px]"
            >
              <option value="ALL">All Types</option>
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
              <option value="EQUITY">Equity</option>
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] min-w-[120px]"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ALL">All Status</option>
          </select>
        </div>
        )}

        {/* 1. Customers Table */}
        {activeTab === "customers" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                  <th className="py-3 px-3">CUSTOMER NAME & GSTIN</th>
                  <th className="py-3 px-3">TYPE</th>
                  <th className="py-3 px-3">STATE & POS</th>
                  <th className="py-3 px-3">CONTACT</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEE9] text-xs">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#68756C]">
                      No customers found. Click &quot;+ Add Record&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => {
                    const isB2B = cust.customerType === "B2B";
                    const isExport = cust.customerType === "B2B_EXPORT";
                    const formattedType = isExport ? "Export" : isB2B ? "B2B" : "B2C";
                    const stateName = cust.state || cust.placeOfSupply || "Kerala";

                    return (
                      <tr key={cust.id} className="hover:bg-[#F9FAF8] transition-colors">
                        <td className="py-4 px-3">
                          <p className="font-bold text-[#17211B]">{cust.tradeName || cust.legalName}</p>
                          {cust.gstin ? (
                            <p className="text-[11px] text-[#68756C] mt-0.5">GSTIN: <strong className="text-[#17211B]">{cust.gstin}</strong></p>
                          ) : (
                            <p className="text-[11px] text-[#7B877F] mt-0.5">{isExport ? "Export Customer" : "Unregistered"}</p>
                          )}
                        </td>
                        <td className="py-4 px-3 text-[#17211B] font-medium">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${isExport ? 'bg-blue-50 text-blue-800' : 'bg-emerald-50 text-emerald-800'}`}>
                            {formattedType}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-[#17211B]">
                          {stateName} {cust.country && cust.country !== "India" ? `• ${cust.country}` : ""}
                        </td>
                        <td className="py-4 px-3 text-[#17211B]">
                          {cust.contactPerson || cust.phone || cust.email || "—"}
                        </td>
                        <td className="py-4 px-3 font-medium">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${cust.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                            {cust.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRecord({ type: "customer", data: cust });
                              setIsAddModalOpen(true);
                            }}
                            className="inline-block bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
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
        )}

        {/* 2. Vendors / Parties Table */}
        {activeTab === "vendors" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                  <th className="py-3 px-3">PARTY NAME & GSTIN</th>
                  <th className="py-3 px-3">STATE</th>
                  <th className="py-3 px-3">CONTACT</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEE9] text-xs">
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#68756C]">
                      No parties found. Click &quot;+ Add Record&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((ven) => (
                    <tr key={ven.id} className="hover:bg-[#F9FAF8] transition-colors">
                      <td className="py-4 px-3">
                        <p className="font-bold text-[#17211B]">{ven.name}</p>
                        {ven.gstin ? (
                          <p className="text-[11px] text-[#68756C] mt-0.5">GSTIN: <strong className="text-[#17211B]">{ven.gstin}</strong></p>
                        ) : (
                          <p className="text-[11px] text-[#7B877F] mt-0.5">Unregistered Party</p>
                        )}
                      </td>
                      <td className="py-4 px-3 text-[#17211B]">
                        {ven.state || "Kerala"}
                      </td>
                      <td className="py-4 px-3 text-[#17211B]">
                        {ven.contactPerson || ven.phone || ven.email || "—"}
                      </td>
                      <td className="py-4 px-3 font-medium">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${ven.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                          {ven.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecord({ type: "vendor", data: ven });
                            setIsAddModalOpen(true);
                          }}
                          className="inline-block bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 2b. Employees Table */}
        {activeTab === "employees" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                  <th className="py-3 px-3">EMPLOYEE CODE & NAME</th>
                  <th className="py-3 px-3">DESIGNATION & DEPT</th>
                  <th className="py-3 px-3">CONTACT</th>
                  <th className="py-3 px-3">PAN</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBF1ED]">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-[#738078]">
                      No employee records found. Click &quot;+ Add Record&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-[#F6FAF7] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-xs text-[#17211B]">{emp.name}</div>
                        <div className="text-[11px] text-[#738078] font-mono">{emp.employeeCode || "—"}</div>
                      </td>
                      <td className="py-3 px-3 text-xs text-[#17211B]">
                        <div>{emp.designation || "Staff"}</div>
                        <div className="text-[11px] text-[#738078]">{emp.department || "Operations"}</div>
                      </td>
                      <td className="py-3 px-3 text-xs text-[#17211B]">
                        <div>{emp.email || "—"}</div>
                        <div className="text-[11px] text-[#738078]">{emp.phone || "—"}</div>
                      </td>
                      <td className="py-3 px-3 text-xs font-mono text-[#17211B]">{emp.pan || "—"}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}>
                          {emp.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSalaryEmployee(emp)}
                          className="inline-block bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#0B5F46] transition-colors shadow-2xs cursor-pointer"
                          title="Mark salary payout for this employee"
                        >
                          ₹ Pay Salary
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecord({ type: "employee", data: emp });
                            setIsAddModalOpen(true);
                          }}
                          className="inline-block bg-white border border-[#D9E3DC] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            startTransition(async () => {
                              await toggleEmployeeStatusAction(emp.id, !emp.isActive);
                              setEmployeesList((prev) =>
                                prev.map((e) => (e.id === emp.id ? { ...e, isActive: !e.isActive } : e))
                              );
                              router.refresh();
                            });
                          }}
                          className={`inline-block border rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer ${
                            emp.isActive
                              ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {emp.isActive ? "Deactivate" : "Activate"}
                        </button>
                        {deleteConfirmId === emp.id ? (
                          <span className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={isDeleting === emp.id}
                              onClick={() => handleDeleteEmployee(emp.id)}
                              className="px-2 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              {isDeleting === emp.id ? "..." : "Confirm"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-colors cursor-pointer"
                            >
                              ✕
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(emp.id)}
                            className="inline-block bg-white hover:bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-600 transition-colors shadow-2xs cursor-pointer"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Products & Services Table */}
        {activeTab === "products" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                  <th className="py-3 px-3">PRODUCT / SERVICE</th>
                  <th className="py-3 px-3">TYPE</th>
                  <th className="py-3 px-3">HSN/SAC</th>
                  <th className="py-3 px-3">GST RATE</th>
                  <th className="py-3 px-3">DEFAULT RATE</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEE9] text-xs">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#68756C]">
                      No products or services found. Click &quot;+ Add Record&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-[#F9FAF8] transition-colors">
                      <td className="py-4 px-3 font-bold text-[#17211B]">
                        {prod.name}
                        {prod.description && <p className="text-[11px] text-[#68756C] font-normal">{prod.description}</p>}
                      </td>
                      <td className="py-4 px-3 text-[#17211B] font-medium">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${prod.type === 'SERVICE' ? 'bg-purple-50 text-purple-800' : 'bg-blue-50 text-blue-800'}`}>
                          {prod.type || "SERVICE"}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-[#17211B] font-medium">
                        {prod.hsnSacCode || "9983"}
                      </td>
                      <td className="py-4 px-3 text-[#17211B]">
                        {Number(prod.gstRate || 18)}%
                      </td>
                      <td className="py-4 px-3 font-bold text-[#17211B]">
                        {formatCurrency(Number(prod.sellingPrice || 0))}
                      </td>
                      <td className="py-4 px-3 font-medium">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${prod.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                          {prod.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecord({ type: "product", data: prod });
                            setIsAddModalOpen(true);
                          }}
                          className="inline-block bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Categories Table */}
        {activeTab === "categories" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                  <th className="py-3 px-3">CATEGORY & CODE</th>
                  <th className="py-3 px-3">FINANCIAL TYPE</th>
                  <th className="py-3 px-3">STATEMENT GROUP</th>
                  <th className="py-3 px-3">ACCOUNT NATURE</th>
                  <th className="py-3 px-3">BALANCE</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEE9] text-xs">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#68756C]">
                      No categories found matching filters. Click &quot;+ Add Record&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => {
                    const isInc = cat.financialType === "INCOME";
                    const isAst = cat.financialType === "ASSET";
                    const isLiab = cat.financialType === "LIABILITY";
                    const isEq = cat.financialType === "EQUITY";

                    const badgeColor = isInc
                      ? "bg-emerald-100 text-emerald-800"
                      : isAst
                      ? "bg-blue-100 text-blue-800"
                      : isLiab
                      ? "bg-purple-100 text-purple-800"
                      : isEq
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-amber-100 text-amber-800";

                    return (
                      <tr key={cat.id} className="hover:bg-[#F9FAF8] transition-colors">
                        <td className="py-4 px-3 font-bold text-[#17211B]">
                          <div className="flex items-center gap-2">
                            <span>{cat.name}</span>
                            {cat.code && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">
                                {cat.code}
                              </span>
                            )}
                          </div>
                          {cat.parent && (
                            <p className="text-[11px] text-[#68756C] font-normal mt-0.5">
                              Parent: {cat.parent.name}
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-3 text-[#17211B] font-bold">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-extrabold ${badgeColor}`}>
                            {cat.financialType || "EXPENSE"}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-[#17211B] font-medium">
                          {cat.statementGroup || "Administrative Expenses"}
                        </td>
                        <td className="py-4 px-3 text-[#68756C]">
                          {cat.accountNature || "Operating Expense"}
                        </td>
                        <td className="py-4 px-3 font-bold text-[#17211B]">
                          {cat.normalBalance || (isAst || cat.financialType === "EXPENSE" ? "Debit" : "Credit")}
                        </td>
                        <td className="py-4 px-3 font-medium">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${cat.isActive !== false ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>
                            {cat.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRecord({ type: "category", data: cat });
                              setIsAddModalOpen(true);
                            }}
                            className="bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                await toggleCategoryStatusAction(cat.id, !(cat.isActive !== false));
                                setCategoriesList((prev) =>
                                  prev.map((c) =>
                                    c.id === cat.id ? { ...c, isActive: !(cat.isActive !== false) } : c
                                  )
                                );
                                router.refresh();
                              });
                            }}
                            className="bg-white border border-[#D9E3DC] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#68756C] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
                          >
                            {cat.isActive !== false ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Bank Accounts Table */}
        {activeTab === "bank_accounts" && (
          <div className="pt-2">
            <BankAccountsMasterTab />
          </div>
        )}
      </div>

      {/* Add / Edit Master Record Modal */}
      {isAddModalOpen && (
        <AddMasterRecordModal
          defaultTab={
            editingRecord?.type ||
            (activeTab === "customers"
              ? "customer"
              : activeTab === "vendors"
              ? "vendor"
              : activeTab === "employees"
              ? "employee"
              : activeTab === "products"
              ? "product"
              : "category")
          }
          initialData={editingRecord?.data}
          categories={categoriesList}
          financialTypes={financialTypes}
          statementGroups={statementGroups}
          accountNatures={accountNatures}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingRecord(null);
            if (actionParam === "new") {
              router.replace(`/masters?tab=${activeTab}`);
            }
          }}
          onSuccess={(data, type) => {
            if (data) {
              const recordType =
                type ||
                editingRecord?.type ||
                (data?.employeeCode || data?.department !== undefined
                  ? "employee"
                  : data?.gstin !== undefined || data?.legalName !== undefined
                  ? activeTab === "vendors"
                    ? "vendor"
                    : "customer"
                  : data?.sellingPrice !== undefined
                  ? "product"
                  : data?.statementGroup !== undefined
                  ? "category"
                  : "customer");

              if (recordType === "employee") {
                setEmployeesList((prev) => {
                  const exists = prev.some((e) => e.id === data.id);
                  if (exists) {
                    return prev.map((e) => (e.id === data.id ? { ...e, ...data } : e));
                  }
                  return [data, ...prev];
                });
                setActiveTab("employees");
              } else if (recordType === "customer") {
                setCustomersList((prev) => {
                  const exists = prev.some((c) => c.id === data.id);
                  if (exists) {
                    return prev.map((c) => (c.id === data.id ? { ...c, ...data } : c));
                  }
                  return [data, ...prev];
                });
                setActiveTab("customers");
              } else if (recordType === "vendor") {
                setVendorsList((prev) => {
                  const exists = prev.some((v) => v.id === data.id);
                  if (exists) {
                    return prev.map((v) => (v.id === data.id ? { ...v, ...data } : v));
                  }
                  return [data, ...prev];
                });
                setActiveTab("vendors");
              } else if (recordType === "product") {
                setProductsList((prev) => {
                  const exists = prev.some((p) => p.id === data.id);
                  if (exists) {
                    return prev.map((p) => (p.id === data.id ? { ...p, ...data } : p));
                  }
                  return [data, ...prev];
                });
                setActiveTab("products");
              } else if (recordType === "category") {
                setCategoriesList((prev) => {
                  const exists = prev.some((c) => c.id === data.id);
                  if (exists) {
                    return prev.map((c) => (c.id === data.id ? { ...c, ...data } : c));
                  }
                  return [data, ...prev];
                });
                setActiveTab("categories");
              }
            }
            setIsAddModalOpen(false);
            setEditingRecord(null);
            if (actionParam === "new") {
              router.replace(`/masters?tab=${activeTab}`);
            }
            router.refresh();
          }}
        />
      )}

      {/* Salary Payment Modal */}
      {salaryEmployee && (
        <SalaryPaymentModal
          employee={salaryEmployee}
          onClose={() => setSalaryEmployee(null)}
          onSuccess={() => {
            setSalaryEmployee(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
