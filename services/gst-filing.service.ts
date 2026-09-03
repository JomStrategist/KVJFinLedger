import { prisma } from "@/lib/prisma";

export type RecordGstFilingInput = {
  financialYear: string;
  returnType?: string;
  period?: string;
  filingDate?: string | Date;
  arn?: string;
  challanNumber?: string;
  taxableTurnover?: number;
  totalOutputGST?: number;
  totalITC?: number;
  netTaxPaid?: number;
  status?: string;
  paymentMode?: string;
  bankAccount?: string;
  notes?: string;
};

export class GstFilingService {
  /**
   * Fetch all GST filings across all financial years
   */
  static async getAllGstFilings() {
    return await prisma.gstFiling.findMany({
      orderBy: { filingDate: "desc" },
    });
  }

  /**
   * Fetch a specific GST filing for a financial year and return type
   */
  static async getGstFiling(financialYear: string, returnType: string = "GSTR-3B") {
    return await prisma.gstFiling.findUnique({
      where: {
        financialYear_returnType: {
          financialYear,
          returnType,
        },
      },
    });
  }

  /**
   * Record or update GST filing status and challan payment
   */
  static async recordGstFiling(data: RecordGstFilingInput) {
    const returnType = data.returnType || "GSTR-3B";
    const filingDate = data.filingDate ? new Date(data.filingDate) : new Date();

    return await prisma.gstFiling.upsert({
      where: {
        financialYear_returnType: {
          financialYear: data.financialYear,
          returnType,
        },
      },
      create: {
        financialYear: data.financialYear,
        returnType,
        period: data.period || "Annual",
        filingDate,
        arn: data.arn || `ARN${Date.now().toString().slice(-10)}`,
        challanNumber: data.challanNumber || null,
        taxableTurnover: Number(data.taxableTurnover || 0),
        totalOutputGST: Number(data.totalOutputGST || 0),
        totalITC: Number(data.totalITC || 0),
        netTaxPaid: Number(data.netTaxPaid || 0),
        status: data.status || "FILED",
        paymentMode: data.paymentMode || "BANK",
        bankAccount: data.bankAccount || "Primary Bank Account",
        notes: data.notes || null,
      },
      update: {
        period: data.period || "Annual",
        filingDate,
        arn: data.arn || undefined,
        challanNumber: data.challanNumber || undefined,
        taxableTurnover: Number(data.taxableTurnover || 0),
        totalOutputGST: Number(data.totalOutputGST || 0),
        totalITC: Number(data.totalITC || 0),
        netTaxPaid: Number(data.netTaxPaid || 0),
        status: data.status || "FILED",
        paymentMode: data.paymentMode || "BANK",
        bankAccount: data.bankAccount || undefined,
        notes: data.notes || undefined,
      },
    });
  }

  /**
   * Reopen / Unfile GST Return (Delete filing record)
   */
  static async deleteGstFiling(id: string) {
    return await prisma.gstFiling.delete({
      where: { id },
    });
  }
}
