import { requireAuth } from '@/lib/auth-utils';
import { TaxInvoiceService } from '@/services/tax-invoice.service';
import { ExpenseService } from '@/services/expense.service';
import { OpeningClosingService } from '@/services/opening-closing.service';
import { FinancialReportsClient } from './FinancialReportsClient';

export default async function ReportsPage() {
  await requireAuth();

  const [invoices, expenses, openingBalances] = await Promise.all([
    TaxInvoiceService.getTaxInvoices().catch((err) => {
      console.warn("Could not fetch invoices for reports:", err);
      return [];
    }),
    ExpenseService.getExpenses().catch((err) => {
      console.warn("Could not fetch expenses for reports:", err);
      return [];
    }),
    OpeningClosingService.getOpeningBalances("FY 2026–27").catch((err) => {
      console.warn("Could not fetch opening balances for reports:", err);
      return [];
    }),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <FinancialReportsClient
        invoices={JSON.parse(JSON.stringify(invoices))}
        expenses={JSON.parse(JSON.stringify(expenses))}
        openingBalances={JSON.parse(JSON.stringify(openingBalances))}
      />
    </div>
  );
}
