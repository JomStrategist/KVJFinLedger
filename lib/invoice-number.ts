import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Calculates the short 2-digit Indian Financial Year string (e.g., "26-27")
 * Financial year in India runs from April 1 to March 31.
 */
export function getFinancialYearShortCode(dateInput: Date | string = new Date()): string {
  const date = new Date(dateInput);
  const validDate = isNaN(date.getTime()) ? new Date() : date;
  const month = validDate.getMonth(); // 0 = Jan, 3 = April
  const year = validDate.getFullYear();
  let fyStart = year;
  if (month < 3) { // Jan, Feb, Mar belong to previous FY
    fyStart = year - 1;
  }
  const fyEnd = fyStart + 1;
  const startShort = (fyStart % 100).toString().padStart(2, '0');
  const endShort = (fyEnd % 100).toString().padStart(2, '0');
  return `${startShort}-${endShort}`;
}

/**
 * Determines the category type code for invoice numbering (e.g. B2B, B2C, EXP, PO)
 */
export function getInvoiceTypeCode(params?: {
  customerType?: string | null;
  gstin?: string | null;
  isPurchaseOrder?: boolean;
}): string {
  if (params?.isPurchaseOrder) {
    return 'PO';
  }
  const type = params?.customerType?.toUpperCase();
  if (type === 'B2B_EXPORT' || type === 'EXPORT' || type === 'EXP') {
    return 'EXP';
  }
  if (type === 'B2C') {
    return 'B2C';
  }
  return 'B2B';
}

/**
 * Generates sequential invoice number in the format: KVJ/{TYPE}/{FY}/{SEQ}
 * Example: KVJ/B2B/26-27/001
 */
export async function generateFormattedInvoiceNumber(
  db: PrismaClient | Prisma.TransactionClient,
  modelName: 'taxInvoice' | 'proformaInvoice',
  options?: {
    customerType?: string | null;
    gstin?: string | null;
    isPurchaseOrder?: boolean;
    date?: Date | string;
  }
): Promise<string> {
  const typeCode = getInvoiceTypeCode(options);
  const fyCode = getFinancialYearShortCode(options?.date);
  const prefix = `KVJ/${typeCode}/${fyCode}/`;

  let existingInvoiceNumbers: { invoiceNumber: string }[] = [];

  if (modelName === 'taxInvoice') {
    existingInvoiceNumbers = await (db as any).taxInvoice.findMany({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      select: {
        invoiceNumber: true,
      },
    });
  } else {
    existingInvoiceNumbers = await (db as any).proformaInvoice.findMany({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      select: {
        invoiceNumber: true,
      },
    });
  }

  let maxSeq = 0;
  for (const item of existingInvoiceNumbers) {
    const parts = item.invoiceNumber.split('/');
    const lastPart = parts[parts.length - 1];
    const num = parseInt(lastPart, 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }

  const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
  return `${prefix}${nextSeq}`;
}
