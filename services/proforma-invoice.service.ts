import { prisma } from "@/lib/prisma";
import { PrismaClient, ProformaInvoiceStatus } from "@prisma/client";
import { TaxEngine } from "@/lib/tax";
import { BUSINESS_LOCATION } from "@/lib/config/business";
import { generateFormattedInvoiceNumber } from "@/lib/invoice-number";


export type CreateProformaInvoiceInput = {
  customerId: string;
  customerType: string;
  financialYear: string;
  invoiceDate: string | Date;
  notes?: string | null;
  isPurchaseOrder?: boolean;
  tdsRate?: number; // overall invoice-level tds rate
  globalGstRate?: number;
  isGlobalGstEnabled?: boolean;
  globalTdsRate?: number;
  isGlobalTdsEnabled?: boolean;
  isGstInclusive?: boolean;
  gstTreatment?: string;
  paymentTerms?: string;
  placeCountry?: string;
  customerGstin?: string;
  customerAddress?: string;
  items: {
    productId: string;
    description?: string | null;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    isGstEnabled: boolean;
    gstRate: number;
    isTdsEnabled: boolean;
    tdsRate: number;
    isIgstEnabled: boolean;
    igstRate: number;
    unit: string;
  }[];
};

export class ProformaInvoiceService {
  private static async generateInvoiceNumber(options?: {
    customerType?: string | null;
    isPurchaseOrder?: boolean;
    date?: Date | string;
  }): Promise<string> {
    return await generateFormattedInvoiceNumber(prisma, 'proformaInvoice', options);
  }

  static async getProformaInvoices(params?: { search?: string; status?: ProformaInvoiceStatus; customerId?: string }) {
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
        { customer: { legalName: { contains: search } } },
        { customer: { tradeName: { contains: search } } },
      ];
    }

    return await prisma.proformaInvoice.findMany({
      where,
      include: {
        customer: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getProformaInvoiceById(id: string) {
    return await prisma.proformaInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          }
        },
      },
    });
  }

  private static async processCalculations(data: CreateProformaInvoiceInput) {
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new Error("Customer not found");

    const isInclusive = Boolean(data.isGstInclusive);
    const appliedRate = data.globalGstRate || 0;

    const mappedItems = data.items.map(item => {
      const rawGross = Number((item.quantity * item.unitPrice).toFixed(2));
      const discountAmount = Number(((rawGross * item.discountPercent) / 100).toFixed(2));
      let taxableAmount = 0;

      if (isInclusive && appliedRate > 0) {
        const inclusiveAfterDiscount = Number((rawGross - discountAmount).toFixed(2));
        taxableAmount = Number((inclusiveAfterDiscount / (1 + appliedRate / 100)).toFixed(2));
      } else {
        taxableAmount = Number((rawGross - discountAmount).toFixed(2));
      }

      return {
        ...item,
        grossAmount: rawGross,
        discountAmount,
        taxableAmount,
      };
    });

    return TaxEngine.calculateInvoiceTaxes({
      items: mappedItems.map(item => ({
        ...item,
        customerState: customer.state || BUSINESS_LOCATION.state,
      })),
      businessState: BUSINESS_LOCATION.state,
      customerState: customer.state || BUSINESS_LOCATION.state, // Fallback to intra-state if customer state is missing

      tdsRate: data.tdsRate || 0,
      globalGstRate: data.globalGstRate,
      isGlobalGstEnabled: data.isGlobalGstEnabled,
      globalTdsRate: data.globalTdsRate,
      isGlobalTdsEnabled: data.isGlobalTdsEnabled,
    });
  }

  static async createProformaInvoiceWithUnits(data: CreateProformaInvoiceInput) {
    const invoiceNumber = await this.generateInvoiceNumber({
      customerType: data.customerType,
      isPurchaseOrder: data.isPurchaseOrder,
      date: data.invoiceDate,
    });
    const calculationResult = await this.processCalculations(data);

    return await prisma.proformaInvoice.create({
      data: {
        invoiceNumber,
        customerId: data.customerId,
        customerType: data.customerType,
        financialYear: data.financialYear,
        invoiceDate: new Date(data.invoiceDate),
        notes: data.notes,
        isPurchaseOrder: data.isPurchaseOrder || false,
        status: "DRAFT",
        
        subtotal: calculationResult.subtotal,
        totalDiscount: calculationResult.totalDiscount,
        totalCGST: calculationResult.totalCGST,
        totalSGST: calculationResult.totalSGST,
        totalIGST: calculationResult.totalIGST,
        totalTax: calculationResult.totalGST,
        tdsRate: calculationResult.tdsRate,
        tdsAmount: calculationResult.tdsAmount,
        grossAmount: calculationResult.grossAmount,
        netAmount: calculationResult.netAmount,
        totalAmount: calculationResult.netAmount, // Backward compatibility for legacy totalAmount

        items: {
          create: calculationResult.calculatedItems.map(item => ({
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            taxableAmount: item.taxableAmount,
            isGstEnabled: item.isGstEnabled,
            gstRate: item.gstRate,
            isTdsEnabled: item.isTdsEnabled,
            tdsRate: item.tdsRate,
            tdsAmount: item.tdsAmount || 0,
            cgstAmount: item.cgstAmount,
            sgstAmount: item.sgstAmount,
            totalGST: item.totalGST,
            totalAmount: item.totalAmount,
          }))
        }
      }
    });
  }

  static async updateProformaInvoice(id: string, data: CreateProformaInvoiceInput) {
    const invoice = await prisma.proformaInvoice.findUnique({ where: { id } });
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be edited.");

    const calculationResult = await this.processCalculations(data);

    return await prisma.$transaction(async (tx) => {
      await tx.proformaInvoiceItem.deleteMany({
        where: { proformaInvoiceId: id }
      });

      return await tx.proformaInvoice.update({
        where: { id },
        data: {
          customerId: data.customerId,
          customerType: data.customerType,
          financialYear: data.financialYear,
          invoiceDate: new Date(data.invoiceDate),
          notes: data.notes,
          isPurchaseOrder: data.isPurchaseOrder || false,
          
          subtotal: calculationResult.subtotal,
          totalDiscount: calculationResult.totalDiscount,
          totalCGST: calculationResult.totalCGST,
          totalSGST: calculationResult.totalSGST,
          totalIGST: calculationResult.totalIGST,
          totalTax: calculationResult.totalGST,
          tdsRate: calculationResult.tdsRate,
          tdsAmount: calculationResult.tdsAmount,
          grossAmount: calculationResult.grossAmount,
          netAmount: calculationResult.netAmount,
          totalAmount: calculationResult.netAmount,

          items: {
            create: calculationResult.calculatedItems.map(item => ({
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              discountPercent: item.discountPercent,
              taxableAmount: item.taxableAmount,
              isGstEnabled: item.isGstEnabled,
              gstRate: item.gstRate,
              isTdsEnabled: item.isTdsEnabled,
              tdsRate: item.tdsRate,
              tdsAmount: item.tdsAmount || 0,
              cgstAmount: item.cgstAmount,
              sgstAmount: item.sgstAmount,
              totalGST: item.totalGST,
              totalAmount: item.totalAmount,
            }))
          }
        }
      });
    });
  }

  static async updateStatus(id: string, status: ProformaInvoiceStatus) {
    return await prisma.proformaInvoice.update({
      where: { id },
      data: { status }
    });
  }
}
