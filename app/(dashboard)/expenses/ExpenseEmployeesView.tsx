'use client';

import { useState } from 'react';
import Link from 'next/link';

export function ExpenseEmployeesView({ employees = [] }: { employees: any[] }) {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const departments = Array.from(
    new Set(employees.map((e) => e.department).filter(Boolean))
  ) as string[];

  const filtered = employees.filter((e) => {
    const s = search.toLowerCase().trim();
    const matchesSearch =
      !s ||
      e.name?.toLowerCase().includes(s) ||
      e.employeeCode?.toLowerCase().includes(s) ||
      e.email?.toLowerCase().includes(s) ||
      e.department?.toLowerCase().includes(s);

    const matchesDept = deptFilter === 'ALL' || e.department === deptFilter;

    return matchesSearch && matchesDept;
  });

  return (
    <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs overflow-hidden">
      {/* Header toolbar */}
      <div className="p-4 border-b border-[#D9E3DC] bg-[#FAFBF9] flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex flex-wrap items-center gap-2 flex-1 w-full max-w-lg">
          <input
            type="text"
            placeholder="Search employees by name, code, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] h-[38px] px-3 border border-[#D9E3DC] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white"
          />
          {departments.length > 0 && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#177B55] bg-white text-[#17211B]"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
          <span className="text-[#68756C] font-semibold">
            {filtered.length} employee{filtered.length !== 1 ? 's' : ''}
          </span>
          <Link
            href="/masters?tab=employees"
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
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4">Department / Designation</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Recorded Claims / Expenses</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E9EEE9]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#68756C]">
                  No employees found matching criteria.
                </td>
              </tr>
            ) : (
              filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-[#F9FAF8] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#17211B]">
                    {emp.name}
                  </td>
                  <td className="py-3.5 px-4 text-[#4B5563] font-mono">
                    {emp.employeeCode || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-[#4B5563]">
                    <div>{emp.department || '—'}</div>
                    {emp.designation && (
                      <div className="text-[11px] text-[#68756C]">{emp.designation}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-[#4B5563]">
                    <div>{emp.email || '—'}</div>
                    <div className="text-[11px] text-[#68756C]">{emp.phone || ''}</div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.isActive
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-[#17211B]">
                    {emp._count?.expenses ?? 0}
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
