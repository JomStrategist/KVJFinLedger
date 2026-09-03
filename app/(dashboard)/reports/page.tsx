import { requireAuth } from '@/lib/auth-utils';
import { TaxInvoiceService } from '@/services/tax-invoice.service';
import { ExpenseService } from '@/services/expense.service';
import { OpeningClosingService } from '@/services/opening-closing.service';
import { GstFilingService } from '@/services/gst-filing.service';
import { TdsDepositService } from '@/services/tds-deposit.service';
import { FinancialReportsClient } from './FinancialReportsClient';

export default async function ReportsPage() {
  await requireAuth();

  const [invoices, expenses, openingBalances, gstFilings, tdsDeposits] = await Promise.all([
    TaxInvoiceService.getTaxInvoices().catch((err) => {
      console.warn("Could not fetch invoices for reports:", err);
      return [];
    }),
    ExpenseService.getExpenses().catch((err) => {
      console.warn("Could not fetch expenses for reports:", err);
      return [];
    }),
    OpeningClosingService.getAllOpeningBalances().catch((err) => {
      console.warn("Could not fetch opening balances for reports:", err);
      return [];
    }),
    GstFilingService.getAllGstFilings().catch((err) => {
      console.warn("Could not fetch GST filings for reports:", err);
      return [];
    }),
    TdsDepositService.getAllTdsDeposits().catch((err) => {
      console.warn("Could not fetch TDS deposits for reports:", err);
      return [];
    }),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <FinancialReportsClient
        invoices={JSON.parse(JSON.stringify(invoices))}
        expenses={JSON.parse(JSON.stringify(expenses))}
        openingBalances={JSON.parse(JSON.stringify(openingBalances))}
        gstFilings={JSON.parse(JSON.stringify(gstFilings))}
        tdsDeposits={JSON.parse(JSON.stringify(tdsDeposits))}
      />
    </div>
  );
}
