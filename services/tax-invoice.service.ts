import { prisma } from "@/lib/prisma";
import { PrismaClient, Prisma, TaxInvoiceStatus } from "@prisma/client";
import { FinancialTransactionService } from "./financial-transaction.service";
import { generateFormattedInvoiceNumber } from "@/lib/invoice-number";
import { ProformaInvoiceService, CreateProformaInvoiceInput } from "./proforma-invoice.service";
import { AccountingEngine } from "./accounting-engine.service";

export class TaxInvoiceService {
  private static async generateInvoiceNumber(
    tx: Prisma.TransactionClient,
    options?: { customerType?: string | null; gstin?: string | null; date?: Date | string }
  ): Promise<string> {
    return await generateFormattedInvoiceNumber(tx, 'taxInvoice', options);
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

    try {
      return await prisma.taxInvoice.findMany({
        where,
        include: {
          customer: true,
          items: true,
          payments: {
            orderBy: { paymentDate: "asc" }
          }
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.warn("TaxInvoiceService.getTaxInvoices DB fetch error:", error);
      return [];
    }
  }

  static async getTaxInvoiceById(id: string) {
    try {
      return await prisma.taxInvoice.findUnique({
        where: { id },
        include: {
          items: true,
          customer: true,
          payments: {
            orderBy: { paymentDate: "asc" }
          }
        },
      });
    } catch (error) {
      console.warn("TaxInvoiceService.getTaxInvoiceById DB fetch error:", error);
      return null;
    }
  }

  static async recordPayment(
    invoiceId: string,
    data: {
      paymentDate: string | Date;
      paymentAmount: number;
      isTdsDeducted: boolean;
      tdsRate: number;
      tdsAmount: number;
      bankReceipt: number;
      reference?: string;
      remarks?: string;
    }
  ) {
    const invoice = await prisma.taxInvoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true }
    });

    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status === "CANCELLED") throw new Error("Cannot record payment for a cancelled invoice.");

    const payment = await prisma.$transaction(async (tx) => {
      // 1. Create payment record
      const payment = await tx.invoicePayment.create({
        data: {
          taxInvoiceId: invoiceId,
          paymentDate: new Date(data.paymentDate),
          paymentAmount: data.paymentAmount,
          isTdsDeducted: data.isTdsDeducted,
          tdsRate: data.tdsRate || 0,
          tdsAmount: data.tdsAmount || 0,
          bankReceipt: data.bankReceipt,
          reference: data.reference || null,
          remarks: data.remarks || null,
        }
      });

      // 2. Compute total settlements (exclude cancelled payments)
      const activeExisting = invoice.payments.filter((p: any) => !p.isCancelled);
      const allPayments = [...activeExisting, payment];
      const totalPaidAmount = allPayments.reduce((sum: number, p: any) => sum + Number(p.paymentAmount), 0);
      const totalSettled = totalPaidAmount;

      const invoiceTotal = Number(invoice.grossAmount);
      let newStatus: TaxInvoiceStatus = "CONFIRMED";
      if (totalSettled >= invoiceTotal - 0.5 && totalSettled > 0) { // allow 50 paisa rounding tolerance
        newStatus = "PAID";
      } else if (totalSettled > 0) {
        newStatus = "PARTIALLY_PAID";
      }

      // 3. Update invoice status
      await tx.taxInvoice.update({
        where: { id: invoiceId },
        data: { status: newStatus }
      });

      // 4. Update corresponding FinancialTransaction status
      const ftStatus = newStatus === "PAID" ? "PAID" : newStatus === "PARTIALLY_PAID" ? "PARTIALLY_PAID" : "UNPAID";
      await tx.financialTransaction.updateMany({
        where: { sourceId: invoiceId, sourceType: "TAX_INVOICE" },
        data: { paymentStatus: ftStatus }
      });

      return payment;
    });

    AccountingEngine.invalidateCache();
    return payment;
  }

  static async updatePayment(
    paymentId: string,
    data: {
      paymentDate: string | Date;
      paymentAmount: number;
      isTdsDeducted: boolean;
      tdsRate: number;
      tdsAmount: number;
      bankReceipt: number;
      reference?: string;
      remarks?: string;
    }
  ) {
    const existingPayment = await prisma.invoicePayment.findUnique({
      where: { id: paymentId },
      include: { taxInvoice: true }
    });
    if (!existingPayment) throw new Error("Payment record not found.");
    const invoiceId = existingPayment.taxInvoiceId;

    const res = await prisma.$transaction(async (tx) => {
      await tx.invoicePayment.update({
        where: { id: paymentId },
        data: {
          paymentDate: new Date(data.paymentDate),
          paymentAmount: data.paymentAmount,
          isTdsDeducted: data.isTdsDeducted,
          tdsRate: data.tdsRate || 0,
          tdsAmount: data.tdsAmount || 0,
          bankReceipt: data.bankReceipt,
          reference: data.reference || null,
          remarks: data.remarks || null,
        }
      });

      const allPayments = (await tx.invoicePayment.findMany({ where: { taxInvoiceId: invoiceId } })).filter((p: any) => !p.isCancelled);
      const totalPaidAmount = allPayments.reduce((sum: number, p: any) => sum + Number(p.paymentAmount), 0);
      const invoiceTotal = Number(existingPayment.taxInvoice.grossAmount);

      let newStatus: TaxInvoiceStatus = "CONFIRMED";
      if (totalPaidAmount >= invoiceTotal - 0.5 && totalPaidAmount > 0) {
        newStatus = "PAID";
      } else if (totalPaidAmount > 0) {
        newStatus = "PARTIALLY_PAID";
      }

      await tx.taxInvoice.update({
        where: { id: invoiceId },
        data: { status: newStatus }
      });

      const ftStatus = newStatus === "PAID" ? "PAID" : newStatus === "PARTIALLY_PAID" ? "PARTIALLY_PAID" : "UNPAID";
      await tx.financialTransaction.updateMany({
        where: { sourceId: invoiceId, sourceType: "TAX_INVOICE" },
        data: { paymentStatus: ftStatus }
      });

      return { success: true };
    });

    AccountingEngine.invalidateCache();
    return res;
  }

  static async cancelPayment(paymentId: string, reason?: string) {
    const existingPayment = await prisma.invoicePayment.findUnique({
      where: { id: paymentId },
      include: { taxInvoice: true }
    });
    if (!existingPayment) throw new Error("Payment record not found.");
    if (existingPayment.isCancelled) throw new Error("Payment is already cancelled.");
    const invoiceId = existingPayment.taxInvoiceId;

    const res = await prisma.$transaction(async (tx) => {
      await tx.invoicePayment.update({
        where: { id: paymentId },
        data: {
          isCancelled: true,
          cancelledAt: new Date(),
          cancellationReason: reason || "Cancelled by user"
        }
      });

      const allPayments = (await tx.invoicePayment.findMany({ where: { taxInvoiceId: invoiceId } })).filter((p: any) => !p.isCancelled && p.id !== paymentId);
      const totalPaidAmount = allPayments.reduce((sum: number, p: any) => sum + Number(p.paymentAmount), 0);
      const invoiceTotal = Number(existingPayment.taxInvoice.grossAmount);

      let newStatus: TaxInvoiceStatus = "CONFIRMED";
      if (totalPaidAmount >= invoiceTotal - 0.5 && totalPaidAmount > 0) {
        newStatus = "PAID";
      } else if (totalPaidAmount > 0) {
        newStatus = "PARTIALLY_PAID";
      }

      await tx.taxInvoice.update({
        where: { id: invoiceId },
        data: { status: newStatus }
      });

      const ftStatus = newStatus === "PAID" ? "PAID" : newStatus === "PARTIALLY_PAID" ? "PARTIALLY_PAID" : "UNPAID";
      await tx.financialTransaction.updateMany({
        where: { sourceId: invoiceId, sourceType: "TAX_INVOICE" },
        data: { paymentStatus: ftStatus }
      });

      return { success: true };
    });

    AccountingEngine.invalidateCache();
    return res;
  }

  static async deletePayment(paymentId: string) {
    const existingPayment = await prisma.invoicePayment.findUnique({
      where: { id: paymentId },
      include: { taxInvoice: true }
    });
    if (!existingPayment) throw new Error("Payment record not found.");
    const invoiceId = existingPayment.taxInvoiceId;

    const res = await prisma.$transaction(async (tx) => {
      await tx.invoicePayment.delete({ where: { id: paymentId } });

      const allPayments = (await tx.invoicePayment.findMany({ where: { taxInvoiceId: invoiceId } })).filter((p: any) => !p.isCancelled);
      const totalPaidAmount = allPayments.reduce((sum: number, p: any) => sum + Number(p.paymentAmount), 0);
      const invoiceTotal = Number(existingPayment.taxInvoice.grossAmount);

      let newStatus: TaxInvoiceStatus = "CONFIRMED";
      if (totalPaidAmount >= invoiceTotal - 0.5 && totalPaidAmount > 0) {
        newStatus = "PAID";
      } else if (totalPaidAmount > 0) {
        newStatus = "PARTIALLY_PAID";
      }

      await tx.taxInvoice.update({
        where: { id: invoiceId },
        data: { status: newStatus }
      });

      const ftStatus = newStatus === "PAID" ? "PAID" : newStatus === "PARTIALLY_PAID" ? "PARTIALLY_PAID" : "UNPAID";
      await tx.financialTransaction.updateMany({
        where: { sourceId: invoiceId, sourceType: "TAX_INVOICE" },
        data: { paymentStatus: ftStatus }
      });

      return { success: true };
    });

    AccountingEngine.invalidateCache();
    return res;
  }

  static async deleteTaxInvoice(id: string) {
    const invoice = await prisma.taxInvoice.findUnique({
      where: { id },
      include: { payments: true }
    });
    if (!invoice) throw new Error("Tax invoice not found.");
    const activePayments = invoice.payments.filter((p: any) => !p.isCancelled);
    if (activePayments.length > 0) {
      throw new Error("Cannot delete invoice with existing payment activity. Delete or cancel payments first, or cancel the invoice.");
    }

    const res = await prisma.$transaction(async (tx) => {
      await tx.taxInvoiceItem.deleteMany({ where: { taxInvoiceId: id } });
      await tx.invoicePayment.deleteMany({ where: { taxInvoiceId: id } });
      await FinancialTransactionService.deleteTransactionBySource(tx, "TAX_INVOICE", id);
      return await tx.taxInvoice.delete({ where: { id } });
    });

    AccountingEngine.invalidateCache();
    return res;
  }

  static async getDashboardMetrics() {
    try {
      const invoices = await prisma.taxInvoice.findMany();
      
      return {
        totalCount: invoices.length,
        confirmedCount: invoices.filter(i => i.status === "CONFIRMED").length,
        paidCount: invoices.filter(i => i.status === "PAID").length,
        cancelledCount: invoices.filter(i => i.status === "CANCELLED").length,
        totalValue: invoices.reduce((sum, inv) => sum + Number(inv.netAmount), 0),
      };
    } catch (error) {
      console.warn("TaxInvoiceService.getDashboardMetrics DB fetch error:", error);
      return {
        totalCount: 0,
        confirmedCount: 0,
        paidCount: 0,
        cancelledCount: 0,
        totalValue: 0,
      };
    }
  }

  static async convertProformaToTaxInvoice(proformaId: string) {
    // 1. Validate
    const proforma = await prisma.proformaInvoice.findUnique({
      where: { id: proformaId },
      include: {
        customer: true,
        items: {
          include: { product: true, incomeCategory: true }
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
    const primaryBank = await prisma.bankAccount.findFirst({ where: { isPrimary: true, isActive: true } });
    const bankAcc = proforma.bankAccountId
      ? (await prisma.bankAccount.findUnique({ where: { id: proforma.bankAccountId } })) || primaryBank
      : primaryBank;

    const res = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber(tx, {
        customerType: proforma.customer.customerType,
        gstin: proforma.customer.gstin,
        date: proforma.invoiceDate,
      });

      const taxInvoice = await tx.taxInvoice.create({
        data: {
          invoiceNumber,
          sourceProformaId: proforma.id,
          customerId: proforma.customerId,
          
          // Bank Snapshots
          bankAccountId: bankAcc?.id || null,
          accountNameSnapshot: proforma.accountNameSnapshot || bankAcc?.accountName || "KVJ Analytics",
          bankNameSnapshot: proforma.bankNameSnapshot || bankAcc?.bankName || "Federal Bank",
          branchSnapshot: proforma.branchSnapshot || bankAcc?.branch || "Kakkanad Branch",
          accountNumberSnapshot: proforma.accountNumberSnapshot || bankAcc?.accountNumber || "15240200004512",
          ifscSnapshot: proforma.ifscSnapshot || bankAcc?.ifsc || "FDRL0001524",

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
          poNumber: proforma.poNumber || null,
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
              
              totalAmount: item.totalAmount,
              incomeCategoryId: item.incomeCategoryId || null,
              categoryNameSnapshot: item.categoryNameSnapshot || item.incomeCategory?.name || null,
              categoryCodeSnapshot: item.categoryCodeSnapshot || item.incomeCategory?.code || null,
              statementGroupSnapshot: item.statementGroupSnapshot || item.incomeCategory?.statementGroup || null,
              financialTypeSnapshot: item.financialTypeSnapshot || item.incomeCategory?.financialType || "INCOME",
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
    AccountingEngine.invalidateCache();
    return res;
  }

  static async createTaxInvoice(data: any) {
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new Error("Customer not found.");

    const primaryBank = await prisma.bankAccount.findFirst({ where: { isPrimary: true, isActive: true } });
    const bankAcc = data.bankAccountId
      ? (await prisma.bankAccount.findUnique({ where: { id: data.bankAccountId } })) || primaryBank
      : primaryBank;

    const res = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber(tx, {
        customerType: customer.customerType,
        gstin: customer.gstin,
        date: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
      });

      const taxInvoice = await tx.taxInvoice.create({
        data: {
          invoiceNumber,
          customerId: customer.id,
          invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
          
          bankAccountId: bankAcc?.id || null,
          accountNameSnapshot: bankAcc?.accountName || "KVJ Analytics",
          bankNameSnapshot: bankAcc?.bankName || "Federal Bank",
          branchSnapshot: bankAcc?.branch || "Kakkanad Branch",
          accountNumberSnapshot: bankAcc?.accountNumber || "15240200004512",
          ifscSnapshot: bankAcc?.ifsc || "FDRL0001524",

          customerNameSnapshot: customer.legalName,
          businessNameSnapshot: customer.tradeName,
          gstinSnapshot: customer.gstin,
          stateSnapshot: customer.state,
          stateCodeSnapshot: customer.stateCode,
          addressSnapshot: [customer.address, customer.city, customer.pinCode].filter(Boolean).join(", "),

          subtotal: Number(data.subtotal || 0),
          totalDiscount: Number(data.totalDiscount || 0),
          taxableAmount: Number(data.taxableAmount || (Number(data.subtotal || 0) - Number(data.totalDiscount || 0))),
          
          totalCGST: Number(data.totalCGST || 0),
          totalSGST: Number(data.totalSGST || 0),
          totalIGST: Number(data.totalIGST || 0),
          totalGST: Number(data.totalGST || data.totalTax || 0),
          
          tdsRate: Number(data.tdsRate || 0),
          tdsAmount: Number(data.tdsAmount || 0),
          
          grossAmount: Number(data.grossAmount || 0),
          netAmount: Number(data.netAmount || 0),
          
          notes: data.notes || null,
          poNumber: data.poNumber || null,
          status: "CONFIRMED",

          items: {
            create: (data.items || []).map((item: any) => ({
              productId: item.productId || null,
              name: item.name || "Service",
              description: item.description || null,
              hsnSacCode: item.hsnSacCode || null,
              quantity: Number(item.quantity || 1),
              unit: item.unit || "Unit",
              unitPrice: Number(item.unitPrice || 0),
              discountPercent: Number(item.discountPercent || 0),
              discountAmount: Number(item.discountAmount || 0),
              taxableAmount: Number(item.taxableAmount || 0),
              gstRate: Number(item.gstRate || 0),
              cgstAmount: Number(item.cgstAmount || 0),
              sgstAmount: Number(item.sgstAmount || 0),
              igstAmount: Number(item.igstAmount || 0),
              totalGST: Number(item.totalGST || 0),
              totalAmount: Number(item.totalAmount || 0),
              incomeCategoryId: item.incomeCategoryId || null,
            }))
          }
        }
      });

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

    AccountingEngine.invalidateCache();
    return res;
  }

  static async cancelTaxInvoice(id: string, reason: string) {
    if (!reason || reason.trim() === "") throw new Error("Cancellation reason is required.");

    const invoice = await prisma.taxInvoice.findUnique({ where: { id } });
    if (!invoice) throw new Error("Tax invoice not found.");
    if (invoice.status === "CANCELLED") throw new Error("Invoice is already cancelled.");
    if (invoice.status === "PAID") throw new Error("Cannot cancel a paid invoice.");

    const res = await prisma.$transaction(async (tx) => {
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

    AccountingEngine.invalidateCache();
    return res;
  }

  static async updateTaxInvoice(id: string, data: CreateProformaInvoiceInput) {
    const invoice = await prisma.taxInvoice.findUnique({
      where: { id },
      include: { payments: true }
    });
    if (!invoice) throw new Error("Tax invoice not found.");
    if (invoice.status === "CANCELLED") throw new Error("Cannot edit a cancelled invoice.");

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new Error("Customer not found.");

    const calculationResult = await ProformaInvoiceService.processCalculations(data);

    const res = await prisma.$transaction(async (tx) => {
      await tx.taxInvoiceItem.deleteMany({
        where: { taxInvoiceId: id }
      });

      const productIds = calculationResult.calculatedItems.map(i => i.productId);
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      const productMap = new Map(products.map(p => [p.id, p]));

      const updated = await tx.taxInvoice.update({
        where: { id },
        data: {
          customerId: data.customerId,
          customerNameSnapshot: customer.legalName,
          businessNameSnapshot: customer.tradeName,
          gstinSnapshot: customer.gstin,
          stateSnapshot: customer.state,
          stateCodeSnapshot: customer.stateCode,
          addressSnapshot: [customer.address, customer.city, customer.pinCode].filter(Boolean).join(", "),

          invoiceDate: new Date(data.invoiceDate),
          notes: data.notes,
          poNumber: data.poNumber || null,

          subtotal: calculationResult.subtotal,
          totalDiscount: calculationResult.totalDiscount,
          taxableAmount: Number(calculationResult.subtotal) - Number(calculationResult.totalDiscount),
          totalCGST: calculationResult.totalCGST,
          totalSGST: calculationResult.totalSGST,
          totalIGST: calculationResult.totalIGST,
          totalGST: calculationResult.totalGST,
          tdsRate: calculationResult.tdsRate,
          tdsAmount: calculationResult.tdsAmount,
          grossAmount: calculationResult.grossAmount,
          netAmount: calculationResult.netAmount,

          items: {
            create: calculationResult.calculatedItems.map(item => {
              const prod = productMap.get(item.productId);
              return {
                productId: item.productId,
                name: prod?.name || "Item",
                description: item.description || prod?.description || "",
                hsnSacCode: prod?.hsnSacCode || "998311",
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
                totalAmount: item.totalAmount,
                incomeCategoryId: item.incomeCategoryId || null,
                categoryNameSnapshot: item.categoryNameSnapshot || null,
                categoryCodeSnapshot: item.categoryCodeSnapshot || null,
                statementGroupSnapshot: item.statementGroupSnapshot || null,
                financialTypeSnapshot: item.financialTypeSnapshot || "INCOME",
              };
            })
          }
        }
      });

      const allPayments = await tx.invoicePayment.findMany({ where: { taxInvoiceId: id } });
      const totalPaidAmount = allPayments.reduce((sum, p) => sum + Number(p.paymentAmount), 0);
      const invoiceTotal = Number(calculationResult.grossAmount);

      let newStatus: TaxInvoiceStatus = "CONFIRMED";
      if (totalPaidAmount >= invoiceTotal - 0.5 && totalPaidAmount > 0) {
        newStatus = "PAID";
      } else if (totalPaidAmount > 0) {
        newStatus = "PARTIALLY_PAID";
      }

      await tx.taxInvoice.update({
        where: { id },
        data: { status: newStatus }
      });

      const ftStatus = newStatus === "PAID" ? "PAID" : newStatus === "PARTIALLY_PAID" ? "PARTIALLY_PAID" : "UNPAID";
      await tx.financialTransaction.updateMany({
        where: { sourceId: id, sourceType: "TAX_INVOICE" },
        data: {
          transactionDate: new Date(data.invoiceDate),
          amount: calculationResult.grossAmount,
          taxableAmount: Number(calculationResult.subtotal) - Number(calculationResult.totalDiscount),
          totalGST: calculationResult.totalGST,
          tdsAmount: calculationResult.tdsAmount,
          netAmount: calculationResult.netAmount,
          paymentStatus: ftStatus,
        }
      });

      return updated;
    }, { timeout: 15000 });

    AccountingEngine.invalidateCache();
    return res;
  }
}
