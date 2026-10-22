import { prisma } from "@/lib/prisma";
import { AccountingEngine } from "./accounting-engine.service";
import { BankingStatutoryAccountingService } from "./banking-statutory-accounting.service";
import { ActorContext } from "./journal-posting.service";
import { AuditService } from "./audit.service";

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
      orderBy: { paymentDate: "desc" },
    });
  }

  static async getSettlementById(id: string) {
    return prisma.gstSettlement.findUnique({
      where: { id },
    });
  }

  static async createSettlement(data: CreateGstSettlementInput, actor?: ActorContext) {
    const cgstPaid = Number(data.cgstPaid || 0);
    const sgstPaid = Number(data.sgstPaid || 0);
    const igstPaid = Number(data.igstPaid || 0);
    const totalPaid = Math.round((cgstPaid + sgstPaid + igstPaid) * 100) / 100;
    const itcCgst = Number(data.itcCgstUtilized || 0);
    const itcSgst = Number(data.itcSgstUtilized || 0);
    const itcIgst = Number(data.itcIgstUtilized || 0);

    if (totalPaid === 0 && itcCgst === 0 && itcSgst === 0 && itcIgst === 0) {
      throw new Error("ZeroSettlementError: Settlement cannot have both zero payment and zero ITC utilization.");
    }

    return await prisma.$transaction(async (tx) => {
      const count = await tx.gstSettlement.count();
      const settlementNumber = `GST-SETTLE-${new Date().getFullYear()}-${(count + 1).toString().padStart(3, "0")}`;

      const settlement = await tx.gstSettlement.create({
        data: {
          settlementNumber,
          returnPeriod: data.returnPeriod,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          cgstPaid,
          sgstPaid,
          igstPaid,
          totalPaid,
          itcCgstUtilized: itcCgst,
          itcSgstUtilized: itcSgst,
          itcIgstUtilized: itcIgst,
          bankAccountId: data.bankAccountId || null,
          challanRef: data.challanRef || null,
          notes: data.notes || null,
        },
      });

      // Post General Ledger journal entry atomically
      await BankingStatutoryAccountingService.postGstSettlement(settlement.id, actor, tx);

      // Audit Log
      await AuditService.logEvent(
        {
          actorId: actor?.id || null,
          actorName: actor?.name || "GST Service",
          actorEmail: actor?.email || "system@kvjfinledger.internal",
          action: "CREATE_GST_SETTLEMENT",
          entity: "GstSettlement",
          entityId: settlement.id,
          afterState: {
            id: settlement.id,
            returnPeriod: settlement.returnPeriod,
            totalPaid: settlement.totalPaid,
            itcUtilized: itcCgst + itcSgst + itcIgst,
          },
          changeSummary: `Recorded GST settlement ${settlement.settlementNumber} for ${settlement.returnPeriod} (Paid: ₹${totalPaid}, ITC: ₹${itcCgst + itcSgst + itcIgst})`,
        },
        tx
      );

      AccountingEngine.invalidateCache();
      return settlement;
    });
  }

  static async deleteSettlement(id: string, actor?: ActorContext) {
    const existing = await prisma.gstSettlement.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`GstSettlementNotFound: GST Settlement '${id}' does not exist.`);
    }

    return await prisma.$transaction(async (tx) => {
      // Reverse persistent General Ledger journal entry cleanly
      await BankingStatutoryAccountingService.reverseGstSettlement(
        id,
        "GST settlement deleted or reopened",
        actor,
        tx
      );

      const res = await tx.gstSettlement.delete({ where: { id } });

      // Audit Log
      await AuditService.logEvent(
        {
          actorId: actor?.id || null,
          actorName: actor?.name || "GST Service",
          actorEmail: actor?.email || "system@kvjfinledger.internal",
          action: "DELETE_GST_SETTLEMENT",
          entity: "GstSettlement",
          entityId: id,
          beforeState: { id: existing.id, totalPaid: existing.totalPaid, returnPeriod: existing.returnPeriod },
          changeSummary: `Deleted GST settlement ${existing.settlementNumber} for ${existing.returnPeriod}`,
        },
        tx
      );

      AccountingEngine.invalidateCache();
      return res;
    });
  }
}
