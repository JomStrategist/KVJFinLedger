import { AccountingEngine } from "./accounting-engine.service";

export interface JournalLineItem {
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
}

export interface JournalVoucher {
  id: string;
  date: Date;
  voucherType: "Sales" | "Receipt" | "Payment" | "Contra" | "Journal";
  voucherNumber: string;
  narration: string;
  reference?: string | null;
  sourceUrl?: string;
  totalDebit: number;
  totalCredit: number;
  lines: JournalLineItem[];
}

export class JournalService {
  /**
   * Fetch all journal vouchers across Sales, Receipts, Expenses/Payments, Contra, and Journal entries
   * Backed directly by AccountingEngine for 100% double-entry integrity
   */
  static async getJournalVouchers(params?: {
    fromDate?: string;
    toDate?: string;
    voucherType?: string;
    search?: string;
  }): Promise<{ vouchers: JournalVoucher[]; totalDebit: number; totalCredit: number }> {
    const from = params?.fromDate ? new Date(params.fromDate) : undefined;
    const to = params?.toDate ? new Date(params.toDate + "T23:59:59.999Z") : undefined;

    const allVouchers = await AccountingEngine.generateAllVouchers({
      fromDate: from,
      toDate: to,
    });

    let filtered = allVouchers;

    // Filter by voucherType
    if (params?.voucherType && params.voucherType !== "ALL") {
      filtered = filtered.filter(v => v.voucherType.toLowerCase() === params.voucherType!.toLowerCase());
    }

    // Filter by search term
    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(v =>
        v.voucherNumber.toLowerCase().includes(q) ||
        v.narration.toLowerCase().includes(q) ||
        (v.reference && v.reference.toLowerCase().includes(q)) ||
        v.lines.some(l => l.accountName.toLowerCase().includes(q))
      );
    }

    // Map to client format
    const vouchers: JournalVoucher[] = filtered.map(v => ({
      id: v.id,
      date: v.date,
      voucherType: v.voucherType,
      voucherNumber: v.voucherNumber,
      narration: v.narration,
      reference: v.reference,
      sourceUrl: v.sourceUrl,
      totalDebit: v.totalDebit,
      totalCredit: v.totalCredit,
      lines: v.lines.map(l => ({
        accountName: l.accountName,
        accountType: l.accountGroup || l.financialType,
        debit: l.debit,
        credit: l.credit,
      })),
    }));

    // Sort newest first for Journal view
    vouchers.sort((a, b) => b.date.getTime() - a.date.getTime());

    const totalDebit = Math.round(vouchers.reduce((s, v) => s + v.totalDebit, 0) * 100) / 100;
    const totalCredit = Math.round(vouchers.reduce((s, v) => s + v.totalCredit, 0) * 100) / 100;

    return { vouchers, totalDebit, totalCredit };
  }
}
