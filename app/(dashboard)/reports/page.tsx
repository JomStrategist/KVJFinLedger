import { requireAuth } from '@/lib/auth-utils';
import { TaxInvoiceService } from '@/services/tax-invoice.service';
import { ExpenseService } from '@/services/expense.service';
import { FinancialReportsClient } from './FinancialReportsClient';

export default async function ReportsPage() {
  await requireAuth();

  let invoices: any[] = [];
  let expenses: any[] = [];

  try {
    invoices = await TaxInvoiceService.getTaxInvoices();
  } catch (err) {
    console.warn("Could not fetch invoices for reports page:", err);
  }

  try {
    expenses = await ExpenseService.getExpenses();
  } catch (err) {
    console.warn("Could not fetch expenses for reports page:", err);
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <FinancialReportsClient
        invoices={JSON.parse(JSON.stringify(invoices))}
        expenses={JSON.parse(JSON.stringify(expenses))}
      />
    </div>
  );
}
