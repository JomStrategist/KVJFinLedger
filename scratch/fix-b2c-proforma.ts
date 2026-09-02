import { prisma } from "../lib/prisma";

async function main() {
  const updated = await prisma.proformaInvoice.update({
    where: { id: "6a980b41ec4821ee4861d06c" },
    data: {
      customerType: "B2C",
      invoiceNumber: "KVJ/B2C/26-27/001"
    }
  });

  console.log("Updated Proforma Invoice:", updated.invoiceNumber, updated.customerType);
}

main().finally(() => prisma.$disconnect());
