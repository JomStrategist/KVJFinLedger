import { requireAuth } from '@/lib/auth-utils';
import { AccountingEngine } from '@/services/accounting-engine.service';
import { ReportsService } from '@/services/reports.service';
import { prisma } from '@/lib/prisma';
import { ReportsHubClient } from './ReportsHubClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ERP Reports Hub | FinLedger',
  description: 'Authoritative financial, statutory and management reports driven by AccountingEngine.',
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    category?: string;
    financialYear?: string;
    fromDate?: string;
    toDate?: string;
    tab?: string;
    period?: string;
    comparisonType?: string;
    customerId?: string;
    vendorId?: string;
    categoryId?: string;
  }>;
}) {
  await requireAuth();
  const params = (await searchParams) || {};

  const category = params.category || 'overview';
  const financialYear = params.financialYear || 'FY 2026–27';
  const activeTab = params.tab;
  const filters: any = {
    financialYear,
    fromDate: params.fromDate ? new Date(params.fromDate) : undefined,
    toDate: params.toDate ? new Date(params.toDate) : undefined,
    customerId: params.customerId,
    vendorId: params.vendorId,
    categoryId: params.categoryId,
  };

  // Authoritative Accounting Equilibrium check
  let isBalanced = true;
  let tbDiff = 0;
  let bsDiff = 0;
  let cashBalance = 0;

  try {
    const tb = await AccountingEngine.getTrialBalance(filters);
    tbDiff = tb.difference;
    isBalanced = tb.isBalanced;

    const bs = await AccountingEngine.getBalanceSheet(filters);
    bsDiff = bs.difference;
    cashBalance = bs.currentAssets.cashAndBank;
  } catch (err) {
    console.warn('Accounting equilibrium check warning:', err);
  }

  // Load ONLY the data required for the selected category
  let reportData: any = null;

  try {
    switch (category) {
      case 'overview': {
        reportData = await AccountingEngine.getFinancialIntelligence(filters);
        break;
      }
      case 'statements': {
        const stmtTab = activeTab || 'trial-balance';
        const shouldLoadTB = stmtTab === 'trial-balance';
        const shouldLoadPnl = stmtTab === 'pnl' || stmtTab === 'balance-sheet';
        const shouldLoadBs = stmtTab === 'balance-sheet' || stmtTab === 'trial-balance';
        const shouldLoadCf = stmtTab === 'cash-flow';
        const shouldLoadComparative = stmtTab === 'comparative';

        const [
          trialBalance,
          profitAndLoss,
          balanceSheet,
          cashFlow,
          comparativePnl,
          comparativeBs,
          comparativeCf,
          customers,
          vendors,
          categories,
        ] = await Promise.all([
          shouldLoadTB ? AccountingEngine.getTrialBalance(filters) : Promise.resolve(null),
          shouldLoadPnl ? AccountingEngine.getProfitAndLoss(filters) : Promise.resolve(null),
          shouldLoadBs ? AccountingEngine.getBalanceSheet(filters) : Promise.resolve(null),
          shouldLoadCf ? AccountingEngine.getCashFlow(filters) : Promise.resolve(null),
          shouldLoadComparative ? AccountingEngine.getComparativeProfitAndLoss(filters) : Promise.resolve([]),
          shouldLoadComparative ? AccountingEngine.getComparativeBalanceSheet(filters) : Promise.resolve([]),
          shouldLoadComparative ? AccountingEngine.getComparativeCashFlow(filters) : Promise.resolve([]),
          prisma.customer.findMany({ select: { id: true, legalName: true }, orderBy: { legalName: 'asc' } }).catch(() => []),
          prisma.vendor.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }).catch(() => []),
          prisma.expenseCategory.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }).catch(() => []),
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

        reportData = {
          activeTab: stmtTab,
          trialBalance: trialBalance || defaultTB,
          profitAndLoss: profitAndLoss || defaultPnl,
          balanceSheet: balanceSheet || defaultBs,
          cashFlow: cashFlow || defaultCf,
          comparativePnl: comparativePnl || [],
          comparativeBs: comparativeBs || [],
          comparativeCf: comparativeCf || [],
          customers: customers || [],
          vendors: vendors || [],
          categories: categories || [],
        };
        break;
      }
      case 'sales': {
        reportData = await ReportsService.getSalesReport(filters);
        break;
      }
      case 'expenses': {
        reportData = await ReportsService.getExpenseReport(filters);
        break;
      }
      case 'gst': {
        const [outward, itc] = await Promise.all([
          ReportsService.getGstOutwardSupplies(filters),
          ReportsService.getInputTaxCredit(filters),
        ]);
        reportData = { outward, itc };
        break;
      }
      case 'tds': {
        reportData = await ReportsService.getTdsReport(filters);
        break;
      }
      case 'banking': {
        const accounts = await prisma.bankAccount.findMany({
          where: { isActive: true },
          select: { id: true, accountName: true, accountNumber: true, bankName: true },
        });
        reportData = { accounts };
        break;
      }
      case 'assets': {
        reportData = { message: 'Fixed assets register' };
        break;
      }
      case 'employees': {
        const employees = await prisma.employee.findMany({
          select: { id: true, employeeCode: true, name: true, designation: true, isActive: true },
        });
        reportData = { employees };
        break;
      }
      case 'analysis': {
        const [ratios, analysis, intelligence] = await Promise.all([
          AccountingEngine.getFinancialRatios(filters).catch(() => ({ currentPeriodLabel: '', previousPeriodLabel: '', hasPreviousData: false, ratios: [] })),
          AccountingEngine.getComprehensiveFinancialAnalysis(filters).catch(() => null),
          AccountingEngine.getFinancialIntelligence(filters).catch(() => ({})),
        ]);
        reportData = { ratios, analysis, intelligence };
        break;
      }
      case 'audit': {
        const vouchers = await AccountingEngine.generateAllVouchers(filters);
        reportData = { vouchers };
        break;
      }
      default: {
        reportData = await AccountingEngine.getFinancialIntelligence(filters);
        break;
      }
    }
  } catch (err) {
    console.error(`Error loading report data for category ${category}:`, err);
    reportData = { error: 'Failed to load report dataset.' };
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <ReportsHubClient
        currentCategory={category}
        financialYear={financialYear}
        fromDate={params.fromDate}
        toDate={params.toDate}
        tab={activeTab}
        reportData={reportData}
        accountingEquilibrium={{
          isBalanced,
          tbDiff,
          bsDiff,
          cashBalance,
        }}
      />
    </div>
  );
}
