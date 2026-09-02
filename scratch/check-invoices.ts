import { prisma } from "../lib/prisma";

async function main() {
  const taxInvoices = await prisma.taxInvoice.findMany({
    select: { id: true, invoiceNumber: true, customer: { select: { customerType: true, legalName: true } }, createdAt: true }
  });
  const proformas = await prisma.proformaInvoice.findMany({
    select: { id: true, invoiceNumber: true, customerType: true, customer: { select: { customerType: true, legalName: true } }, createdAt: true }
  });

  console.log("TAX INVOICES:", JSON.stringify(taxInvoices, null, 2));
  console.log("PROFORMA INVOICES:", JSON.stringify(proformas, null, 2));
}

main().finally(() => prisma.$disconnect());
