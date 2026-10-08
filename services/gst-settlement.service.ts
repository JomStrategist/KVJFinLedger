import { prisma } from "@/lib/prisma";
import { AccountingEngine } from "./accounting-engine.service";

export interface CreateGstSettlementInput {
  returnPeriod: string;
  paymentDate?: Date | string;
  cgstPaid: number;
  sgstPaid: number;
  igstPaid: number;
  itcCgstUtilized?: number;
  itcSgstUtilized?: number;
  itcIgstUtilized?: number;
  bankAccountId?: string;
  challanRef?: string;
  notes?: string;
}

export class GstSettlementService {
  static async getSettlements() {
    return prisma.gstSettlement.findMany({
      orderBy: { paymentDate: "desc" }
    });
  }

  static async getSettlementById(id: string) {
    return prisma.gstSettlement.findUnique({
      where: { id }
    });
  }

  static async createSettlement(data: CreateGstSettlementInput) {
    const count = await prisma.gstSettlement.count();
    const settlementNumber = `GST-SETTLE-${new Date().getFullYear()}-${(count + 1).toString().padStart(3, "0")}`;

    const cgstPaid = Number(data.cgstPaid || 0);
    const sgstPaid = Number(data.sgstPaid || 0);
    const igstPaid = Number(data.igstPaid || 0);
    const totalPaid = Math.round((cgstPaid + sgstPaid + igstPaid) * 100) / 100;

    const settlement = await prisma.gstSettlement.create({
      data: {
        settlementNumber,
        returnPeriod: data.returnPeriod,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        cgstPaid,
        sgstPaid,
        igstPaid,
        totalPaid,
        itcCgstUtilized: Number(data.itcCgstUtilized || 0),
        itcSgstUtilized: Number(data.itcSgstUtilized || 0),
        itcIgstUtilized: Number(data.itcIgstUtilized || 0),
        bankAccountId: data.bankAccountId || null,
        challanRef: data.challanRef || null,
        notes: data.notes || null
      }
    });

    AccountingEngine.invalidateCache();
    return settlement;
  }

  static async deleteSettlement(id: string) {
    const res = await prisma.gstSettlement.delete({ where: { id } });
    AccountingEngine.invalidateCache();
    return res;
  }
}
