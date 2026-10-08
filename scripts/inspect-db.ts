import { prisma } from "../lib/prisma";

async function inspectDb() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true } });
  const customers = await prisma.customer.findMany({ select: { id: true, legalName: true, gstin: true, customerType: true } });
  const vendors = await prisma.vendor.findMany({ select: { id: true, name: true, businessName: true, gstin: true } });
  const employees = await prisma.employee.findMany({ select: { id: true, name: true, employeeCode: true, department: true } });
  const bankAccounts = await prisma.bankAccount.findMany({ select: { id: true, accountName: true, accountNumber: true, isPrimary: true, isActive: true } });
  
  const taxInvoices = await prisma.taxInvoice.findMany({
    select: {
      id: true,
      invoiceNumber: true,
      customerId: true,
      customerNameSnapshot: true,
      invoiceDate: true,
      status: true,
      grossAmount: true,
      netAmount: true,
      payments: { select: { id: true, paymentAmount: true, paymentDate: true } },
      items: { select: { id: true, name: true, taxableAmount: true, totalGST: true } },
    }
  });

  const proformaInvoices = await prisma.proformaInvoice.findMany({
    select: {
      id: true,
      invoiceNumber: true,
      customerId: true,
      invoiceDate: true,
      status: true,
      totalAmount: true,
      customer: { select: { legalName: true, gstin: true } }
    }
  });

  const expenses = await prisma.expense.findMany({
    select: {
      id: true,
      expenseNumber: true,
      expenseDate: true,
      vendorId: true,
      vendor: { select: { name: true } },
      paidBy: true,
      employeeId: true,
      employee: { select: { name: true } },
      grossAmount: true,
      netAmount: true,
      paidAmount: true,
      paymentStatus: true,
      items: { select: { id: true, categoryNameSnapshot: true, taxableAmount: true, totalGST: true, gstRate: true, totalAmount: true } }
    }
  });

  const bankTransfers = await prisma.bankTransfer.findMany();
  const openingBalances = await prisma.openingBalance.findMany();
  const gstFilings = await prisma.gstFiling.findMany();
  const tdsDeposits = await prisma.tdsDeposit.findMany();
  const loans = await prisma.loan.findMany();
  const gstSettlements = await prisma.gstSettlement.findMany();
  const financialTransactions = await prisma.financialTransaction.findMany();
  const products = await prisma.product.findMany({ select: { id: true, name: true } });
  const categories = await prisma.expenseCategory.findMany({ select: { id: true, name: true, financialType: true } });

  console.log(JSON.stringify({
    users,
    customers,
    vendors,
    employees,
    bankAccounts,
    taxInvoices,
    proformaInvoices,
    expenses,
    counts: {
      users: users.length,
      customers: customers.length,
      vendors: vendors.length,
      employees: employees.length,
      bankAccounts: bankAccounts.length,
      taxInvoices: taxInvoices.length,
      proformaInvoices: proformaInvoices.length,
      expenses: expenses.length,
      bankTransfers: bankTransfers.length,
      openingBalances: openingBalances.length,
      gstFilings: gstFilings.length,
      tdsDeposits: tdsDeposits.length,
      loans: loans.length,
      gstSettlements: gstSettlements.length,
      financialTransactions: financialTransactions.length,
      products: products.length,
      categories: categories.length,
    },
    openingBalances,
    bankTransfers
  }, null, 2));

  await prisma.$disconnect();
}

inspectDb().catch((err) => {
  console.error("Error inspecting DB:", err);
  process.exit(1);
});
