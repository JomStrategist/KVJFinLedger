import { prisma } from "@/lib/prisma";
import { AccountingEngine } from "./accounting-engine.service";
import { BankingStatutoryAccountingService } from "./banking-statutory-accounting.service";
import { ActorContext } from "./journal-posting.service";
import { AuditService } from "./audit.service";
import { roundToPaisa } from "@/lib/utils/currency";

export interface CreateLoanInput {
  loanNumber?: string;
  lenderName: string;
  loanType?: string;
  principalAmount: number;
  interestRate?: number;
  disbursementDate?: Date | string;
  bankAccountId?: string;
  notes?: string;
}

export interface RecordRepaymentInput {
  loanId: string;
  paymentDate?: Date | string;
  principalAmount: number;
  interestAmount: number;
  totalAmount?: number;
  bankAccountId?: string;
  reference?: string;
  notes?: string;
}

export class LoanService {
  static async getLoans() {
    const loans = await prisma.loan.findMany({
      include: {
        repayments: {
          orderBy: { paymentDate: "desc" },
        },
      },
      orderBy: { disbursementDate: "desc" },
    });

    return loans.map((loan) => {
      const totalPrincipalRepaid = roundToPaisa(
        loan.repayments.reduce((sum, r) => sum + Number(r.principalAmount || 0), 0)
      );
      const totalInterestPaid = roundToPaisa(
        loan.repayments.reduce((sum, r) => sum + Number(r.interestAmount || 0), 0)
      );
      const outstandingPrincipal = Math.max(0, roundToPaisa(Number(loan.principalAmount) - totalPrincipalRepaid));

      return {
        ...loan,
        totalPrincipalRepaid,
        totalInterestPaid,
        outstandingPrincipal,
        isFullyRepaid: outstandingPrincipal === 0,
      };
    });
  }

  static async getLoanById(id: string) {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        repayments: {
          orderBy: { paymentDate: "asc" },
        },
      },
    });

    if (!loan) return null;

    const totalPrincipalRepaid = roundToPaisa(
      loan.repayments.reduce((sum, r) => sum + Number(r.principalAmount || 0), 0)
    );
    const totalInterestPaid = roundToPaisa(
      loan.repayments.reduce((sum, r) => sum + Number(r.interestAmount || 0), 0)
    );
    const outstandingPrincipal = Math.max(0, roundToPaisa(Number(loan.principalAmount) - totalPrincipalRepaid));

    return {
      ...loan,
      totalPrincipalRepaid,
      totalInterestPaid,
      outstandingPrincipal,
      isFullyRepaid: outstandingPrincipal === 0,
    };
  }

  static async createLoan(data: CreateLoanInput, actor?: ActorContext) {
    const principalAmount = roundToPaisa(Number(data.principalAmount));
    if (principalAmount <= 0) {
      throw new Error("InvalidLoanPrincipalError: Loan principal amount must be greater than zero.");
    }

    const bank = await BankingStatutoryAccountingService.resolveBankAccount(
      data.bankAccountId,
      null,
      prisma
    );

    return await prisma.$transaction(async (tx) => {
      let loanNumber = data.loanNumber;
      if (!loanNumber) {
        const count = await tx.loan.count();
        loanNumber = `LOAN-${new Date().getFullYear()}-${(count + 1).toString().padStart(3, "0")}`;
      }

      const loan = await tx.loan.create({
        data: {
          loanNumber,
          lenderName: data.lenderName,
          loanType: data.loanType || "TERM_LOAN",
          principalAmount,
          interestRate: Number(data.interestRate || 0),
          disbursementDate: data.disbursementDate ? new Date(data.disbursementDate) : new Date(),
          bankAccountId: bank.id,
          notes: data.notes || null,
          status: "ACTIVE",
        },
      });

      // Post persistent General Ledger drawdown journal atomically
      await BankingStatutoryAccountingService.postLoanDrawdown(loan.id, actor, tx);

      // Audit Log
      await AuditService.logEvent(
        {
          actorId: actor?.id || null,
          actorName: actor?.name || "Loan Service",
          actorEmail: actor?.email || "system@kvjfinledger.internal",
          action: "CREATE_LOAN",
          entity: "Loan",
          entityId: loan.id,
          afterState: {
            loanNumber: loan.loanNumber,
            lenderName: loan.lenderName,
            principalAmount: loan.principalAmount,
            bankAccountId: bank.id,
          },
          changeSummary: `Created loan ${loan.loanNumber} from ${loan.lenderName} for ₹${loan.principalAmount}`,
        },
        tx
      );

      AccountingEngine.invalidateCache();
      return loan;
    });
  }

  static async recordRepayment(data: RecordRepaymentInput, actor?: ActorContext) {
    const loan = await prisma.loan.findUnique({
      where: { id: data.loanId },
      include: { repayments: true },
    });

    if (!loan) throw new Error("Loan not found");

    const pAmount = roundToPaisa(Number(data.principalAmount || 0));
    const iAmount = roundToPaisa(Number(data.interestAmount || 0));
    const totAmount = roundToPaisa(Number(data.totalAmount || (pAmount + iAmount)));

    if (pAmount < 0 || iAmount < 0) {
      throw new Error("InvalidRepaymentAmountError: Principal and interest amounts cannot be negative.");
    }

    if (totAmount <= 0) {
      throw new Error("ZeroRepaymentError: Total repayment amount must be greater than zero.");
    }

    if (roundToPaisa(pAmount + iAmount) !== totAmount) {
      throw new Error(`RepaymentSplitMismatchError: Sum of principal (₹${pAmount}) and interest (₹${iAmount}) does not match total amount (₹${totAmount}).`);
    }

    // Check outstanding principal limit
    const existingPrincipalRepaid = roundToPaisa(
      loan.repayments.reduce((sum, r) => sum + Number(r.principalAmount || 0), 0)
    );
    const outstandingBefore = Math.max(0, roundToPaisa(Number(loan.principalAmount) - existingPrincipalRepaid));

    if (pAmount > outstandingBefore) {
      throw new Error(`ExcessPrincipalRepaymentError: Principal repayment ₹${pAmount} exceeds remaining outstanding loan balance ₹${outstandingBefore}.`);
    }

    const bank = await BankingStatutoryAccountingService.resolveBankAccount(
      data.bankAccountId,
      loan.bankAccountId,
      prisma
    );

    return await prisma.$transaction(async (tx) => {
      const repayment = await tx.loanRepayment.create({
        data: {
          loanId: data.loanId,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          principalAmount: pAmount,
          interestAmount: iAmount,
          totalAmount: totAmount,
          bankAccountId: bank.id,
          reference: data.reference || null,
          notes: data.notes || null,
        },
      });

      // Check if fully repaid
      const totalPrincipalRepaid = roundToPaisa(existingPrincipalRepaid + pAmount);
      if (totalPrincipalRepaid >= Number(loan.principalAmount)) {
        await tx.loan.update({
          where: { id: data.loanId },
          data: { status: "CLOSED" },
        });
      }

      // Post persistent General Ledger repayment journal atomically
      await BankingStatutoryAccountingService.postLoanRepayment(repayment.id, actor, tx);

      // Audit Log
      await AuditService.logEvent(
        {
          actorId: actor?.id || null,
          actorName: actor?.name || "Loan Service",
          actorEmail: actor?.email || "system@kvjfinledger.internal",
          action: "RECORD_LOAN_REPAYMENT",
          entity: "LoanRepayment",
          entityId: repayment.id,
          afterState: {
            loanId: loan.id,
            principalAmount: pAmount,
            interestAmount: iAmount,
            totalAmount: totAmount,
            remainingPrincipal: Math.max(0, roundToPaisa(Number(loan.principalAmount) - totalPrincipalRepaid)),
          },
          changeSummary: `Recorded repayment of ₹${totAmount} (Principal: ₹${pAmount}, Interest: ₹${iAmount}) on loan ${loan.loanNumber}`,
        },
        tx
      );

      AccountingEngine.invalidateCache();
      return repayment;
    });
  }

  static async deleteRepayment(repaymentId: string, actor?: ActorContext) {
    const existing = await prisma.loanRepayment.findUnique({
      where: { id: repaymentId },
      include: { loan: true },
    });

    if (!existing) {
      throw new Error(`LoanRepaymentNotFound: Repayment record '${repaymentId}' does not exist.`);
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Reverse persistent General Ledger journal entry cleanly
      await BankingStatutoryAccountingService.reverseLoanRepayment(
        repaymentId,
        "Loan repayment deleted",
        actor,
        tx
      );

      // 2. If loan was CLOSED, reopen to ACTIVE
      if (existing.loan.status === "CLOSED") {
        await tx.loan.update({
          where: { id: existing.loanId },
          data: { status: "ACTIVE" },
        });
      }

      const deleted = await tx.loanRepayment.delete({
        where: { id: repaymentId },
      });

      // Audit Log
      await AuditService.logEvent(
        {
          actorId: actor?.id || null,
          actorName: actor?.name || "Loan Service",
          actorEmail: actor?.email || "system@kvjfinledger.internal",
          action: "DELETE_LOAN_REPAYMENT",
          entity: "LoanRepayment",
          entityId: repaymentId,
          beforeState: { id: existing.id, principalAmount: existing.principalAmount, totalAmount: existing.totalAmount },
          changeSummary: `Deleted repayment ${repaymentId} of ₹${existing.totalAmount}`,
        },
        tx
      );

      AccountingEngine.invalidateCache();
      return deleted;
    });
  }

  static async deleteLoan(id: string, actor?: ActorContext) {
    const repaymentsCount = await prisma.loanRepayment.count({ where: { loanId: id } });
    if (repaymentsCount > 0) {
      throw new Error(`Cannot delete loan with ${repaymentsCount} repayments recorded.`);
    }

    const existing = await prisma.loan.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`LoanNotFound: Loan '${id}' does not exist.`);
    }

    return await prisma.$transaction(async (tx) => {
      // Find drawdown journal and reverse it
      const originalJournal = await tx.journalEntry.findFirst({
        where: {
          sourceType: "LOAN_RECEIPT",
          sourceId: id,
          status: "POSTED",
        },
      });

      if (originalJournal) {
        const { JournalPostingService } = await import("./journal-posting.service");
        await JournalPostingService.reverseJournalEntry(
          {
            originalEntryId: originalJournal.id,
            reason: "Loan cancelled or deleted",
            actor: actor || { id: "loan_service", name: "Loan Service", email: "loan@kvj.local" },
          },
          tx
        );
      }

      const res = await tx.loan.delete({ where: { id } });

      // Audit Log
      await AuditService.logEvent(
        {
          actorId: actor?.id || null,
          actorName: actor?.name || "Loan Service",
          actorEmail: actor?.email || "system@kvjfinledger.internal",
          action: "DELETE_LOAN",
          entity: "Loan",
          entityId: id,
          beforeState: { id: existing.id, loanNumber: existing.loanNumber, principalAmount: existing.principalAmount },
          changeSummary: `Deleted loan ${existing.loanNumber} of ₹${existing.principalAmount}`,
        },
        tx
      );

      AccountingEngine.invalidateCache();
      return res;
    });
  }
}
