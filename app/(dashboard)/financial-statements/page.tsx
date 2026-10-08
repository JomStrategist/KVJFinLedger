import { requireAuth } from '@/lib/auth-utils';
import { AccountingEngine } from '@/services/accounting-engine.service';
import { prisma } from '@/lib/prisma';
import { FinancialStatementsClient } from './FinancialStatementsClient';

export const dynamic = "force-dynamic";

export default async function FinancialStatementsPage({
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
    tab?: string;
  }>;
}) {
  await requireAuth();
  const params = (await searchParams) || {};

  const currentFilters = {
    financialYear: params.financialYear || "FY 2026–27",
    period: params.period || "ALL",
    fromDate: params.fromDate,
    toDate: params.toDate,
    comparisonType: params.comparisonType || "PREV_FY",
    customerId: params.customerId,
    vendorId: params.vendorId,
    categoryId: params.categoryId,
    tab: params.tab || "trial-balance",
  };

  const engineFilters = {
    financialYear: currentFilters.financialYear,
    fromDate: currentFilters.fromDate ? new Date(currentFilters.fromDate) : undefined,
    toDate: currentFilters.toDate ? new Date(currentFilters.toDate) : undefined,
    customerId: currentFilters.customerId,
    vendorId: currentFilters.vendorId,
    categoryId: currentFilters.categoryId,
  };

  // Concurrently fetch all core financial statements & intelligence from AccountingEngine
  const [
    trialBalance,
    profitAndLoss,
    balanceSheet,
    cashFlow,
    comparativePnl,
    comparativeBs,
    comparativeCf,
    financialRatios,
    financialAnalysis,
    customers,
    vendors,
    categories,
  ] = await Promise.all([
    AccountingEngine.getTrialBalance(engineFilters),
    AccountingEngine.getProfitAndLoss(engineFilters),
    AccountingEngine.getBalanceSheet(engineFilters),
    AccountingEngine.getCashFlow(engineFilters),
    AccountingEngine.getComparativeProfitAndLoss(engineFilters),
    AccountingEngine.getComparativeBalanceSheet(engineFilters),
    AccountingEngine.getComparativeCashFlow(engineFilters),
    AccountingEngine.getFinancialRatios(engineFilters),
    AccountingEngine.getComprehensiveFinancialAnalysis(engineFilters),
    prisma.customer.findMany({ select: { id: true, legalName: true }, orderBy: { legalName: "asc" } }).catch(() => []),
    prisma.vendor.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }).catch(() => []),
    prisma.expenseCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }).catch(() => []),
  ]);

  return (
    <FinancialStatementsClient
      currentFilters={currentFilters}
      trialBalance={JSON.parse(JSON.stringify(trialBalance))}
      profitAndLoss={JSON.parse(JSON.stringify(profitAndLoss))}
      balanceSheet={JSON.parse(JSON.stringify(balanceSheet))}
      cashFlow={JSON.parse(JSON.stringify(cashFlow))}
      comparativePnl={JSON.parse(JSON.stringify(comparativePnl))}
      comparativeBs={JSON.parse(JSON.stringify(comparativeBs))}
      comparativeCf={JSON.parse(JSON.stringify(comparativeCf))}
      financialRatios={JSON.parse(JSON.stringify(financialRatios))}
      financialAnalysis={JSON.parse(JSON.stringify(financialAnalysis))}
      customers={JSON.parse(JSON.stringify(customers))}
      vendors={JSON.parse(JSON.stringify(vendors))}
      categories={JSON.parse(JSON.stringify(categories))}
    />
  );
}
