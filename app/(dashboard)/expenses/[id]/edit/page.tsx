import { ExpenseForm } from "../../ExpenseForm";
import { ExpenseService } from "@/services/expense.service";
import { VendorService } from "@/services/vendor.service";
import { ExpenseCategoryService } from "@/services/expense-category.service";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const expense = await ExpenseService.getExpenseById(id);

  if (!expense) {
    notFound();
  }

  if (expense.status !== "DRAFT") {
    redirect(`/expenses/${expense.id}`); // Only drafts can be edited
  }

  const [vendors, categories, products, employees] = await Promise.all([
    VendorService.getVendors({ isActive: true }),
    ExpenseCategoryService.getExpenseCategories({ isActive: true }),
    prisma.product.findMany({ where: { isActive: true } }),
    prisma.user.findMany({ 
      where: { isActive: true }, 
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <ExpenseForm 
        initialData={JSON.parse(JSON.stringify(expense))} 
        vendors={JSON.parse(JSON.stringify(vendors))} 
        categories={JSON.parse(JSON.stringify(categories))} 
        products={JSON.parse(JSON.stringify(products))} 
        employees={JSON.parse(JSON.stringify(employees))} 
      />
    </div>
  );
}
