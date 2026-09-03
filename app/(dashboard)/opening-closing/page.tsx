import { requireAuth } from "@/lib/auth-utils";
import { OpeningClosingService } from "@/services/opening-closing.service";
import { ExpenseCategoryService } from "@/services/expense-category.service";
import { OpeningClosingClient } from "./OpeningClosingClient";

export default async function OpeningClosingPage() {
  await requireAuth();

  const [initialBalances, categories] = await Promise.all([
    OpeningClosingService.getOpeningBalances("FY 2026–27"),
    ExpenseCategoryService.getExpenseCategories({ isActive: true }),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <OpeningClosingClient
        initialBalances={JSON.parse(JSON.stringify(initialBalances))}
        categories={JSON.parse(JSON.stringify(categories))}
      />
    </div>
  );
}
