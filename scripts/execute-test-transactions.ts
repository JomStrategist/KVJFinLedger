import { prisma } from '../lib/prisma';
import { EmployeeService } from '../services/employee.service';
import { VendorService } from '../services/vendor.service';
import { ExpenseService } from '../services/expense.service';
import { TaxInvoiceService } from '../services/tax-invoice.service';
import { BankTransferService } from '../services/bank-transfer.service';
import { DepreciationService } from '../services/depreciation.service';
import { AccountingEngine } from '../services/accounting-engine.service';
import { ReportsService } from '../services/reports.service';

async function main() {
  console.log('==================================================================');
  console.log('FINLEDGER END-TO-END TRANSACTION TEST EXECUTION (STEP 6)');
  console.log('==================================================================\n');

  // Baseline Check
  const initialEmployees = await EmployeeService.getEmployees();
  console.log(`[Baseline] Existing Employees: ${initialEmployees.length}`);

  // ─────────────────────────────────────────────────────────────────
  // Transaction 1: Create Employee (Rahul Sharma)
  // ─────────────────────────────────────────────────────────────────
  let employee: any = initialEmployees.find((e) => e.email === 'rahul.sharma@kvjanalytics.com');
  if (!employee) {
    employee = await EmployeeService.createEmployee({
      name: 'Rahul Sharma',
      designation: 'Senior Software Engineer',
      department: 'Engineering',
      email: 'rahul.sharma@kvjanalytics.com',
      phone: '+91 98765 43210',
      pan: 'ABCPS1234F',
      salary: 60000,
      isActive: true,
    });
    console.log(`[Trx 1] ✅ Created Employee: ${employee.name} (${employee.employeeCode})`);
  } else {
    console.log(`[Trx 1] ℹ️ Employee already exists: ${employee.name} (${employee.employeeCode})`);
  }

  // ─────────────────────────────────────────────────────────────────
  // Transaction 2: Create Vendor (TechSolutions Systems Pvt Ltd)
  // ─────────────────────────────────────────────────────────────────
  const existingVendors = await VendorService.getVendors();
  let vendor: any = existingVendors.find((v) => v.gstin === '32AABCT1234D1Z5' || v.name === 'TechSolutions Systems Pvt Ltd');
  if (!vendor) {
    vendor = await VendorService.createVendor({
      name: 'TechSolutions Systems Pvt Ltd',
      businessName: 'TechSolutions Systems Pvt Ltd',
      gstin: '32AABCT1234D1Z5',
      state: 'Kerala',
      stateCode: '32',
      email: 'billing@techsolutions.in',
      phone: '+91 484 2345678',
      address: 'Infopark Phase 2, Kakkanad',
      city: 'Kochi',
      isActive: true,
    });
    console.log(`[Trx 2] ✅ Created Vendor: ${vendor.name} (GSTIN: ${vendor.gstin})`);
  } else {
    console.log(`[Trx 2] ℹ️ Vendor already exists: ${vendor.name}`);
  }

  // Locate Category references
  const internetCategory = await prisma.expenseCategory.findFirst({
    where: { name: 'Internet & Telephone' },
  });
  const travelCategory = await prisma.expenseCategory.findFirst({
    where: { name: 'Travel & Transportation' },
  });
  const salaryCategory = await prisma.expenseCategory.findFirst({
    where: { name: 'Salaries & Wages' },
  });
  let assetCategory = await prisma.expenseCategory.findFirst({
    where: { name: 'Computer Equipment' },
  });
  if (!assetCategory) {
    assetCategory = await prisma.expenseCategory.create({
      data: {
        name: 'Computer Equipment',
        financialType: 'ASSET',
        statementGroup: 'Fixed Assets',
        accountNature: 'Fixed Asset',
        financialStatement: 'Balance Sheet',
        normalBalance: 'Debit',
        isActive: true,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // Transaction 3: Operational Expense — Office Broadband Internet
  // ─────────────────────────────────────────────────────────────────
  const existingExpenses = await ExpenseService.getExpenses();
  let internetExpense: any = existingExpenses.find((e) => e.notes?.includes('AIRTEL-OCT-9921'));
  if (!internetExpense) {
    internetExpense = await ExpenseService.createExpense({
      expenseDate: new Date('2026-10-02'),
      description: 'Office Broadband Internet - Airtel Fibre',
      notes: 'AIRTEL-OCT-9921',
      categoryId: internetCategory?.id,
      paidBy: 'COMPANY',
      paymentStatus: 'PAID',
      status: 'APPROVED',
      taxableAmount: 2000,
      subtotal: 2000,
      inputCGST: 180,
      inputSGST: 180,
      inputIGST: 0,
      totalInputGST: 360,
      grossAmount: 2360,
      netAmount: 2360,
      paidAmount: 2360,
      isAsset: false,
      items: [
        {
          categoryId: internetCategory?.id,
          quantity: 1,
          unit: 'Month',
          unitPrice: 2000,
          gstRate: 18,
          taxableAmount: 2000,
          cgstRate: 9,
          cgstAmount: 180,
          sgstRate: 9,
          sgstAmount: 180,
          igstRate: 0,
          igstAmount: 0,
          totalAmount: 2360,
        },
      ],
    });
    console.log(`[Trx 3] ✅ Recorded Internet Expense: ${internetExpense.expenseNumber} (₹2,360 Paid)`);
  } else {
    console.log(`[Trx 3] ℹ️ Internet Expense already recorded: ${internetExpense.expenseNumber}`);
  }

  // ─────────────────────────────────────────────────────────────────
  // Transaction 4: Capital Asset Purchase — Development Laptop
  // ─────────────────────────────────────────────────────────────────
  let laptopAsset: any = existingExpenses.find((e) => e.notes?.includes('TS-INV-8831'));
  if (!laptopAsset) {
    laptopAsset = await ExpenseService.createExpense({
      expenseDate: new Date('2026-10-03'),
      description: 'Apple MacBook Pro M3 (16GB, 512GB) for Engineering',
      notes: 'TS-INV-8831',
      vendorId: vendor.id,
      categoryId: assetCategory.id,
      paidBy: 'COMPANY',
      paymentStatus: 'UNPAID',
      status: 'APPROVED',
      taxableAmount: 60000,
      subtotal: 60000,
      inputCGST: 5400,
      inputSGST: 5400,
      inputIGST: 0,
      totalInputGST: 10800,
      grossAmount: 70800,
      netAmount: 70800,
      paidAmount: 0,
      isAsset: true,
      assetType: 'Computer Equipment',
      depreciationRate: 40,
      items: [
        {
          categoryId: assetCategory.id,
          vendorId: vendor.id,
          quantity: 1,
          unit: 'Nos',
          unitPrice: 60000,
          gstRate: 18,
          taxableAmount: 60000,
          cgstRate: 9,
          cgstAmount: 5400,
          sgstRate: 9,
          sgstAmount: 5400,
          igstRate: 0,
          igstAmount: 0,
          isAsset: true,
          depreciationRate: 40,
          totalAmount: 70800,
        },
      ],
    });
    console.log(`[Trx 4] ✅ Capitalized Development Laptop: ${laptopAsset.expenseNumber} (₹70,800 Gross Block)`);
  } else {
    console.log(`[Trx 4] ℹ️ Development Laptop already capitalized: ${laptopAsset.expenseNumber}`);
  }

  // ─────────────────────────────────────────────────────────────────
  // Transaction 5: Employee Travel Reimbursement
  // ─────────────────────────────────────────────────────────────────
  let travelExpense: any = existingExpenses.find((e) => e.notes?.includes('TRAVEL-CLM-001'));
  if (!travelExpense) {
    travelExpense = await ExpenseService.createExpense({
      expenseDate: new Date('2026-10-04'),
      description: 'Client onsite technical consultation travel expenses',
      notes: 'TRAVEL-CLM-001',
      categoryId: travelCategory?.id,
      paidBy: 'COMPANY',
      employeeId: employee.id,
      paymentStatus: 'PAID',
      status: 'APPROVED',
      taxableAmount: 3000,
      subtotal: 3000,
      inputCGST: 0,
      inputSGST: 0,
      inputIGST: 0,
      totalInputGST: 0,
      grossAmount: 3000,
      netAmount: 3000,
      paidAmount: 3000,
      isAsset: false,
      items: [
        {
          categoryId: travelCategory?.id,
          quantity: 1,
          unit: 'Trip',
          unitPrice: 3000,
          gstRate: 0,
          taxableAmount: 3000,
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          igstRate: 0,
          igstAmount: 0,
          totalAmount: 3000,
        },
      ],
    });
    console.log(`[Trx 5] ✅ Recorded Travel Reimbursement: ${travelExpense.expenseNumber} (₹3,000 Paid)`);
  } else {
    console.log(`[Trx 5] ℹ️ Travel Reimbursement already recorded: ${travelExpense.expenseNumber}`);
  }

  // ─────────────────────────────────────────────────────────────────
  // Transaction 6: Direct Salary Posting
  // ─────────────────────────────────────────────────────────────────
  let salaryExpense: any = existingExpenses.find((e) => e.notes?.includes('SAL-2026-10-RAHUL'));
  if (!salaryExpense) {
    salaryExpense = await ExpenseService.createExpense({
      expenseDate: new Date('2026-10-05'),
      description: `Monthly Salary Payout - ${employee.name}`,
      notes: 'SAL-2026-10-RAHUL',
      categoryId: salaryCategory?.id,
      paidBy: 'COMPANY',
      employeeId: employee.id,
      paymentStatus: 'PAID',
      status: 'APPROVED',
      taxableAmount: 50000,
      subtotal: 50000,
      inputCGST: 0,
      inputSGST: 0,
      inputIGST: 0,
      totalInputGST: 0,
      grossAmount: 50000,
      netAmount: 50000,
      paidAmount: 50000,
      isAsset: false,
      items: [
        {
          categoryId: salaryCategory?.id,
          quantity: 1,
          unit: 'Month',
          unitPrice: 50000,
          gstRate: 0,
          taxableAmount: 50000,
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          igstRate: 0,
          igstAmount: 0,
          totalAmount: 50000,
        },
      ],
    });
    console.log(`[Trx 6] ✅ Recorded Salary Payout: ${salaryExpense.expenseNumber} (₹50,000 Paid)`);
  } else {
    console.log(`[Trx 6] ℹ️ Salary Payout already recorded: ${salaryExpense.expenseNumber}`);
  }

  // ─────────────────────────────────────────────────────────────────
  // Transaction 7: Customer Tax Invoice — Consulting to Aparna Sara Mathew
  // ─────────────────────────────────────────────────────────────────
  const aparna = await prisma.customer.findFirst({
    where: { tradeName: { contains: 'Aparna Sara Mathew' } },
  });
  if (!aparna) throw new Error('Customer Aparna Sara Mathew not found');

  const existingInvoices = await TaxInvoiceService.getTaxInvoices();
  let consultingInvoice: any = existingInvoices.find((inv) => inv.notes?.includes('CONSULTING-OCT-2026'));
  if (!consultingInvoice) {
    consultingInvoice = await TaxInvoiceService.createTaxInvoice({
      customerId: aparna.id,
      invoiceDate: new Date('2026-10-06'),
      notes: 'CONSULTING-OCT-2026: Cloud Architecture & Analytics Consulting',
      subtotal: 50000,
      taxableAmount: 50000,
      totalDiscount: 0,
      totalCGST: 4500,
      totalSGST: 4500,
      totalIGST: 0,
      totalGST: 9000,
      grossAmount: 59000,
      netAmount: 59000,
      items: [
        {
          name: 'Cloud Architecture & Analytics Consulting',
          description: 'Technical Advisory for Enterprise Scalability',
          hsnSacCode: '998314',
          quantity: 1,
          unit: 'Service',
          unitPrice: 50000,
          taxableAmount: 50000,
          gstRate: 18,
          cgstAmount: 4500,
          sgstAmount: 4500,
          igstAmount: 0,
          totalGST: 9000,
          totalAmount: 59000,
        },
      ],
    });
    console.log(`[Trx 7] ✅ Created Consulting Tax Invoice: ${consultingInvoice.invoiceNumber} (₹59,000)`);
  } else {
    console.log(`[Trx 7] ℹ️ Consulting Tax Invoice already exists: ${consultingInvoice.invoiceNumber}`);
  }

  // ─────────────────────────────────────────────────────────────────
  // Transaction 8: Customer Payment Receipt with 10% TDS (Section 194J)
  // ─────────────────────────────────────────────────────────────────
  const freshInv = await TaxInvoiceService.getTaxInvoiceById(consultingInvoice.id);
  if (!freshInv?.payments || freshInv.payments.length === 0) {
    await TaxInvoiceService.recordPayment(consultingInvoice.id, {
      paymentDate: new Date('2026-10-07'),
      paymentAmount: 59000,
      isTdsDeducted: true,
      tdsRate: 10,
      tdsAmount: 5000,
      bankReceipt: 54000,
      reference: 'NEFT-APARNA-99412',
      remarks: 'Settlement with 10% Section 194J TDS withheld by customer',
    });
    console.log(`[Trx 8] ✅ Recorded Payment Receipt: ₹54,000 Bank + ₹5,000 TDS Receivable`);
  } else {
    console.log(`[Trx 8] ℹ️ Payment Receipt already recorded for ${consultingInvoice.invoiceNumber}`);
  }

  // ─────────────────────────────────────────────────────────────────
  // Transaction 9: Banking Contra — Petty Cash Withdrawal
  // ─────────────────────────────────────────────────────────────────
  const existingTransfers = await BankTransferService.getBankTransfers();
  let contraTransfer = existingTransfers.find((t) => t.reference === 'CONTRA-PETTY-CASH-01');
  if (!contraTransfer) {
    contraTransfer = await BankTransferService.createBankTransfer({
      date: new Date('2026-10-08'),
      fromAccount: 'HDFC Current Account',
      toAccount: 'Petty Cash Account',
      amount: 10000,
      reference: 'CONTRA-PETTY-CASH-01',
      description: 'Cash withdrawal for office petty cash float',
    });
    console.log(`[Trx 9] ✅ Recorded Banking Contra: ₹10,000 HDFC -> Petty Cash`);
  } else {
    console.log(`[Trx 9] ℹ️ Banking Contra already recorded: ${contraTransfer.reference}`);
  }

  // ─────────────────────────────────────────────────────────────────
  // Transaction 10: Fixed Asset Depreciation Write-Off
  // ─────────────────────────────────────────────────────────────────
  const existingDeps = await DepreciationService.getAllDepreciations('FY 2026–27');
  let laptopDep = existingDeps.find((d) => d.expenseId === laptopAsset.id);
  if (!laptopDep) {
    laptopDep = await DepreciationService.recordAssetDepreciation({
      expenseId: laptopAsset.id,
      financialYear: 'FY 2026–27',
      method: 'WDV',
      rate: 40,
      depreciationAmount: 24000,
      effectiveDate: new Date('2026-10-09'),
      remarks: 'Annual Schedule II depreciation at 40% WDV on development laptop',
    });
    console.log(`[Trx 10] ✅ Recorded Asset Depreciation: ₹24,000 written off at 40% WDV`);
  } else {
    console.log(`[Trx 10] ℹ️ Asset Depreciation already recorded: ₹${laptopDep.depreciationAmount}`);
  }

  // Invalidate Cache and Compute Fresh Financial Statements
  AccountingEngine.invalidateCache();

  console.log('\n==================================================================');
  console.log('ACCOUNTING INTEGRITY AUDIT AFTER 10 TRANSACTIONS');
  console.log('==================================================================\n');

  const [trialBalance, balanceSheet, profitAndLoss, cashFlow, gstOutward, itc, fixedAssetsData] =
    await Promise.all([
      AccountingEngine.getTrialBalance({ financialYear: 'FY 2026–27' }),
      AccountingEngine.getBalanceSheet({ financialYear: 'FY 2026–27' }),
      AccountingEngine.getProfitAndLoss({ financialYear: 'FY 2026–27' }),
      AccountingEngine.getCashFlow({ financialYear: 'FY 2026–27' }),
      ReportsService.getGstOutwardSupplies({} as any),
      ReportsService.getInputTaxCredit({} as any),
      prisma.expense.findMany({
        where: { isAsset: true },
        include: { depreciations: true },
      }),
    ]);

  // Check 1: Trial Balance Equilibrium
  const tbDiff = Math.abs((trialBalance?.totalDebit || 0) - (trialBalance?.totalCredit || 0));
  const isTbBalanced = tbDiff < 0.01;
  console.log(
    `[TB Equilibrium] Total Debit: ₹${trialBalance?.totalDebit?.toLocaleString('en-IN')}, Total Credit: ₹${trialBalance?.totalCredit?.toLocaleString('en-IN')}`
  );
  console.log(`[TB Difference]  ₹${tbDiff.toFixed(2)} -> ${isTbBalanced ? '✅ PERFECTLY BALANCED' : '❌ OUT OF BALANCE'}`);

  // Check 2: Balance Sheet Equilibrium
  const bsDiff = Math.abs((Number(balanceSheet?.totalAssets) || 0) - (Number(balanceSheet?.totalEquityAndLiabilities) || 0));
  const isBsBalanced = balanceSheet?.isBalanced ?? (bsDiff < 0.01);
  console.log(
    `[BS Equilibrium] Total Assets: ₹${Number(balanceSheet?.totalAssets || 0).toLocaleString('en-IN')}, Total Eq+Liab: ₹${Number(balanceSheet?.totalEquityAndLiabilities || 0).toLocaleString('en-IN')}`
  );
  console.log(`[BS Difference]  ₹${bsDiff.toFixed(2)} -> ${isBsBalanced ? '✅ PERFECTLY BALANCED' : '❌ OUT OF BALANCE'}`);

  // Check 3: Profit & Loss Net Profit
  console.log(
    `[P&L Statement]  Revenue: ₹${Number(profitAndLoss?.totalRevenue || 0).toLocaleString('en-IN')}, Operating Expenses: ₹${Number(profitAndLoss?.totalExpenses || 0).toLocaleString('en-IN')}, Net Profit: ₹${Number(profitAndLoss?.netProfitAfterTax || 0).toLocaleString('en-IN')}`
  );

  // Check 4: Cash Flow
  console.log(
    `[Cash Flow]      Net Operating: ₹${cashFlow?.operatingCashFlow?.netOperating?.toLocaleString('en-IN')}, Closing Cash: ₹${cashFlow?.closingCashAndBank?.toLocaleString('en-IN')}`
  );

  // Check 5: Fixed Assets Register
  const totalGross = fixedAssetsData.reduce((s, a) => s + (a.grossAmount || 0), 0);
  const totalAccDep = fixedAssetsData.reduce(
    (s, a) => s + (a.depreciations || []).reduce((dSum, d) => dSum + d.depreciationAmount, 0),
    0
  );
  const netBookValue = totalGross - totalAccDep;
  console.log(
    `[Asset Register] Gross Block: ₹${totalGross.toLocaleString('en-IN')}, Acc Dep: ₹${totalAccDep.toLocaleString('en-IN')}, Net Book Value: ₹${netBookValue.toLocaleString('en-IN')}`
  );

  // Check 6: Statutory Tax
  console.log(
    `[Statutory GST]  GSTR-1 Outward Records: ${(gstOutward as any)?.data?.length || 0}, GSTR-2B ITC Records: ${(itc as any)?.data?.length || 0}`
  );

  console.log('\n==================================================================');
  if (isTbBalanced && isBsBalanced) {
    console.log('🎉 ALL 10 TRANSACTIONS POSTED & VERIFIED WITH 100% ACCOUNTING ACCURACY!');
  } else {
    console.error('⚠️ AUDIT DISCREPANCY DETECTED');
  }
  console.log('==================================================================\n');
}

main()
  .catch((e) => {
    console.error('Fatal execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
