import { requireAuth } from "@/lib/auth-utils";
import { OpeningClosingService } from "@/services/opening-closing.service";
import { ExpenseCategoryService } from "@/services/expense-category.service";
import { OpeningClosingClient } from "./OpeningClosingClient";
import { GeneralLedgerNav } from "@/components/GeneralLedgerNav";

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
  const balanceSheetCategories = (allCategories as Array<{ financialType?: string | null }>).filter((c) =>
    BALANCE_SHEET_TYPES.includes((c.financialType || "").toUpperCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-7">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#17211B] tracking-tight">General Ledger</h1>
          <p className="text-[#68756C] text-sm mt-0.5 font-normal">
            Chart of Accounts explorer, double-entry ledger vouchers, and financial statements.
          </p>
        </div>
      </div>

      <GeneralLedgerNav />

      <OpeningClosingClient
        initialBalances={JSON.parse(JSON.stringify(initialBalances))}
        categories={JSON.parse(JSON.stringify(balanceSheetCategories))}
      />
    </div>
  );
}
