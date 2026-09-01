import { requireAuth } from "@/lib/auth-utils";
import { CustomerService } from "@/services/customer.service";
import { VendorService } from "@/services/vendor.service";
import { ProductService } from "@/services/product.service";
import { ExpenseCategoryService } from "@/services/expense-category.service";
import { MastersClient } from "./MastersClient";

export default async function MastersPage() {
  await requireAuth();

  const customers = await CustomerService.getCustomers();
  const vendors = await VendorService.getVendors();
  const products = await ProductService.getProducts();
  const categories = await ExpenseCategoryService.getExpenseCategories();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <MastersClient
        customers={JSON.parse(JSON.stringify(customers))}
        vendors={JSON.parse(JSON.stringify(vendors))}
        products={JSON.parse(JSON.stringify(products))}
        categories={JSON.parse(JSON.stringify(categories))}
      />
    </div>
  );
}
