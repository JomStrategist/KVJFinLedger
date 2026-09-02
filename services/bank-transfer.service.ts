import { prisma } from "@/lib/prisma";

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

  static async createBankTransfer(data: {
    date: Date;
    fromAccount: string;
    toAccount: string;
    amount: number;
    reference?: string;
    description?: string;
  }) {
    return await prisma.bankTransfer.create({
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
    return await prisma.bankTransfer.update({
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

  static async deleteBankTransfer(id: string) {
    return await prisma.bankTransfer.delete({
      where: { id },
    });
  }
}
