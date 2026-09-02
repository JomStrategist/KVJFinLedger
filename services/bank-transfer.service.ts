import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export class BankTransferService {
  static async getBankTransfers() {
    try {
        const transfers = await prisma.bankTransfer.findMany({
          orderBy: { date: "desc" },
        });
        return transfers;
      }
    } catch (e) {
      // Fallback to raw query
    }

    try {
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id", "date", "fromAccount", "toAccount", "amount", "reference", "description", "createdAt", "updatedAt" FROM "BankTransfer" ORDER BY "date" DESC`
      );
      return rows || [];
    } catch (err) {
      return [];
    }
  }

  static async createBankTransfer(data: {
    date: Date;
    fromAccount: string;
    toAccount: string;
    amount: number;
    reference?: string;
    description?: string;
  }) {
    const id = crypto.randomUUID();
    try {
      if ((prisma as any).bankTransfer?.create) {
        return await (prisma as any).bankTransfer.create({
          data: {
            id,
            date: data.date,
            fromAccount: data.fromAccount,
            toAccount: data.toAccount,
            amount: data.amount,
            reference: data.reference || null,
            description: data.description || null,
          },
        });
      }
    } catch (e) {
      // Fallback
    }

    await prisma.$queryRawUnsafe(
      `INSERT INTO "BankTransfer" ("id", "date", "fromAccount", "toAccount", "amount", "reference", "description", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      id,
      data.date,
      data.fromAccount,
      data.toAccount,
      data.amount,
      data.reference || null,
      data.description || null
    );

    return { id, ...data };
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
    }
  ) {
    try {
      if ((prisma as any).bankTransfer?.update) {
        return await (prisma as any).bankTransfer.update({
          where: { id },
          data: {
            date: data.date,
            fromAccount: data.fromAccount,
            toAccount: data.toAccount,
            amount: data.amount,
            reference: data.reference || null,
            description: data.description || null,
          },
        });
      }
    } catch (e) {
      // Fallback
    }

    await prisma.$queryRawUnsafe(
      `UPDATE "BankTransfer" SET "date" = $1, "fromAccount" = $2, "toAccount" = $3, "amount" = $4, "reference" = $5, "description" = $6, "updatedAt" = NOW() WHERE "id" = $7`,
      data.date,
      data.fromAccount,
      data.toAccount,
      data.amount,
      data.reference || null,
      data.description || null,
      id
    );

    return { id, ...data };
  }

  static async deleteBankTransfer(id: string) {
    try {
      if ((prisma as any).bankTransfer?.delete) {
        return await (prisma as any).bankTransfer.delete({ where: { id } });
      }
    } catch (e) {
      // Fallback
    }

    await prisma.$queryRawUnsafe(`DELETE FROM "BankTransfer" WHERE "id" = $1`, id);
    return { id };
  }
}
