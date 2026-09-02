import { requireAuth } from "@/lib/auth-utils";
import { CustomerService } from "@/services/customer.service";
import { VendorService } from "@/services/vendor.service";
import { ProductService } from "@/services/product.service";
import { ExpenseCategoryService } from "@/services/expense-category.service";
import { ChartOfAccountsService } from "@/services/chart-of-accounts.service";
import { MastersClient } from "./MastersClient";

export default async function MastersPage() {
  await requireAuth();

  const [customers, vendors, products, categories, financialTypes, statementGroups, accountNatures] =
    await Promise.all([
      CustomerService.getCustomers(),
      VendorService.getVendors(),
      ProductService.getProducts(),
      ExpenseCategoryService.getExpenseCategories(),
      ChartOfAccountsService.getFinancialTypes(),
      ChartOfAccountsService.getStatementGroups(),
      ChartOfAccountsService.getAccountNatures(),
    ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <MastersClient
        customers={JSON.parse(JSON.stringify(customers))}
        vendors={JSON.parse(JSON.stringify(vendors))}
        products={JSON.parse(JSON.stringify(products))}
        categories={JSON.parse(JSON.stringify(categories))}
        financialTypes={JSON.parse(JSON.stringify(financialTypes))}
        statementGroups={JSON.parse(JSON.stringify(statementGroups))}
        accountNatures={JSON.parse(JSON.stringify(accountNatures))}
      />
    </div>
  );
}
