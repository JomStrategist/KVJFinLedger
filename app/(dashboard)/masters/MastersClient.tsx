"use client";

import { useState } from "react";
import Link from "next/link";
import { AddMasterRecordModal } from "./AddMasterRecordModal";
import { useRouter } from "next/navigation";

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
  const [activeTab, setActiveTab] = useState<"customers" | "vendors" | "products" | "categories">("customers");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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

  const filteredCategories = categories.filter((c) =>
    filterRecord(c.name || "", c.description || "", c.isActive ?? true)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#17211B] tracking-tight">Masters</h1>
          <p className="text-[#68756C] text-sm mt-0.5 font-normal">
            Maintain customers, vendors, products/services and categories.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
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
            { id: "customers", label: "Customers" },
            { id: "vendors", label: "Vendors" },
            { id: "products", label: "Products & Services" },
            { id: "categories", label: "Categories" },
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
              placeholder="Search record"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[41px] px-3.5 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white placeholder-[#68756C]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-[41px] border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B] min-w-[120px]"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ALL">All</option>
          </select>
        </div>

        {/* 1. Customers Table */}
        {activeTab === "customers" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                  <th className="py-3 px-3">CUSTOMER</th>
                  <th className="py-3 px-3">GSTIN</th>
                  <th className="py-3 px-3">TYPE</th>
                  <th className="py-3 px-3">STATE</th>
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
                    const stateName =
                      cust.billingAddress?.state || cust.placeOfSupply || "Kerala";
                    const isB2B = cust.customerType === "B2B";
                    const isExport = cust.customerType === "B2B_EXPORT";

                    return (
                      <tr key={cust.id} className="hover:bg-[#F9FAF8] transition-colors">
                        <td className="py-4 px-3 font-bold text-[#17211B]">
                          {cust.tradeName || cust.legalName}
                        </td>
                        <td className="py-4 px-3 text-[#17211B] font-medium">
                          {cust.gstin || (isExport ? "Export Customer" : "—")}
                        </td>
                        <td className="py-4 px-3 text-[#17211B]">
                          {isExport ? "Export" : isB2B ? "B2B" : "B2C"}
                        </td>
                        <td className="py-4 px-3 text-[#17211B]">
                          {isExport ? "USA" : stateName}
                        </td>
                        <td className="py-4 px-3 text-[#17211B] font-medium">
                          {cust.isActive ? "Active" : "Inactive"}
                        </td>
                        <td className="py-4 px-2 text-right space-x-2 whitespace-nowrap">
                          <Link
                            href={`/customers/${cust.id}/edit`}
                            className="inline-block bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/customers/${cust.id}`}
                            className="inline-block bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
                          >
                            View
                          </Link>
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
                  <th className="py-3 px-3">VENDOR</th>
                  <th className="py-3 px-3">GSTIN</th>
                  <th className="py-3 px-3">STATE</th>
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
                      <td className="py-4 px-3 font-bold text-[#17211B]">
                        {ven.name}
                      </td>
                      <td className="py-4 px-3 text-[#17211B] font-medium">
                        {ven.gstin || "—"}
                      </td>
                      <td className="py-4 px-3 text-[#17211B]">
                        {ven.state || "Kerala"}
                      </td>
                      <td className="py-4 px-3 text-[#17211B] font-medium">
                        {ven.isActive ? "Active" : "Inactive"}
                      </td>
                      <td className="py-4 px-2 text-right space-x-2 whitespace-nowrap">
                        <Link
                          href={`/vendors/${ven.id}/edit`}
                          className="inline-block bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/vendors/${ven.id}`}
                          className="inline-block bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
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
        )}

        {/* 3. Products & Services Table */}
        {activeTab === "products" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                  <th className="py-3 px-3">PRODUCT / SERVICE</th>
                  <th className="py-3 px-3">HSN/SAC</th>
                  <th className="py-3 px-3">GST</th>
                  <th className="py-3 px-3">TREATMENT</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEE9] text-xs">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#68756C]">
                      No products or services found. Click &quot;+ Add Record&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-[#F9FAF8] transition-colors">
                      <td className="py-4 px-3 font-bold text-[#17211B]">
                        {prod.name}
                      </td>
                      <td className="py-4 px-3 text-[#17211B] font-medium">
                        {prod.hsnSacCode || "9983"}
                      </td>
                      <td className="py-4 px-3 text-[#17211B]">
                        {Number(prod.gstRate || 18)}%
                      </td>
                      <td className="py-4 px-3 text-[#17211B]">
                        {prod.description || "Training Income"}
                      </td>
                      <td className="py-4 px-3 text-[#17211B] font-medium">
                        {prod.isActive ? "Active" : "Inactive"}
                      </td>
                      <td className="py-4 px-2 text-right space-x-2 whitespace-nowrap">
                        <Link
                          href={`/products/${prod.id}/edit`}
                          className="inline-block bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/products/${prod.id}`}
                          className="inline-block bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
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
        )}

        {/* 4. Categories Table */}
        {activeTab === "categories" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                  <th className="py-3 px-3">TYPE</th>
                  <th className="py-3 px-3">CATEGORY</th>
                  <th className="py-3 px-3">STATEMENT GROUP</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEE9] text-xs">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#68756C]">
                      No categories found. Click &quot;+ Add Record&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-[#F9FAF8] transition-colors">
                      <td className="py-4 px-3 text-[#17211B] font-medium">
                        Expense
                      </td>
                      <td className="py-4 px-3 font-bold text-[#17211B]">
                        {cat.name}
                      </td>
                      <td className="py-4 px-3 text-[#17211B]">
                        {cat.description || "P&L — Operating Expense"}
                      </td>
                      <td className="py-4 px-3 text-[#17211B] font-medium">
                        {cat.isActive ? "Active" : "Inactive"}
                      </td>
                      <td className="py-4 px-2 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setIsAddModalOpen(true)}
                          className="bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddModalOpen(true)}
                          className="bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Master Record Modal */}
      {isAddModalOpen && (
        <AddMasterRecordModal
          defaultTab={
            activeTab === "customers"
              ? "customer"
              : activeTab === "vendors"
              ? "vendor"
              : activeTab === "products"
              ? "product"
              : "category"
          }
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
