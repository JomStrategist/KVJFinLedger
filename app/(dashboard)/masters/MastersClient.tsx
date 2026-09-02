"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AddMasterRecordModal } from "./AddMasterRecordModal";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils/currency";
import { toggleCategoryStatusAction } from "./actions";

export function MastersClient({
  customers = [],
  vendors = [],
  products = [],
  categories = [],
}: {
  customers: any[];
  vendors: any[];
  products: any[];
  categories: any[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"customers" | "vendors" | "products" | "categories">("customers");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");
  const [financialTypeFilter, setFinancialTypeFilter] = useState<string>("ALL");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{ type: string; data: any } | null>(null);

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

  const filteredCustomers = customers.filter((c) =>
    filterRecord(c.tradeName || c.legalName || "", c.gstin || "", c.isActive ?? true)
  );

  const filteredVendors = vendors.filter((v) =>
    filterRecord(v.name || "", v.gstin || "", v.isActive ?? true)
  );

  const filteredProducts = products.filter((p) =>
    filterRecord(p.name || "", p.hsnSacCode || "", p.isActive ?? true)
  );

  const filteredCategories = categories.filter((c) => {
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
            Maintain customers, vendors, products/services and categories in a clean table workflow.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingRecord(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#1b5e4b] hover:bg-[#136f58] shadow-xs transition-colors gap-1.5 shrink-0"
        >
          <span>+</span> Add Record
        </button>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6 space-y-5">
        {/* Navigation Tabs */}
        <div className="flex gap-6 border-b border-[#D9E3DC]">
          {[
            { id: "customers", label: `Customers (${filteredCustomers.length})` },
            { id: "vendors", label: `Vendors (${filteredVendors.length})` },
            { id: "products", label: `Products & Services (${filteredProducts.length})` },
            { id: "categories", label: `Categories (${filteredCategories.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-xs font-bold transition-all border-b-2 ${
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder={
                activeTab === "categories"
                  ? "Search category name, code, group, nature..."
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

        {/* 2. Vendors Table */}
        {activeTab === "vendors" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                  <th className="py-3 px-3">VENDOR NAME & GSTIN</th>
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
                      No vendors found. Click &quot;+ Add Record&quot; to create one.
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
                          <p className="text-[11px] text-[#7B877F] mt-0.5">Unregistered Vendor</p>
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
              : activeTab === "products"
              ? "product"
              : "category")
          }
          initialData={editingRecord?.data}
          categories={categories}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingRecord(null);
          }}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
