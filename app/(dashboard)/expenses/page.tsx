import { requireAuth } from '@/lib/auth-utils';
import { ExpenseService } from '@/services/expense.service';
import { ExpenseCategoryService } from '@/services/expense-category.service';
import { VendorService } from '@/services/vendor.service';
import { prisma } from '@/lib/prisma';
import { ExpensesClientList } from './ExpensesClientList';

export default async function ExpensesPage() {
  await requireAuth();

  const [expenses, categories, vendors, users] = await Promise.all([
    ExpenseService.getExpenses(),
    ExpenseCategoryService.getExpenseCategories(),
    VendorService.getVendors(),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
    }),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <ExpensesClientList
        initialExpenses={JSON.parse(JSON.stringify(expenses))}
        categories={JSON.parse(JSON.stringify(categories))}
        vendors={JSON.parse(JSON.stringify(vendors))}
        employees={JSON.parse(JSON.stringify(users))}
      />
    </div>
  );
}
