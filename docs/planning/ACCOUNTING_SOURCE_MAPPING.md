# FINLEDGER ERP — ACCOUNTING SOURCE MAPPING MATRIX

**Organization:** KVJ Analytics (Indian IT & Analytics Services)  
**System:** FinLedger ERP  
**Document Type:** Source-to-Ledger Accounting Mapping Specification  
**Baseline Date:** 21 October 2026  
**Document Status:** DESIGN FROZEN & EVIDENCE-BACKED (PROMPT 3)  

---

## 1. Executive Summary

This document specifies the exact double-entry accounting mechanics, debit/credit journal postings, triggers, idempotency keys, and reconciliation controls for all **16 financial transaction types** in FinLedger ERP.

### Core Policy: Proforma Invoice Non-Accounting Principle
- **Proforma Invoices are commercial quotations / estimates and DO NOT create General Ledger entries.**
- **Tax Invoice Confirmation is the authoritative accounting trigger for revenue recognition.**

---

## 2. Complete Source-to-Ledger Mapping Matrix (16 Transaction Types)

### 1. Tax Invoice Confirmation
- **Triggering Business Event:** Tax Invoice status transitions to `CONFIRMED` (either created directly or converted from Proforma Invoice).
- **Posting Mode:** Immediate transactional posting via `prisma.$transaction`.
- **Double-Entry Mapping:**
  - **Debit:** Trade Receivables (`Customer.id` sub-ledger) $\rightarrow$ **Gross Invoice Value** (₹ Total Receivable)
  - **Credit:** Revenue from Operations (`ExpenseCategory.id` by line item) $\rightarrow$ **Taxable Amount**
  - **Credit:** Output CGST Payable (`stat_output_cgst`) $\rightarrow$ **CGST Amount**
  - **Credit:** Output SGST Payable (`stat_output_sgst`) $\rightarrow$ **SGST Amount**
  - **Credit:** Output IGST Payable (`stat_output_igst`) $\rightarrow$ **IGST Amount**
- **Idempotency Strategy:** `TAX_INVOICE:{invoice.id}:CONFIRM` (Unique index on `JournalEntry.idempotencyKey`).
- **Source Document Link:** `sourceType = TAX_INVOICE`, `sourceId = TaxInvoice.id`, `sourceNumber = TaxInvoice.invoiceNumber`.
- **Validation & Reconciliation:**
  - Verify $\sum \text{Debit} \equiv \sum \text{Credit}$ down to the exact paisa.
  - Verify `grossAmount === taxableAmount + totalCGST + totalSGST + totalIGST`.
  - Customer sub-ledger debit must equal gross invoice balance.

---

### 2. Proforma Invoice Creation and Conversion
- **Triggering Business Event:**
  - *Creation:* Proforma invoice created in `DRAFT`, `SENT`, or `ACCEPTED` status.
  - *Conversion:* Proforma converted to Tax Invoice via `TaxInvoiceService.convertFromProforma`.
- **Posting Mode:**
  - *Creation:* **STRICTLY NON-ACCOUNTING**. No journal entry is created.
  - *Conversion:* Proforma status marked `CONVERTED`. Accounting trigger occurs through the resulting `TaxInvoice` creation (see Transaction #1).
- **Double-Entry Mapping:** None for Proforma.
- **Idempotency Strategy:** `PROFORMA_CONVERT:{proforma.id}` ensures a proforma cannot be converted into multiple tax invoices.
- **Source Document Link:** `TaxInvoice.sourceProformaId = ProformaInvoice.id`.
- **Validation & Reconciliation:** Prevent double conversion by enforcing unique index on `TaxInvoice.sourceProformaId`.

---

### 3. Customer Receipts and Partial Receipts
- **Triggering Business Event:** User records payment against a Tax Invoice (`InvoicePayment` created).
- **Posting Mode:** Immediate transactional posting.
- **Double-Entry Mapping:**
  - **Debit:** Bank Account (`bankAccountId`) $\rightarrow$ **Bank Receipt Amount** (Actual funds received)
  - **Debit:** TDS Receivable - Current Asset (`stat_tds_receivable`) $\rightarrow$ **TDS Deducted by Customer** (if applicable)
  - **Credit:** Trade Receivables (`Customer.id` sub-ledger) $\rightarrow$ **Total Payment Amount** (`bankReceipt + tdsAmount`)
- **Idempotency Strategy:** `INVOICE_PAYMENT:{payment.id}:RECORD`.
- **Source Document Link:** `sourceType = INVOICE_PAYMENT`, `sourceId = InvoicePayment.id`, `reference = reference/UTR`.
- **Payment / Allocation Behavior:**
  - Re-evaluates `TaxInvoice.status` (`CONFIRMED` $\rightarrow$ `PARTIALLY_PAID` or `PAID`).
  - Invoice balance payable reduced by total settled amount.
- **Validation & Reconciliation:**
  - Verify $\text{Bank Receipt} + \text{TDS Amount} \equiv \text{Payment Amount}$.
  - Bank account balance updated; customer statement credited.

---

### 4. Customer Overpayments and Advances
- **Triggering Business Event:** Payment recorded where receipt exceeds outstanding invoice balance, or an on-account customer advance is received.
- **Posting Mode:** Immediate transactional posting.
- **Double-Entry Mapping:**
  - **Debit:** Bank Account (`bankAccountId`) $\rightarrow$ **Total Funds Received**
  - **Credit:** Trade Receivables (`Customer.id`) $\rightarrow$ **Invoice Settlement Amount** (clears invoice balance)
  - **Credit:** Customer Advances - Current Liability (`liab_cust_advance`, tagged with `Customer.id`) $\rightarrow$ **Excess Amount**
- **Idempotency Strategy:** `CUSTOMER_ADVANCE:{payment.id}:RECEIPT`.
- **Source Document Link:** `sourceType = INVOICE_PAYMENT`, `sourceId = InvoicePayment.id`.
- **Payment / Allocation Behavior:** Advance liability remains on customer account until applied against future invoices.
- **Validation & Reconciliation:** Customer balance in Trade Receivables never drops below zero; excess sits in Advance liability.

---

### 5. Customer TDS Receivable
- **Triggering Business Event:** Deducted by customer under Section 194J/194C at the time of payment remittance.
- **Posting Mode:** Posted concurrently with customer receipt (Transaction #3).
- **Double-Entry Mapping:**
  - **Debit:** TDS Receivable - Current Asset (`stat_tds_receivable`, tagged with `Customer.id`)
  - **Credit:** Trade Receivables (`Customer.id`)
- **Idempotency Strategy:** Covered under `INVOICE_PAYMENT:{payment.id}:RECORD`.
- **Validation & Reconciliation:** Reconciled quarterly against Form 26AS / AIS on the Income Tax Portal.

---

### 6. Vendor Expenses and Unpaid Bills
- **Triggering Business Event:** Vendor bill approved (`Expense.status = APPROVED`, `paymentStatus = UNPAID`).
- **Posting Mode:** Immediate transactional posting upon approval.
- **Double-Entry Mapping:**
  - **Debit:** Operating Expense / Asset (`ExpenseCategory.id`) $\rightarrow$ **Taxable Amount**
  - **Debit:** Input CGST Credit - ITC Asset (`stat_input_cgst`) $\rightarrow$ **Input CGST** (if ITC eligible)
  - **Debit:** Input SGST Credit - ITC Asset (`stat_input_sgst`) $\rightarrow$ **Input SGST** (if ITC eligible)
  - **Debit:** Input IGST Credit - ITC Asset (`stat_input_igst`) $\rightarrow$ **Input IGST** (if ITC eligible)
  - **Credit:** Trade Payables (`Vendor.id` sub-ledger) $\rightarrow$ **Net Payable Amount**
  - **Credit:** Statutory TDS Payable (`stat_tds_payable`) $\rightarrow$ **TDS Withheld** (if applicable)
- **Note on Ineligible ITC:** If `isItcEligible === false`, GST is capitalized into the Expense Category debit.
- **Idempotency Strategy:** `EXPENSE:{expense.id}:APPROVE`.
- **Source Document Link:** `sourceType = EXPENSE`, `sourceId = Expense.id`, `sourceNumber = Expense.expenseNumber`.
- **Validation & Reconciliation:**
  - Verify $\text{Taxable} + \text{Input GST} \equiv \text{Net Payable} + \text{TDS Withheld}$.
  - Trade Payables sub-ledger reflects exact vendor liability.

---

### 7. Company-Paid Direct Expenses
- **Triggering Business Event:** Expense paid directly at the time of incurrence via corporate bank account or cash (`Expense.paidBy = COMPANY`, `paymentStatus = PAID`).
- **Posting Mode:** Immediate transactional posting upon approval.
- **Double-Entry Mapping:**
  - **Debit:** Operating Expense (`ExpenseCategory.id`) $\rightarrow$ **Taxable Amount**
  - **Debit:** Input GST Credit (`stat_input_cgst/sgst/igst`) $\rightarrow$ **Input GST**
  - **Credit:** Bank Account (`bankAccountId`) or Cash in Hand $\rightarrow$ **Net Disbursed**
  - **Credit:** Statutory TDS Payable (`stat_tds_payable`) $\rightarrow$ **TDS Withheld** (if any)
- **Idempotency Strategy:** `EXPENSE_DIRECT_PAY:{expense.id}`.
- **Validation & Reconciliation:** Direct credit to real `BankAccount.id` matches bank statement withdrawal.

---

### 8. Employee-Paid Expenses and Reimbursements
- **Triggering Business Event:**
  - *Phase A (Accrual):* Employee submits approved expense paid out of personal pocket (`Expense.paidBy = EMPLOYEE`).
  - *Phase B (Reimbursement):* Company settles reimbursement to employee (`ExpensePayment.isReimbursement = true`).
- **Posting Mode:**
  - *Accrual:* Immediate upon approval.
  - *Reimbursement:* Immediate upon payment creation.
- **Double-Entry Mapping:**
  - *Accrual:*
    - **Debit:** Operating Expense (`ExpenseCategory.id`) $\rightarrow$ **Taxable Amount**
    - **Debit:** Input GST Credit (`stat_input_cgst/sgst`) $\rightarrow$ **GST Amount**
    - **Credit:** Employee Payables (`Employee.id` sub-ledger) $\rightarrow$ **Total Incurred**
  - *Reimbursement:*
    - **Debit:** Employee Payables (`Employee.id` sub-ledger) $\rightarrow$ **Reimbursement Amount**
    - **Credit:** Bank Account (`bankAccountId`) $\rightarrow$ **Disbursement Amount**
- **Idempotency Strategy:**
  - Accrual: `EXPENSE_EMP_ACCRUAL:{expense.id}`
  - Reimbursement: `EXPENSE_EMP_REIMB:{payment.id}`
- **Validation & Reconciliation:** Employee payable balance clears upon reimbursement.

---

### 9. Salary Expense, Salary Payable, and Salary Payments
- **Triggering Business Event:** Monthly batch payroll wizard execution (`PayrollService.runBatchPayroll`).
- **Posting Mode:** Atomic two-phase posting within the payroll transaction.
- **Double-Entry Mapping:**
  - *Phase 1: Remuneration Accrual:*
    - **Debit:** Salaries & Wages Expense (`cat_salaries_wages`) $\rightarrow$ **Gross Earnings**
    - **Credit:** Employee Payables (`Employee.id` sub-ledger) $\rightarrow$ **Net Salary Payable**
    - **Credit:** Statutory TDS Payable - Sec 192 (`stat_tds_payable_192`) $\rightarrow$ **TDS Amount**
    - **Credit:** Employee Advance Asset (`EmployeeAdvance.id`) $\rightarrow$ **Advance Deduction Recovered**
  - *Phase 2: Salary Disbursement:*
    - **Debit:** Employee Payables (`Employee.id` sub-ledger) $\rightarrow$ **Net Salary Disbursed**
    - **Credit:** Bank Account (`bankAccountId`) $\rightarrow$ **Net Payout**
- **Idempotency Strategy:**
  - Accrual: `PAYROLL_ACCRUAL:{periodMonth}:{employee.id}`
  - Payout: `PAYROLL_PAYOUT:{periodMonth}:{employee.id}`
- **Validation & Reconciliation:**
  - Advance deduction updates `EmployeeAdvance.repaidAmount` and `balanceAmount`.
  - Net payout matches corporate banking export file.

---

### 10. Vendor TDS Payable and Deposits
- **Triggering Business Event:** Depositing withheld TDS to the Government via Challan ITNS 281 (`TdsDeposit` created).
- **Posting Mode:** Immediate transactional posting.
- **Double-Entry Mapping:**
  - **Debit:** Statutory TDS Payable (`stat_tds_payable`) $\rightarrow$ **Amount Deposited**
  - **Credit:** Bank Account (`bankAccountId`) $\rightarrow$ **Challan Payment**
- **Idempotency Strategy:** `TDS_DEPOSIT:{deposit.id}`.
- **Source Document Link:** `sourceType = TDS_DEPOSIT`, `sourceId = TdsDeposit.id`, `reference = challanNumber/BSR`.
- **Validation & Reconciliation:** TDS liability for the quarter/section is cleared.

---

### 11. GST Output/Input Settlement and Government Payments
- **Triggering Business Event:** Monthly GSTR-3B settlement creation (`GstSettlement` created).
- **Posting Mode:** Immediate transactional posting.
- **Double-Entry Mapping:**
  - **Debit:** Output CGST Payable (`stat_output_cgst`) $\rightarrow$ **CGST Offset**
  - **Debit:** Output SGST Payable (`stat_output_sgst`) $\rightarrow$ **SGST Offset**
  - **Debit:** Output IGST Payable (`stat_output_igst`) $\rightarrow$ **IGST Offset**
  - **Credit:** Input CGST Credit - ITC (`stat_input_cgst`) $\rightarrow$ **CGST ITC Utilized**
  - **Credit:** Input SGST Credit - ITC (`stat_input_sgst`) $\rightarrow$ **SGST ITC Utilized**
  - **Credit:** Input IGST Credit - ITC (`stat_input_igst`) $\rightarrow$ **IGST ITC Utilized**
  - **Credit:** Bank Account (`bankAccountId`) $\rightarrow$ **Net Cash Tax Paid via Challan**
- **Idempotency Strategy:** `GST_SETTLEMENT:{settlement.id}`.
- **Source Document Link:** `sourceType = GST_SETTLEMENT`, `sourceId = GstSettlement.id`, `reference = challanRef`.
- **Validation & Reconciliation:** Output liability offset must equal ITC utilized plus cash paid.

---

### 12. Inter-Bank Transfers (Contra Vouchers)
- **Triggering Business Event:** Funds transferred between company bank accounts (`BankTransfer` created).
- **Posting Mode:** Immediate transactional posting.
- **Double-Entry Mapping:**
  - **Debit:** Destination Bank Account (`toBankAccountId`) $\rightarrow$ **Transfer Amount**
  - **Credit:** Source Bank Account (`fromBankAccountId`) $\rightarrow$ **Transfer Amount**
- **Idempotency Strategy:** `BANK_TRANSFER:{transfer.id}`.
- **Source Document Link:** `sourceType = BANK_TRANSFER`, `sourceId = BankTransfer.id`.
- **Validation & Reconciliation:**
  - Uses real `BankAccount.id` for both legs.
  - Zero P&L impact; purely balance sheet contra reclassification.

---

### 13. Fixed Asset Purchases, Depreciation, and Disposals
- **Triggering Business Event:**
  - *Purchase:* Capital expense approved (`isAsset = true`).
  - *Depreciation:* Periodic depreciation run (`AssetDepreciation` created).
  - *Disposal:* Asset retired or sold (`AssetDisposal` created).
- **Double-Entry Mapping:**
  - *Purchase:*
    - **Debit:** Fixed Assets & Equipment (`asset_fixed`, tagged with asset category) $\rightarrow$ **Gross Cost**
    - **Debit:** Input GST Credit $\rightarrow$ **Eligible ITC**
    - **Credit:** Trade Payables / Bank $\rightarrow$ **Total Cost**
  - *Depreciation:*
    - **Debit:** Depreciation Expense (`cat_exp_depreciation`) $\rightarrow$ **Depreciation Amount**
    - **Credit:** Accumulated Depreciation (`asset_dep_accum`) $\rightarrow$ **Depreciation Amount**
  - *Disposal:*
    - **Debit:** Bank Account (`bankAccountId`) $\rightarrow$ **Sale Proceeds**
    - **Debit:** Accumulated Depreciation (`asset_dep_accum`) $\rightarrow$ **Total Depreciation to Date**
    - **Debit:** Loss on Sale of Assets (if NBV > Proceeds) $\rightarrow$ **Net Loss**
    - **Credit:** Fixed Assets & Equipment (`asset_fixed`) $\rightarrow$ **Gross Historical Cost**
    - **Credit:** Gain on Sale of Assets (if Proceeds > NBV) $\rightarrow$ **Net Gain**
- **Idempotency Strategy:** `ASSET_PURCHASE:{id}`, `ASSET_DEP:{id}`, `ASSET_DISPOSAL:{id}`.
- **Validation & Reconciliation:** Net book value on balance sheet matches asset register.

---

### 14. Loan Receipts, Principal Repayment, and Interest
- **Triggering Business Event:**
  - *Receipt:* Loan disbursed into bank account (`Loan` created).
  - *Repayment:* Monthly debt service recorded (`LoanRepayment` created).
- **Double-Entry Mapping:**
  - *Loan Receipt:*
    - **Debit:** Bank Account (`bankAccountId`) $\rightarrow$ **Principal Disbursed**
    - **Credit:** Long-Term Borrowings (`loan_{id}` sub-ledger) $\rightarrow$ **Loan Principal**
  - *Loan Repayment:*
    - **Debit:** Long-Term Borrowings (`loan_{id}` sub-ledger) $\rightarrow$ **Principal Component**
    - **Debit:** Interest on Borrowings - Finance Cost (`cat_exp_finance_interest`) $\rightarrow$ **Interest Component**
    - **Credit:** Bank Account (`bankAccountId`) $\rightarrow$ **Total EMI / Repayment**
- **Idempotency Strategy:** `LOAN_RECEIPT:{loan.id}`, `LOAN_REPAY:{repayment.id}`.
- **Validation & Reconciliation:** Loan outstanding balance amortizes strictly by principal component.

---

### 15. Opening Balances and Adjustments
- **Triggering Business Event:** Opening balances configured for a new financial year (`OpeningBalance` records created).
- **Posting Mode:** Grouped by financial year and posted as an Opening Journal Voucher.
- **Double-Entry Mapping:**
  - **Debit:** Asset Accounts (Bank, Customer Receivables, Fixed Assets) $\rightarrow$ **Debit Opening Amounts**
  - **Credit:** Liability Accounts (Vendor Payables, Loans, Taxes) $\rightarrow$ **Credit Opening Amounts**
  - **Credit / Debit:** Owner Capital / Retained Earnings $\rightarrow$ **Balancing Equity Difference**
- **Idempotency Strategy:** `OPENING_BALANCE:{financialYear}`.
- **Validation & Reconciliation:**
  - If debits and credits do not balance, the net difference is posted to an **Opening Balance Suspense Account** (`Opening Balance Suspense - Equity`) and flagged for administrative review.
  - Never silently force-adjust operational accounts.

---

### 16. Reversals, Cancellations, and Corrections
- **Triggering Business Event:** Document cancellation, payment voiding, or administrative adjustment.
- **Posting Mode:** Immediate transactional posting.
- **Double-Entry Mapping:**
  - Exact mathematical inverse of the original posted entry:
    - Original Debit lines become Credit lines.
    - Original Credit lines become Debit lines.
- **Idempotency Strategy:** `REVERSAL:{originalEntry.id}`.
- **Source Document Link:** `reversalOfId = originalEntry.id`, `originalEntry.reversedById = reversalEntry.id`.
- **Validation & Reconciliation:**
  - Original entry and reversal entry cancel each other out to exactly ₹0.00 in the general ledger.
  - Source document status updated to `CANCELLED` or `VOID`.
  - Mandatory audit log generated.
