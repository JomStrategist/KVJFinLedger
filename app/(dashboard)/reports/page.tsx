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
  }>;
}) {
  await requireAuth();
  const params = (await searchParams) || {};

  const category = params.category || 'overview';
  const financialYear = params.financialYear || 'FY 2026–27';
  const filters: any = {
    financialYear,
    fromDate: params.fromDate ? new Date(params.fromDate) : undefined,
    toDate: params.toDate ? new Date(params.toDate) : undefined,
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
        reportData = { message: 'Authoritative statements hosted at /financial-statements' };
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
        reportData = await AccountingEngine.getFinancialIntelligence(filters);
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
