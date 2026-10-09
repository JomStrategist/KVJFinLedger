# FINLEDGER — FROZEN BUSINESS AND ACCOUNTING RULES
**Organization:** KVJ Analytics  
**Business Profile:** Indian Information Technology (IT) and Analytics Services  
**Jurisdiction:** Republic of India (GST & Income Tax Act, 1961)  
**Accounting Basis:** Accrual Basis, Double-Entry Bookkeeping (ICAI & Companies Act 2013 Schedule III)  
**Financial Year:** 1 April to 31 March  
**Reporting Currency:** Indian Rupee (INR / ₹)  
**Document Status:** FROZEN & AUTHORITATIVE  
**Version:** 1.0.0 (Production Quality Standard)

---

## 1. Executive Accounting Charter

FinLedger is the financial ERP of **KVJ Analytics**, an Indian IT and analytics services enterprise.  
This document establishes the frozen accounting, tax, workflow, and navigation rules governing the FinLedger software platform.  
Every calculation, journal voucher, ledger balance, financial statement, and user interaction within FinLedger must strictly adhere to these rules without exception.

---

## Section A1: General Accounting Rules

### RULE-GEN-001: Pure Double-Entry Bookkeeping
- **Rule:** FinLedger strictly enforces double-entry accounting. For every financial event, total debits must exactly equal total credits ($\sum \text{Dr} = \sum \text{Cr}$). Transactions with unequal debits and credits are rejected by the Accounting Engine.
- **Accounting Effect:** Fundamental mathematical equilibrium across all accounts.
- **Affected Module:** `services/accounting-engine.service.ts`, `app/(dashboard)/journals`
- **Mapped Test ID:** `TEST-GEN-001`

### RULE-GEN-002: Accounting Engine & General Ledger as Single Source of Truth
- **Rule:** The Accounting Engine (`AccountingEngine`) and the General Ledger are the sole authoritative sources for all accounting balances, statuses, and reports. Module-level summary tables or caches must never override or diverge from General Ledger vouchers.
- **Accounting Effect:** Guarantees 100% auditability and eliminates duplicate or divergent financial figures.
- **Affected Module:** `services/accounting-engine.service.ts`, `app/(dashboard)/ledgers`
- **Mapped Test ID:** `TEST-GEN-002`

### RULE-GEN-003: Absolute Balance Equilibrium
- **Rule:** Every posted journal entry must validate balance integrity prior to ledger persistence or voucher synthesis.
- **Accounting Effect:** Eliminates "suspense balance" or artificial plug values.
- **Affected Module:** `services/accounting-engine.service.ts`, `app/(dashboard)/reports/trial-balance`
- **Mapped Test ID:** `TEST-GEN-003`

### RULE-GEN-004: Five-Fold Account Classification
- **Rule:** Every ledger account must belong to one of the five core accounting classifications: **Asset**, **Liability**, **Equity**, **Income (Revenue)**, or **Expense**. GST and TDS must be classified explicitly into their statutory asset or liability categories.
- **Accounting Effect:** Ensures correct presentation on the Profit & Loss statement vs. Balance Sheet.
- **Affected Module:** `services/chart-of-accounts.service.ts`, `app/(dashboard)/masters`
- **Mapped Test ID:** `TEST-GEN-004`

### RULE-GEN-005: Non-Duplication on Settlement
- **Rule:** Payments and receipts are balance sheet settlements; they must never create secondary income or expense entries upon disbursement or receipt.
- **Accounting Effect:** Income is recognized on billing; expense is recognized on incurrence. Settlement only exchanges cash/bank for receivable/payable.
- **Affected Module:** `services/tax-invoice.service.ts`, `services/expense.service.ts`
- **Mapped Test ID:** `TEST-GEN-005`

### RULE-GEN-006: Authoritative Derivation of Reports
- **Rule:** All financial statements (Trial Balance, Profit & Loss, Balance Sheet, Cash Flow) must be dynamically derived from posted General Ledger vouchers. No report may store static financial figures independently.
- **Accounting Effect:** Real-time alignment between transaction changes and reporting.
- **Affected Module:** `app/(dashboard)/reports`, `app/(dashboard)/financial-statements`
- **Mapped Test ID:** `TEST-GEN-006`

### RULE-GEN-007: Read-Only Nature of Reports
- **Rule:** Reports are strictly read-only views. Corrections, adjustments, or reversals must be initiated at the source transaction level (Invoice, Expense, Contra, Journal Voucher), which propagates authoritatively to reports.
- **Accounting Effect:** Full audit trail and traceability under Indian Companies Act statutory requirements.
- **Affected Module:** `app/(dashboard)/reports`
- **Mapped Test ID:** `TEST-GEN-007`

### RULE-GEN-008: Indian Financial Year Cycle
- **Rule:** The standard financial year runs from **1 April to 31 March** (e.g., FY 2026–27 is 01-Apr-2026 to 31-Mar-2027). All quarterly and annual filters align to this fiscal calendar.
- **Accounting Effect:** Complies with Section 2(41) of the Indian Income Tax Act.
- **Affected Module:** `services/accounting-engine.service.ts`, `components/YearFilter`
- **Mapped Test ID:** `TEST-GEN-008`

### RULE-GEN-009: Strict INR Functional Currency
- **Rule:** All accounting ledgers, transaction records, tax calculations, and financial statements are expressed in Indian Rupees (INR / ₹) with precision to two decimal places.
- **Accounting Effect:** Single currency consistency without unhedged currency conversion distortion.
- **Affected Module:** `lib/utils/currency.ts`, all client UI tables
- **Mapped Test ID:** `TEST-GEN-009`

### RULE-GEN-010: Permanent Audit Traceability
- **Rule:** Financial events must maintain historical traceability. Transactions with posted settlements or audit dependencies cannot be hard-deleted without leaving reversal and audit logs.
- **Accounting Effect:** Compliance with statutory accounting software audit trail rules (MCA notification G.S.R. 206(E)).
- **Affected Module:** `services/tax-invoice.service.ts`, `services/expense.service.ts`
- **Mapped Test ID:** `TEST-GEN-010`

---

## Section A2: Sales & Customer Invoices

### RULE-SALES-001: Revenue Recognition
- **Rule:** Service value (taxable amount) is recognized as operating income upon confirmation of a Tax Invoice, irrespective of customer payment status.
- **Example:** For an IT consulting invoice of ₹10,000 + 18% GST (₹1,800) = ₹11,800:
  - **Debit:** Accounts Receivable (Customer) ₹11,800
  - **Credit:** Revenue from Operations (Income) ₹10,000
  - **Credit:** Output GST Payable (Liability) ₹1,800
- **Affected Module:** `services/tax-invoice.service.ts`, `app/(dashboard)/invoices`
- **Mapped Test ID:** `TEST-SALES-001`

### RULE-SALES-002: Separation of GST from Operating Revenue
- **Rule:** GST collected on behalf of the Government is a statutory balance sheet liability (Output CGST, Output SGST, or Output IGST) and must never be included in P&L income.
- **Accounting Effect:** Operating revenue on P&L reflects only the net earned service revenue.
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-SALES-002`

### RULE-SALES-003: Accounts Receivable Creation
- **Rule:** Every confirmed tax invoice establishes an Accounts Receivable asset for the gross amount billed until settled.
- **Accounting Effect:** Asset reflects legal claim against the debtor.
- **Affected Module:** `services/tax-invoice.service.ts`, `app/(dashboard)/customers`
- **Mapped Test ID:** `TEST-SALES-003`

### RULE-SALES-004: Flexible Settlement Structure
- **Rule:** Invoices support zero, partial, multiple, or full payments over time.
- **Accounting Effect:** Outstanding balance equals Gross Amount less total settled receipts.
- **Affected Module:** `app/(dashboard)/invoices/[id]`
- **Mapped Test ID:** `TEST-SALES-004`

### RULE-SALES-005: Settlement Does Not Create Revenue
- **Rule:** Recording a payment against an invoice reduces Accounts Receivable and increases Cash/Bank; it creates zero revenue.
- **Accounting Effect:** Prevents double-counting revenue.
- **Affected Module:** `services/tax-invoice.service.ts`
- **Mapped Test ID:** `TEST-SALES-005`

### RULE-SALES-006: Invariance of Invoice Face Value
- **Rule:** Recording partial or full customer receipts does not alter the gross amount, net amount, or tax breakup of the original invoice.
- **Accounting Effect:** Historical invoice contract value remains immutable.
- **Affected Module:** `services/tax-invoice.service.ts`
- **Mapped Test ID:** `TEST-SALES-006`

### RULE-SALES-007: Multi-Line Service Items
- **Rule:** Invoices support multiple service items, each with specific HSN/SAC code, rate, quantity, and GST rate.
- **Accounting Effect:** Line items aggregate to total taxable income and tax components.
- **Affected Module:** `app/(dashboard)/invoices/new`, `app/(dashboard)/invoices/[id]/edit`
- **Mapped Test ID:** `TEST-SALES-007`

### RULE-SALES-008: Whole-Invoice Settlement
- **Rule:** Customer payments are credited against the aggregate balance of the invoice rather than individual line items.
- **Accounting Effect:** Receivable ledger operates at the invoice and customer level.
- **Affected Module:** `services/tax-invoice.service.ts`
- **Mapped Test ID:** `TEST-SALES-008`

### RULE-SALES-009: Clear Distinction: Proforma vs. Tax Invoice
- **Rule:** Proforma Invoices are commercial quotations; they have **zero** accounting or tax impact. Only confirmed Tax Invoices generate journal vouchers and tax liabilities.
- **Accounting Effect:** Proforma creation does not impact P&L, Balance Sheet, or GST returns.
- **Affected Module:** `app/(dashboard)/proforma-invoices`, `services/proforma-invoice.service.ts`
- **Mapped Test ID:** `TEST-SALES-009`

### RULE-SALES-010: Direct Tax Invoice Creation
- **Rule:** The system supports creating direct Tax Invoices without requiring a prior Proforma Invoice.
- **Accounting Effect:** Streamlined billing for direct client mandates.
- **Affected Module:** `app/(dashboard)/invoices/new`
- **Mapped Test ID:** `TEST-SALES-010`

---

## Section A3: Customer Receipts & Customer TDS

### RULE-RCPT-001: Identification of Receipt Attributes
- **Rule:** Every customer receipt record must capture the receipt date, received amount, target Bank/Cash account, payment reference (UTR/cheque/wire), and customer reference.
- **Affected Module:** `app/(dashboard)/invoices/[id]`
- **Mapped Test ID:** `TEST-RCPT-001`

### RULE-RCPT-002: Multiple Installments
- **Rule:** Multiple partial receipts against a single invoice are aggregated cleanly, maintaining individual transaction timestamps and bank references.
- **Affected Module:** `services/tax-invoice.service.ts`
- **Mapped Test ID:** `TEST-RCPT-002`

### RULE-RCPT-003: Asset Exchange Accounting
- **Rule:** Customer receipts increase Bank/Cash and decrease Accounts Receivable by the exact cash amount received.
- **Journal Effect:**
  - **Debit:** Bank / Cash Account
  - **Credit:** Accounts Receivable (Customer)
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-RCPT-003`

### RULE-RCPT-004: Derived Invoice Payment Statuses
- **Rule:** Invoice payment status is authoritatively derived from the relationship between gross amount and settled amounts:
  - If Settled Amount = 0: **Not Paid** (`UNPAID` / `CONFIRMED`)
  - If 0 < Settled Amount < Gross Amount: **Partially Paid** (`PARTIALLY_PAID`)
  - If Settled Amount $\ge$ Gross Amount: **Paid** (`PAID`)
- **Affected Module:** `services/tax-invoice.service.ts`, `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-RCPT-004`

### RULE-RCPT-005: Unallocated Receipts as Customer Advances
- **Rule:** Any receipt not allocated to an invoice is recorded as a **Customer Advance** (Current Liability) rather than revenue.
- **Journal Effect:**
  - **Debit:** Bank Account
  - **Credit:** Customer Advance (Liability)
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-RCPT-005`

### RULE-RCPT-006: Multi-Invoice Allocation
- **Rule:** A single customer bank remittance can be allocated across multiple outstanding invoices of that customer.
- **Affected Module:** `services/tax-invoice.service.ts`
- **Mapped Test ID:** `TEST-RCPT-006`

### RULE-RCPT-007: Overpayment Handling
- **Rule:** Overpayment by a customer in excess of invoice face value creates a Customer Advance credit balance; it must never increase operating revenue.
- **Affected Module:** `services/tax-invoice.service.ts`
- **Mapped Test ID:** `TEST-RCPT-007`

### RULE-RCPT-008: Customer Refund Traceability
- **Rule:** Refunds paid back to customers must link to the original settlement or advance and reduce Bank/Cash while debiting the customer liability/receivable.
- **Journal Effect:**
  - **Debit:** Customer Advance / Receivable
  - **Credit:** Bank Account
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-RCPT-008`

### RULE-RCPT-009: Customer TDS Recognized Only on Actual Deduction
- **Rule:** Customer TDS (under Section 194J / 194C) is recognized as **TDS Receivable** (Current Asset) strictly when the customer actually deducts it during settlement. It must never be accrued prematurely at invoice creation.
- **Affected Module:** `services/tax-invoice.service.ts`, `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-RCPT-009`

### RULE-RCPT-010: Customer TDS Does Not Diminish Revenue
- **Rule:** TDS deducted by customers represents advance tax paid on KVJ's behalf; it does not reduce total earned service income.
- **Example:** For an invoice of ₹11,800, client pays ₹10,800 to bank and deducts ₹1,000 TDS:
  - **Debit:** Bank Account ₹10,800
  - **Debit:** TDS Receivable (Asset) ₹1,000
  - **Credit:** Accounts Receivable (Customer) ₹11,800
  - **P&L Revenue Impact:** Remains exactly ₹10,000.
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-RCPT-010`

### RULE-RCPT-011: Combined Settlement Form
- **Rule:** The payment recording interface must support entering cash received and actual TDS deducted simultaneously, settling the invoice in one unified transaction.
- **Affected Module:** `app/(dashboard)/invoices/[id]`
- **Mapped Test ID:** `TEST-RCPT-011`

---

## Section A4: Vendor Bills & Expenses

### RULE-EXP-001: Accrual of Operating Expenses
- **Rule:** Expenses, purchases, and assets are recognized on the expense transaction date, even if unpaid.
- **Affected Module:** `services/expense.service.ts`, `app/(dashboard)/expenses`
- **Mapped Test ID:** `TEST-EXP-001`

### RULE-EXP-002: Accounts Payable Creation
- **Rule:** Unpaid vendor bills create an Accounts Payable (Sundry Creditors) liability for the gross bill amount.
- **Affected Module:** `services/expense.service.ts`, `app/(dashboard)/vendors`
- **Mapped Test ID:** `TEST-EXP-002`

### RULE-EXP-003: Input GST Treatment
- **Rule:** Eligible GST on business expenses is debited to **Input GST (ITC Receivable)** asset accounts and excluded from P&L expense cost.
- **Example:** Expense ₹10,000 + 18% eligible GST (₹1,800) = ₹11,800:
  - **Debit:** Operating Expense ₹10,000
  - **Debit:** Input GST (Asset) ₹1,800
  - **Credit:** Accounts Payable (Vendor) ₹11,800
- **Affected Module:** `services/expense.service.ts`, `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-EXP-003`

### RULE-EXP-004: Flexible Vendor Bill Settlement
- **Rule:** Vendor payments support zero, partial, multiple, or full payments.
- **Affected Module:** `services/expense.service.ts`
- **Mapped Test ID:** `TEST-EXP-004`

### RULE-EXP-005: Disbursement Does Not Duplicate Expense
- **Rule:** Paying a vendor bill debits Accounts Payable and credits Bank; it does not record a second expense.
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-EXP-005`

### RULE-EXP-006: Multi-Item Vendor Bills
- **Rule:** A single vendor bill may contain multiple line items across different expense categories, each with independent GST rates and ITC eligibility.
- **Affected Module:** `app/(dashboard)/expenses/new`, `app/(dashboard)/expenses/[id]/edit`
- **Mapped Test ID:** `TEST-EXP-006`

### RULE-EXP-007: Full-Bill Settlement
- **Rule:** Vendor payments clear against the overall bill balance rather than individual line items.
- **Affected Module:** `services/expense.service.ts`
- **Mapped Test ID:** `TEST-EXP-007`

### RULE-EXP-008: Four Expense Classifications
- **Rule:** Every expense entry is classified into:
  1. **Expense** (Operating overhead)
  2. **Purchase** (Direct project/delivery cost)
  3. **Fixed Asset** (Capital expenditure)
  4. **Other** (Non-operating items)
- **Affected Module:** `services/expense.service.ts`
- **Mapped Test ID:** `TEST-EXP-008`

### RULE-EXP-009: Capitalization of Fixed Assets
- **Rule:** Fixed asset acquisitions (e.g., Laptops, Servers, Office Equipment) must be capitalized to Balance Sheet asset accounts and never charged directly to P&L operating expenses.
- **Affected Module:** `services/expense.service.ts`, `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-EXP-009`

### RULE-EXP-010: Vendor Advance Handling
- **Rule:** Vendor payments in excess of bill amounts or without bills create **Vendor Advances** (Current Asset), not additional expenses.
- **Affected Module:** `services/expense.service.ts`
- **Mapped Test ID:** `TEST-EXP-010`

---

## Section A5: Expense Payment Modes

### RULE-MOD-001: Strict Two-Mode Enforcement
- **Rule:** FinLedger permits only two user-facing payment modes for expenses:
  1. **KVJ Paid** (Direct company payment via bank/cash)
  2. **Employee Paid** (Paid personally by staff, creating reimbursement liability)
  - *No separate user-facing "Payable Later" mode is permitted.*
- **Affected Module:** `app/(dashboard)/expenses/new`, `app/(dashboard)/expenses/[id]/edit`
- **Mapped Test ID:** `TEST-MOD-001`

### RULE-MOD-002: KVJ Paid Workflow
- **Rule:** Defaults to the company's Primary Bank Account. Allows selection of any active bank/cash account. Supports immediate full, partial, or zero payment at creation, with subsequent payments recorded against the expense.
- **Affected Module:** `services/expense.service.ts`
- **Mapped Test ID:** `TEST-MOD-002`

### RULE-MOD-003: KVJ Paid Statuses
- **Rule:** KVJ Paid expenses display exactly three derived statuses:
  - **Not Paid** (`UNPAID`): Paid amount = 0
  - **Partially Paid** (`PARTIALLY_PAID`): 0 < Paid amount < Net bill
  - **Paid** (`PAID`): Paid amount $\ge$ Net bill
- **Affected Module:** `app/(dashboard)/expenses`
- **Mapped Test ID:** `TEST-MOD-003`

### RULE-MOD-004: Employee Paid Workflow
- **Rule:** Requires selection of an active Employee Master record. Recognizes the business expense immediately upon recording while crediting **Employee Payable** liability. Bank/Cash accounts are untouched until reimbursement occurs.
- **Journal Entry at Expense Recognition:**
  - **Debit:** Business Expense
  - **Credit:** Employee Payable (Current Liability)
- **Affected Module:** `services/expense.service.ts`, `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-MOD-004`

### RULE-MOD-005: Employee Paid Statuses
- **Rule:** Employee Paid expenses display exactly three reimbursement statuses:
  - **Not Reimbursed** (`UNREIMBURSED`): Reimbursed amount = 0
  - **Partially Reimbursed** (`PARTIALLY_REIMBURSED`): 0 < Reimbursed amount < Net expense
  - **Fully Reimbursed** (`REIMBURSED`): Reimbursed amount $\ge$ Net expense
- **Affected Module:** `app/(dashboard)/expenses`
- **Mapped Test ID:** `TEST-MOD-005`

### RULE-MOD-006: Reimbursement Accounting
- **Rule:** Employee reimbursement pays out from Bank/Cash to discharge the Employee Payable liability. It creates zero P&L expense.
- **Journal Entry at Reimbursement:**
  - **Debit:** Employee Payable
  - **Credit:** Bank Account
- **Affected Module:** `services/expense.service.ts`, `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-MOD-006`

---

## Section A6: Employees & Salary

### RULE-EMP-001: Employees Segregated from Vendors
- **Rule:** Employees are distinct legal entities and master records, completely separate from commercial vendors/suppliers. They must never be classified as Trade Payables (Sundry Creditors).
- **Affected Module:** `services/employee.service.ts`, `app/(dashboard)/masters`
- **Mapped Test ID:** `TEST-EMP-001`

### RULE-EMP-002: Dedicated Employee Payable Head
- **Rule:** Liabilities arising from employee-incurred expenses reside in a dedicated **Employee Payable** (Current Liability) account.
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-EMP-002`

### RULE-EMP-003: Multi-Category Reimbursement Claims
- **Rule:** An employee claim may consolidate multiple business expense categories (e.g., travel, meals, stationery) within one bill voucher.
- **Affected Module:** `services/expense.service.ts`
- **Mapped Test ID:** `TEST-EMP-003`

### RULE-EMP-004: Optional Receipt Attachments
- **Rule:** Attaching physical voucher receipts is optional; absence of an image must not block claim processing or accounting posting.
- **Affected Module:** `app/(dashboard)/expenses/new`
- **Mapped Test ID:** `TEST-EMP-004`

### RULE-EMP-005: Salary as Direct Operating Cost
- **Rule:** Salary is an operating expense recognized under Employee Costs / Personnel Expenses.
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-EMP-005`

### RULE-EMP-006: Non-Vendor Classification of Salary
- **Rule:** Salary journal entries debit Salary Expense and credit Bank/Cash or Salary Payable, never Trade Creditors.
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-EMP-006`

### RULE-EMP-007: Salary TDS Accounting (Section 192)
- **Rule:** Where TDS applies to salary, the deducted tax is credited to **TDS Payable (Salary)** (Current Liability) and the net amount is disbursed from Bank.
- **Example:** Gross Salary ₹50,000 with ₹5,000 TDS:
  - **Debit:** Salary Expense ₹50,000
  - **Credit:** Bank Account ₹45,000
  - **Credit:** TDS Payable (Salary) ₹5,000
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-EMP-007`

### RULE-EMP-008: Clear Separation: Reimbursement vs. Salary
- **Rule:** Employee expense reimbursements (asset repayment) and salary disbursements (remuneration for services) remain in separate ledgers and report categories.
- **Affected Module:** `app/(dashboard)/reports?category=employees`
- **Mapped Test ID:** `TEST-EMP-008`

### RULE-EMP-009: Mandatory Working "Add Employee" Option
- **Rule:** The application must provide a functional, accessible option to add, edit, search, and manage employees within both Masters and Expense workflows.
- **Affected Module:** `app/(dashboard)/masters`, `app/(dashboard)/expenses`
- **Mapped Test ID:** `TEST-EMP-009`

---

## Section A7: Vendor TDS (Sections 194C, 194J)

### RULE-VTDS-001: Vendor TDS on Actual Deduction
- **Rule:** Vendor TDS is recorded only when KVJ actually deducts it at the time of payment or bill booking.
- **Affected Module:** `services/expense.service.ts`
- **Mapped Test ID:** `TEST-VTDS-001`

### RULE-VTDS-002: Configured Calculation with User Confirmation
- **Rule:** The system computes expected TDS based on statutory rates (e.g., 2% for 194C, 10% or 2% for 194J) while allowing manual override for special certificates or roundings.
- **Affected Module:** `app/(dashboard)/expenses/new`
- **Mapped Test ID:** `TEST-VTDS-002`

### RULE-VTDS-003: Vendor TDS is a Statutory Liability
- **Rule:** Vendor TDS is credited to **TDS Payable (Vendor)** (Current Liability) to be remitted to the Government by the 7th of the subsequent month.
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-VTDS-003`

### RULE-VTDS-004: TDS Deduction Counts as Bill Settlement
- **Rule:** The amount of TDS deducted from a vendor bill counts toward full settlement of that vendor's payable.
- **Example:** Vendor Bill ₹30,000; TDS deducted ₹2,000; Bank payment ₹28,000:
  - **Debit:** Accounts Payable (Vendor) ₹30,000
  - **Credit:** Bank Account ₹28,000
  - **Credit:** TDS Payable ₹2,000
  - **Vendor Outstanding:** Exactly ₹0.
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-VTDS-004`

### RULE-VTDS-005: Challan Details Not Required for Ledger Settlement
- **Rule:** Bill settlement and voucher creation must not be blocked by absence of government challan / BSR codes, which are entered later upon tax deposit.
- **Affected Module:** `services/expense.service.ts`
- **Mapped Test ID:** `TEST-VTDS-005`

---

## Section A8: GST & Input Tax Credit (ITC)

### RULE-GST-001: Distinct Three-Component GST Structure
- **Rule:** FinLedger separately accounts for Central GST (CGST), State GST (SGST), and Integrated GST (IGST) in dedicated ledger accounts.
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-GST-001`

### RULE-GST-002: Intra-State vs. Inter-State Logic
- **Rule:**
  - If Vendor/Customer State = KVJ State (Kerala, Code 32): **CGST + SGST** (each at half the total GST rate).
  - If Vendor/Customer State $\neq$ KVJ State: **IGST** (at full GST rate).
- **Affected Module:** `lib/constants/indian-states.ts`, `services/tax-invoice.service.ts`
- **Mapped Test ID:** `TEST-GST-002`

### RULE-GST-003: Place of Supply Determination
- **Rule:** Default Place of Supply is the customer/vendor address state, with explicit user override capability for delivery to another location.
- **Affected Module:** `app/(dashboard)/invoices/new`, `app/(dashboard)/expenses/new`
- **Mapped Test ID:** `TEST-GST-003`

### RULE-GST-004: Preserved Export Treatment
- **Rule:** Invoices to overseas clients classified as **B2B_EXPORT** have 0% GST charged, with Place of Supply designated as "96 - Outside India / Export".
- **Affected Module:** `services/tax-invoice.service.ts`
- **Mapped Test ID:** `TEST-GST-004`

### RULE-GST-005: Transaction-Level ITC Eligibility
- **Rule:** ITC eligibility is decided per expense line item, not locked at the vendor level.
- **Affected Module:** `app/(dashboard)/expenses/new`
- **Mapped Test ID:** `TEST-GST-005`

### RULE-GST-006: Eligible ITC Excluded from Cost
- **Rule:** Eligible Input GST is debited to Input Tax Credit Asset; it is strictly excluded from P&L expense cost.
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-GST-006`

### RULE-GST-007: Ineligible ITC Capitalized into Expense Cost
- **Rule:** Where ITC is ineligible (e.g., Section 17(5) blocked credits like food/beverages or personal use), the GST amount is added to the expense cost or asset value.
- **Example:** Ineligible expense of ₹10,000 + ₹1,800 GST:
  - **Debit:** Operating Expense ₹11,800
  - **Credit:** Bank / Payable ₹11,800
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-GST-007`

### RULE-GST-008: Warning for GST Charged Without GSTIN
- **Rule:** If a vendor charges GST but has no registered GSTIN, the system prompts with an audit warning.
- **Affected Module:** `app/(dashboard)/expenses/new`
- **Mapped Test ID:** `TEST-GST-008`

### RULE-GST-009: Unregistered Vendors Generate Zero ITC
- **Rule:** Vendors marked unregistered or without GST charged must never generate Input GST assets or ITC claims.
- **Affected Module:** `services/expense.service.ts`
- **Mapped Test ID:** `TEST-GST-009`

### RULE-GST-010: No Silent Assumptions on ITC
- **Rule:** The system must never silently assume 100% ITC eligibility without explicit line-item confirmation or configuration.
- **Affected Module:** `app/(dashboard)/expenses`
- **Mapped Test ID:** `TEST-GST-010`

---

## Section A9: Advances, Refunds & Payment History

### RULE-ADV-001: Segregated Advance Accounts
- **Rule:** Customer Advances (Liability) and Vendor Advances (Asset) are maintained in distinct control ledgers.
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-ADV-001`

### RULE-ADV-002: Cross-Invoice Advance Allocation
- **Rule:** Accumulated advances can be allocated against future or existing invoices and bills, generating an adjusting voucher.
- **Affected Module:** `services/tax-invoice.service.ts`
- **Mapped Test ID:** `TEST-ADV-002`

### RULE-ADV-003: Residual Advance Availability
- **Rule:** Partial allocation leaves unallocated advance funds available for subsequent bills without manual re-entry.
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-ADV-003`

### RULE-ADV-004: Refund Accounting
- **Rule:** Refunding an advance reverses the cash and liability balances cleanly without touching income or expense.
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-ADV-004`

### RULE-ADV-005: Payment Editing Recomputes Balances
- **Rule:** Editing a recorded payment automatically recalculates invoice outstanding, settlement status, and journal entries.
- **Affected Module:** `services/tax-invoice.service.ts`
- **Mapped Test ID:** `TEST-ADV-005`

### RULE-ADV-006: Cancellation Preserves Auditability
- **Rule:** Cancelling a payment voids its financial effect while maintaining an immutable audit log record.
- **Affected Module:** `services/tax-invoice.service.ts`
- **Mapped Test ID:** `TEST-ADV-006`

### RULE-ADV-007: Prevention of Orphan Records
- **Rule:** Payment deletion cleanses child vouchers and recalculates parent invoice status back to its true balance.
- **Affected Module:** `services/tax-invoice.service.ts`
- **Mapped Test ID:** `TEST-ADV-007`

### RULE-ADV-008: Blocked Deletion for Settled Records
- **Rule:** Invoices or bills with active payment history cannot be deleted until payments are explicitly reversed or cancelled.
- **Affected Module:** `services/tax-invoice.service.ts`, `services/expense.service.ts`
- **Mapped Test ID:** `TEST-ADV-008`

### RULE-ADV-009: Immutability of Historical Bank Accounts
- **Rule:** Changing the company's default Primary Bank Account in Settings does not alter the historical bank accounts assigned to past transactions.
- **Affected Module:** `services/bank-account.service.ts`
- **Mapped Test ID:** `TEST-ADV-009`

---

## Section A10: Banking, Assets, Loans & Opening Balances

### RULE-BNK-001: Contra Bank Transfers are Zero P&L
- **Rule:** Internal transfers between company accounts (e.g., Current Account to Petty Cash) are Contra vouchers. They impact zero revenue, expense, GST, or TDS.
- **Journal Effect:**
  - **Debit:** Destination Bank / Cash Account
  - **Credit:** Source Bank / Cash Account
- **Affected Module:** `services/bank-transfer.service.ts`, `app/(dashboard)/bank-transfers`
- **Mapped Test ID:** `TEST-BNK-001`

### RULE-BNK-002: Opening Balances Excluded from Current Income
- **Rule:** Opening balances entered via the Opening/Closing module represent brought-forward historical positions; they must never appear in current-year P&L income or expenses.
- **Affected Module:** `services/opening-closing.service.ts`, `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-BNK-002`

### RULE-BNK-003: Preserving Invoice Breakdown in Opening Balances
- **Rule:** Opening debtor and creditor balances maintain individual invoice/bill numbers and dates for tracking aging.
- **Affected Module:** `app/(dashboard)/opening-closing`
- **Mapped Test ID:** `TEST-BNK-003`

### RULE-BNK-004: Fixed Asset Lifecycle
- **Rule:** Fixed assets support capitalization, accumulated depreciation (Companies Act Schedule II rates), and gain/loss on disposal.
- **Affected Module:** `services/depreciation.service.ts`, `services/asset-disposal.service.ts`
- **Mapped Test ID:** `TEST-BNK-004`

### RULE-BNK-005: Loan Receipts are Liabilities
- **Rule:** Receiving a commercial or director loan increases Bank/Cash and increases Loan Liability; it is never recognized as income.
- **Journal Effect:**
  - **Debit:** Bank Account
  - **Credit:** Loan Account (Liability)
- **Affected Module:** `services/loan.service.ts`
- **Mapped Test ID:** `TEST-BNK-005`

### RULE-BNK-006: Loan Principal Repayment Reduces Liability
- **Rule:** Principal repayments debit Loan Liability and credit Bank; they are excluded from P&L operating expenses.
- **Affected Module:** `services/loan.service.ts`
- **Mapped Test ID:** `TEST-BNK-006`

### RULE-BNK-007: Loan Interest is Finance Cost
- **Rule:** Interest paid on loans is recognized as a Finance Cost expense in P&L, separate from principal repayment.
- **Journal Effect:**
  - **Debit:** Finance Cost — Interest Expense (P&L)
  - **Debit:** Loan Liability (Principal portion)
  - **Credit:** Bank Account (Total outflow)
- **Affected Module:** `services/loan.service.ts`
- **Mapped Test ID:** `TEST-BNK-007`

### RULE-BNK-008: Non-Destructive Bank Reconciliation
- **Rule:** Bank reconciliation matches ledger vouchers with statement feeds. It identifies timing differences without altering original transaction dates or payment statuses.
- **Affected Module:** `services/bank-reconciliation.service.ts`, `app/(dashboard)/bank-transfers/reconciliation`
- **Mapped Test ID:** `TEST-BNK-008`

---

## Section A11: Reports Architecture & Financial Statements

### RULE-RPT-001: 11 Authoritative Report Categories
- **Rule:** FinLedger organizes reports into 11 categories:
  1. Executive Reports
  2. Financial Statements
  3. Sales & Receivables
  4. Expenses & Payables
  5. GST & Tax
  6. TDS
  7. Banking & Cash
  8. Fixed Assets
  9. Employees & Salary
  10. Analysis
  11. Audit
- **Affected Module:** `app/(dashboard)/reports`
- **Mapped Test ID:** `TEST-RPT-001`

### RULE-RPT-002: Financial Statements Ribbon
- **Rule:** Financial Statements comprises five standardized views:
  - **Trial Balance**
  - **Profit & Loss Account**
  - **Balance Sheet**
  - **Cash Flow Statement**
  - **Comparative Analysis**
- **Affected Module:** `app/(dashboard)/reports?category=statements`, `app/(dashboard)/financial-statements`
- **Mapped Test ID:** `TEST-RPT-002`

### RULE-RPT-003: Trial Balance Equilibrium
- **Rule:** Total Debits must equal Total Credits exactly ($\Delta = 0.00$) for any selected date range.
- **Affected Module:** `app/(dashboard)/reports/trial-balance`
- **Mapped Test ID:** `TEST-RPT-003`

### RULE-RPT-004: Balance Sheet Schedule III Equilibrium
- **Rule:** Total Assets must exactly equal Total Liabilities + Equity ($\text{Assets} = \text{Liabilities} + \text{Equity}$).
- **Affected Module:** `app/(dashboard)/reports/balance-sheet`
- **Mapped Test ID:** `TEST-RPT-004`

### RULE-RPT-005: Cash Flow Closing Reconciliation
- **Rule:** Cash Flow closing cash & bank balances must reconcile with the Balance Sheet Cash & Cash Equivalents figure.
- **Affected Module:** `services/accounting-engine.service.ts`
- **Mapped Test ID:** `TEST-RPT-005`

### RULE-RPT-006: General Ledger to Voucher Agreement
- **Rule:** Every balance reported on the General Ledger must equal the mathematical sum of its constituent journal vouchers.
- **Affected Module:** `app/(dashboard)/ledgers`
- **Mapped Test ID:** `TEST-RPT-006`

---

## Section A12: Frozen Navigation Model

### RULE-NAV-001: Primary Left Sidebar (11 Items)
- **Rule:** The primary application navigation consists of 11 items:
  1. `Dashboard` (`/dashboard`)
  2. `Ledgers` (`/ledgers`)
  3. `Journal` (`/journals`)
  4. `Invoice` (`/invoices`)
  5. `Expense` (`/expenses`)
  6. `Banking & Cash` (`/bank-transfers`)
  7. `Masters` (`/masters`)
  8. `Users` (`/users`)
  9. `Reports` (`/reports`)
  10. `Opening/Closing` (`/opening-closing`)
  11. `Settings` (`/settings`)
- **Affected Module:** `components/Sidebar.tsx`
- **Mapped Test ID:** `TEST-NAV-001`

### RULE-NAV-002: Invoice Module Ribbon
- **Rule:** The Invoice module provides sub-navigation via a top ribbon:
  - **Confirmed Invoices** (`/invoices`)
  - **Proforma Invoices** (`/proforma-invoices`)
  - **Customers** (`/customers`)
- **Affected Module:** `components/InvoiceSubnav.tsx`, `components/Sidebar.tsx`
- **Mapped Test ID:** `TEST-NAV-002`

### RULE-NAV-003: Expense Module Ribbon
- **Rule:** The Expense module provides sub-navigation via a top ribbon:
  - **Expenses** (`/expenses?tab=expenses`)
  - **Vendors** (`/expenses?tab=vendors`)
  - **Employees** (`/expenses?tab=employees`)
- **Affected Module:** `app/(dashboard)/expenses/page.tsx`
- **Mapped Test ID:** `TEST-NAV-003`

### RULE-NAV-004: Category-Level Navigation Restriction
- **Rule:** Only the **Reports** module uses category-level sub-navigation and deep drill-down. Other modules must not convert filters or temporary statuses into deep navigation trees.
- **Affected Module:** `components/Sidebar.tsx`, `app/(dashboard)/reports`
- **Mapped Test ID:** `TEST-NAV-004`

---

## Complete Business Rules Mapping Table

| Rule ID | Module | Title | Primary Journal / Accounting Effect | Mapped Test ID |
| :--- | :--- | :--- | :--- | :--- |
| `RULE-GEN-001` | Accounting Engine | Pure Double-Entry Bookkeeping | $\sum \text{Dr} = \sum \text{Cr}$ enforced strictly | `TEST-GEN-001` |
| `RULE-GEN-002` | Ledgers | Single Source of Truth | GL is authoritative for all reporting | `TEST-GEN-002` |
| `RULE-GEN-003` | Trial Balance | Absolute Equilibrium | Zero difference tolerance | `TEST-GEN-003` |
| `RULE-GEN-004` | Chart of Accounts | Five-Fold Classification | Asset, Liability, Equity, Income, Expense | `TEST-GEN-004` |
| `RULE-GEN-005` | Invoices / Expenses | Settlement Non-Duplication | Settlements adjust AR/AP, zero P&L impact | `TEST-GEN-005` |
| `RULE-GEN-006` | Reports | Dynamic Report Derivation | Reports computed dynamically from GL | `TEST-GEN-006` |
| `RULE-GEN-007` | Reports | Read-Only Reports | Adjustments made only at source vouchers | `TEST-GEN-007` |
| `RULE-GEN-008` | Settings / Filters | Financial Year 1 Apr – 31 Mar | Indian fiscal cycle compliance | `TEST-GEN-008` |
| `RULE-GEN-009` | Global UI | INR Functional Currency | Precision to 2 decimal places | `TEST-GEN-009` |
| `RULE-GEN-010` | Audit | Audit Trail Traceability | Immutable voucher audit trail | `TEST-GEN-010` |
| `RULE-SALES-001`| Invoices | Revenue Recognition | Dr AR, Cr Revenue, Cr Output GST | `TEST-SALES-001`|
| `RULE-SALES-002`| Invoices | GST Separation from Revenue | Output GST is a balance sheet liability | `TEST-SALES-002`|
| `RULE-SALES-003`| Invoices | AR Asset Recognition | Gross invoice creates Accounts Receivable | `TEST-SALES-003`|
| `RULE-SALES-004`| Invoices | Flexible Settlements | Zero, partial, full payments supported | `TEST-SALES-004`|
| `RULE-SALES-005`| Invoices | Payment Non-Duplication | Cash received reduces AR, zero new revenue | `TEST-SALES-005`|
| `RULE-SALES-006`| Invoices | Invariant Face Value | Invoice billed value is immutable | `TEST-SALES-006`|
| `RULE-SALES-007`| Invoices | Multi-Line Service Lines | Multiple SAC codes and tax rates per bill | `TEST-SALES-007`|
| `RULE-SALES-008`| Invoices | Whole-Invoice Settlement | Payment allocated across invoice total | `TEST-SALES-008`|
| `RULE-SALES-009`| Proforma | Proforma Zero Impact | Proforma creates zero journal entries | `TEST-SALES-009`|
| `RULE-SALES-010`| Invoices | Direct Tax Invoice Creation| Direct creation supported without Proforma | `TEST-SALES-010`|
| `RULE-RCPT-001` | Invoices | Receipt Metadata Capture | Date, Bank account, UTR/ref required | `TEST-RCPT-001` |
| `RULE-RCPT-002` | Invoices | Multiple Receipts per Invoice| Installment payments supported | `TEST-RCPT-002` |
| `RULE-RCPT-003` | Invoices | Cash vs. AR Swap | Dr Bank, Cr Accounts Receivable | `TEST-RCPT-003` |
| `RULE-RCPT-004` | Invoices | Derived Payment Statuses | Not Paid, Partially Paid, Paid | `TEST-RCPT-004` |
| `RULE-RCPT-005` | Invoices | Customer Advances | Unallocated receipt = Current Liability | `TEST-RCPT-005` |
| `RULE-RCPT-006` | Invoices | Multi-Invoice Receipt Split | Single receipt split across invoices | `TEST-RCPT-006` |
| `RULE-RCPT-007` | Invoices | Customer Overpayment | Surplus amount credited to Advance | `TEST-RCPT-007` |
| `RULE-RCPT-008` | Invoices | Customer Refund | Dr Customer Advance, Cr Bank | `TEST-RCPT-008` |
| `RULE-RCPT-009` | Invoices | Actual Customer TDS | TDS Receivable recognized on receipt | `TEST-RCPT-009` |
| `RULE-RCPT-010` | Invoices | TDS Revenue Invariance | Dr Bank, Dr TDS Recv, Cr AR (Revenue unaffected) | `TEST-RCPT-010` |
| `RULE-RCPT-011` | Invoices | Unified Settlement UI | Single dialog captures Bank + TDS | `TEST-RCPT-011` |
| `RULE-EXP-001`  | Expenses | Accrual of Operating Expenses | Expense recognized on date of incurrence | `TEST-EXP-001`  |
| `RULE-EXP-002`  | Expenses | Accounts Payable Recognition | Unpaid bills create Trade Payables | `TEST-EXP-002`  |
| `RULE-EXP-003`  | Expenses | Input GST (ITC) Treatment | Dr Expense, Dr Input GST, Cr Vendor | `TEST-EXP-003`  |
| `RULE-EXP-004`  | Expenses | Flexible Bill Settlement | Zero, partial, or full payment | `TEST-EXP-004`  |
| `RULE-EXP-005`  | Expenses | Bill Payment Non-Duplication | Dr Vendor Payable, Cr Bank (Zero P&L impact) | `TEST-EXP-005`  |
| `RULE-EXP-006`  | Expenses | Multi-Item Vendor Bills | Multiple expense heads per single bill | `TEST-EXP-006`  |
| `RULE-EXP-007`  | Expenses | Full-Bill Settlement | Payment settles overall vendor bill | `TEST-EXP-007`  |
| `RULE-EXP-008`  | Expenses | Expense Classification | Expense, Purchase, Fixed Asset, Other | `TEST-EXP-008`  |
| `RULE-EXP-009`  | Expenses | Fixed Asset Capitalization | Fixed assets capitalized to Balance Sheet | `TEST-EXP-009`  |
| `RULE-EXP-010`  | Expenses | Vendor Advances | Advance payments tracked as Asset | `TEST-EXP-010`  |
| `RULE-MOD-001`  | Expenses | Strict Two Modes Only | Only KVJ Paid & Employee Paid allowed | `TEST-MOD-001`  |
| `RULE-MOD-002`  | Expenses | KVJ Paid Bank Workflow | Paid from Primary or selected bank | `TEST-MOD-002`  |
| `RULE-MOD-003`  | Expenses | KVJ Paid Statuses | Not Paid, Partially Paid, Paid | `TEST-MOD-003`  |
| `RULE-MOD-004`  | Expenses | Employee Paid Workflow | Dr Expense, Cr Employee Payable | `TEST-MOD-004`  |
| `RULE-MOD-005`  | Expenses | Employee Paid Statuses | Not Reimbursed, Partially, Reimbursed | `TEST-MOD-005`  |
| `RULE-MOD-006`  | Expenses | Reimbursement Accounting | Dr Employee Payable, Cr Bank | `TEST-MOD-006`  |
| `RULE-EMP-001`  | Employees | Employee vs. Vendor Separation| Employees segregated from Trade Creditors | `TEST-EMP-001`  |
| `RULE-EMP-002`  | Employees | Employee Payable Head | Dedicated Current Liability ledger | `TEST-EMP-002`  |
| `RULE-EMP-003`  | Employees | Multi-Category Claims | Consolidated reimbursement claims | `TEST-EMP-003`  |
| `RULE-EMP-004`  | Employees | Optional Receipt Upload | Image attachment is non-blocking | `TEST-EMP-004`  |
| `RULE-EMP-005`  | Employees | Salary as Operating Cost | Personnel cost in P&L | `TEST-EMP-005`  |
| `RULE-EMP-006`  | Employees | Salary Non-Vendor Posting | Dr Salary Expense, Cr Bank / Payable | `TEST-EMP-006`  |
| `RULE-EMP-007`  | Employees | Salary TDS (Sec 192) | Dr Salary, Cr Bank, Cr TDS Payable | `TEST-EMP-007`  |
| `RULE-EMP-008`  | Employees | Reimbursement vs. Salary | Maintained in distinct accounts | `TEST-EMP-008`  |
| `RULE-EMP-009`  | Employees | Working Add Employee Option | Accessible UI across Masters and Expenses | `TEST-EMP-009`  |
| `RULE-VTDS-001` | Expenses | Vendor TDS Actual Deduction | Recognized when KVJ deducts tax | `TEST-VTDS-001` |
| `RULE-VTDS-002` | Expenses | Statutory TDS Calculation | Auto-calculated with override support | `TEST-VTDS-002` |
| `RULE-VTDS-003` | Expenses | Vendor TDS Liability | Credited to TDS Payable (Liability) | `TEST-VTDS-003` |
| `RULE-VTDS-004` | Expenses | TDS Clears Bill Balance | Dr Vendor, Cr Bank, Cr TDS Payable | `TEST-VTDS-004` |
| `RULE-VTDS-005` | Expenses | Non-Blocking Challan | Settlement doesn't require Challan BSR | `TEST-VTDS-005` |
| `RULE-GST-001`  | GST | Three-Component GST | Separate CGST, SGST, IGST ledgers | `TEST-GST-001`  |
| `RULE-GST-002`  | GST | Intra vs. Inter-State | Kerala (32) = CGST+SGST; Other = IGST | `TEST-GST-002`  |
| `RULE-GST-003`  | GST | Place of Supply | Determined by destination state | `TEST-GST-003`  |
| `RULE-GST-004`  | GST | Export GST Treatment | Overseas export = 0% tax, POS = 96 | `TEST-GST-004`  |
| `RULE-GST-005`  | GST | Line-Level ITC Eligibility | Independent ITC per item | `TEST-GST-005`  |
| `RULE-GST-006`  | GST | Eligible ITC Excluded from Cost| Dr Input GST asset, not P&L cost | `TEST-GST-006`  |
| `RULE-GST-007`  | GST | Ineligible ITC Capitalized | Ineligible tax merged into expense cost | `TEST-GST-007`  |
| `RULE-GST-008`  | GST | Unregistered Vendor Warning | Audit alert if GST charged without GSTIN | `TEST-GST-008`  |
| `RULE-GST-009`  | GST | Unregistered Zero ITC | Zero Input GST on unregistered suppliers | `TEST-GST-009`  |
| `RULE-GST-010`  | GST | No Silent Assumptions | Explicit ITC confirmation required | `TEST-GST-010`  |
| `RULE-ADV-001`  | Advances | Segregated Control Ledgers | Separate Customer & Vendor Advance heads | `TEST-ADV-001`  |
| `RULE-ADV-002`  | Advances | Advance Allocation | Advance offset reduces invoice payable | `TEST-ADV-002`  |
| `RULE-ADV-003`  | Advances | Residual Balance Retained | Unallocated balance remains available | `TEST-ADV-003`  |
| `RULE-ADV-004`  | Advances | Advance Refund | Reverses cash & liability without P&L impact | `TEST-ADV-004`  |
| `RULE-ADV-005`  | Payments | Payment Editing Recomputes | Auto-updates AR/AP balances | `TEST-ADV-005`  |
| `RULE-ADV-006`  | Payments | Cancellation Auditability | Voids vouchers while preserving log | `TEST-ADV-006`  |
| `RULE-ADV-007`  | Payments | No Orphan Records | Cascading reversal clears child vouchers | `TEST-ADV-007`  |
| `RULE-ADV-008`  | Audit | Blocked Deletion on History | Settled invoices cannot be deleted | `TEST-ADV-008`  |
| `RULE-ADV-009`  | Settings | Immutability of Past Bank Links| Primary bank switch doesn't alter past data | `TEST-ADV-009`  |
| `RULE-BNK-001`  | Banking | Internal Contra Transfers | Dr Bank B, Cr Bank A (Zero P&L / GST) | `TEST-BNK-001`  |
| `RULE-BNK-002`  | Opening | Opening Balances Zero P&L | Brought-forward balance excluded from P&L | `TEST-BNK-002`  |
| `RULE-BNK-003`  | Opening | Detailed Debtor/Creditor Aging | Preserves historical bill reference | `TEST-BNK-003`  |
| `RULE-BNK-004`  | Assets | Fixed Asset Schedule II | Asset capitalization, depreciation & disposal | `TEST-BNK-004`  |
| `RULE-BNK-005`  | Loans | Loan Receipt is Liability | Dr Bank, Cr Loan Liability (Zero income) | `TEST-BNK-005`  |
| `RULE-BNK-006`  | Loans | Loan Principal Repayment | Dr Loan Liability, Cr Bank (Zero expense) | `TEST-BNK-006`  |
| `RULE-BNK-007`  | Loans | Loan Interest Accounting | Dr Finance Cost, Cr Bank | `TEST-BNK-007`  |
| `RULE-BNK-008`  | Banking | Non-Destructive Reconciliation | Reconciles dates without changing vouchers | `TEST-BNK-008`  |
| `RULE-RPT-001`  | Reports | 11 Core Report Categories | Structured reporting hierarchy | `TEST-RPT-001`  |
| `RULE-RPT-002`  | Reports | 5 Financial Statements | TB, P&L, BS, CF, Comparative | `TEST-RPT-002`  |
| `RULE-RPT-003`  | Reports | Trial Balance Equilibrium | Dr = Cr exact mathematical balance | `TEST-RPT-003`  |
| `RULE-RPT-004`  | Reports | Schedule III Balance Sheet | Assets = Liabilities + Equity exactly | `TEST-RPT-004`  |
| `RULE-RPT-005`  | Reports | Cash Flow Closing Reconciliation| Closing Cash matches Balance Sheet Cash | `TEST-RPT-005`  |
| `RULE-RPT-006`  | Reports | General Ledger Agreement | Account balance = sum of vouchers | `TEST-RPT-006`  |
| `RULE-NAV-001`  | Navigation | 11-Item Sidebar Navigation | Frozen standard left sidebar | `TEST-NAV-001`  |
| `RULE-NAV-002`  | Navigation | Invoice Module Ribbon | Confirmed Invoices, Proforma, Customers | `TEST-NAV-002`  |
| `RULE-NAV-003`  | Navigation | Expense Module Ribbon | Expenses, Vendors, Employees | `TEST-NAV-003`  |
| `RULE-NAV-004`  | Navigation | Category Sub-Nav Restriction | Sub-navigation permitted only in Reports | `TEST-NAV-004`  |
