import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface StatementLineInput {
  transactionDate: Date | string;
  description: string;
  referenceNo?: string;
  withdrawal?: number;
  deposit?: number;
  balance?: number;
}

export class BankReconciliationService {
  static async getImports(bankAccountId?: string) {
    const where: Prisma.BankStatementImportWhereInput = {};
    if (bankAccountId) where.bankAccountId = bankAccountId;

    return prisma.bankStatementImport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { lines: true }
        }
      }
    });
  }

  static async getImportById(id: string) {
    const imp = await prisma.bankStatementImport.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: { transactionDate: "asc" }
        }
      }
    });

    if (!imp) return null;

    const enrichedLines = await Promise.all(
      imp.lines.map(async (line) => {
        if (line.isReconciled) {
          return { ...line, suggestions: [] };
        }
        const suggestions = await this.findSuggestions(imp.bankAccountId, line);
        return { ...line, suggestions };
      })
    );

    const reconciledCount = imp.lines.filter(l => l.isReconciled).length;

    return {
      ...imp,
      lines: enrichedLines,
      reconciledCount,
      unreconciledCount: imp.lines.length - reconciledCount
    };
  }

  static async createImport(bankAccountId: string, fileName: string, lines: StatementLineInput[]) {
    return prisma.$transaction(async (tx) => {
      const imp = await tx.bankStatementImport.create({
        data: {
          bankAccountId,
          fileName,
          totalRecords: lines.length,
          status: "IN_PROGRESS",
          statementDate: lines.length > 0 ? new Date(lines[lines.length - 1].transactionDate) : new Date(),
          closingBalance: lines.length > 0 ? Number(lines[lines.length - 1].balance || 0) : 0,
          lines: {
            create: lines.map(l => ({
              transactionDate: new Date(l.transactionDate),
              description: l.description,
              referenceNo: l.referenceNo || null,
              withdrawal: Number(l.withdrawal || 0),
              deposit: Number(l.deposit || 0),
              balance: l.balance !== undefined ? Number(l.balance) : null,
              isReconciled: false
            }))
          }
        },
        include: { lines: true }
      });

      return imp;
    });
  }

  /**
   * Suggests possible matching Ledger entries based on amount, date proximity (+/- 14 days), and reference
   */
  static async findSuggestions(bankAccountId: string, line: { transactionDate: Date; withdrawal: number; deposit: number; description: string; referenceNo?: string | null }) {
    const minDate = new Date(line.transactionDate.getTime() - 14 * 24 * 60 * 60 * 1000);
    const maxDate = new Date(line.transactionDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    const suggestions: Array<{
      type: "INVOICE_PAYMENT" | "EXPENSE" | "BANK_TRANSFER";
      id: string;
      reference: string;
      date: Date;
      amount: number;
      partyName: string;
      confidence: "HIGH" | "MEDIUM" | "LOW";
    }> = [];

    // 1. Deposits -> Check Invoice Payments
    if (line.deposit > 0) {
      const payments = await prisma.invoicePayment.findMany({
        where: {
          paymentDate: { gte: minDate, lte: maxDate },
          OR: [{ isCancelled: false }, { isCancelled: null }]
        },
        include: {
          taxInvoice: {
            include: { customer: true }
          }
        }
      });

      for (const p of payments) {
        const pAmt = Number(p.paymentAmount || 0);
        const bAmt = Number(p.bankReceipt || pAmt);
        if (Math.abs(bAmt - line.deposit) < 0.05 || Math.abs(pAmt - line.deposit) < 0.05) {
          const refMatch = line.referenceNo && p.reference && line.referenceNo.toLowerCase().includes(p.reference.toLowerCase());
          suggestions.push({
            type: "INVOICE_PAYMENT",
            id: p.id,
            reference: p.taxInvoice.invoiceNumber,
            date: p.paymentDate,
            amount: bAmt,
            partyName: p.taxInvoice.customerNameSnapshot || p.taxInvoice.customer?.legalName || "Customer",
            confidence: refMatch ? "HIGH" : "MEDIUM"
          });
        }
      }
    }

    // 2. Withdrawals -> Check Expenses and Bank Transfers
    if (line.withdrawal > 0) {
      const expenses = await prisma.expense.findMany({
        where: {
          expenseDate: { gte: minDate, lte: maxDate },
          status: "APPROVED",
          paymentStatus: { in: ["PAID", "PARTIALLY_PAID"] }
        },
        include: { vendor: true, employee: true }
      });

      for (const e of expenses) {
        const paid = Number(e.paidAmount || e.netAmount || 0);
        if (Math.abs(paid - line.withdrawal) < 0.05) {
          const party = e.paidBy === "EMPLOYEE" 
            ? (e.employee?.name || "Employee")
            : (e.vendor?.businessName || e.vendor?.name || "Vendor");
          suggestions.push({
            type: "EXPENSE",
            id: e.id,
            reference: e.expenseNumber,
            date: e.expenseDate,
            amount: paid,
            partyName: party,
            confidence: "MEDIUM"
          });
        }
      }

      const transfers = await prisma.bankTransfer.findMany({
        where: {
          date: { gte: minDate, lte: maxDate }
        }
      });

      for (const t of transfers) {
        const amt = Number(t.amount || 0);
        if (Math.abs(amt - line.withdrawal) < 0.05) {
          suggestions.push({
            type: "BANK_TRANSFER",
            id: t.id,
            reference: t.reference || "Contra Transfer",
            date: t.date,
            amount: amt,
            partyName: t.toAccount,
            confidence: "HIGH"
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * User confirms a match
   */
  static async confirmMatch(lineId: string, matchedType: string, matchedId: string, matchedNotes?: string) {
    const updatedLine = await prisma.bankStatementLine.update({
      where: { id: lineId },
      data: {
        isReconciled: true,
        matchedType,
        matchedId,
        matchedNotes: matchedNotes || null,
        reconciledAt: new Date()
      }
    });

    // Check if entire import is reconciled
    const remainingUnreconciled = await prisma.bankStatementLine.count({
      where: { importId: updatedLine.importId, isReconciled: false }
    });

    if (remainingUnreconciled === 0) {
      await prisma.bankStatementImport.update({
        where: { id: updatedLine.importId },
        data: { status: "RECONCILED" }
      });
    }

    return updatedLine;
  }

  /**
   * User rejects or unlinks a match
   */
  static async unmatchLine(lineId: string) {
    const updatedLine = await prisma.bankStatementLine.update({
      where: { id: lineId },
      data: {
        isReconciled: false,
        matchedType: null,
        matchedId: null,
        matchedNotes: null,
        reconciledAt: null
      }
    });

    await prisma.bankStatementImport.update({
      where: { id: updatedLine.importId },
      data: { status: "IN_PROGRESS" }
    });

    return updatedLine;
  }

  static async deleteImport(id: string) {
    return prisma.bankStatementImport.delete({
      where: { id }
    });
  }
}
