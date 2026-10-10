import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { ExpenseService } from '@/services/expense.service';
import { ExpenseCategoryService } from '@/services/expense-category.service';
import { VendorService } from '@/services/vendor.service';
import { EmployeeService } from '@/services/employee.service';
import { EmployeeAdvanceService } from '@/services/employee-advance.service';
import { RecurringExpenseService } from '@/services/recurring-expense.service';
import { ExpensesClientList } from './ExpensesClientList';
import { RecurringExpensesView } from './RecurringExpensesView';
import { CategoryClient } from './CategoryClient';
import { ExpenseVendorsView } from './ExpenseVendorsView';
import { ExpenseEmployeesView } from './ExpenseEmployeesView';
import { OptimisticTabs } from '@/components/OptimisticTabs';
import Link from 'next/link';

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; [key: string]: any }>;
}) {
  await requireAuth();
  const params = await searchParams;
  const activeTab = params.tab || 'expenses';

  const [
    expenses,
    categories,
    vendors,
    employees,
    advances,
    schedules,
    dueItems,
    bankAccounts,
  ] = await Promise.all([
    ExpenseService.getExpenses(),
    ExpenseCategoryService.getExpenseCategories(),
    VendorService.getVendors(),
    EmployeeService.getEmployees(),
    EmployeeAdvanceService.getAdvances(),
    RecurringExpenseService.getSchedules(),
    RecurringExpenseService.getDueItems(),
    prisma.bankAccount.findMany({ where: { isActive: true }, orderBy: { isPrimary: 'desc' } }),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-7">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#17211B] tracking-tight">Business Expenses</h1>
          <p className="text-[#68756C] text-sm mt-0.5 font-normal">
            Manage operational costs, salaries, utility bills, capital additions, and employee reimbursements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'expenses' && (
            <Link
              href="/expenses/new"
              className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#1b5e4b] hover:bg-[#136f58] shadow-xs transition-colors gap-1.5 shrink-0"
            >
              <span>+</span> Record Expense
            </Link>
          )}
          {activeTab === 'vendors' && (
            <Link
              href="/vendors/new"
              className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#177B55] hover:bg-[#0B5F46] shadow-xs transition-colors gap-1.5 shrink-0"
            >
              <span>+</span> Add Vendor
            </Link>
          )}
          {activeTab === 'employees' && (
            <Link
              href="/expenses?tab=employees&action=new"
              className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#177B55] hover:bg-[#0B5F46] shadow-xs transition-colors gap-1.5 shrink-0"
            >
              <span>+</span> Add Employee
            </Link>
          )}
        </div>
      </div>

      {/* Comprehensive Ribbon: Expenses | Recurring Schedules | Categories Master | Vendors | Employees & Payroll */}
      <OptimisticTabs
        basePath="/expenses"
        defaultTab="expenses"
        tabs={[
          { id: 'expenses', label: 'Expenses Register' },
          { id: 'recurring', label: 'Recurring Schedules' },
          { id: 'categories', label: 'Categories Master' },
          { id: 'vendors', label: 'Vendors' },
          { id: 'employees', label: 'Employees & Payroll' },
        ]}
      />

      {/* Tab Content */}
      {activeTab === 'expenses' && (
        <ExpensesClientList
          initialExpenses={JSON.parse(JSON.stringify(expenses))}
          categories={JSON.parse(JSON.stringify(categories))}
          vendors={JSON.parse(JSON.stringify(vendors))}
          employees={JSON.parse(JSON.stringify(employees))}
          bankAccounts={JSON.parse(JSON.stringify(bankAccounts))}
          showHeader={false}
        />
      )}

      {activeTab === 'recurring' && (
        <RecurringExpensesView
          schedules={JSON.parse(JSON.stringify(schedules))}
          dueItems={JSON.parse(JSON.stringify(dueItems))}
          categories={JSON.parse(JSON.stringify(categories))}
          vendors={JSON.parse(JSON.stringify(vendors))}
          employees={JSON.parse(JSON.stringify(employees))}
          bankAccounts={JSON.parse(JSON.stringify(bankAccounts))}
        />
      )}

      {activeTab === 'categories' && (
        <CategoryClient categories={JSON.parse(JSON.stringify(categories))} />
      )}

      {activeTab === 'vendors' && (
        <ExpenseVendorsView vendors={JSON.parse(JSON.stringify(vendors))} />
      )}

      {activeTab === 'employees' && (
        <ExpenseEmployeesView
          employees={JSON.parse(JSON.stringify(employees))}
          advances={JSON.parse(JSON.stringify(advances))}
          autoOpenAddEmployee={params.action === 'new'}
        />
      )}
    </div>
  );
}
