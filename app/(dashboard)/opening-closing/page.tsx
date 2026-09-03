import { requireAuth } from "@/lib/auth-utils";
import { OpeningClosingService } from "@/services/opening-closing.service";
import { ExpenseCategoryService } from "@/services/expense-category.service";
import { OpeningClosingClient } from "./OpeningClosingClient";

// Only Balance Sheet types are valid for opening balances (CA principle).
// Income & Expense are P&L items that reset each FY — never carried forward.
const BALANCE_SHEET_TYPES = ["ASSET", "LIABILITY", "EQUITY"];

export default async function OpeningClosingPage() {
  await requireAuth();

  const [initialBalances, allCategories] = await Promise.all([
    OpeningClosingService.getOpeningBalances("FY 2026–27"),
    ExpenseCategoryService.getExpenseCategories({ isActive: true }),
  ]);

  // Filter server-side: only pass Balance Sheet categories to the client
  const balanceSheetCategories = (allCategories as any[]).filter((c) =>
    BALANCE_SHEET_TYPES.includes((c.financialType || "").toUpperCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <OpeningClosingClient
        initialBalances={JSON.parse(JSON.stringify(initialBalances))}
        categories={JSON.parse(JSON.stringify(balanceSheetCategories))}
      />
    </div>
  );
}
