import { prisma } from "@/lib/prisma";

export interface JournalLineItem {
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
}

export interface JournalVoucher {
  id: string;
  date: Date;
  voucherType: "Sales" | "Receipt" | "Payment" | "Contra";
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
   * Fetch all journal vouchers across Sales, Receipts, Expenses/Payments, and Contra transfers
   */
  static async getJournalVouchers(params?: {
    fromDate?: string;
    toDate?: string;
    voucherType?: string;
    search?: string;
  }): Promise<{ vouchers: JournalVoucher[]; totalDebit: number; totalCredit: number }> {
    const from = params?.fromDate ? new Date(params.fromDate) : null;
    const to = params?.toDate ? new Date(params.toDate + "T23:59:59.999Z") : null;

    const vouchers: JournalVoucher[] = [];

    // 1. Tax Invoices (Sales Journal)
    if (!params?.voucherType || params.voucherType === "ALL" || params.voucherType === "Sales") {
      const invoices = await prisma.taxInvoice.findMany({
        where: {
          status: { in: ["CONFIRMED", "PAID", "PARTIALLY_PAID"] },
          ...(from || to
            ? {
                invoiceDate: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              }
            : {}),
        },
        include: {
          customer: true,
          items: { include: { incomeCategory: true } },
        },
        orderBy: { invoiceDate: "desc" },
      });

      for (const inv of invoices) {
        const customerName = inv.customerNameSnapshot || inv.customer?.legalName || "Customer Account";
        const gross = Number(inv.grossAmount || inv.netAmount || 0);
        const taxable = Number(inv.taxableAmount || 0);
        const gst = Number(inv.totalGST || 0);
        const tds = Number(inv.tdsAmount || 0);

        const lines: JournalLineItem[] = [];

        // Debit Customer (Receivable)
        const customerDebit = tds > 0 ? gross - tds : gross;
        lines.push({
          accountName: customerName,
          accountType: "Sundry Debtors (Customer)",
          debit: customerDebit,
          credit: 0,
        });

        // Debit TDS Receivable if applicable
        if (tds > 0) {
          lines.push({
            accountName: "TDS Receivable",
            accountType: "Current Assets",
            debit: tds,
            credit: 0,
          });
        }

        // Credit Revenue
        lines.push({
          accountName: "Sales / Service Revenue",
          accountType: "Revenue",
          debit: 0,
          credit: taxable > 0 ? taxable : gross - gst,
        });

        // Credit GST Output if applicable
        if (gst > 0) {
          const isIgst = Number(inv.totalIGST || 0) > 0;
          if (isIgst) {
            lines.push({
              accountName: "Output IGST Payable",
              accountType: "Duties & Taxes",
              debit: 0,
              credit: Number(inv.totalIGST),
            });
          } else {
            const cgst = Number(inv.totalCGST || gst / 2);
            const sgst = Number(inv.totalSGST || gst / 2);
            lines.push({
              accountName: "Output CGST Payable",
              accountType: "Duties & Taxes",
              debit: 0,
              credit: cgst,
            });
            lines.push({
              accountName: "Output SGST Payable",
              accountType: "Duties & Taxes",
              debit: 0,
              credit: sgst,
            });
          }
        }

        const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

        vouchers.push({
          id: `sales_${inv.id}`,
          date: inv.invoiceDate,
          voucherType: "Sales",
          voucherNumber: inv.invoiceNumber,
          narration: `Sales Invoice ${inv.invoiceNumber} to ${customerName}`,
          reference: inv.poNumber || null,
          sourceUrl: `/invoices/${inv.id}`,
          totalDebit: Math.round(totalDebit * 100) / 100,
          totalCredit: Math.round(totalCredit * 100) / 100,
          lines,
        });
      }
    }

    // 2. Invoice Payments (Receipt Journal)
    if (!params?.voucherType || params.voucherType === "ALL" || params.voucherType === "Receipt") {
      const payments = await prisma.invoicePayment.findMany({
        where: {
          ...(from || to
            ? {
                paymentDate: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              }
            : {}),
        },
        include: {
          taxInvoice: { include: { customer: true } },
        },
        orderBy: { paymentDate: "desc" },
      });

      for (const p of payments) {
        const customerName =
          p.taxInvoice?.customerNameSnapshot || p.taxInvoice?.customer?.legalName || "Customer Account";
        const bankReceipt = Number(p.bankReceipt || p.paymentAmount);
        const tds = Number(p.tdsAmount || 0);
        const totalSettled = Number(p.paymentAmount);

        const lines: JournalLineItem[] = [
          {
            accountName: "Bank / Cash Account",
            accountType: "Cash & Bank Balances",
            debit: bankReceipt,
            credit: 0,
          },
        ];

        if (tds > 0) {
          lines.push({
            accountName: "TDS Deducted by Customer",
            accountType: "Current Assets",
            debit: tds,
            credit: 0,
          });
        }

        lines.push({
          accountName: customerName,
          accountType: "Sundry Debtors (Customer)",
          debit: 0,
          credit: totalSettled,
        });

        const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

        vouchers.push({
          id: `receipt_${p.id}`,
          date: p.paymentDate,
          voucherType: "Receipt",
          voucherNumber: `RCPT-${p.id.slice(-6).toUpperCase()}`,
          narration: `Payment received for Invoice ${p.taxInvoice?.invoiceNumber || ""}${
            p.remarks ? ` — ${p.remarks}` : ""
          }`,
          reference: p.reference || null,
          sourceUrl: `/invoices/${p.taxInvoiceId}`,
          totalDebit: Math.round(totalDebit * 100) / 100,
          totalCredit: Math.round(totalCredit * 100) / 100,
          lines,
        });
      }
    }

    // 3. Expenses (Payment Journal)
    if (!params?.voucherType || params.voucherType === "ALL" || params.voucherType === "Payment") {
      const expenses = await prisma.expense.findMany({
        where: {
          status: "APPROVED",
          ...(from || to
            ? {
                expenseDate: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              }
            : {}),
        },
        include: {
          vendor: true,
          category: true,
        },
        orderBy: { expenseDate: "desc" },
      });

      for (const exp of expenses) {
        const vendorName = exp.vendor?.businessName || exp.vendor?.name || "Cash / Vendor";
        const catName = exp.category?.name || "General Business Expense";
        const taxable = Number(exp.taxableAmount || 0);
        const gst = Number(exp.totalInputGST || 0);
        const tds = Number(exp.tdsAmount || 0);
        const net = Number(exp.netAmount || exp.grossAmount || 0);

        const lines: JournalLineItem[] = [
          {
            accountName: catName,
            accountType: "Expense / Asset",
            debit: taxable > 0 ? taxable : net,
            credit: 0,
          },
        ];

        if (gst > 0) {
          lines.push({
            accountName: "Input GST Credit",
            accountType: "Duties & Taxes",
            debit: gst,
            credit: 0,
          });
        }

        // Credit Cash/Bank or Vendor
        lines.push({
          accountName: exp.paymentStatus === "PAID" ? "Bank / Cash Account" : vendorName,
          accountType: exp.paymentStatus === "PAID" ? "Cash & Bank Balances" : "Sundry Creditors (Vendor)",
          debit: 0,
          credit: tds > 0 ? net - tds : net,
        });

        if (tds > 0) {
          lines.push({
            accountName: "TDS Payable",
            accountType: "Current Liabilities",
            debit: 0,
            credit: tds,
          });
        }

        const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

        vouchers.push({
          id: `payment_${exp.id}`,
          date: exp.expenseDate,
          voucherType: "Payment",
          voucherNumber: exp.expenseNumber || `EXP-${exp.id.slice(-6).toUpperCase()}`,
          narration: `Expense: ${exp.description || catName} paid to ${vendorName}`,
          reference: exp.notes || null,
          sourceUrl: `/expenses`,
          totalDebit: Math.round(totalDebit * 100) / 100,
          totalCredit: Math.round(totalCredit * 100) / 100,
          lines,
        });
      }
    }

    // 4. Bank Transfers (Contra Journal)
    if (!params?.voucherType || params.voucherType === "ALL" || params.voucherType === "Contra") {
      const transfers = await prisma.bankTransfer.findMany({
        where: {
          ...(from || to
            ? {
                date: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              }
            : {}),
        },
        orderBy: { date: "desc" },
      });

      for (const t of transfers) {
        const amt = Number(t.amount || 0);
        const lines: JournalLineItem[] = [
          {
            accountName: t.toAccount || "Destination Bank",
            accountType: "Cash & Bank Balances",
            debit: amt,
            credit: 0,
          },
          {
            accountName: t.fromAccount || "Source Bank",
            accountType: "Cash & Bank Balances",
            debit: 0,
            credit: amt,
          },
        ];

        vouchers.push({
          id: `contra_${t.id}`,
          date: t.date,
          voucherType: "Contra",
          voucherNumber: `CONTRA-${t.id.slice(-6).toUpperCase()}`,
          narration: `Fund Transfer from ${t.fromAccount} to ${t.toAccount}${
            t.description ? ` — ${t.description}` : ""
          }`,
          reference: t.reference || null,
          sourceUrl: `/bank-transfers`,
          totalDebit: amt,
          totalCredit: amt,
          lines,
        });
      }
    }

    // Sort all vouchers descending by date
    vouchers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Optional text search filter
    let filtered = vouchers;
    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      filtered = vouchers.filter(
        (v) =>
          v.voucherNumber.toLowerCase().includes(q) ||
          v.narration.toLowerCase().includes(q) ||
          v.voucherType.toLowerCase().includes(q) ||
          (v.reference && v.reference.toLowerCase().includes(q)) ||
          v.lines.some((l) => l.accountName.toLowerCase().includes(q))
      );
    }

    const totalDebit = filtered.reduce((s, v) => s + v.totalDebit, 0);
    const totalCredit = filtered.reduce((s, v) => s + v.totalCredit, 0);

    return {
      vouchers: filtered,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
    };
  }
}
