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
    subtab?: string;
    period?: string;
    comparisonType?: string;
    customerId?: string;
    vendorId?: string;
    categoryId?: string;
  }>;
}) {
  await requireAuth();
  const rawParams = (await searchParams) || {};
  let category = rawParams.category;
  let activeTab = rawParams.tab || rawParams.subtab;

  // Handle direct or legacy subtab routing (e.g. /reports?subtab=pnl)
  if (!category && rawParams.subtab) {
    if (['pnl', 'trial-balance', 'tb', 'bs', 'balance-sheet', 'cashflow', 'cash-flow', 'comparative', 'analysis'].includes(rawParams.subtab)) {
      category = 'statements';
      if (rawParams.subtab === 'tb') activeTab = 'trial-balance';
      else if (rawParams.subtab === 'bs') activeTab = 'balance-sheet';
      else if (rawParams.subtab === 'cashflow') activeTab = 'cash-flow';
    } else if (['sales', 'expenses', 'gst', 'tds', 'banking', 'assets', 'employees', 'analysis', 'audit'].includes(rawParams.subtab)) {
      category = rawParams.subtab;
      activeTab = undefined;
    } else {
      category = 'overview';
    }
  }

  if (!category) {
    category = 'overview';
  }

  const financialYear = rawParams.financialYear || 'FY 2026–27';
  const filters: any = {
    financialYear,
    fromDate: rawParams.fromDate ? new Date(rawParams.fromDate) : undefined,
    toDate: rawParams.toDate ? new Date(rawParams.toDate) : undefined,
    customerId: rawParams.customerId,
    vendorId: rawParams.vendorId,
    categoryId: rawParams.categoryId,
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

  // Load data required for the selected category
  let reportData: any = null;

  try {
    switch (category) {
      case 'overview': {
        reportData = await AccountingEngine.getFinancialIntelligence(filters);
        break;
      }
      case 'statements': {
        const stmtTab = activeTab || 'trial-balance';

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
          AccountingEngine.getTrialBalance(filters).catch(() => null),
          AccountingEngine.getProfitAndLoss(filters).catch(() => null),
          AccountingEngine.getBalanceSheet(filters).catch(() => null),
          AccountingEngine.getCashFlow(filters).catch(() => null),
          AccountingEngine.getComparativeProfitAndLoss(filters).catch(() => null),
          AccountingEngine.getComparativeBalanceSheet(filters).catch(() => null),
          AccountingEngine.getComparativeCashFlow(filters).catch(() => null),
          AccountingEngine.getFinancialRatios(filters).catch(() => ({ currentPeriodLabel: financialYear, previousPeriodLabel: '', hasPreviousData: false, ratios: [] })),
          AccountingEngine.getComprehensiveFinancialAnalysis(filters).catch(() => null),
          prisma.customer.findMany({ select: { id: true, legalName: true }, orderBy: { legalName: 'asc' } }).catch(() => []),
          prisma.vendor.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }).catch(() => []),
          prisma.expenseCategory.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }).catch(() => []),
        ]);

        const defaultTB = {
          asOfDate: new Date().toISOString(),
          totalDebit: 0,
          totalCredit: 0,
          difference: 0,
          isBalanced: true,
          items: [],
        };
        const defaultPnl = {
          fromDate: new Date().toISOString(),
          toDate: new Date().toISOString(),
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
          asOfDate: new Date().toISOString(),
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
          fromDate: new Date().toISOString(),
          toDate: new Date().toISOString(),
          operatingCashFlow: { customerReceipts: 0, vendorDisbursements: 0, employeeDisbursements: 0, gstPaid: 0, tdsPaid: 0, netOperating: 0 },
          investingCashFlow: { capitalExpenditure: 0, netInvesting: 0 },
          financingCashFlow: { capitalIntroduced: 0, drawingsWithdrawn: 0, netFinancing: 0 },
          openingCashAndBank: 0,
          netCashFlow: 0,
          closingCashAndBank: 0,
        };
        const defaultCompPnl = {
          currentPeriodLabel: financialYear,
          previousPeriodLabel: 'Previous FY',
          hasPreviousData: false,
          revenueItems: [],
          expenseItems: [],
          totals: {
            totalRevenue: { id: 'tot_rev', name: 'Total Revenue', currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
            totalExpenses: { id: 'tot_exp', name: 'Total Expenses', currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
            operatingProfit: { id: 'tot_ebit', name: 'Operating Profit', currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
            profitBeforeTax: { id: 'tot_pbt', name: 'Profit Before Tax', currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
            netProfitAfterTax: { id: 'tot_pat', name: 'Net Profit After Tax', currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
            operatingMargin: { current: 0, previous: 0, variance: 0 },
            netMargin: { current: 0, previous: 0, variance: 0 },
          },
        };
        const defaultCompBs = {
          currentPeriodLabel: financialYear,
          previousPeriodLabel: 'Previous FY',
          hasPreviousData: false,
          items: [],
          sections: { shareholdersFunds: [], currentLiabilities: [], nonCurrentAssets: [], currentAssets: [] },
          totals: {
            totalShareholdersFunds: { id: 'tot_funds', name: 'Shareholders Funds', currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
            totalEquity: { id: 'tot_funds', name: 'Total Equity', currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
            totalCurrentLiabilities: { id: 'tot_curr_liab', name: 'Total Current Liabilities', currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
            totalLiabilities: { id: 'tot_curr_liab', name: 'Total Liabilities', currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
            totalEquityAndLiabilities: { id: 'tot_eq_liab', name: 'Total Equity & Liabilities', currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
            netFixedAssets: { id: 'tot_fixed', name: 'Net Fixed Assets', currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
            totalCurrentAssets: { id: 'tot_curr_assets', name: 'Total Current Assets', currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
            totalAssets: { id: 'tot_assets', name: 'Total Assets', currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
            netWorkingCapital: { id: 'tot_wc', name: 'Net Working Capital', currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
          },
          workingCapital: { id: 'tot_wc', name: 'Net Working Capital', currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
          isBalanced: true,
          difference: 0,
        };
        const defaultCompCf = {
          currentPeriodLabel: financialYear,
          previousPeriodLabel: 'Previous FY',
          hasPreviousData: false,
          items: [],
          openingCash: { id: 'cf_opening', name: 'Cash at Inception', currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
          closingCash: { id: 'cf_closing', name: 'Cash at End', currentAmount: 0, previousAmount: 0, varianceAmount: 0, variancePercent: null, currentCommonSizePercent: 0, previousCommonSizePercent: 0 },
          closingCashMatchesBalanceSheet: true,
        };

        reportData = JSON.parse(JSON.stringify({
          activeTab: stmtTab,
          trialBalance: trialBalance || defaultTB,
          profitAndLoss: profitAndLoss || defaultPnl,
          balanceSheet: balanceSheet || defaultBs,
          cashFlow: cashFlow || defaultCf,
          comparativePnl: comparativePnl || defaultCompPnl,
          comparativeBs: comparativeBs || defaultCompBs,
          comparativeCf: comparativeCf || defaultCompCf,
          financialRatios: financialRatios || { currentPeriodLabel: financialYear, previousPeriodLabel: '', hasPreviousData: false, ratios: [] },
          financialAnalysis: financialAnalysis || { managementInsights: [], monthlyTrends: [], customerConcentration: [], expenseBreakdown: [], vendorConcentration: [] },
          customers: customers || [],
          vendors: vendors || [],
          categories: categories || [],
        }));
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
        const [assetExpenses, assetDepreciations, assetDisposals, fixedAssetCategories] = await Promise.all([
          prisma.expense.findMany({
            where: { isAsset: true },
            include: {
              vendor: { select: { id: true, name: true } },
              category: { select: { id: true, name: true } },
              depreciations: true,
              disposal: true,
            },
            orderBy: { expenseDate: 'desc' },
          }),
          prisma.assetDepreciation.findMany({
            include: {
              expense: {
                select: { id: true, expenseNumber: true, notes: true, grossAmount: true, netAmount: true },
              },
            },
            orderBy: { effectiveDate: 'desc' },
          }),
          prisma.assetDisposal.findMany({
            include: {
              expense: {
                select: { id: true, expenseNumber: true, notes: true, grossAmount: true },
              },
            },
            orderBy: { disposalDate: 'desc' },
          }),
          prisma.expenseCategory.findMany({
            where: { financialType: 'ASSET' },
            select: { id: true, name: true, code: true, statementGroup: true },
          }),
        ]);
        reportData = {
          assets: assetExpenses,
          depreciations: assetDepreciations,
          disposals: assetDisposals,
          categories: fixedAssetCategories,
        };
        break;
      }
      case 'employees': {
        const { PayrollService } = await import('@/services/payroll.service');
        const { EmployeeAdvanceService } = await import('@/services/employee-advance.service');

        const [employees, salaryExpenses, advances, form24Q] = await Promise.all([
          prisma.employee.findMany({
            orderBy: { name: 'asc' },
            include: {
              advances: { where: { status: 'ACTIVE' } },
              _count: { select: { expenses: true } },
            },
          }),
          prisma.expense.findMany({
            where: { employeeId: { not: null } },
            include: { employee: true, category: true },
            orderBy: { expenseDate: 'desc' },
          }),
          EmployeeAdvanceService.getAdvances(),
          PayrollService.getForm24QSummary('Q2', financialYear),
        ]);

        let initialForm16 = null;
        if (employees.length > 0) {
          try {
            initialForm16 = await PayrollService.getForm16Data(employees[0].id, financialYear);
          } catch {}
        }

        reportData = {
          employees,
          salaryExpenses,
          advances,
          form24Q,
          initialForm16,
        };
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
        fromDate={rawParams.fromDate}
        toDate={rawParams.toDate}
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
