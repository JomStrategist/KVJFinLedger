'use client';

import { useState } from 'react';
import Link from 'next/link';

export function BankAccountsView({ bankAccounts = [] }: { bankAccounts: any[] }) {
  const [search, setSearch] = useState('');

  const filtered = bankAccounts.filter((b) => {
    const s = search.toLowerCase().trim();
    if (!s) return true;
    return (
      b.accountName?.toLowerCase().includes(s) ||
      b.bankName?.toLowerCase().includes(s) ||
      b.accountNumber?.toLowerCase().includes(s) ||
      b.ifsc?.toLowerCase().includes(s) ||
      b.branch?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-[#D9E3DC] bg-[#FAFBF9] flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex items-center gap-2 flex-1 w-full max-w-md">
          <input
            type="text"
            placeholder="Search bank accounts by name, number, IFSC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 h-[38px] px-3 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white"
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto text-xs">
          <span className="text-[#68756C] font-semibold">
            {filtered.length} account{filtered.length !== 1 ? 's' : ''}
          </span>
          <Link
            href="/masters?tab=bank-accounts"
            className="inline-flex items-center text-xs font-semibold text-[#177B55] hover:underline"
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
              <th className="py-3 px-4">Account Name</th>
              <th className="py-3 px-4">Bank Name &amp; Branch</th>
              <th className="py-3 px-4">Account Number</th>
              <th className="py-3 px-4">IFSC Code</th>
              <th className="py-3 px-4 text-center">Type</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E9EEE9]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#68756C]">
                  No bank accounts configured.
                </td>
              </tr>
            ) : (
              filtered.map((acc) => (
                <tr key={acc.id} className="hover:bg-[#F9FAF8] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#17211B]">
                    <div className="flex items-center gap-2">
                      <span>{acc.accountName}</span>
                      {acc.isPrimary && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          PRIMARY
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-[#4B5563]">
                    <div className="font-medium text-[#17211B]">{acc.bankName}</div>
                    {acc.branch && <div className="text-[11px] text-[#68756C]">{acc.branch}</div>}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-[#17211B]">
                    {acc.accountNumber}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#4B5563]">
                    {acc.ifsc}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      CURRENT
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        acc.isActive !== false
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {acc.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
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
