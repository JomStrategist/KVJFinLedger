import { ExpenseForm } from "../ExpenseForm";
import { VendorService } from "@/services/vendor.service";
import { ExpenseCategoryService } from "@/services/expense-category.service";
import { prisma } from "@/lib/prisma";

export default async function NewExpensePage() {
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
        vendors={JSON.parse(JSON.stringify(vendors))} 
        categories={JSON.parse(JSON.stringify(categories))} 
        products={JSON.parse(JSON.stringify(products))} 
        employees={JSON.parse(JSON.stringify(employees))} 
      />
    </div>
  );
}
