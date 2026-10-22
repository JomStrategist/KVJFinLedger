import { prisma } from "@/lib/prisma";
import { BankingStatutoryAccountingService } from "./banking-statutory-accounting.service";
import { ActorContext } from "./journal-posting.service";
import { AuditService } from "./audit.service";
import { AccountingEngine } from "./accounting-engine.service";

export type RecordTdsDepositInput = {
  financialYear: string;
  quarter?: string;
  section?: string;
  challanNumber: string;
  bsrCode?: string;
  challanSerial?: string;
  depositDate?: string | Date;
  amountPaid: number;
  bankAccount?: string;
  bankAccountId?: string;
  notes?: string;
  expenseIds?: string[];
};

export class TdsDepositService {
  /**
   * Fetch all TDS deposits across all financial years
   */
  static async getAllTdsDeposits() {
    return await prisma.tdsDeposit.findMany({
      orderBy: { depositDate: "desc" },
    });
  }

  static async getTdsDepositById(id: string) {
    return await prisma.tdsDeposit.findUnique({
      where: { id },
    });
  }

  /**
   * Record a TDS Challan ITNS 281 deposit
   */
  static async recordTdsDeposit(data: RecordTdsDepositInput, actor?: ActorContext) {
    const depositDate = data.depositDate ? new Date(data.depositDate) : new Date();
    const amountPaid = Number(data.amountPaid || 0);

    if (amountPaid <= 0) {
      throw new Error("InvalidTdsDepositAmountError: TDS deposit amount must be greater than zero.");
    }

    const bank = await BankingStatutoryAccountingService.resolveBankAccount(
      data.bankAccountId,
      data.bankAccount,
      prisma
    );

    return await prisma.$transaction(async (tx) => {
      const deposit = await tx.tdsDeposit.create({
        data: {
          financialYear: data.financialYear,
          quarter: data.quarter || "Annual",
          section: data.section || "194J",
          challanNumber: data.challanNumber,
          bsrCode: data.bsrCode || null,
          challanSerial: data.challanSerial || null,
          depositDate,
          amountPaid,
          status: "PAID",
          bankAccount: `${bank.bankName} (${bank.accountName || "Current"})`,
          bankAccountId: bank.id,
          notes: data.notes || null,
        },
      });

      // Update linked expense records
      if (data.expenseIds && data.expenseIds.length > 0) {
        await tx.expense.updateMany({
          where: { id: { in: data.expenseIds } },
          data: {
            tdsPaymentStatus: "PAID",
            tdsPaidDate: depositDate,
            tdsChallanNumber: data.challanNumber,
          },
        });
      }

      // Post persistent General Ledger journal entry atomically
      await BankingStatutoryAccountingService.postTdsDeposit(deposit.id, actor, tx);

      // Audit Log
      await AuditService.logEvent(
        {
          actorId: actor?.id || null,
          actorName: actor?.name || "TDS Service",
          actorEmail: actor?.email || "system@kvjfinledger.internal",
          action: "RECORD_TDS_DEPOSIT",
          entity: "TdsDeposit",
          entityId: deposit.id,
          afterState: {
            id: deposit.id,
            amountPaid: deposit.amountPaid,
            challanNumber: deposit.challanNumber,
            bankAccountId: bank.id,
          },
          changeSummary: `Recorded TDS Challan ITNS 281 deposit of ₹${deposit.amountPaid} (Challan: ${deposit.challanNumber})`,
        },
        tx
      );

      AccountingEngine.invalidateCache();
      return deposit;
    });
  }

  /**
   * Mark a single expense's TDS as paid
   */
  static async markExpenseTdsPaid(expenseId: string, challanNumber: string, paidDate?: string | Date) {
    const d = paidDate ? new Date(paidDate) : new Date();
    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        tdsPaymentStatus: "PAID",
        tdsPaidDate: d,
        tdsChallanNumber: challanNumber,
      },
    });
    AccountingEngine.invalidateCache();
    return updated;
  }

  /**
   * Delete / Reopen a TDS deposit
   */
  static async deleteTdsDeposit(id: string, actor?: ActorContext) {
    const existing = await prisma.tdsDeposit.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`TdsDepositNotFound: TDS deposit '${id}' does not exist.`);
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Reverse persistent General Ledger journal entry cleanly
      await BankingStatutoryAccountingService.reverseTdsDeposit(
        id,
        "TDS deposit deleted or reopened",
        actor,
        tx
      );

      // 2. Revert any linked expenses back to PENDING status
      if (existing.challanNumber) {
        await tx.expense.updateMany({
          where: { tdsChallanNumber: existing.challanNumber },
          data: {
            tdsPaymentStatus: "PENDING",
            tdsPaidDate: null,
            tdsChallanNumber: null,
          },
        });
      }

      // 3. Delete deposit record
      const deleted = await tx.tdsDeposit.delete({
        where: { id },
      });

      // Audit Log
      await AuditService.logEvent(
        {
          actorId: actor?.id || null,
          actorName: actor?.name || "TDS Service",
          actorEmail: actor?.email || "system@kvjfinledger.internal",
          action: "DELETE_TDS_DEPOSIT",
          entity: "TdsDeposit",
          entityId: id,
          beforeState: { id: existing.id, amountPaid: existing.amountPaid, challanNumber: existing.challanNumber },
          changeSummary: `Deleted TDS deposit ${id} of ₹${existing.amountPaid}`,
        },
        tx
      );

      AccountingEngine.invalidateCache();
      return deleted;
    });
  }
}
