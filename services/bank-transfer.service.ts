import { prisma } from "@/lib/prisma";
import { BankingStatutoryAccountingService } from "./banking-statutory-accounting.service";
import { ActorContext } from "./journal-posting.service";
import { AuditService } from "./audit.service";
import { AccountingEngine } from "./accounting-engine.service";

export class BankTransferService {
  static async getBankTransfers() {
    try {
      return await prisma.bankTransfer.findMany({
        orderBy: { date: "desc" },
      });
    } catch (e) {
      console.error("Error fetching bank transfers:", e);
      return [];
    }
  }

  static async getBankTransferById(id: string) {
    try {
      return await prisma.bankTransfer.findUnique({
        where: { id },
      });
    } catch (e) {
      console.error("Error fetching bank transfer:", e);
      return null;
    }
  }

  static async createBankTransfer(
    data: {
      date: Date;
      fromAccount: string;
      toAccount: string;
      amount: number;
      reference?: string;
      description?: string;
      fromAccountId?: string;
      toAccountId?: string;
    },
    actor?: ActorContext
  ) {
    // Pre-validate accounts before transaction
    const fromBank = await BankingStatutoryAccountingService.resolveBankAccount(
      data.fromAccountId,
      data.fromAccount,
      prisma
    );
    const toBank = await BankingStatutoryAccountingService.resolveBankAccount(
      data.toAccountId,
      data.toAccount,
      prisma
    );

    if (fromBank.id === toBank.id) {
      throw new Error("IdenticalAccountTransferError: Source and destination bank accounts must be different.");
    }

    if (Number(data.amount) <= 0) {
      throw new Error("InvalidTransferAmountError: Transfer amount must be greater than zero.");
    }

    return await prisma.$transaction(async (tx) => {
      const transfer = await tx.bankTransfer.create({
        data: {
          date: data.date,
          fromAccount: `${fromBank.bankName} (${fromBank.accountName || fromBank.accountNumber})`,
          toAccount: `${toBank.bankName} (${toBank.accountName || toBank.accountNumber})`,
          fromAccountId: fromBank.id,
          toAccountId: toBank.id,
          amount: Number(data.amount),
          reference: data.reference || null,
          description: data.description || null,
          status: "COMPLETED",
        },
      });

      // Post Contra journal entry in General Ledger atomically
      await BankingStatutoryAccountingService.postBankTransfer(transfer.id, actor, tx);

      // Audit Log
      await AuditService.logEvent(
        {
          actorId: actor?.id || null,
          actorName: actor?.name || "Banking Service",
          actorEmail: actor?.email || "system@kvjfinledger.internal",
          action: "CREATE_BANK_TRANSFER",
          entity: "BankTransfer",
          entityId: transfer.id,
          afterState: {
            id: transfer.id,
            amount: transfer.amount,
            fromAccountId: fromBank.id,
            toAccountId: toBank.id,
          },
          changeSummary: `Recorded inter-bank transfer of ₹${transfer.amount} from ${fromBank.bankName} to ${toBank.bankName}`,
        },
        tx
      );

      AccountingEngine.invalidateCache();
      return transfer;
    });
  }

  static async updateBankTransfer(
    id: string,
    data: {
      date: Date;
      fromAccount: string;
      toAccount: string;
      amount: number;
      reference?: string;
      description?: string;
      fromAccountId?: string;
      toAccountId?: string;
    },
    actor?: ActorContext
  ) {
    const existing = await prisma.bankTransfer.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`BankTransferNotFound: Bank transfer '${id}' does not exist.`);
    }

    const fromBank = await BankingStatutoryAccountingService.resolveBankAccount(
      data.fromAccountId,
      data.fromAccount,
      prisma
    );
    const toBank = await BankingStatutoryAccountingService.resolveBankAccount(
      data.toAccountId,
      data.toAccount,
      prisma
    );

    if (fromBank.id === toBank.id) {
      throw new Error("IdenticalAccountTransferError: Source and destination bank accounts must be different.");
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Reverse previous journal
      await BankingStatutoryAccountingService.reverseBankTransfer(
        id,
        "Reversed due to bank transfer modification",
        actor,
        tx
      );

      // 2. Update transfer record
      const updated = await tx.bankTransfer.update({
        where: { id },
        data: {
          date: data.date,
          fromAccount: `${fromBank.bankName} (${fromBank.accountName || fromBank.accountNumber})`,
          toAccount: `${toBank.bankName} (${toBank.accountName || toBank.accountNumber})`,
          fromAccountId: fromBank.id,
          toAccountId: toBank.id,
          amount: Number(data.amount),
          reference: data.reference || null,
          description: data.description || null,
          status: "COMPLETED",
        },
      });

      // 3. Post revised journal
      await BankingStatutoryAccountingService.postBankTransfer(id, actor, tx);

      // Audit Log
      await AuditService.logEvent(
        {
          actorId: actor?.id || null,
          actorName: actor?.name || "Banking Service",
          actorEmail: actor?.email || "system@kvjfinledger.internal",
          action: "UPDATE_BANK_TRANSFER",
          entity: "BankTransfer",
          entityId: id,
          beforeState: { amount: existing.amount, fromAccount: existing.fromAccount, toAccount: existing.toAccount },
          afterState: { amount: updated.amount, fromAccount: updated.fromAccount, toAccount: updated.toAccount },
          changeSummary: `Updated bank transfer ${id} amount to ₹${updated.amount}`,
        },
        tx
      );

      AccountingEngine.invalidateCache();
      return updated;
    });
  }

  static async deleteBankTransfer(id: string, actor?: ActorContext) {
    const existing = await prisma.bankTransfer.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`BankTransferNotFound: Bank transfer '${id}' does not exist.`);
    }

    return await prisma.$transaction(async (tx) => {
      // Reverse persistent General Ledger journal entry cleanly
      await BankingStatutoryAccountingService.reverseBankTransfer(
        id,
        "Bank transfer record deleted",
        actor,
        tx
      );

      const deleted = await tx.bankTransfer.delete({
        where: { id },
      });

      // Audit Log
      await AuditService.logEvent(
        {
          actorId: actor?.id || null,
          actorName: actor?.name || "Banking Service",
          actorEmail: actor?.email || "system@kvjfinledger.internal",
          action: "DELETE_BANK_TRANSFER",
          entity: "BankTransfer",
          entityId: id,
          beforeState: { id: existing.id, amount: existing.amount },
          changeSummary: `Deleted bank transfer ${id} of ₹${existing.amount}`,
        },
        tx
      );

      AccountingEngine.invalidateCache();
      return deleted;
    });
  }
}
