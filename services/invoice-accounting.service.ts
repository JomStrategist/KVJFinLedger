import { prisma } from "@/lib/prisma";
import { PrismaClient, Prisma } from "@prisma/client";
import {
  JournalPostingService,
  DbClientOrTx,
  ActorContext,
  JournalEntryWithLines,
} from "./journal-posting.service";
import { JournalEntryInput, JournalLineInput } from "./journal-validator.service";
import { roundToPaisa, toPaise, fromPaise } from "@/lib/utils/currency";

export class InvoiceAccountingService {
  /**
   * Helper to derive Indian Financial Year string (e.g. "2026-27") from a Date.
   */
  static getFinancialYear(dateInput: Date | string): string {
    const d = new Date(dateInput);
    const month = d.getMonth() + 1; // 1-indexed (1 to 12)
    const year = d.getFullYear();
    const startYear = month >= 4 ? year : year - 1;
    const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
    return `${startYear}-${endYearShort}`;
  }

  /**
   * Resolves the canonical bank account to attribute a payment receipt to.
   */
  private static async resolveBankAccount(
    bankAccountId?: string | null,
    fallbackBankAccountId?: string | null,
    dbOrTx: DbClientOrTx = prisma
  ) {
    const client = dbOrTx as any;
    if (bankAccountId) {
      const b = await client.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (b) return b;
    }
    if (fallbackBankAccountId) {
      const b = await client.bankAccount.findUnique({ where: { id: fallbackBankAccountId } });
      if (b) return b;
    }
    // Fallback to primary active bank account
    const primary = await client.bankAccount.findFirst({
      where: { isPrimary: true, isActive: true },
    });
    if (primary) return primary;

    // Fallback to any active bank account
    return await client.bankAccount.findFirst({
      where: { isActive: true },
    });
  }

  /**
   * Posts a balanced General Ledger sales journal for a confirmed Tax Invoice.
   * Executed atomically within the caller's transaction where supplied.
   */
  static async postTaxInvoiceConfirmation(
    invoiceId: string,
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines | null> {
    const client = dbOrTx as any;
    const invoice = await client.taxInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!invoice) {
      throw new Error(`TaxInvoiceNotFound: Cannot post journal for nonexistent invoice '${invoiceId}'.`);
    }

    if (invoice.status === "CANCELLED") {
      throw new Error(`CancelledInvoiceError: Cannot post confirmation journal for cancelled invoice '${invoice.invoiceNumber}'.`);
    }

    const customerName = invoice.customerNameSnapshot || invoice.customer?.legalName || "Customer";
    const customerId = invoice.customerId;
    const grossAmount = roundToPaisa(invoice.grossAmount);
    const taxableAmount = roundToPaisa(invoice.taxableAmount);
    const cgst = roundToPaisa(invoice.totalCGST || 0);
    const sgst = roundToPaisa(invoice.totalSGST || 0);
    const igst = roundToPaisa(invoice.totalIGST || 0);

    const lines: JournalLineInput[] = [];

    // 1. Dr Trade Receivables (Gross Invoice Value - never reduced by theoretical TDS)
    lines.push({
      lineNumber: 1,
      accountId: `customer_${customerId}`,
      accountCode: invoice.customer?.customerCode || `CUST-${customerId.slice(-6).toUpperCase()}`,
      accountName: customerName,
      financialType: "ASSET",
      statementGroup: "Trade Receivables",
      normalBalance: "DEBIT",
      debit: grossAmount,
      credit: 0,
      particulars: `Invoice Gross Total — ${invoice.invoiceNumber}`,
      entityType: "CUSTOMER",
      entityId: customerId,
    });

    // 2. Cr Revenue Accounts (Item category or default Service Revenue)
    let nextLineNum = 2;
    if (invoice.items && invoice.items.length > 0) {
      for (const item of invoice.items) {
        const itemTaxable = roundToPaisa(item.taxableAmount || 0);
        if (itemTaxable <= 0) continue;

        const catId = item.incomeCategoryId ? `cat_${item.incomeCategoryId}` : "cat_revenue_service";
        const catName = item.categoryNameSnapshot || "Service Revenue";
        const statementGroup = item.statementGroupSnapshot || "Revenue from Operations";

        lines.push({
          lineNumber: nextLineNum++,
          accountId: catId,
          accountCode: item.categoryCodeSnapshot || "REV-OPS-001",
          accountName: catName,
          financialType: "INCOME",
          statementGroup: statementGroup,
          normalBalance: "CREDIT",
          debit: 0,
          credit: itemTaxable,
          particulars: item.name || "Service Revenue",
          entityType: "CATEGORY",
          entityId: item.incomeCategoryId || undefined,
        });
      }
    } else if (taxableAmount > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "cat_revenue_service",
        accountCode: "REV-OPS-001",
        accountName: "Service Revenue",
        financialType: "INCOME",
        statementGroup: "Revenue from Operations",
        normalBalance: "CREDIT",
        debit: 0,
        credit: taxableAmount,
        particulars: "Sales Revenue",
        entityType: "CATEGORY",
      });
    }

    // 3. Cr Output GST Liabilities
    if (cgst > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "stat_output_cgst",
        accountCode: "GST-OUT-CGST",
        accountName: "Output CGST Payable",
        financialType: "LIABILITY",
        statementGroup: "Statutory Tax Liabilities",
        normalBalance: "CREDIT",
        debit: 0,
        credit: cgst,
        particulars: `Output CGST on invoice ${invoice.invoiceNumber}`,
      });
    }

    if (sgst > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "stat_output_sgst",
        accountCode: "GST-OUT-SGST",
        accountName: "Output SGST Payable",
        financialType: "LIABILITY",
        statementGroup: "Statutory Tax Liabilities",
        normalBalance: "CREDIT",
        debit: 0,
        credit: sgst,
        particulars: `Output SGST on invoice ${invoice.invoiceNumber}`,
      });
    }

    if (igst > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "stat_output_igst",
        accountCode: "GST-OUT-IGST",
        accountName: "Output IGST Payable",
        financialType: "LIABILITY",
        statementGroup: "Statutory Tax Liabilities",
        normalBalance: "CREDIT",
        debit: 0,
        credit: igst,
        particulars: `Output IGST on invoice ${invoice.invoiceNumber}`,
      });
    }

    // Mathematical equilibrium reconciliation check for odd-paise drift across line items
    const totalDrPaise = toPaise(grossAmount);
    const totalCrPaise = lines
      .filter((l) => Number(l.credit || 0) > 0)
      .reduce((sum, l) => sum + toPaise(l.credit || 0), 0);

    const diffPaise = totalDrPaise - totalCrPaise;
    if (diffPaise !== 0 && Math.abs(diffPaise) <= 5) {
      // Small rounding adjustment on primary revenue line to ensure integer equilibrium
      const revenueLine = lines.find((l) => l.financialType === "INCOME" && Number(l.credit || 0) > 0);
      if (revenueLine) {
        revenueLine.credit = fromPaise(toPaise(revenueLine.credit || 0) + diffPaise);
      }
    }

    const journalInput: JournalEntryInput = {
      entryType: "SALES",
      accountingDate: new Date(invoice.invoiceDate),
      financialYear: this.getFinancialYear(invoice.invoiceDate),
      sourceType: "TAX_INVOICE",
      sourceId: invoice.id,
      sourceNumber: invoice.invoiceNumber,
      narration: `Tax Invoice ${invoice.invoiceNumber} issued to ${customerName}`,
      reference: invoice.poNumber || null,
      postedBy: actor?.id || null,
      authorizedBy: actor?.id || null,
      idempotencyKey: `TAX_INVOICE:CONFIRM:${invoice.id}`,
      lines,
    };

    return await JournalPostingService.postJournalEntry(journalInput, actor, dbOrTx);
  }

  /**
   * Reverses a confirmed Tax Invoice journal when the invoice is cancelled.
   */
  static async reverseTaxInvoiceConfirmation(
    invoiceId: string,
    reason: string,
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines | null> {
    const client = dbOrTx as any;
    const existing = await client.journalEntry.findUnique({
      where: { idempotencyKey: `TAX_INVOICE:CONFIRM:${invoiceId}` },
    });

    if (!existing) {
      // No persistent journal exists for this invoice (e.g. historical invoice)
      return null;
    }

    if (existing.status === "REVERSED") {
      // Already reversed
      return null;
    }

    return await JournalPostingService.reverseJournalEntry(
      {
        originalEntryId: existing.id,
        reason: reason || "Invoice cancelled by user",
        actor: actor || { id: "system", name: "System" },
        accountingDate: new Date(),
      },
      dbOrTx
    );
  }

  /**
   * Applies an auditable revision when a confirmed Tax Invoice is edited.
   * Reverses the prior confirmed voucher and posts the revised confirmed voucher.
   */
  static async adjustTaxInvoice(
    invoiceId: string,
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines | null> {
    const client = dbOrTx as any;
    const existing = await client.journalEntry.findUnique({
      where: { idempotencyKey: `TAX_INVOICE:CONFIRM:${invoiceId}` },
    });

    if (existing && existing.status !== "REVERSED") {
      // Atomically reverse the prior journal entry
      await JournalPostingService.reverseJournalEntry(
        {
          originalEntryId: existing.id,
          reason: `Reversal due to Tax Invoice modification`,
          actor: actor || { id: "system", name: "System" },
          accountingDate: new Date(),
        },
        dbOrTx
      );
    }

    // Post the updated invoice voucher with versioned idempotency key
    const versionedKey = `TAX_INVOICE:CONFIRM:${invoiceId}:REV_${Date.now()}`;
    const invoice = await client.taxInvoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, items: true },
    });
    if (!invoice) return null;

    const customerName = invoice.customerNameSnapshot || invoice.customer?.legalName || "Customer";
    const customerId = invoice.customerId;
    const grossAmount = roundToPaisa(invoice.grossAmount);
    const taxableAmount = roundToPaisa(invoice.taxableAmount);
    const cgst = roundToPaisa(invoice.totalCGST || 0);
    const sgst = roundToPaisa(invoice.totalSGST || 0);
    const igst = roundToPaisa(invoice.totalIGST || 0);

    const lines: JournalLineInput[] = [];
    lines.push({
      lineNumber: 1,
      accountId: `customer_${customerId}`,
      accountCode: invoice.customer?.customerCode || `CUST-${customerId.slice(-6).toUpperCase()}`,
      accountName: customerName,
      financialType: "ASSET",
      statementGroup: "Trade Receivables",
      normalBalance: "DEBIT",
      debit: grossAmount,
      credit: 0,
      particulars: `Revised Invoice Gross Total — ${invoice.invoiceNumber}`,
      entityType: "CUSTOMER",
      entityId: customerId,
    });

    let nextLineNum = 2;
    if (invoice.items && invoice.items.length > 0) {
      for (const item of invoice.items) {
        const itemTaxable = roundToPaisa(item.taxableAmount || 0);
        if (itemTaxable <= 0) continue;
        lines.push({
          lineNumber: nextLineNum++,
          accountId: item.incomeCategoryId ? `cat_${item.incomeCategoryId}` : "cat_revenue_service",
          accountCode: item.categoryCodeSnapshot || "REV-OPS-001",
          accountName: item.categoryNameSnapshot || "Service Revenue",
          financialType: "INCOME",
          statementGroup: item.statementGroupSnapshot || "Revenue from Operations",
          normalBalance: "CREDIT",
          debit: 0,
          credit: itemTaxable,
          particulars: item.name || "Service Revenue",
          entityType: "CATEGORY",
          entityId: item.incomeCategoryId || undefined,
        });
      }
    } else if (taxableAmount > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "cat_revenue_service",
        accountCode: "REV-OPS-001",
        accountName: "Service Revenue",
        financialType: "INCOME",
        statementGroup: "Revenue from Operations",
        normalBalance: "CREDIT",
        debit: 0,
        credit: taxableAmount,
        particulars: "Sales Revenue",
        entityType: "CATEGORY",
      });
    }

    if (cgst > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "stat_output_cgst",
        accountCode: "GST-OUT-CGST",
        accountName: "Output CGST Payable",
        financialType: "LIABILITY",
        statementGroup: "Statutory Tax Liabilities",
        normalBalance: "CREDIT",
        debit: 0,
        credit: cgst,
        particulars: `Output CGST on invoice ${invoice.invoiceNumber}`,
      });
    }
    if (sgst > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "stat_output_sgst",
        accountCode: "GST-OUT-SGST",
        accountName: "Output SGST Payable",
        financialType: "LIABILITY",
        statementGroup: "Statutory Tax Liabilities",
        normalBalance: "CREDIT",
        debit: 0,
        credit: sgst,
        particulars: `Output SGST on invoice ${invoice.invoiceNumber}`,
      });
    }
    if (igst > 0) {
      lines.push({
        lineNumber: nextLineNum++,
        accountId: "stat_output_igst",
        accountCode: "GST-OUT-IGST",
        accountName: "Output IGST Payable",
        financialType: "LIABILITY",
        statementGroup: "Statutory Tax Liabilities",
        normalBalance: "CREDIT",
        debit: 0,
        credit: igst,
        particulars: `Output IGST on invoice ${invoice.invoiceNumber}`,
      });
    }

    const totalDrPaise = toPaise(grossAmount);
    const totalCrPaise = lines.filter((l) => Number(l.credit || 0) > 0).reduce((sum, l) => sum + toPaise(l.credit || 0), 0);
    const diffPaise = totalDrPaise - totalCrPaise;
    if (diffPaise !== 0 && Math.abs(diffPaise) <= 5) {
      const revenueLine = lines.find((l) => l.financialType === "INCOME" && Number(l.credit || 0) > 0);
      if (revenueLine) {
        revenueLine.credit = fromPaise(toPaise(revenueLine.credit || 0) + diffPaise);
      }
    }

    return await JournalPostingService.postJournalEntry(
      {
        entryType: "SALES",
        accountingDate: new Date(invoice.invoiceDate),
        financialYear: this.getFinancialYear(invoice.invoiceDate),
        sourceType: "TAX_INVOICE",
        sourceId: invoice.id,
        sourceNumber: invoice.invoiceNumber,
        narration: `Revised Tax Invoice ${invoice.invoiceNumber} issued to ${customerName}`,
        reference: invoice.poNumber || null,
        postedBy: actor?.id || null,
        authorizedBy: actor?.id || null,
        idempotencyKey: versionedKey,
        lines,
      },
      actor,
      dbOrTx
    );
  }

  /**
   * Posts a balanced General Ledger customer receipt journal for an invoice payment.
   * Handles Net Bank Receipt, Customer TDS Receivable deduction, and Customer Advance overpayments.
   */
  static async postCustomerReceipt(
    paymentId: string,
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines | null> {
    const client = dbOrTx as any;
    const payment = await client.invoicePayment.findUnique({
      where: { id: paymentId },
      include: {
        taxInvoice: {
          include: { customer: true },
        },
      },
    });

    if (!payment) {
      throw new Error(`InvoicePaymentNotFound: Cannot post receipt for nonexistent payment '${paymentId}'.`);
    }

    if (payment.isCancelled) {
      throw new Error(`CancelledPaymentError: Cannot post receipt for cancelled payment '${paymentId}'.`);
    }

    const invoice = payment.taxInvoice;
    if (!invoice) {
      throw new Error(`InvoiceNotFound: Payment '${paymentId}' is not associated with a Tax Invoice.`);
    }

    const customerName = invoice.customerNameSnapshot || invoice.customer?.legalName || "Customer";
    const customerId = invoice.customerId;

    // Resolve target receiving BankAccount
    const bankAccount = await this.resolveBankAccount(
      payment.bankAccountId,
      invoice.bankAccountId,
      dbOrTx
    );

    const bankAccountId = bankAccount?.id || "default_bank";
    const bankAccountName = bankAccount
      ? `${bankAccount.bankName} (${bankAccount.accountName || "Bank"})`
      : "Federal Bank (KVJ Analytics)";

    const paymentAmount = roundToPaisa(payment.paymentAmount);
    const isTds = Boolean(payment.isTdsDeducted);
    const tdsAmount = isTds ? roundToPaisa(payment.tdsAmount || 0) : 0;
    const bankReceipt = roundToPaisa(payment.bankReceipt || paymentAmount - tdsAmount);

    const advanceAmount = roundToPaisa(payment.advanceAmount || 0);
    const invoiceSettled = roundToPaisa(paymentAmount - advanceAmount);

    const lines: JournalLineInput[] = [];
    let lineIdx = 1;

    // 1. Dr Bank Account (Actual funds deposited)
    lines.push({
      lineNumber: lineIdx++,
      accountId: `bank_${bankAccountId}`,
      accountCode: bankAccount?.accountNumber || "BANK-001",
      accountName: bankAccountName,
      financialType: "ASSET",
      statementGroup: "Bank Accounts",
      normalBalance: "DEBIT",
      debit: bankReceipt,
      credit: 0,
      particulars: `Bank receipt from ${customerName} — Ref: ${payment.reference || "N/A"}`,
      entityType: "BANK",
      entityId: bankAccountId,
      bankAccountId: bankAccount?.id || null,
    });

    // 2. Dr TDS Receivable (Current Asset) — ONLY when actual customer deduction occurs
    if (tdsAmount > 0) {
      lines.push({
        lineNumber: lineIdx++,
        accountId: "stat_tds_receivable",
        accountCode: "TDS-REC-194",
        accountName: "TDS Receivable (Current Asset)",
        financialType: "ASSET",
        statementGroup: "Current Assets",
        normalBalance: "DEBIT",
        debit: tdsAmount,
        credit: 0,
        particulars: `TDS withheld by ${customerName} u/s 194J/194C on payment for ${invoice.invoiceNumber}`,
        entityType: "CUSTOMER",
        entityId: customerId,
      });
    }

    // 3. Cr Trade Receivables (Clearing the invoice receivable)
    if (invoiceSettled > 0) {
      lines.push({
        lineNumber: lineIdx++,
        accountId: `customer_${customerId}`,
        accountCode: invoice.customer?.customerCode || `CUST-${customerId.slice(-6).toUpperCase()}`,
        accountName: customerName,
        financialType: "ASSET",
        statementGroup: "Trade Receivables",
        normalBalance: "DEBIT",
        debit: 0,
        credit: invoiceSettled,
        particulars: `Payment settlement for Invoice ${invoice.invoiceNumber}`,
        entityType: "CUSTOMER",
        entityId: customerId,
      });
    }

    // 4. Cr Customer Advance (Current Liability for overpayments)
    if (advanceAmount > 0) {
      lines.push({
        lineNumber: lineIdx++,
        accountId: `cust_adv_${customerId}`,
        accountCode: `ADV-${customerId.slice(-6).toUpperCase()}`,
        accountName: `${customerName} (Customer Advance)`,
        financialType: "LIABILITY",
        statementGroup: "Current Liabilities",
        normalBalance: "CREDIT",
        debit: 0,
        credit: advanceAmount,
        particulars: `Customer advance / overpayment on Invoice ${invoice.invoiceNumber}`,
        entityType: "CUSTOMER",
        entityId: customerId,
      });
    }

    // Paise equilibrium check
    const totalDrPaise = toPaise(bankReceipt) + toPaise(tdsAmount);
    const totalCrPaise = toPaise(invoiceSettled) + toPaise(advanceAmount);
    const diffPaise = totalDrPaise - totalCrPaise;
    if (diffPaise !== 0 && Math.abs(diffPaise) <= 5) {
      // Adjust settlement credit line for 1-paise integer drift
      const settleLine = lines.find((l) => Number(l.credit || 0) > 0);
      if (settleLine) {
        settleLine.credit = fromPaise(toPaise(settleLine.credit || 0) + diffPaise);
      }
    }

    const journalInput: JournalEntryInput = {
      entryType: "RECEIPT",
      accountingDate: new Date(payment.paymentDate),
      financialYear: this.getFinancialYear(payment.paymentDate),
      sourceType: "INVOICE_PAYMENT",
      sourceId: payment.id,
      sourceNumber: payment.reference || `REC-${payment.id.slice(-6).toUpperCase()}`,
      narration: `Payment received for Invoice ${invoice.invoiceNumber}${payment.remarks ? ` — ${payment.remarks}` : ""}`,
      reference: payment.reference || null,
      postedBy: actor?.id || null,
      authorizedBy: actor?.id || null,
      idempotencyKey: `INVOICE_PAYMENT:${payment.id}`,
      lines,
    };

    return await JournalPostingService.postJournalEntry(journalInput, actor, dbOrTx);
  }

  /**
   * Reverses an existing receipt journal when a payment is cancelled or deleted.
   */
  static async reverseCustomerReceipt(
    paymentId: string,
    reason: string,
    actor?: ActorContext,
    dbOrTx: DbClientOrTx = prisma
  ): Promise<JournalEntryWithLines | null> {
    const client = dbOrTx as any;
    const existing = await client.journalEntry.findUnique({
      where: { idempotencyKey: `INVOICE_PAYMENT:${paymentId}` },
    });

    if (!existing) {
      return null;
    }

    if (existing.status === "REVERSED") {
      return null;
    }

    return await JournalPostingService.reverseJournalEntry(
      {
        originalEntryId: existing.id,
        reason: reason || "Payment cancelled / deleted by user",
        actor: actor || { id: "system", name: "System" },
        accountingDate: new Date(),
      },
      dbOrTx
    );
  }
}
