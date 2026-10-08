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

  const activeTab = currentFilters.tab;

  // Performance Optimization (Section 4): Load only the selected statement view
  const shouldLoadTB = activeTab === "trial-balance";
  const shouldLoadPnl = activeTab === "pnl" || activeTab === "balance-sheet";
  const shouldLoadBs = activeTab === "balance-sheet" || activeTab === "trial-balance";
  const shouldLoadCf = activeTab === "cash-flow";
  const shouldLoadComparative = activeTab === "comparative";
  const shouldLoadAnalysis = activeTab === "analysis";

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
    shouldLoadTB ? AccountingEngine.getTrialBalance(engineFilters) : Promise.resolve(null),
    shouldLoadPnl ? AccountingEngine.getProfitAndLoss(engineFilters) : Promise.resolve(null),
    shouldLoadBs ? AccountingEngine.getBalanceSheet(engineFilters) : Promise.resolve(null),
    shouldLoadCf ? AccountingEngine.getCashFlow(engineFilters) : Promise.resolve(null),
    shouldLoadComparative ? AccountingEngine.getComparativeProfitAndLoss(engineFilters) : Promise.resolve([]),
    shouldLoadComparative ? AccountingEngine.getComparativeBalanceSheet(engineFilters) : Promise.resolve([]),
    shouldLoadComparative ? AccountingEngine.getComparativeCashFlow(engineFilters) : Promise.resolve([]),
    shouldLoadAnalysis ? AccountingEngine.getFinancialRatios(engineFilters) : Promise.resolve([]),
    shouldLoadAnalysis ? AccountingEngine.getComprehensiveFinancialAnalysis(engineFilters) : Promise.resolve(null),
    prisma.customer.findMany({ select: { id: true, legalName: true }, orderBy: { legalName: "asc" } }).catch(() => []),
    prisma.vendor.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }).catch(() => []),
    prisma.expenseCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }).catch(() => []),
  ]);

  const defaultTB = {
    asOfDate: new Date(),
    totalDebit: 0,
    totalCredit: 0,
    difference: 0,
    isBalanced: true,
    items: [],
  };
  const defaultPnl = {
    fromDate: new Date(),
    toDate: new Date(),
    revenueFromOperations: [],
    otherIncome: [],
    totalRevenue: 0,
    operatingExpenses: [],
    employeeCosts: [],
    depreciationAmortization: [],
    financeCosts: [],
    otherExpenses: [],
    totalExpenses: 0,
    operatingProfit: 0,
    profitBeforeTax: 0,
    taxExpense: 0,
    netProfitAfterTax: 0,
  };
  const defaultBs = {
    asOfDate: new Date(),
    equity: { capital: 0, reservesAndSurplus: 0, drawings: 0, totalShareholdersFunds: 0 },
    nonCurrentLiabilities: { items: [], total: 0 },
    currentLiabilities: { tradePayables: 0, employeePayables: 0, statutoryGstPayable: 0, statutoryTdsPayable: 0, otherCurrentLiabilities: 0, total: 0 },
    totalEquityAndLiabilities: 0,
    nonCurrentAssets: { fixedAssetsGross: 0, accumulatedDepreciation: 0, fixedAssetsNet: 0, otherNonCurrentAssets: 0, total: 0 },
    currentAssets: { tradeReceivables: 0, cashAndBank: 0, tdsReceivable: 0, gstInputCredit: 0, otherCurrentAssets: 0, total: 0 },
    totalAssets: 0,
    difference: 0,
    isBalanced: true,
  };
  const defaultCf = {
    fromDate: new Date(),
    toDate: new Date(),
    operatingCashFlow: { customerReceipts: 0, vendorDisbursements: 0, employeeDisbursements: 0, gstPaid: 0, tdsPaid: 0, netOperating: 0 },
    investingCashFlow: { capitalExpenditure: 0, netInvesting: 0 },
    financingCashFlow: { capitalIntroduced: 0, drawingsWithdrawn: 0, netFinancing: 0 },
    openingCashAndBank: 0,
    netCashFlow: 0,
    closingCashAndBank: 0,
  };

  return (
    <FinancialStatementsClient
      currentFilters={currentFilters}
      trialBalance={JSON.parse(JSON.stringify(trialBalance || defaultTB))}
      profitAndLoss={JSON.parse(JSON.stringify(profitAndLoss || defaultPnl))}
      balanceSheet={JSON.parse(JSON.stringify(balanceSheet || defaultBs))}
      cashFlow={JSON.parse(JSON.stringify(cashFlow || defaultCf))}
      comparativePnl={JSON.parse(JSON.stringify(comparativePnl || []))}
      comparativeBs={JSON.parse(JSON.stringify(comparativeBs || []))}
      comparativeCf={JSON.parse(JSON.stringify(comparativeCf || []))}
      financialRatios={JSON.parse(JSON.stringify(financialRatios || []))}
      financialAnalysis={JSON.parse(JSON.stringify(financialAnalysis || { executiveSummary: '', strengths: [], risks: [], recommendations: [], zScore: 0, zScoreCategory: 'SAFE' }))}
      customers={JSON.parse(JSON.stringify(customers))}
      vendors={JSON.parse(JSON.stringify(vendors))}
      categories={JSON.parse(JSON.stringify(categories))}
    />
  );
}
