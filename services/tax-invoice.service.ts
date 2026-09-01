import { prisma } from "@/lib/prisma";
import { PrismaClient, Prisma, TaxInvoiceStatus } from "@prisma/client";
import { FinancialTransactionService } from "./financial-transaction.service";


export class TaxInvoiceService {
  private static async generateInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    
    const latestInvoice = await tx.taxInvoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
    });

    if (!latestInvoice) {
      return `${prefix}0001`;
    }

    const lastSequenceStr = latestInvoice.invoiceNumber.replace(prefix, "");
    const nextSequence = parseInt(lastSequenceStr, 10) + 1;
    return `${prefix}${nextSequence.toString().padStart(4, "0")}`;
  }

  static async getTaxInvoices(params?: { search?: string; status?: TaxInvoiceStatus; customerId?: string }) {
    const { search, status, customerId } = params || {};
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { customerNameSnapshot: { contains: search } },
        { businessNameSnapshot: { contains: search } },
        { gstinSnapshot: { contains: search } },
      ];
    }

    return await prisma.taxInvoice.findMany({
      where,
      include: {
        customer: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getTaxInvoiceById(id: string) {
    return await prisma.taxInvoice.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });
  }

  static async getDashboardMetrics() {
    const invoices = await prisma.taxInvoice.findMany();
    
    return {
      totalCount: invoices.length,
      confirmedCount: invoices.filter(i => i.status === "CONFIRMED").length,
      paidCount: invoices.filter(i => i.status === "PAID").length,
      cancelledCount: invoices.filter(i => i.status === "CANCELLED").length,
      totalValue: invoices.reduce((sum, inv) => sum + Number(inv.netAmount), 0),
    };
  }

  static async convertProformaToTaxInvoice(proformaId: string) {
    // 1. Validate
    const proforma = await prisma.proformaInvoice.findUnique({
      where: { id: proformaId },
      include: {
        customer: true,
        items: {
          include: { product: true }
        }
      }
    });

    if (!proforma) throw new Error("Proforma invoice not found.");
    if (proforma.status === "CANCELLED" || proforma.status === "REJECTED") {
      throw new Error("Cannot convert a cancelled or rejected proforma invoice.");
    }
    if (proforma.status === "CONVERTED") {
      throw new Error("This proforma invoice has already been converted.");
    }

    // Ensure it doesn't already exist (double check)
    const existing = await prisma.taxInvoice.findUnique({
      where: { sourceProformaId: proformaId }
    });
    if (existing) {
      throw new Error(`Already converted to Tax Invoice: ${existing.invoiceNumber}`);
    }

    // 2. Transaction
    return await prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber(tx);

      const taxInvoice = await tx.taxInvoice.create({
        data: {
          invoiceNumber,
          sourceProformaId: proforma.id,
          customerId: proforma.customerId,
          
          // Historical Snapshots for Customer
          customerNameSnapshot: proforma.customer.legalName,
          businessNameSnapshot: proforma.customer.tradeName,
          gstinSnapshot: proforma.customer.gstin,
          stateSnapshot: proforma.customer.state,
          stateCodeSnapshot: proforma.customer.stateCode,
          addressSnapshot: [
            proforma.customer.address, 
            proforma.customer.city, 
            proforma.customer.pinCode
          ].filter(Boolean).join(", "),

          // Financials copied from Proforma
          subtotal: proforma.subtotal,
          totalDiscount: proforma.totalDiscount,
          taxableAmount: Number(proforma.subtotal) - Number(proforma.totalDiscount),
          
          totalCGST: proforma.totalCGST,
          totalSGST: proforma.totalSGST,
          totalIGST: proforma.totalIGST,
          totalGST: proforma.totalTax,
          
          tdsRate: proforma.tdsRate,
          tdsAmount: proforma.tdsAmount,
          
          grossAmount: proforma.grossAmount,
          netAmount: proforma.netAmount,
          
          notes: proforma.notes,
          status: "CONFIRMED",

          items: {
            create: proforma.items.map(item => ({
              productId: item.productId,
              
              // Historical Snapshots for Product
              name: item.product.name,
              description: item.description || item.product.description,
              hsnSacCode: item.product.hsnSacCode,
              
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              
              discountPercent: item.discountPercent,
              discountAmount: Number((Number(item.quantity) * Number(item.unitPrice)) * (Number(item.discountPercent) / 100)),
              
              taxableAmount: item.taxableAmount,
              
              gstRate: item.gstRate,
              cgstAmount: item.cgstAmount,
              sgstAmount: item.sgstAmount,
              igstAmount: item.igstAmount,
              totalGST: item.totalGST,
              
              totalAmount: item.totalAmount
            }))
          }
        }
      });

      // 3. Mark Proforma as Converted
      await tx.proformaInvoice.update({
        where: { id: proformaId },
        data: { status: "CONVERTED" }
      });

      // 4. Create Financial Transaction (Revenue Ledger)
      await FinancialTransactionService.createRevenueTransaction(tx, {
        sourceId: taxInvoice.id,
        transactionDate: taxInvoice.invoiceDate,
        description: `Revenue from Invoice ${taxInvoice.invoiceNumber}`,
        amount: taxInvoice.grossAmount,
        taxableAmount: taxInvoice.taxableAmount,
        totalGST: taxInvoice.totalGST,
        tdsAmount: taxInvoice.tdsAmount,
        netAmount: taxInvoice.netAmount,
      });

      return taxInvoice;
    }, { timeout: 15000 });
  }

  static async cancelTaxInvoice(id: string, reason: string) {
    if (!reason || reason.trim() === "") throw new Error("Cancellation reason is required.");

    const invoice = await prisma.taxInvoice.findUnique({ where: { id } });
    if (!invoice) throw new Error("Tax invoice not found.");
    if (invoice.status === "CANCELLED") throw new Error("Invoice is already cancelled.");
    if (invoice.status === "PAID") throw new Error("Cannot cancel a paid invoice.");

    return await prisma.$transaction(async (tx) => {
      const updatedInvoice = await tx.taxInvoice.update({
        where: { id },
        data: { 
          status: "CANCELLED",
          cancellationReason: reason,
          cancelledAt: new Date(),
        }
      });

      await FinancialTransactionService.deleteTransactionBySource(tx, "TAX_INVOICE", id);

      return updatedInvoice;
    });
  }
}
