'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AddMasterRecordModal } from '../masters/AddMasterRecordModal';
import { SalaryPaymentModal } from './SalaryPaymentModal';
import { BatchPayrollModal } from './BatchPayrollModal';
import { PayslipModal } from './PayslipModal';
import { RecordAdvanceModal } from './RecordAdvanceModal';
import { CorporateBankingExportModal } from './CorporateBankingExportModal';
import { EmployeeAdvancesView } from './EmployeeAdvancesView';
import { deleteEmployeeMasterAction } from './actions';

export function ExpenseEmployeesView({
  employees = [],
  advances = [],
  autoOpenAddEmployee = false,
}: {
  employees: any[];
  advances?: any[];
  autoOpenAddEmployee?: boolean;
}) {
  const router = useRouter();
  const [employeesList, setEmployeesList] = useState<any[]>(employees);
  const [advancesList, setAdvancesList] = useState<any[]>(advances);

  useEffect(() => {
    setEmployeesList(employees);
  }, [employees]);

  useEffect(() => {
    setAdvancesList(advances || []);
  }, [advances]);

  // Sub-view tab
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'advances'>('directory');

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(autoOpenAddEmployee);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [salaryEmployee, setSalaryEmployee] = useState<any | null>(null);
  const [isBatchPayrollOpen, setIsBatchPayrollOpen] = useState(false);
  const [isBankExportOpen, setIsBankExportOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advanceTargetEmployeeId, setAdvanceTargetEmployeeId] = useState<string | undefined>(undefined);

  // Payslip modal state
  const [selectedPayslipExpenseId, setSelectedPayslipExpenseId] = useState<string | null>(null);

  // Deletion state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const departments = Array.from(
    new Set(employeesList.map((e) => e.department).filter(Boolean))
  ) as string[];

  const filtered = employeesList.filter((e) => {
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

  const handleOpenPayslipForEmployee = (emp: any) => {
    // If employee has a recent expense, open payslip
    const recentExpense = emp.expenses?.[0] || null;
    if (recentExpense) {
      setSelectedPayslipExpenseId(recentExpense.id);
    } else {
      // Find expense by employeeId
      alert(`No recent salary payout found for ${emp.name}. Record a salary payment first.`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-Tabs Ribbon: Staff Directory vs Advances & Loans */}
      <div className="flex justify-between items-center bg-[#FAFBF9] border border-[#D9E3DC] rounded-2xl p-1.5 shadow-2xs">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'directory'
                ? 'bg-white text-[#17211B] shadow-xs border border-[#D9E3DC]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👥 Staff Directory & Payroll
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('advances')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'advances'
                ? 'bg-white text-[#17211B] shadow-xs border border-[#D9E3DC]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>💸</span> Advances & Loans Sub-Ledger
            {advancesList.filter((a) => a.status === 'ACTIVE').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                {advancesList.filter((a) => a.status === 'ACTIVE').length}
              </span>
            )}
          </button>
        </div>

        {/* Action Group in Sub-header */}
        <div className="flex items-center gap-2 pr-1">
          <button
            type="button"
            onClick={() => setIsBatchPayrollOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#177B55] hover:bg-[#0B5F46] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            title="Single-click monthly salary run with pro-rata adjustments"
          >
            <span>⚡</span> Run Monthly Payroll
          </button>

          <button
            type="button"
            onClick={() => setIsBankExportOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            title="Download corporate batch payment files (HDFC, ICICI, SBI, Federal Bank)"
          >
            <span>🏦</span> Bank Batch File
          </button>
        </div>
      </div>

      {/* Directory Sub-View */}
      {activeSubTab === 'directory' && (
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
              <button
                onClick={() => {
                  setEditingEmployee(null);
                  setIsAddModalOpen(true);
                }}
                className="ml-2 inline-flex items-center gap-1 px-3 py-1.5 bg-[#177B55] hover:bg-[#0B5F46] text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                <span>+</span> Add Employee
              </button>
              <Link
                href="/masters?tab=employees"
                className="ml-1 inline-flex items-center text-xs font-semibold text-[#177B55] hover:underline"
              >
                Manage in Masters →
              </Link>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[840px]">
              <thead>
                <tr className="border-b border-[#D9E3DC] bg-[#FAFBF9] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Department / Designation</th>
                  <th className="py-3 px-4">Contact &amp; PAN</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Advances (Asset)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEE9]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#68756C]">
                      No employees found matching criteria. Click &quot;+ Add Employee&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  filtered.map((emp) => {
                    const activeAdvAmt = (emp.advances || []).reduce(
                      (sum: number, a: any) => sum + (a.status === 'ACTIVE' ? Number(a.balanceAmount || a.amount) : 0),
                      0
                    );

                    return (
                      <tr key={emp.id} className="hover:bg-[#F9FAF8] transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-[#17211B]">
                          <div>{emp.name}</div>
                          {Number(emp.salary || 0) > 0 ? (
                            <div className="text-[10px] text-[#177B55] font-semibold mt-0.5">
                              Base CTC: ₹{Number(emp.salary).toLocaleString('en-IN')}/mo
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 mt-0.5">No base salary configured</div>
                          )}
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
                          <div className="text-[10px] text-slate-500 font-mono">
                            {emp.pan ? `PAN: ${emp.pan}` : ''} {emp.phone ? `• ${emp.phone}` : ''}
                          </div>
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
                        <td className="py-3.5 px-4 text-center">
                          {activeAdvAmt > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              ₹{activeAdvAmt.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Pay Salary Button */}
                            <button
                              type="button"
                              onClick={() => setSalaryEmployee(emp)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-[#0B5F46] border border-emerald-200 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                              title="Mark direct salary payout for this employee"
                            >
                              <span>₹</span> Pay Salary
                            </button>

                            {/* Disburse Advance Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setAdvanceTargetEmployeeId(emp.id);
                                setIsAdvanceModalOpen(true);
                              }}
                              className="px-2 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                              title="Disburse recoverable salary advance"
                            >
                              <span>💸</span> Advance
                            </button>

                            {/* Payslip Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenPayslipForEmployee(emp)}
                              className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                              title="Generate & print salary slip"
                            >
                              📄 Slip
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEmployee(emp);
                                setIsAddModalOpen(true);
                              }}
                              className="px-2 py-1 rounded-lg text-xs font-bold bg-white hover:bg-[#F4F7F3] text-[#374151] border border-[#D9E3DC] transition-colors shadow-2xs cursor-pointer"
                            >
                              Edit
                            </button>

                            {/* Delete Button with 2-step confirmation */}
                            {deleteConfirmId === emp.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isDeleting === emp.id}
                                  onClick={() => handleDeleteEmployee(emp.id)}
                                  className="px-2 py-1 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                                >
                                  {isDeleting === emp.id ? "..." : "Confirm"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-1.5 py-1 rounded-lg text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-colors cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(emp.id)}
                                className="px-2 py-1 rounded-lg text-xs font-bold bg-white hover:bg-red-50 text-red-600 border border-red-200 transition-colors shadow-2xs cursor-pointer"
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
      )}

      {/* Advances Sub-View */}
      {activeSubTab === 'advances' && (
        <EmployeeAdvancesView
          advances={advancesList}
          employees={employeesList}
          onOpenNewAdvance={() => {
            setAdvanceTargetEmployeeId(undefined);
            setIsAdvanceModalOpen(true);
          }}
          onRefresh={() => router.refresh()}
        />
      )}

      {/* Add / Edit Employee Modal */}
      {isAddModalOpen && (
        <AddMasterRecordModal
          defaultTab="employee"
          initialData={editingEmployee}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingEmployee(null);
            if (autoOpenAddEmployee) {
              router.replace('/expenses?tab=employees');
            }
          }}
          onSuccess={(newEmp: any) => {
            if (newEmp) {
              setEmployeesList((prev) => {
                const exists = prev.some((e) => e.id === newEmp.id);
                if (exists) {
                  return prev.map((e) => (e.id === newEmp.id ? { ...e, ...newEmp } : e));
                }
                return [newEmp, ...prev];
              });
            }
            setIsAddModalOpen(false);
            setEditingEmployee(null);
            if (autoOpenAddEmployee) {
              router.replace('/expenses?tab=employees');
            }
            router.refresh();
          }}
        />
      )}

      {/* Single Salary Payment Modal */}
      {salaryEmployee && (
        <SalaryPaymentModal
          employee={salaryEmployee}
          onClose={() => setSalaryEmployee(null)}
          onSuccess={(newExpense) => {
            setSalaryEmployee(null);
            router.refresh();
            if (newExpense?.id) {
              setSelectedPayslipExpenseId(newExpense.id);
            }
          }}
        />
      )}

      {/* Batch Monthly Payroll Modal */}
      {isBatchPayrollOpen && (
        <BatchPayrollModal
          employees={employeesList}
          onClose={() => setIsBatchPayrollOpen(false)}
          onSuccess={() => router.refresh()}
          onOpenPayslip={(expId) => {
            setIsBatchPayrollOpen(false);
            setSelectedPayslipExpenseId(expId);
          }}
        />
      )}

      {/* Corporate Banking Export Modal */}
      {isBankExportOpen && (
        <CorporateBankingExportModal
          employees={employeesList}
          onClose={() => setIsBankExportOpen(false)}
        />
      )}

      {/* Record Employee Advance Modal */}
      {isAdvanceModalOpen && (
        <RecordAdvanceModal
          employees={employeesList.filter((e) => e.isActive)}
          defaultEmployeeId={advanceTargetEmployeeId}
          onClose={() => {
            setIsAdvanceModalOpen(false);
            setAdvanceTargetEmployeeId(undefined);
          }}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Payslip Modal */}
      {selectedPayslipExpenseId && (
        <PayslipModal
          expenseId={selectedPayslipExpenseId}
          onClose={() => setSelectedPayslipExpenseId(null)}
        />
      )}
    </div>
  );
}
