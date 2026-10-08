'use client';

import { useState } from 'react';
import Link from 'next/link';

export function ExpenseVendorsView({ vendors = [] }: { vendors: any[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const filtered = vendors.filter((v) => {
    const s = search.toLowerCase().trim();
    const matchesSearch =
      !s ||
      v.name?.toLowerCase().includes(s) ||
      v.businessName?.toLowerCase().includes(s) ||
      v.gstin?.toLowerCase().includes(s) ||
      v.phone?.toLowerCase().includes(s) ||
      v.email?.toLowerCase().includes(s);

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' ? v.isActive : !v.isActive);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs overflow-hidden">
      {/* Header toolbar */}
      <div className="p-4 border-b border-[#D9E3DC] bg-[#FAFBF9] flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex flex-wrap items-center gap-2 flex-1 w-full max-w-lg">
          <input
            type="text"
            placeholder="Search vendors by name, GSTIN, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] h-[38px] px-3 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B]"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
          <span className="text-[#68756C] font-semibold">
            {filtered.length} vendor{filtered.length !== 1 ? 's' : ''}
          </span>
          <Link
            href="/masters?tab=vendors"
            className="ml-2 inline-flex items-center text-xs font-semibold text-[#177B55] hover:underline"
          >
            Manage in Masters →
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#D9E3DC] bg-[#FAFBF9] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
              <th className="py-3 px-4">Vendor Name</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4">GSTIN</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Recorded Expenses</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E9EEE9]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#68756C]">
                  No vendors found matching criteria.
                </td>
              </tr>
            ) : (
              filtered.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-[#F9FAF8] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#17211B]">
                    <div>{vendor.name}</div>
                    {vendor.businessName && (
                      <div className="text-[11px] text-[#68756C] font-normal">{vendor.businessName}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-[#4B5563]">
                    <div>{vendor.phone || '—'}</div>
                    <div className="text-[11px] text-[#68756C]">{vendor.email || ''}</div>
                  </td>
                  <td className="py-3.5 px-4 text-[#4B5563] font-mono">
                    {vendor.gstin || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        vendor.isActive
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {vendor.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-[#17211B]">
                    {vendor._count?.expenses ?? 0}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/vendors/${vendor.id}`}
                      className="text-[#177B55] hover:underline font-semibold text-xs mr-3"
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
  );
}
