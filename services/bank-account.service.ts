import { prisma } from "@/lib/prisma";

export type CreateBankAccountInput = {
  accountName: string;
  bankName: string;
  branch?: string | null;
  accountNumber: string;
  ifsc: string;
  isPrimary?: boolean;
  isActive?: boolean;
};

export type UpdateBankAccountInput = Partial<CreateBankAccountInput>;

export class BankAccountService {
  static async getBankAccounts() {
    try {
      return await prisma.bankAccount.findMany({
        orderBy: [
          { isPrimary: "desc" },
          { createdAt: "asc" },
        ],
      });
    } catch (error) {
      console.warn("BankAccountService.getBankAccounts error:", error);
      return [];
    }
  }

  static async getActiveBankAccounts() {
    try {
      return await prisma.bankAccount.findMany({
        where: { isActive: true },
        orderBy: [
          { isPrimary: "desc" },
          { createdAt: "asc" },
        ],
      });
    } catch (error) {
      console.warn("BankAccountService.getActiveBankAccounts error:", error);
      return [];
    }
  }

  static async getPrimaryBankAccount() {
    try {
      const primary = await prisma.bankAccount.findFirst({
        where: { isPrimary: true, isActive: true },
      });
      if (primary) return primary;
      // Fallback to first active account if no explicit primary
      return await prisma.bankAccount.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      });
    } catch (error) {
      console.warn("BankAccountService.getPrimaryBankAccount error:", error);
      return null;
    }
  }

  static async createBankAccount(data: CreateBankAccountInput) {
    if (data.isPrimary) {
      await prisma.bankAccount.updateMany({
        where: { isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const count = await prisma.bankAccount.count();
    const isFirst = count === 0;

    return await prisma.bankAccount.create({
      data: {
        accountName: data.accountName,
        bankName: data.bankName,
        branch: data.branch || null,
        accountNumber: data.accountNumber,
        ifsc: data.ifsc,
        isPrimary: Boolean(data.isPrimary || isFirst),
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  static async updateBankAccount(id: string, data: UpdateBankAccountInput) {
    if (data.isPrimary) {
      await prisma.bankAccount.updateMany({
        where: { id: { not: id }, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return await prisma.bankAccount.update({
      where: { id },
      data: {
        ...(data.accountName && { accountName: data.accountName }),
        ...(data.bankName && { bankName: data.bankName }),
        ...(data.branch !== undefined && { branch: data.branch }),
        ...(data.accountNumber && { accountNumber: data.accountNumber }),
        ...(data.ifsc && { ifsc: data.ifsc }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  static async setPrimaryBankAccount(id: string) {
    await prisma.bankAccount.updateMany({
      where: { isPrimary: true },
      data: { isPrimary: false },
    });

    return await prisma.bankAccount.update({
      where: { id },
      data: { isPrimary: true, isActive: true },
    });
  }

  static async deleteBankAccount(id: string) {
    return await prisma.bankAccount.delete({
      where: { id },
    });
  }
}
