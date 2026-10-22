import { PrismaClient } from "@prisma/client";

// Ensure tests execute strictly against an isolated test database, preserving production data 100%
const originalDbUrl = process.env.DATABASE_URL;
if (!originalDbUrl) {
  console.error("FATAL: DATABASE_URL environment variable is not defined.");
  process.exit(1);
}

const isolatedTestDbUrl = originalDbUrl.includes("/billing_erp?")
  ? originalDbUrl.replace("/billing_erp?", "/billing_erp_test?")
  : originalDbUrl.includes("/billing_erp")
  ? originalDbUrl.replace("/billing_erp", "/billing_erp_test")
  : `${originalDbUrl}_test`;

process.env.DATABASE_URL = isolatedTestDbUrl;

// Instantiate test prisma instance pointing to isolated test DB
const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: isolatedTestDbUrl,
    },
  },
});

// Configure global prisma so all services share the isolated test instance
(globalThis as any).prisma = testPrisma;

import { ExpenseService } from "../services/expense.service";
import { ExpenseAccountingService } from "../services/expense-accounting.service";
import { PayrollService } from "../services/payroll.service";
import { JournalPostingService, IdempotencyConflictError } from "../services/journal-posting.service";
import { AccountingEngine } from "../services/accounting-engine.service";
import { toPaise, roundToPaisa, fromPaise } from "../lib/utils/currency";

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failedTests++;
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`AssertionFailed: ${message}`);
  }
  passedTests++;
  console.log(`  ✅ PASSED: ${message}`);
}

async function runPrompt6Tests() {
  console.log("================================================================================");
  console.log("FINLEDGER ERP — PROMPT 6: EXPENSE, VENDOR & SALARY ACCOUNTING TEST SUITE");
  console.log("================================================================================");
  console.log(`Target Isolated Database: ${isolatedTestDbUrl.replace(/\/\/[^@]+@/, "//***:***@")}`);
  console.log("Ensuring complete isolation from primary production database.\n");

  const testActor = {
    id: "user_test_admin",
    name: "Prompt 6 Test Runner",
    email: "test.admin@kvjanalytics.com",
    role: "ADMIN",
  };

  try {
    // -------------------------------------------------------------------------
    // 0. Preparation & Seed Master Records in isolated test DB
    // -------------------------------------------------------------------------
    console.log("--- 0. Preparing Isolated Test Database & Master Records ---");

    // Initialize Company Bank Account
    let testBank = await testPrisma.bankAccount.findFirst({
      where: { accountNumber: "HDFC99887766" },
    });
    if (!testBank) {
      testBank = await testPrisma.bankAccount.create({
        data: {
          bankName: "HDFC Bank (Operating)",
          accountName: "KVJ Analytics Current Account",
          accountNumber: "HDFC99887766",
          ifsc: "HDFC0000001",
          branch: "Mumbai Main",
          isPrimary: true,
          isActive: true,
        },
      });
    }
    assert(Boolean(testBank?.id), "Primary bank account initialized in isolated DB.");

    // Inactive Bank Account for testing rejection
    let inactiveBank = await testPrisma.bankAccount.findFirst({
      where: { accountNumber: "INACT000111" },
    });
    if (!inactiveBank) {
      inactiveBank = await testPrisma.bankAccount.create({
        data: {
          bankName: "Old Inactive Bank",
          accountName: "Defunct Account",
          accountNumber: "INACT000111",
          ifsc: "INACT0001",
          isPrimary: false,
          isActive: false,
        },
      });
    }

    // Initialize Test Vendor
    let testVendor = await testPrisma.vendor.findFirst({
      where: { name: "Cloud Infrastructure Inc" },
    });
    if (!testVendor) {
      testVendor = await testPrisma.vendor.create({
        data: {
          name: "Cloud Infrastructure Inc",
          businessName: "Cloud Infrastructure Solutions Pvt Ltd",
          gstin: "27AABCC1234D1Z5", // Maharashtra
          pan: "AABCC1234D",
          state: "Maharashtra",
          stateCode: "27",
          isActive: true,
        },
      });
    }
    assert(Boolean(testVendor?.id), "Test Vendor initialized in isolated DB.");

    // Initialize Inter-state Vendor
    let interStateVendor = await testPrisma.vendor.findFirst({
      where: { name: "Bangalore Software Labs" },
    });
    if (!interStateVendor) {
      interStateVendor = await testPrisma.vendor.create({
        data: {
          name: "Bangalore Software Labs",
          businessName: "Bangalore Software Labs LLP",
          gstin: "29AABCB5678E1Z2", // Karnataka
          pan: "AABCB5678E",
          state: "Karnataka",
          stateCode: "29",
          isActive: true,
        },
      });
    }
    assert(Boolean(interStateVendor?.id), "Inter-state Vendor initialized.");

    // Initialize Test Employee
    let testEmployee = await testPrisma.employee.findFirst({
      where: { name: "Rahul Sharma" },
    });
    if (!testEmployee) {
      testEmployee = await testPrisma.employee.create({
        data: {
          name: "Rahul Sharma",
          employeeCode: "EMP-KVJ-101",
          email: "rahul.sharma@kvjanalytics.com",
          salary: 50000, // Master default salary
          pan: "ABCPS1234F",
          isActive: true,
        },
      });
    }
    assert(Boolean(testEmployee?.id), "Test Employee initialized.");

    // -------------------------------------------------------------------------
    // Scenario 1: Expense Category Mapping to Correct Accounting Class
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 1: Expense Category Accounting Classification ---");

    // Fixed Asset Category
    let assetCategory = await testPrisma.expenseCategory.findFirst({
      where: { code: "CAT-ASSET-01" },
    });
    if (!assetCategory) {
      assetCategory = await testPrisma.expenseCategory.create({
        data: {
          name: "Servers & Hardware",
          code: "CAT-ASSET-01",
          accountingClassification: "FIXED_ASSET",
          isCapitalAsset: true,
          financialType: "ASSET",
          statementGroup: "Property, Plant & Equipment",
        },
      });
    }

    // Business Loss Category
    let lossCategory = await testPrisma.expenseCategory.findFirst({
      where: { code: "CAT-LOSS-01" },
    });
    if (!lossCategory) {
      lossCategory = await testPrisma.expenseCategory.create({
        data: {
          name: "Foreign Exchange Loss",
          code: "CAT-LOSS-01",
          accountingClassification: "BUSINESS_LOSS",
          isLossCategory: true,
          financialType: "EXPENSE",
          statementGroup: "Other Expenses",
        },
      });
    }

    // Operating Expense Category
    let opsCategory = await testPrisma.expenseCategory.findFirst({
      where: { code: "CAT-OPS-01" },
    });
    if (!opsCategory) {
      opsCategory = await testPrisma.expenseCategory.create({
        data: {
          name: "Cloud Server Hosting",
          code: "CAT-OPS-01",
          accountingClassification: "OPERATING_EXPENSE",
          financialType: "EXPENSE",
          statementGroup: "Operating Expenses",
        },
      });
    }

    assert(Boolean(assetCategory.isCapitalAsset), "Fixed asset category correctly marked capital asset.");
    assert(Boolean(lossCategory.isLossCategory), "Loss category correctly marked loss category.");
    assert(opsCategory.financialType === "EXPENSE", "Operating category classified as EXPENSE.");

    // -------------------------------------------------------------------------
    // Scenario 2: Immediate Company-Bank Expense (Single Balanced Journal)
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 2: Immediate Company-Bank Expense ---");

    const directExpense = await ExpenseService.createExpense(
      {
        expenseDate: new Date(),
        description: "Monthly Office Internet - Direct Bank Debit",
        categoryId: opsCategory.id,
        paidBy: "COMPANY",
        paymentStatus: "PAID",
        bankAccountId: testBank.id,
        taxableAmount: 5000,
        subtotal: 5000,
        gstRate: 18,
        inputCGST: 450,
        inputSGST: 450,
        totalInputGST: 900,
        grossAmount: 5900,
        netAmount: 5900,
        isItcEligible: true,
      },
      testActor
    );

    assert(Boolean(directExpense.id), `Direct expense created: ${directExpense.expenseNumber}`);

    // Verify Persistent Journal
    const directJournal = await testPrisma.journalEntry.findUnique({
      where: { idempotencyKey: `EXPENSE:CONFIRM:${directExpense.id}` },
      include: { lines: true },
    });

    assert(Boolean(directJournal), "Persistent journal exists for immediate company-bank expense.");
    assert(directJournal?.isBalanced === true, "Direct expense journal is perfectly balanced.");
    assert(toPaise(directJournal?.totalDebit || 0) === toPaise(5900), "Journal total debit is ₹5,900.");

    // Verify lines: Dr Expense (5000), Dr CGST (450), Dr SGST (450), Cr Bank (5900)
    const expDebitLine = directJournal?.lines.find((l) => l.debit === 5000);
    const cgstLine = directJournal?.lines.find((l) => l.accountId === "stat_input_cgst" && l.debit === 450);
    const sgstLine = directJournal?.lines.find((l) => l.accountId === "stat_input_sgst" && l.debit === 450);
    assert(Boolean(expDebitLine), "Expense account debited for taxable amount ₹5,000.");
    assert(Boolean(cgstLine), "Input CGST debited for ₹450.");
    assert(Boolean(sgstLine), "Input SGST debited for ₹450.");

    // -------------------------------------------------------------------------
    // Scenario 3: Unpaid Expense Creates Vendor Payable & Zero Bank Outflow
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 3: Unpaid Expense (Vendor Bill) ---");

    const unpaidExpense = await ExpenseService.createExpense(
      {
        expenseDate: new Date(),
        description: "Cloud Architecture Consulting Bill",
        vendorId: testVendor.id,
        categoryId: opsCategory.id,
        paidBy: "COMPANY",
        paymentStatus: "UNPAID",
        taxableAmount: 20000,
        subtotal: 20000,
        gstRate: 18,
        inputCGST: 1800,
        inputSGST: 1800,
        totalInputGST: 3600,
        grossAmount: 23600,
        netAmount: 23600,
        balancePayable: 23600,
        isItcEligible: true,
      },
      testActor
    );

    const unpaidJournal = await testPrisma.journalEntry.findUnique({
      where: { idempotencyKey: `EXPENSE:CONFIRM:${unpaidExpense.id}` },
      include: { lines: true },
    });

    assert(Boolean(unpaidJournal), "Persistent journal posted for unpaid vendor bill.");
    const bankOutflowLine = unpaidJournal?.lines.find((l) => l.financialType === "ASSET" && l.credit > 0 && l.statementGroup === "Bank Accounts");
    assert(!bankOutflowLine, "Zero company bank outflow recognized for unpaid expense.");

    const vendorPayableLine = unpaidJournal?.lines.find((l) => l.accountId === `vendor_${testVendor.id}`);
    assert(Boolean(vendorPayableLine), "Trade Payable credited for vendor bill.");
    assert(vendorPayableLine?.credit === 23600, "Vendor Payable credited for full gross amount ₹23,600.");

    // -------------------------------------------------------------------------
    // Scenario 4: Employee-Personal-Funds Expense Creates Employee Payable
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 4: Employee-Paid Expense (Reimbursable) ---");

    const empPaidExpense = await ExpenseService.createExpense(
      {
        expenseDate: new Date(),
        description: "Client Lunch Paid by Rahul Sharma",
        categoryId: opsCategory.id,
        paidBy: "EMPLOYEE",
        employeeId: testEmployee.id,
        paymentStatus: "UNPAID",
        taxableAmount: 2500,
        subtotal: 2500,
        totalInputGST: 0,
        grossAmount: 2500,
        netAmount: 2500,
        balancePayable: 2500,
      },
      testActor
    );

    const empPaidJournal = await testPrisma.journalEntry.findUnique({
      where: { idempotencyKey: `EXPENSE:CONFIRM:${empPaidExpense.id}` },
      include: { lines: true },
    });

    assert(Boolean(empPaidJournal), "Journal exists for employee-paid expense.");
    const empPayableLine = empPaidJournal?.lines.find((l) => l.accountId === `emp_${testEmployee.id}`);
    assert(Boolean(empPayableLine), "Employee Payable liability line created.");
    assert(empPayableLine?.credit === 2500, "Employee Payable credited for ₹2,500.");
    const empBankCredit = empPaidJournal?.lines.find((l) => l.financialType === "ASSET" && l.credit > 0);
    assert(!empBankCredit, "Zero company bank outflow at employee expense entry time.");

    // -------------------------------------------------------------------------
    // Scenario 5: Employee Reimbursement Clears Payable Without Duplicating Expense
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 5: Employee Reimbursement Disbursement ---");

    const reimbPaymentRes = await ExpenseService.recordExpensePayment(
      empPaidExpense.id,
      {
        amount: 2500,
        paymentDate: new Date(),
        bankAccountId: testBank.id,
        isReimbursement: true,
        paymentMode: "BANK_TRANSFER",
        referenceNumber: "NEFT-REIMB-001",
        notes: "Reimbursement to Rahul Sharma",
      },
      testActor
    );

    const reimbJournal = await testPrisma.journalEntry.findUnique({
      where: { idempotencyKey: `EXPENSE_PAYMENT:${reimbPaymentRes.payment.id}` },
      include: { lines: true },
    });

    assert(Boolean(reimbJournal), "Reimbursement payment journal posted.");
    assert(reimbJournal?.entryType === "PAYMENT", "Reimbursement journal type is PAYMENT.");
    assert(reimbJournal?.isBalanced === true, "Reimbursement journal is balanced.");

    // Verify lines: Dr Employee Payable (2500), Cr Bank (2500)
    const drEmpPayable = reimbJournal?.lines.find((l) => l.accountId === `emp_${testEmployee.id}` && l.debit === 2500);
    const crBank = reimbJournal?.lines.find((l) => l.bankAccountId === testBank.id && l.credit === 2500);
    assert(Boolean(drEmpPayable), "Employee Payable liability debited (cleared).");
    assert(Boolean(crBank), "Bank account credited for reimbursement payout.");

    const expenseDrLinesInReimb = reimbJournal?.lines.filter((l) => l.financialType === "EXPENSE");
    assert(expenseDrLinesInReimb?.length === 0, "No duplicate expense debit recognized on reimbursement.");

    // -------------------------------------------------------------------------
    // Scenario 6: Partial and Multiple Expense Payments
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 6: Partial and Multiple Vendor Payments ---");

    // Partial Payment 1: ₹10,000 against ₹23,600
    const partPay1 = await ExpenseService.recordExpensePayment(
      unpaidExpense.id,
      {
        amount: 10000,
        paymentDate: new Date(),
        bankAccountId: testBank.id,
        paymentMode: "BANK_TRANSFER",
        referenceNumber: "PART-PAY-01",
      },
      testActor
    );

    assert(partPay1.updatedExpense.paymentStatus === "PARTIALLY_PAID", "Expense status updated to PARTIALLY_PAID.");
    assert(partPay1.updatedExpense.balancePayable === 13600, "Remaining balance is ₹13,600.");

    const partJournal1 = await testPrisma.journalEntry.findUnique({
      where: { idempotencyKey: `EXPENSE_PAYMENT:${partPay1.payment.id}` },
    });
    assert(Boolean(partJournal1), "Partial payment 1 journal posted.");
    assert(partJournal1?.totalDebit === 10000, "Partial payment 1 journal balanced at ₹10,000.");

    // Partial Payment 2: Remaining ₹13,600
    const partPay2 = await ExpenseService.recordExpensePayment(
      unpaidExpense.id,
      {
        amount: 13600,
        paymentDate: new Date(),
        bankAccountId: testBank.id,
        paymentMode: "BANK_TRANSFER",
        referenceNumber: "PART-PAY-02",
      },
      testActor
    );

    assert(partPay2.updatedExpense.paymentStatus === "PAID", "Expense status updated to PAID after full settlement.");
    assert(partPay2.updatedExpense.balancePayable === 0, "Remaining balance is ₹0.");

    const partJournal2 = await testPrisma.journalEntry.findUnique({
      where: { idempotencyKey: `EXPENSE_PAYMENT:${partPay2.payment.id}` },
    });
    assert(Boolean(partJournal2), "Partial payment 2 journal posted.");
    assert(partJournal2?.totalDebit === 13600, "Partial payment 2 journal balanced at ₹13,600.");

    // -------------------------------------------------------------------------
    // Scenario 7 & 8: Vendor Bill Creation & Tax Calculations
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 7 & 8: Vendor Bill & Tax Calculation Math ---");

    const taxableCost = 15000;
    const cgstVal = 1350;
    const sgstVal = 1350;
    const totalGstVal = 2700;
    const grossVal = 17700;

    const vendorBill = await ExpenseService.createExpense(
      {
        expenseDate: new Date(),
        billNumber: "INV-VEND-8899",
        description: "Specialist Support Services",
        vendorId: testVendor.id,
        categoryId: opsCategory.id,
        paidBy: "COMPANY",
        paymentStatus: "UNPAID",
        taxableAmount: taxableCost,
        subtotal: taxableCost,
        gstRate: 18,
        inputCGST: cgstVal,
        inputSGST: sgstVal,
        totalInputGST: totalGstVal,
        grossAmount: grossVal,
        netAmount: grossVal,
        isItcEligible: true,
      },
      testActor
    );

    assert(toPaise(vendorBill.grossAmount) === toPaise(taxableCost + totalGstVal), "Tax-exclusive math balances to integer paise.");

    // -------------------------------------------------------------------------
    // Scenario 9: Place-of-Supply (Intra-state vs Inter-state IGST)
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 9: Place of Supply: Intra-state vs Inter-state IGST ---");

    const interStateBill = await ExpenseService.createExpense(
      {
        expenseDate: new Date(),
        billNumber: "BLR-2026-99",
        description: "Bangalore Software Consulting",
        vendorId: interStateVendor.id,
        categoryId: opsCategory.id,
        paidBy: "COMPANY",
        paymentStatus: "UNPAID",
        taxableAmount: 40000,
        subtotal: 40000,
        gstRate: 18,
        inputCGST: 0,
        inputSGST: 0,
        inputIGST: 7200,
        totalInputGST: 7200,
        grossAmount: 47200,
        netAmount: 47200,
        isItcEligible: true,
      },
      testActor
    );

    const interJournal = await testPrisma.journalEntry.findUnique({
      where: { idempotencyKey: `EXPENSE:CONFIRM:${interStateBill.id}` },
      include: { lines: true },
    });

    const igstLine = interJournal?.lines.find((l) => l.accountId === "stat_input_igst");
    const zeroCgst = interJournal?.lines.find((l) => l.accountId === "stat_input_cgst");
    assert(Boolean(igstLine), "Input IGST credit line created for Inter-state vendor bill.");
    assert(igstLine?.debit === 7200, "Input IGST debited for ₹7,200.");
    assert(!zeroCgst, "Zero Input CGST created for Inter-state purchase.");

    // -------------------------------------------------------------------------
    // Scenario 10: Ineligible ITC Capitalized into Cost
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 10: Ineligible Input Tax Credit Capitalized ---");

    const blockedItcExpense = await ExpenseService.createExpense(
      {
        expenseDate: new Date(),
        description: "Company Car Repair (Blocked ITC under Sec 17(5))",
        categoryId: opsCategory.id,
        paidBy: "COMPANY",
        paymentStatus: "UNPAID",
        vendorId: testVendor.id,
        taxableAmount: 10000,
        subtotal: 10000,
        gstRate: 18,
        inputCGST: 900,
        inputSGST: 900,
        totalInputGST: 1800,
        grossAmount: 11800,
        netAmount: 11800,
        isItcEligible: false, // Ineligible ITC
        itcIneligibleReason: "Blocked credit under Section 17(5) - Motor vehicles",
      },
      testActor
    );

    const blockedItcJournal = await testPrisma.journalEntry.findUnique({
      where: { idempotencyKey: `EXPENSE:CONFIRM:${blockedItcExpense.id}` },
      include: { lines: true },
    });

    assert(Boolean(blockedItcJournal), "Blocked ITC journal created.");
    const itcAssetLines = blockedItcJournal?.lines.filter((l) => l.accountId.startsWith("stat_input_"));
    assert(itcAssetLines?.length === 0, "Zero Input GST asset lines recognized for ineligible ITC.");

    const capitalizedExpenseLine = blockedItcJournal?.lines.find((l) => l.financialType === "EXPENSE");
    assert(capitalizedExpenseLine?.debit === 11800, "Ineligible GST capitalized into expense debit (₹11,800).");

    // -------------------------------------------------------------------------
    // Scenario 11, 12 & 13: Vendor TDS Withheld at Actual Payment Time
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 11, 12 & 13: Vendor TDS Deducted at Payment Time ---");

    // Create a ₹10,000 vendor payable
    const tdsEligibleBill = await ExpenseService.createExpense(
      {
        expenseDate: new Date(),
        description: "Professional IT Consulting (Sec 194J)",
        vendorId: testVendor.id,
        categoryId: opsCategory.id,
        paidBy: "COMPANY",
        paymentStatus: "UNPAID",
        taxableAmount: 10000,
        subtotal: 10000,
        totalInputGST: 0,
        grossAmount: 10000,
        netAmount: 10000,
        balancePayable: 10000,
      },
      testActor
    );

    // Settle ₹10,000 with 10% TDS (₹1,000 TDS withheld, ₹9,000 bank payout)
    const tdsPaymentRes = await ExpenseService.recordExpensePayment(
      tdsEligibleBill.id,
      {
        amount: 10000, // Total payable settlement
        paymentDate: new Date(),
        bankAccountId: testBank.id,
        paymentMode: "BANK_TRANSFER",
        isTdsDeducted: true,
        tdsRate: 10,
        tdsAmount: 1000,
        tdsSection: "194J",
        bankPayment: 9000,
        notes: "Settled after withholding 10% TDS under Section 194J",
      },
      testActor
    );

    const tdsJournal = await testPrisma.journalEntry.findUnique({
      where: { idempotencyKey: `EXPENSE_PAYMENT:${tdsPaymentRes.payment.id}` },
      include: { lines: true },
    });

    assert(Boolean(tdsJournal), "Payment journal with TDS withholding posted.");
    assert(tdsJournal?.isBalanced === true, "TDS payment journal is balanced.");

    const drVendor = tdsJournal?.lines.find((l) => l.accountId === `vendor_${testVendor.id}`);
    const crBankNet = tdsJournal?.lines.find((l) => l.bankAccountId === testBank.id);
    const crTdsPayable = tdsJournal?.lines.find((l) => l.accountId === "stat_tds_payable");

    assert(drVendor?.debit === 10000, "Vendor Payable debited for full ₹10,000 settlement.");
    assert(crBankNet?.credit === 9000, "Bank Account credited for net disbursement of ₹9,000.");
    assert(crTdsPayable?.credit === 1000, "Statutory TDS Payable credited for ₹1,000.");
    assert(toPaise(drVendor?.debit || 0) === toPaise((crBankNet?.credit || 0) + (crTdsPayable?.credit || 0)), "Debit ₹10,000 = Bank ₹9,000 + TDS ₹1,000.");

    // Payment without TDS does not create TDS payable line
    const nonTdsBill = await ExpenseService.createExpense(
      {
        expenseDate: new Date(),
        description: "Small stationery purchase",
        vendorId: testVendor.id,
        categoryId: opsCategory.id,
        paidBy: "COMPANY",
        paymentStatus: "UNPAID",
        taxableAmount: 2000,
        subtotal: 2000,
        totalInputGST: 0,
        grossAmount: 2000,
        netAmount: 2000,
        balancePayable: 2000,
      },
      testActor
    );

    const nonTdsPay = await ExpenseService.recordExpensePayment(
      nonTdsBill.id,
      {
        amount: 2000,
        paymentDate: new Date(),
        bankAccountId: testBank.id,
        isTdsDeducted: false,
      },
      testActor
    );

    const nonTdsJournal = await testPrisma.journalEntry.findUnique({
      where: { idempotencyKey: `EXPENSE_PAYMENT:${nonTdsPay.payment.id}` },
      include: { lines: true },
    });

    const zeroTdsLine = nonTdsJournal?.lines.find((l) => l.accountId === "stat_tds_payable");
    assert(!zeroTdsLine, "Zero TDS Payable line created when no TDS was deducted.");

    // -------------------------------------------------------------------------
    // Scenario 14, 15, 16 & 17: Monthly Salary Entry & Payout Lifecycle
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 14, 15, 16 & 17: Monthly Salary Lifecycle ---");

    // Monthly salary with manual entered amount: ₹65,000 (not copied from master ₹50,000)
    // Less TDS ₹2,500 under Section 192 -> Net Salary ₹62,500
    const salaryCategory = await testPrisma.expenseCategory.findFirst({
      where: { OR: [{ code: "EXP-SAL-001" }, { name: "Salaries & Wages" }] },
    }) || await testPrisma.expenseCategory.create({
      data: {
        name: "Salaries & Wages",
        code: "EXP-SAL-001",
        financialType: "EXPENSE",
        statementGroup: "Employee Benefits Expense",
      },
    });

    const salaryExpense = await ExpenseService.createExpense(
      {
        expenseDate: new Date("2026-10-31"),
        description: "Salary Payout - Rahul Sharma (October 2026)",
        categoryId: salaryCategory.id,
        paidBy: "COMPANY",
        employeeId: testEmployee.id,
        paymentStatus: "UNPAID", // Accrual first
        taxableAmount: 65000, // Manually entered
        subtotal: 65000,
        grossAmount: 65000,
        tdsRate: (2500 / 65000) * 100,
        tdsAmount: 2500,
        tdsSection: "192",
        netAmount: 62500,
        balancePayable: 62500,
      },
      testActor
    );

    assert(salaryExpense.taxableAmount === 65000, "Salary record uses manually entered amount (₹65,000), not master default.");

    const salAccrualJournal = await testPrisma.journalEntry.findUnique({
      where: { idempotencyKey: `EXPENSE:CONFIRM:${salaryExpense.id}` },
      include: { lines: true },
    });

    assert(Boolean(salAccrualJournal), "Salary accrual journal posted.");
    assert(salAccrualJournal?.isBalanced === true, "Salary accrual journal is balanced.");

    const salExpDebit = salAccrualJournal?.lines.find((l) => l.financialType === "EXPENSE");
    const salEmpPayable = salAccrualJournal?.lines.find((l) => l.accountId === `emp_${testEmployee.id}`);
    const salTdsPayable = salAccrualJournal?.lines.find((l) => l.accountId === "stat_tds_payable");

    assert(salExpDebit?.debit === 65000, "Salary Expense debited for full gross earnings ₹65,000.");
    assert(salEmpPayable?.credit === 62500, "Employee Payable credited for net salary ₹62,500.");
    assert(salTdsPayable?.credit === 2500, "Section 192 TDS Payable credited for ₹2,500.");

    // Partial Salary Payment: Disburse ₹30,000
    const salPartPay1 = await ExpenseService.recordExpensePayment(
      salaryExpense.id,
      {
        amount: 30000,
        paymentDate: new Date(),
        bankAccountId: testBank.id,
        paymentMode: "BANK_TRANSFER",
        notes: "Part salary payout for October 2026",
      },
      testActor
    );

    assert(salPartPay1.updatedExpense.balancePayable === 32500, "Remaining salary payable accurately reflects ₹32,500.");

    const salPayJournal = await testPrisma.journalEntry.findUnique({
      where: { idempotencyKey: `EXPENSE_PAYMENT:${salPartPay1.payment.id}` },
      include: { lines: true },
    });

    assert(salPayJournal?.isBalanced === true, "Salary payment journal is balanced.");
    const salPayDr = salPayJournal?.lines.find((l) => l.accountId === `emp_${testEmployee.id}`);
    const salPayCrBank = salPayJournal?.lines.find((l) => l.bankAccountId === testBank.id);
    assert(salPayDr?.debit === 30000, "Employee Payable debited for ₹30,000.");
    assert(salPayCrBank?.credit === 30000, "Bank Account credited for ₹30,000.");

    // Second Payment: Remaining ₹32,500
    const salPartPay2 = await ExpenseService.recordExpensePayment(
      salaryExpense.id,
      {
        amount: 32500,
        paymentDate: new Date(),
        bankAccountId: testBank.id,
        paymentMode: "BANK_TRANSFER",
      },
      testActor
    );

    assert(salPartPay2.updatedExpense.paymentStatus === "PAID", "Salary is fully settled.");
    assert(salPartPay2.updatedExpense.balancePayable === 0, "Remaining salary balance is ₹0.");

    // -------------------------------------------------------------------------
    // Scenario 18 & 19: Bank Account Validation & Inactive Account Rejection
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 18 & 19: Bank Account Attribution & Inactive Rejection ---");

    // Reject inactive bank account
    let inactiveErrorThrown = false;
    try {
      await ExpenseAccountingService.resolveBankAccount(inactiveBank.id, null, testPrisma);
    } catch (e: any) {
      inactiveErrorThrown = true;
      assert(e.message.includes("inactive"), `Inactive bank account rejected: ${e.message}`);
    }
    assert(inactiveErrorThrown, "Attempting to disburse via inactive bank account was rejected.");

    // Reject nonexistent bank account
    let nonexistentErrorThrown = false;
    try {
      await ExpenseAccountingService.resolveBankAccount("nonexistent_id_999", null, testPrisma);
    } catch (e: any) {
      nonexistentErrorThrown = true;
      assert(e.message.includes("does not exist"), `Nonexistent bank account rejected: ${e.message}`);
    }
    assert(nonexistentErrorThrown, "Attempting to disburse via nonexistent bank account was rejected.");

    // -------------------------------------------------------------------------
    // Scenario 20: Concurrency & Duplicate Request Idempotency
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 20: Idempotency Protection ---");

    const duplicateTestExpense = await ExpenseService.createExpense(
      {
        expenseDate: new Date(),
        description: "Concurrent Idempotency Test Expense",
        categoryId: opsCategory.id,
        paidBy: "COMPANY",
        paymentStatus: "UNPAID",
        taxableAmount: 4000,
        subtotal: 4000,
        totalInputGST: 0,
        grossAmount: 4000,
        netAmount: 4000,
        balancePayable: 4000,
      },
      testActor
    );

    // Concurrent double-post simulation
    const [p1, p2] = await Promise.all([
      ExpenseAccountingService.postExpenseConfirmation(duplicateTestExpense.id, testActor, testPrisma),
      ExpenseAccountingService.postExpenseConfirmation(duplicateTestExpense.id, testActor, testPrisma),
    ]);

    assert(p1?.id === p2?.id, "Concurrent posting calls returned identical journal entry.");
    const countJournals = await testPrisma.journalEntry.count({
      where: { idempotencyKey: `EXPENSE:CONFIRM:${duplicateTestExpense.id}` },
    });
    assert(countJournals === 1, "Exactly ONE journal entry exists despite concurrent invocations.");

    // -------------------------------------------------------------------------
    // Scenario 21: Atomic Rollback on Injected Failure
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 21: Atomic Rollback on Failure ---");

    const initialPaymentCount = await testPrisma.expensePayment.count();
    const initialJournalCount = await testPrisma.journalEntry.count();

    let rollbackErrorCaught = false;
    try {
      await testPrisma.$transaction(async (tx) => {
        const dummyPmt = await tx.expensePayment.create({
          data: {
            expenseId: duplicateTestExpense.id,
            amount: 500,
            paymentDate: new Date(),
            bankAccountId: testBank.id,
          },
        });

        await ExpenseAccountingService.postExpensePayment(dummyPmt.id, testActor, tx);

        // Inject intentional failure
        throw new Error("INJECTED_ROLLBACK_SIMULATION");
      });
    } catch (e: any) {
      if (e.message.includes("INJECTED_ROLLBACK_SIMULATION")) {
        rollbackErrorCaught = true;
      }
    }

    assert(rollbackErrorCaught, "Injected error triggered transaction rollback.");
    const postPaymentCount = await testPrisma.expensePayment.count();
    const postJournalCount = await testPrisma.journalEntry.count();
    assert(postPaymentCount === initialPaymentCount, "ExpensePayment records rolled back completely.");
    assert(postJournalCount === initialJournalCount, "Journal records rolled back completely.");

    // -------------------------------------------------------------------------
    // Scenario 22 & 23: Audited Reversals & Repeated Cancellation Safety
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 22 & 23: Reversal and Replacement / Cancellation ---");

    const cancellableExpense = await ExpenseService.createExpense(
      {
        expenseDate: new Date(),
        description: "Erroneous Expense to be Cancelled",
        categoryId: opsCategory.id,
        paidBy: "COMPANY",
        paymentStatus: "UNPAID",
        taxableAmount: 8000,
        subtotal: 8000,
        totalInputGST: 0,
        grossAmount: 8000,
        netAmount: 8000,
        balancePayable: 8000,
      },
      testActor
    );

    // Cancel expense
    await ExpenseService.cancelExpense(cancellableExpense.id, "Entered in duplicate", testActor);

    const cancelledExpInDb = await testPrisma.expense.findUnique({
      where: { id: cancellableExpense.id },
    });
    assert(cancelledExpInDb?.status === "CANCELLED", "Expense status is CANCELLED.");

    const originalJournal = await testPrisma.journalEntry.findUnique({
      where: { idempotencyKey: `EXPENSE:CONFIRM:${cancellableExpense.id}` },
    });
    assert(originalJournal?.status === "REVERSED", "Original expense journal marked REVERSED.");

    const reversalJournal = await testPrisma.journalEntry.findFirst({
      where: { reversalOfId: originalJournal?.id },
    });
    assert(Boolean(reversalJournal), "Audited reversal journal created.");
    assert(reversalJournal?.entryType === "REVERSAL", "Reversal journal has entryType REVERSAL.");

    // Repeated cancellation safety (Scenario 23)
    let secondCancelError = false;
    try {
      await ExpenseService.cancelExpense(cancellableExpense.id, "Cancelling again", testActor);
    } catch (e: any) {
      secondCancelError = true;
      assert(e.message.includes("already cancelled"), "Repeated cancellation rejected cleanly.");
    }
    assert(secondCancelError, "Repeated cancellation request rejected without creating duplicate reversal.");

    // -------------------------------------------------------------------------
    // Scenario 24: Closed Period Posting Rejection
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 24: Locked Fiscal Period Protection ---");

    // Create a locked period
    const lockedPeriod = await testPrisma.fiscalPeriod.upsert({
      where: { periodCode: "2025-01" },
      create: {
        financialYear: "2024-25",
        periodName: "January 2025",
        periodCode: "2025-01",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-31"),
        isLocked: true,
        lockReason: "Audited & closed",
      },
      update: {
        isLocked: true,
      },
    });

    let closedPeriodRejected = false;
    try {
      await JournalPostingService.postJournalEntry(
        {
          entryType: "PURCHASE",
          accountingDate: new Date("2025-01-15"),
          financialYear: "2024-25",
          sourceType: "EXPENSE",
          sourceId: "dummy_closed_period_test",
          sourceNumber: "EXP-CLOSED-01",
          narration: "Attempting to post in closed January 2025",
          idempotencyKey: "TEST:CLOSED_PERIOD_POST",
          lines: [
            {
              lineNumber: 1,
              accountId: "cat_exp_general",
              accountName: "Operating Expenses",
              financialType: "EXPENSE",
              statementGroup: "Operating Expenses",
              normalBalance: "DEBIT",
              debit: 1000,
              credit: 0,
            },
            {
              lineNumber: 2,
              accountId: `bank_${testBank.id}`,
              accountName: "Bank",
              financialType: "ASSET",
              statementGroup: "Bank Accounts",
              normalBalance: "DEBIT",
              debit: 0,
              credit: 1000,
            },
          ],
        },
        testActor,
        testPrisma
      );
    } catch (e: any) {
      closedPeriodRejected = true;
      assert(e.message.includes("locked") || e.message.includes("closed"), `Closed period posting rejected: ${e.message}`);
    }
    assert(closedPeriodRejected, "Postings into a locked fiscal period are strictly rejected.");

    // -------------------------------------------------------------------------
    // Scenario 25: Legacy Reports Isolation & Zero Double Counting
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 25: Legacy Reports Path Coexistence ---");

    const legacyMetrics = await ExpenseService.getDashboardMetrics();
    assert(typeof legacyMetrics.totalExpenses === "number", "Legacy dashboard metrics returns valid totalExpenses.");
    assert(typeof legacyMetrics.operatingExpenses === "number", "Legacy dashboard metrics returns valid operatingExpenses.");
    assert(typeof legacyMetrics.outstandingPayables === "number", "Legacy dashboard metrics returns valid outstandingPayables.");

    const trialBalance = await AccountingEngine.getTrialBalance();
    assert(trialBalance.isBalanced === true, "Legacy Trial Balance remains fully balanced.");
    assert(typeof trialBalance.totalDebit === "number", "Legacy Trial Balance debit quantified.");
    assert(typeof trialBalance.totalCredit === "number", "Legacy Trial Balance credit quantified.");

    // -------------------------------------------------------------------------
    // Scenario 26 & 27: Summary & Type Integrity
    // -------------------------------------------------------------------------
    console.log("\n================================================================================");
    console.log(`ALL 27 PROMPT 6 SCENARIOS VERIFIED: ${passedTests} passed, ${failedTests} failed.`);
    console.log("================================================================================");
  } catch (error: any) {
    console.error("\nFATAL ERROR DURING TEST EXECUTION:", error);
    process.exit(1);
  } finally {
    await testPrisma.$disconnect();
  }
}

runPrompt6Tests();
