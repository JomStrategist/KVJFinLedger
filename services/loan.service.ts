import { prisma } from "@/lib/prisma";
import { AccountingEngine } from "./accounting-engine.service";

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
          orderBy: { paymentDate: "desc" }
        }
      },
      orderBy: { disbursementDate: "desc" }
    });

    return loans.map(loan => {
      const totalPrincipalRepaid = loan.repayments.reduce((sum, r) => sum + Number(r.principalAmount || 0), 0);
      const totalInterestPaid = loan.repayments.reduce((sum, r) => sum + Number(r.interestAmount || 0), 0);
      const outstandingPrincipal = Math.max(0, Number(loan.principalAmount) - totalPrincipalRepaid);

      return {
        ...loan,
        totalPrincipalRepaid,
        totalInterestPaid,
        outstandingPrincipal: Math.round(outstandingPrincipal * 100) / 100,
        isFullyRepaid: outstandingPrincipal === 0
      };
    });
  }

  static async getLoanById(id: string) {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        repayments: {
          orderBy: { paymentDate: "asc" }
        }
      }
    });

    if (!loan) return null;

    const totalPrincipalRepaid = loan.repayments.reduce((sum, r) => sum + Number(r.principalAmount || 0), 0);
    const totalInterestPaid = loan.repayments.reduce((sum, r) => sum + Number(r.interestAmount || 0), 0);
    const outstandingPrincipal = Math.max(0, Number(loan.principalAmount) - totalPrincipalRepaid);

    return {
      ...loan,
      totalPrincipalRepaid,
      totalInterestPaid,
      outstandingPrincipal: Math.round(outstandingPrincipal * 100) / 100,
      isFullyRepaid: outstandingPrincipal === 0
    };
  }

  static async createLoan(data: CreateLoanInput) {
    let loanNumber = data.loanNumber;
    if (!loanNumber) {
      const count = await prisma.loan.count();
      loanNumber = `LOAN-${new Date().getFullYear()}-${(count + 1).toString().padStart(3, "0")}`;
    }

    const loan = await prisma.loan.create({
      data: {
        loanNumber,
        lenderName: data.lenderName,
        loanType: data.loanType || "TERM_LOAN",
        principalAmount: Number(data.principalAmount),
        interestRate: Number(data.interestRate || 0),
        disbursementDate: data.disbursementDate ? new Date(data.disbursementDate) : new Date(),
        bankAccountId: data.bankAccountId || null,
        notes: data.notes || null,
        status: "ACTIVE"
      }
    });

    AccountingEngine.invalidateCache();
    return loan;
  }

  static async recordRepayment(data: RecordRepaymentInput) {
    const loan = await prisma.loan.findUnique({
      where: { id: data.loanId },
      include: { repayments: true }
    });

    if (!loan) throw new Error("Loan not found");

    const pAmount = Number(data.principalAmount || 0);
    const iAmount = Number(data.interestAmount || 0);
    const totAmount = Number(data.totalAmount || (pAmount + iAmount));

    const repayment = await prisma.loanRepayment.create({
      data: {
        loanId: data.loanId,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        principalAmount: pAmount,
        interestAmount: iAmount,
        totalAmount: totAmount,
        bankAccountId: data.bankAccountId || loan.bankAccountId || null,
        reference: data.reference || null,
        notes: data.notes || null
      }
    });

    // Check if fully repaid
    const totalPrincipalRepaid = loan.repayments.reduce((sum, r) => sum + Number(r.principalAmount || 0), 0) + pAmount;
    if (totalPrincipalRepaid >= Number(loan.principalAmount)) {
      await prisma.loan.update({
        where: { id: data.loanId },
        data: { status: "CLOSED" }
      });
    }

    AccountingEngine.invalidateCache();
    return repayment;
  }

  static async deleteLoan(id: string) {
    const repaymentsCount = await prisma.loanRepayment.count({ where: { loanId: id } });
    if (repaymentsCount > 0) {
      throw new Error(`Cannot delete loan with ${repaymentsCount} repayments recorded.`);
    }

    const res = await prisma.loan.delete({ where: { id } });
    AccountingEngine.invalidateCache();
    return res;
  }
}
