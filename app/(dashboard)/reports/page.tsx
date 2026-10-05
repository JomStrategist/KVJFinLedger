import { requireAuth } from '@/lib/auth-utils';
import { TaxInvoiceService } from '@/services/tax-invoice.service';
import { ExpenseService } from '@/services/expense.service';
import { OpeningClosingService } from '@/services/opening-closing.service';
import { GstFilingService } from '@/services/gst-filing.service';
import { TdsDepositService } from '@/services/tds-deposit.service';
import { DepreciationService } from '@/services/depreciation.service';
import { AnalysisService } from '@/services/analysis.service';
import { prisma } from '@/lib/prisma';
import { FinancialReportsClient } from './FinancialReportsClient';

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    financialYear?: string;
    period?: string;
    fromDate?: string;
    toDate?: string;
    comparisonType?: string;
    customerId?: string;
    vendorId?: string;
    categoryId?: string;
    subtab?: string;
  }>;
}) {
  await requireAuth();
  const params = (await searchParams) || {};

  const filters = {
    financialYear: params.financialYear || "FY 2026–27",
    period: params.period || "ALL",
    fromDate: params.fromDate,
    toDate: params.toDate,
    comparisonType: (params.comparisonType as any) || "PREV_FY",
    customerId: params.customerId,
    vendorId: params.vendorId,
    categoryId: params.categoryId,
  };

  const [
    invoices,
    expenses,
    openingBalances,
    gstFilings,
    tdsDeposits,
    assetDepreciations,
    customers,
    vendors,
    categories,
    analysisData
  ] = await Promise.all([
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
    DepreciationService.getAllDepreciations().catch((err) => {
      console.warn("Could not fetch asset depreciations:", err);
      return [];
    }),
    prisma.customer.findMany({ select: { id: true, legalName: true }, orderBy: { legalName: "asc" } }).catch(() => []),
    prisma.vendor.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }).catch(() => []),
    prisma.expenseCategory.findMany({ select: { id: true, name: true, financialType: true }, orderBy: { name: "asc" } }).catch(() => []),
    AnalysisService.getFullAnalysis(filters).catch((err) => {
      console.warn("Could not fetch full analysis:", err);
      return null;
    }),
  ]);

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <FinancialReportsClient
        invoices={JSON.parse(JSON.stringify(invoices))}
        expenses={JSON.parse(JSON.stringify(expenses))}
        openingBalances={JSON.parse(JSON.stringify(openingBalances))}
        gstFilings={JSON.parse(JSON.stringify(gstFilings))}
        tdsDeposits={JSON.parse(JSON.stringify(tdsDeposits))}
        assetDepreciations={JSON.parse(JSON.stringify(assetDepreciations))}
        customers={JSON.parse(JSON.stringify(customers))}
        vendors={JSON.parse(JSON.stringify(vendors))}
        categories={JSON.parse(JSON.stringify(categories))}
        initialAnalysisData={JSON.parse(JSON.stringify(analysisData))}
        initialFilters={filters}
        initialSubTab={params.subtab}
      />
    </div>
  );
}
