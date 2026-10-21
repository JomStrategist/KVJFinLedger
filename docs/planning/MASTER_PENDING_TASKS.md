# FINLEDGER ERP — MASTER PENDING TASKS REGISTER

**Organization:** KVJ Analytics (Indian IT & Analytics Services)  
**System:** FinLedger ERP  
**Document Type:** Master Implementation Task Register  
**Audit Baseline Date:** 21 October 2026  
**Document Status:** ACTIVE REGISTER — ALL TASKS PENDING IMPLEMENTATION  

> [!IMPORTANT]
> In accordance with the prompt audit baseline restrictions, all tasks listed in this register represent confirmed gaps and requirements. All tasks are set to **`Pending`** status until implementation is authorized and executed in subsequent prompts.

---

## 1. Master Task Inventory Summary

| Phase | Phase Name | Focus Area | Task Count | Priority Distribution |
| :---: | :--- | :--- | :---: | :---: |
| **Phase 1** | Security, Auth & Environmental Hardening | NextAuth, Middleware, Server Actions, Secrets | 6 | 4 Critical, 2 High |
| **Phase 2** | Data Model, General Ledger & Monetary Precision | Prisma Schema, `JournalEntry`, Precision & Rounding | 6 | 3 Critical, 3 High |
| **Phase 3** | Invoice Preservation & Customer Receipts | Numbering concurrency, idempotency, Payment bank link | 5 | 2 High, 3 Medium |
| **Phase 4** | Expenses, Payroll & Banking Modernization | Accruals, inter-bank transfers, payroll batch sequencing | 6 | 2 High, 4 Medium |
| **Phase 5** | Statutory Tax, Fixed Assets & Multi-Year Continuity | GST settlement consolidation, TDS, Depreciation, Retained Earnings | 6 | 3 High, 3 Medium |
| **Phase 6** | Reports, Statements & Reconciliation Engine | Dynamic GL queries, Trial Balance, P&L, Balance Sheet, Cash Flow | 5 | 2 High, 3 Medium |
| **Phase 7** | Automated Testing, Backup/Restore & Release Readiness | Vitest/Playwright, Restore tool, Excel Tracker, Auditing | 6 | 2 High, 4 Medium |
| **Total** | | | **40 Tasks** | **7 Critical, 18 High, 15 Medium** |

---

## 2. Phase 1: Security, Authentication & Environmental Hardening

### TASK-SEC-001: Eliminate Hardcoded Secrets & Enforce Environment Guards
- **Module:** Security & Auth
- **Priority:** Critical
- **Dependencies:** None
- **Target Files:** [`auth.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/auth.ts), [`auth.config.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/auth.config.ts)
- **Description:** Remove fallback default secret `"ATG7kBWRrKlZnzMiJ8wYXjFt5O2eQc3p"`. Enforce strict startup validation that requires a 32+ character `AUTH_SECRET` environment variable.
- **Acceptance Criteria:** Application refuses to boot if `AUTH_SECRET` is unset; no fallback secret exists in source code.
- **Proposed Phase:** Phase 1 (Prompt 2)
- **Status:** `Pending`

### TASK-SEC-002: Purge Hardcoded Backdoor Credentials from Credentials Provider
- **Module:** Authentication
- **Priority:** Critical
- **Dependencies:** TASK-SEC-001
- **Target Files:** [`auth.ts#L22-L41`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/auth.ts#L22-L41)
- **Description:** Remove hardcoded email/password branches for `info@thestrategist.co.in` and `mail@thestrategist.co.in`. Authenticate all users strictly through bcrypt password hash comparison against the database `User` collection.
- **Acceptance Criteria:** No plain-text passwords or bypass accounts exist in source code; all logins require active user records with valid bcrypt hashes.
- **Proposed Phase:** Phase 1 (Prompt 2)
- **Status:** `Pending`

### TASK-SEC-003: Implement Next.js Edge Middleware for Route Protection
- **Module:** Authentication & Routing
- **Priority:** Critical
- **Dependencies:** TASK-SEC-001, TASK-SEC-002
- **Target Files:** `middleware.ts` (new file)
- **Description:** Create root `middleware.ts` integrating NextAuth v5 session validation. Automatically protect all `/(dashboard)/` routes and private `/api/` endpoints, redirecting unauthenticated requests to `/login`.
- **Acceptance Criteria:** Unauthenticated HTTP requests to `/dashboard`, `/invoices`, `/reports`, etc., receive immediate redirect to `/login` before rendering layouts.
- **Proposed Phase:** Phase 1 (Prompt 2)
- **Status:** `Pending`

### TASK-SEC-004: Secure All Server Actions with Session & Role Authorization
- **Module:** Server Actions & RBAC
- **Priority:** High
- **Dependencies:** TASK-SEC-003
- **Target Files:** 17 files across `app/(dashboard)/**/actions.ts`
- **Description:** Add `await requireAuth()` checks to all unprotected Server Actions (`createTaxInvoiceAction`, `recordInvoicePaymentAction`, `createExpenseAction`, `createBankTransferAction`, etc.) and enforce role permissions (`ADMIN` vs `USER`).
- **Acceptance Criteria:** Calling any server action without a valid session throws an unauthorized error; actions execute only with valid user context.
- **Proposed Phase:** Phase 1 (Prompt 2)
- **Status:** `Pending`

### TASK-SEC-005: Decommission or Secure Diagnostic API Endpoint
- **Module:** API Security
- **Priority:** High
- **Dependencies:** TASK-SEC-003
- **Target Files:** [`app/api/test-db/route.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/app/api/test-db/route.ts)
- **Description:** Remove secret length, admin email, and stack trace disclosure from `/api/test-db`. Convert into an authenticated health check endpoint returning sanitized `{ status: "ok" }`.
- **Acceptance Criteria:** Public unauthenticated requests receive 401 Unauthorized; responses never disclose stack traces or environment metadata.
- **Proposed Phase:** Phase 1 (Prompt 2)
- **Status:** `Pending`

### TASK-SEC-006: Secure Account Ledger Statement API Endpoint
- **Module:** API Security & Data Protection
- **Priority:** High
- **Dependencies:** TASK-SEC-003
- **Target Files:** [`app/api/ledgers/statement/route.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/app/api/ledgers/statement/route.ts)
- **Description:** Enforce session authentication and RBAC verification on `GET /api/ledgers/statement`.
- **Acceptance Criteria:** Unauthenticated requests return 401; authenticated users can access only authorized ledger data.
- **Proposed Phase:** Phase 1 (Prompt 2)
- **Status:** `Pending`

---

## 3. Phase 2: Data Model, General Ledger & Monetary Precision

### TASK-GL-001: Model Persistent General Ledger Collections in Prisma
- **Module:** Database & ORM
- **Priority:** Critical
- **Dependencies:** TASK-SEC-004
- **Target Files:** [`prisma/schema.prisma`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/prisma/schema.prisma)
- **Description:** Add `JournalEntry` and `JournalLine` models to the Prisma schema. `JournalEntry` represents an immutable voucher (voucherNumber, voucherType, date, narration, sourceType, sourceId, isBalanced). `JournalLine` stores individual balanced lines (accountId, debit, credit, particulars, entityId, entityType).
- **Acceptance Criteria:** Schema compiles cleanly with `prisma generate`; relations between journal entries and lines support atomic creation.
- **Proposed Phase:** Phase 2 (Prompt 3)
- **Status:** `Pending`

### TASK-GL-002: Implement Statutory MCA Audit Trail Model
- **Module:** Database & Compliance
- **Priority:** Critical
- **Dependencies:** TASK-GL-001
- **Target Files:** [`prisma/schema.prisma`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/prisma/schema.prisma), `services/audit.service.ts` (new file)
- **Description:** Add `AuditLog` model to track entity modifications (entityName, entityId, action: CREATE/UPDATE/DELETE/CANCEL, changedBy, timestamp, oldValues, newValues, justification).
- **Acceptance Criteria:** Meets Indian MCA notification G.S.R. 206(E) requirements for unalterable accounting software audit trail.
- **Proposed Phase:** Phase 2 (Prompt 3)
- **Status:** `Pending`

### TASK-GL-003: Model Fiscal Period & Accounting Close Records
- **Module:** Database & Financial Controls
- **Priority:** High
- **Dependencies:** TASK-GL-001
- **Target Files:** [`prisma/schema.prisma`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/prisma/schema.prisma)
- **Description:** Add `FiscalPeriod` model (financialYear, startDate, endDate, isClosed, closedAt, closedBy). Prevent posting transactions into closed fiscal periods.
- **Acceptance Criteria:** Transactions dated within a closed fiscal period are rejected by the posting engine.
- **Proposed Phase:** Phase 2 (Prompt 3)
- **Status:** `Pending`

### TASK-GL-004: Standardize Fixed 2-Decimal Monetary Precision
- **Module:** Core Utilities & Accounting
- **Priority:** Critical
- **Dependencies:** TASK-GL-001
- **Target Files:** `lib/utils/currency.ts`, `services/accounting-engine.service.ts`
- **Description:** Create deterministic precision utility `roundPaise(amount: number): number` and integer paise conversion helper to eliminate IEEE 754 floating-point drift across all voucher calculations.
- **Acceptance Criteria:** Summing debit and credit lines across 10,000 transactions produces exact equality ($\sum \text{Dr} = \sum \text{Cr}$) with zero artificial rounding plugs.
- **Proposed Phase:** Phase 2 (Prompt 3)
- **Status:** `Pending`

### TASK-GL-005: Build Atomic Journal Posting Engine
- **Module:** Accounting Engine
- **Priority:** High
- **Dependencies:** TASK-GL-001, TASK-GL-004
- **Target Files:** `services/journal-posting.service.ts` (new file), [`services/accounting-engine.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/accounting-engine.service.ts)
- **Description:** Implement transactional journal posting service that writes balanced `JournalEntry` and `JournalLine` records to MongoDB atomically when source transactions are created, edited, or cancelled.
- **Acceptance Criteria:** Double-entry vouchers are persisted in MongoDB; unbalanced vouchers are rejected before commit.
- **Proposed Phase:** Phase 2 (Prompt 3)
- **Status:** `Pending`

### TASK-GL-006: Historical Data Backfill & Reconciliation Migration Script
- **Module:** Data Migration & Integrity
- **Priority:** High
- **Dependencies:** TASK-GL-005
- **Target Files:** `scripts/backfill-journal-entries.ts` (new file)
- **Description:** Write idempotent migration script that compiles existing legacy transactions (`TaxInvoice`, `Expense`, `BankTransfer`, `OpeningBalance`) into balanced, persistent `JournalEntry` records without altering source data.
- **Acceptance Criteria:** All existing database records have corresponding persistent journal vouchers that reconcile 100% to live statements.
- **Proposed Phase:** Phase 2 (Prompt 3)
- **Status:** `Pending`

---

## 4. Phase 3: Invoice Preservation & Customer Receipts Integrity

### TASK-INV-001: Implement Atomic Sequential Invoice Numbering
- **Module:** Invoices & Core
- **Priority:** High
- **Dependencies:** TASK-GL-001
- **Target Files:** [`lib/invoice-number.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/lib/invoice-number.ts)
- **Description:** Replace non-atomic in-memory `findMany` sequence generation with an atomic MongoDB sequence counter or transactional lock to prevent race conditions during concurrent invoice creation.
- **Acceptance Criteria:** Concurrent invoice creation requests generate sequential, gapless, unique numbers (`KVJ/B2B/26-27/NNN`) without `P2002` collisions.
- **Proposed Phase:** Phase 3 (Prompt 4)
- **Status:** `Pending`

### TASK-INV-002: Add Bank Account Selector to Invoice Payment Modal
- **Module:** Invoices & Banking
- **Priority:** High
- **Dependencies:** TASK-GL-001
- **Target Files:** [`prisma/schema.prisma#L326-L344`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/prisma/schema.prisma#L326-L344), [`app/(dashboard)/invoices/InvoicePaymentModal.tsx`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/app/%28dashboard%29/invoices/InvoicePaymentModal.tsx), [`services/tax-invoice.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/tax-invoice.service.ts)
- **Description:** Add `bankAccountId` relation to `InvoicePayment` model. Update the Record Payment modal to include a bank account dropdown populated from active `BankAccount` records.
- **Acceptance Criteria:** User can select destination bank account; payment journal voucher correctly debits the selected bank ledger.
- **Proposed Phase:** Phase 3 (Prompt 4)
- **Status:** `Pending`

### TASK-INV-003: Dynamic Company Information in Invoice Views & Previews
- **Module:** Invoicing & Company Masters
- **Priority:** Medium
- **Dependencies:** None
- **Target Files:** [`app/(dashboard)/invoices/[id]/page.tsx`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/app/%28dashboard%29/invoices/%5Bid%5D/page.tsx), `app/(dashboard)/proforma-invoices/[id]/page.tsx`
- **Description:** Replace hardcoded company details (GSTIN, PAN, Phone, Address) in invoice templates with dynamic queries from `CompanySettings` master.
- **Acceptance Criteria:** Changing company address or phone in Settings updates the invoice display without modifying JSX.
- **Proposed Phase:** Phase 3 (Prompt 4)
- **Status:** `Pending`

### TASK-INV-004: Payment Idempotency & Duplicate Submission Lock
- **Module:** Invoices & Transactions
- **Priority:** Medium
- **Dependencies:** TASK-SEC-004
- **Target Files:** [`services/tax-invoice.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/tax-invoice.service.ts), [`app/(dashboard)/invoices/actions.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/app/%28dashboard%29/invoices/actions.ts)
- **Description:** Add client submission token / idempotency key to payment records to prevent duplicate payment creation upon rapid clicking or network retries.
- **Acceptance Criteria:** Submitting the same payment payload within 5 seconds returns the existing payment record without creating a duplicate.
- **Proposed Phase:** Phase 3 (Prompt 4)
- **Status:** `Pending`

### TASK-INV-005: Customer Overpayment Reclassification as Customer Advance
- **Module:** Invoicing & Accounts Receivable
- **Priority:** Medium
- **Dependencies:** TASK-GL-005
- **Target Files:** [`services/tax-invoice.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/tax-invoice.service.ts)
- **Description:** When recorded payment exceeds the invoice face value, automatically split the settlement: allocate invoice portion to Accounts Receivable and excess to Customer Advance liability.
- **Acceptance Criteria:** Invoice status marks `PAID`; excess payment creates credit entry in Customer Advance ledger (`cust_adv_${customerId}`).
- **Proposed Phase:** Phase 3 (Prompt 4)
- **Status:** `Pending`

---

## 5. Phase 4: Expenses, Payroll & Banking Modernization

### TASK-EXP-001: Fix Inter-Bank Contra Transfer Account Linking
- **Module:** Bank Transfers & Contras
- **Priority:** High
- **Dependencies:** TASK-GL-001
- **Target Files:** [`prisma/schema.prisma#L737-L747`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/prisma/schema.prisma#L737-L747), [`services/bank-transfer.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/bank-transfer.service.ts), [`services/accounting-engine.service.ts#L1271-L1294`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/accounting-engine.service.ts#L1271-L1294)
- **Description:** Update `BankTransfer` model to reference `fromBankAccountId` and `toBankAccountId` as foreign keys to `BankAccount`. Eliminate string-based `bank_dest_...` and `bank_src_...` phantom IDs.
- **Acceptance Criteria:** Contra vouchers debit `bank_${toId}` and credit `bank_${fromId}` directly; both bank ledgers update cleanly.
- **Proposed Phase:** Phase 4 (Prompt 5)
- **Status:** `Pending`

### TASK-EXP-002: Standardize Accrual Accounting for Single-Step Expenses
- **Module:** Expenses & Accounts Payable
- **Priority:** High
- **Dependencies:** TASK-GL-005
- **Target Files:** [`services/expense.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/expense.service.ts), [`services/accounting-engine.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/accounting-engine.service.ts)
- **Description:** Ensure expenses created with `paymentStatus: "PAID"` automatically generate both an accrual voucher (Debit Expense, Credit Trade Payable) and a settlement voucher (Debit Trade Payable, Credit Bank) with an `ExpensePayment` record.
- **Acceptance Criteria:** Full trade payable audit trail exists for every expense regardless of whether paid immediately or in installments.
- **Proposed Phase:** Phase 4 (Prompt 5)
- **Status:** `Pending`

### TASK-EXP-003: Atomic Sequencing for Batch Payroll Expense Numbers
- **Module:** Payroll & Expenses
- **Priority:** Medium
- **Dependencies:** TASK-INV-001
- **Target Files:** [`services/payroll.service.ts#L149-L150`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/payroll.service.ts#L149-L150)
- **Description:** Replace in-loop `prisma.expense.count()` sequential generation with batch pre-allocation of expense numbers during batch payroll runs.
- **Acceptance Criteria:** Batch payroll for 50 employees generates unique, non-overlapping `EXP-YYYY-NNNN` numbers without collisions.
- **Proposed Phase:** Phase 4 (Prompt 5)
- **Status:** `Pending`

### TASK-EXP-004: Automated Employee Advance Recovery in Payroll
- **Module:** Payroll & Employee Advances
- **Priority:** Medium
- **Dependencies:** TASK-GL-005
- **Target Files:** [`services/payroll.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/payroll.service.ts), [`services/employee-advance.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/employee-advance.service.ts)
- **Description:** During batch payroll runs, automatically link advance deductions to open `EmployeeAdvance` records and mark advances as recovered.
- **Acceptance Criteria:** Employee advance balance decreases by exact deduction amount; journal voucher credits Employee Advance asset.
- **Proposed Phase:** Phase 4 (Prompt 5)
- **Status:** `Pending`

### TASK-EXP-005: Vendor Advance Utilization Workflow
- **Module:** Vendors & Expenses
- **Priority:** Medium
- **Dependencies:** TASK-GL-005
- **Target Files:** [`services/expense.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/expense.service.ts)
- **Description:** Allow applying existing vendor advance balances against newly recorded vendor bills, reducing accounts payable.
- **Acceptance Criteria:** Bill settlement applies advance: Debits Trade Payable, Credits Vendor Advance (`vend_adv_...`).
- **Proposed Phase:** Phase 4 (Prompt 5)
- **Status:** `Pending`

### TASK-EXP-006: Bank Statement Import & Reconciliation Engine
- **Module:** Banking & Reconciliation
- **Priority:** Medium
- **Dependencies:** TASK-EXP-001
- **Target Files:** [`services/bank-reconciliation.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/bank-reconciliation.service.ts)
- **Description:** Enhance reconciliation matching between imported `BankStatementLine` items and persistent `JournalEntry` bank vouchers by UTR, cheque number, date window, and amount.
- **Acceptance Criteria:** Matched lines mark vouchers reconciled; un-reconciled differences display on Bank Reconciliation Statement.
- **Proposed Phase:** Phase 4 (Prompt 5)
- **Status:** `Pending`

---

## 6. Phase 5: Statutory Taxes, Fixed Assets & Multi-Year Continuity

### TASK-TAX-001: Consolidate Dual GST Settlement Paths
- **Module:** Statutory Tax (GST)
- **Priority:** High
- **Dependencies:** TASK-GL-005
- **Target Files:** [`services/gst-settlement.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/gst-settlement.service.ts), [`services/gst-filing.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/gst-filing.service.ts), [`services/accounting-engine.service.ts#L1365-L1820`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/accounting-engine.service.ts#L1365-L1820)
- **Description:** Unify GST return filing and payment into a single authoritative service (`GstSettlementService`). Deprecate redundant voucher generation in `GstFiling`.
- **Acceptance Criteria:** GST payments produce exactly one balanced payment voucher; zero duplicate cash outflows occur on financial statements.
- **Proposed Phase:** Phase 5 (Prompt 6)
- **Status:** `Pending`

### TASK-TAX-002: TDS Deposit Challan Bank Account Binding
- **Module:** Statutory Tax (TDS)
- **Priority:** Medium
- **Dependencies:** TASK-GL-005
- **Target Files:** [`prisma/schema.prisma#L792-L807`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/prisma/schema.prisma#L792-L807), [`services/tds-deposit.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/tds-deposit.service.ts)
- **Description:** Add `bankAccountId` relation to `TdsDeposit` model. Update ITNS 281 challan recording to debit Statutory TDS Payable and credit the specified `BankAccount`.
- **Acceptance Criteria:** TDS payments reduce the selected bank account balance and clear the statutory TDS payable liability.
- **Proposed Phase:** Phase 5 (Prompt 6)
- **Status:** `Pending`

### TASK-TAX-003: Fixed Asset Disposal Net Book Value Validation
- **Module:** Fixed Assets
- **Priority:** Medium
- **Dependencies:** TASK-GL-005
- **Target Files:** [`services/asset-disposal.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/asset-disposal.service.ts)
- **Description:** Validate asset disposal inputs against accumulated depreciation in `AssetDepreciation` to compute exact gain/loss on disposal (`RULE-AST-003`).
- **Acceptance Criteria:** Disposal removes gross asset value, clears accumulated depreciation, and recognizes exact gain/loss in P&L.
- **Proposed Phase:** Phase 5 (Prompt 6)
- **Status:** `Pending`

### TASK-TAX-004: Loan Repayment Split Verification (Principal vs Interest)
- **Module:** Loans & Borrowings
- **Priority:** Medium
- **Dependencies:** TASK-GL-005
- **Target Files:** [`services/loan.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/loan.service.ts)
- **Description:** Verify loan EMI repayment vouchers debit Loan Principal (Liability) for principal portion, debit Finance Costs (P&L Expense) for interest portion, and credit Bank Account for total EMI.
- **Acceptance Criteria:** Principal reduces loan liability; interest flows into P&L finance costs.
- **Proposed Phase:** Phase 5 (Prompt 6)
- **Status:** `Pending`

### TASK-TAX-005: Multi-Year Retained Earnings Roll-Forward Engine
- **Module:** Financial Year Continuity & Equity
- **Priority:** High
- **Dependencies:** TASK-GL-005
- **Target Files:** [`services/accounting-engine.service.ts#L2599`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/accounting-engine.service.ts#L2599), `services/opening-closing.service.ts`
- **Description:** Implement multi-year profit roll-forward logic. When generating a balance sheet for FY N, calculate accumulated retained earnings from all prior fiscal years (FY 1 through N-1) and include them in Reserves & Surplus alongside current year PAT.
- **Acceptance Criteria:** Balance Sheet maintains mathematical equilibrium across multiple consecutive financial years without artificial adjustments.
- **Proposed Phase:** Phase 5 (Prompt 6)
- **Status:** `Pending`

### TASK-TAX-006: Fiscal Year-End Closing Voucher Generator
- **Module:** Year-End Processing
- **Priority:** Medium
- **Dependencies:** TASK-TAX-005
- **Target Files:** `services/year-end-closing.service.ts` (new file)
- **Description:** Implement year-end closing routine that transfers net revenue and expense balances to Retained Earnings (Equity) and establishes opening balances for the new fiscal year.
- **Acceptance Criteria:** Closing a financial year sets P&L account balances to zero for the new year while carrying balance sheet accounts forward.
- **Proposed Phase:** Phase 5 (Prompt 6)
- **Status:** `Pending`

---

## 7. Phase 6: Reports, Financial Statements & Reconciliation Engine

### TASK-RPT-001: Refactor Reports Engine to Query Persistent General Ledger
- **Module:** Reporting Engine
- **Priority:** High
- **Dependencies:** TASK-GL-005, TASK-GL-006
- **Target Files:** [`services/accounting-engine.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/accounting-engine.service.ts), [`services/reports.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/reports.service.ts)
- **Description:** Refactor `getTrialBalance()`, `getProfitAndLoss()`, `getBalanceSheet()`, and `getCashFlow()` to query indexed `JournalEntry` and `JournalLine` database collections instead of running in-memory `buildAllRawVouchers()`.
- **Acceptance Criteria:** Report generation executes fast indexed database aggregation queries; in-memory full collection loading is eliminated.
- **Proposed Phase:** Phase 6 (Prompt 7)
- **Status:** `Pending`

### TASK-RPT-002: Modularize Monolithic `accounting-engine.service.ts`
- **Module:** Architecture & Maintainability
- **Priority:** Medium
- **Dependencies:** TASK-RPT-001
- **Target Files:** [`services/accounting-engine.service.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/accounting-engine.service.ts)
- **Description:** Split 144 KB monolithic service into focused modules: `services/gl/`, `services/statements/`, `services/analysis/`, and `services/reports/`.
- **Acceptance Criteria:** Each module is under 500 lines with single responsibility; all existing consumers continue working via unified facade.
- **Proposed Phase:** Phase 6 (Prompt 7)
- **Status:** `Pending`

### TASK-RPT-003: Optimize Reports Hub Server-Side Execution
- **Module:** Performance & UX
- **Priority:** Medium
- **Dependencies:** TASK-RPT-001
- **Target Files:** [`app/(dashboard)/reports/page.tsx`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/app/%28dashboard%29/reports/page.tsx)
- **Description:** Replace monolithic 12-task `Promise.all()` with on-demand fetching tailored to the active sub-tab (e.g. fetch only Balance Sheet when `subtab=balance-sheet`).
- **Acceptance Criteria:** Reports Hub initial page load time drops by at least 60%; eliminates unnecessary database queries.
- **Proposed Phase:** Phase 6 (Prompt 7)
- **Status:** `Pending`

### TASK-RPT-004: Implement Real-Time Trial Balance Reconciliation Health Check
- **Module:** Financial Integrity
- **Priority:** High
- **Dependencies:** TASK-RPT-001
- **Target Files:** `services/reconciliation-check.service.ts` (new file)
- **Description:** Build automated health check verifying that total ledger debits equal total credits across all accounts, alerting if any imbalance occurs.
- **Acceptance Criteria:** Returns `{ isHealthy: true, diff: 0 }`; flags discrepancies immediately with diagnostic line details.
- **Proposed Phase:** Phase 6 (Prompt 7)
- **Status:** `Pending`

### TASK-RPT-005: Form 24Q & Form 16 Statutory TDS Exports
- **Module:** Statutory Tax Exports
- **Priority:** Medium
- **Dependencies:** TASK-TAX-002
- **Target Files:** `services/tds-export.service.ts` (new file)
- **Description:** Generate standard Excel and text export files conforming to Indian Income Tax Department Form 24Q (Salary TDS) and Form 16 Annexures.
- **Acceptance Criteria:** Export file parses cleanly according to NSDL File Validation Utility (FVU) specifications.
- **Proposed Phase:** Phase 6 (Prompt 7)
- **Status:** `Pending`

---

## 8. Phase 7: Automated Testing, Backup/Restore & Release Readiness

### TASK-TST-001: Install & Configure Vitest and Playwright Test Suites
- **Module:** Testing Framework
- **Priority:** High
- **Dependencies:** None
- **Target Files:** [`package.json`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/package.json), `vitest.config.ts` (new file)
- **Description:** Install Vitest and Playwright. Configure `npm test` script and test runner with isolated MongoDB in-memory or staging database URI.
- **Acceptance Criteria:** `npm test` executes cleanly and outputs standard TAP/JUnit test reports.
- **Proposed Phase:** Phase 7 (Prompt 8)
- **Status:** `Pending`

### TASK-TST-002: Build End-to-End Accounting Integration Test Suite
- **Module:** Integration Testing
- **Priority:** High
- **Dependencies:** TASK-TST-001, TASK-GL-005
- **Target Files:** `tests/integration/accounting-lifecycle.test.ts` (new file)
- **Description:** Write comprehensive integration tests covering complete lifecycles: Proforma -> Tax Invoice -> Partial Payments -> TDS Withholding -> Expense Accrual -> Payment -> GST Settlement -> Trial Balance -> P&L -> Balance Sheet.
- **Acceptance Criteria:** All 30 scenarios from `docs/business-rules/FINLEDGER_BUSINESS_AND_ACCOUNTING_RULES.md` execute against real database transactions.
- **Proposed Phase:** Phase 7 (Prompt 8)
- **Status:** `Pending`

### TASK-TST-003: Create & Validate Database Restore Tooling (`restore-db.ts`)
- **Module:** Operations & Recovery
- **Priority:** High
- **Dependencies:** TASK-TST-001
- **Target Files:** `scripts/restore-db.ts` (new file), [`scripts/backup-db.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/scripts/backup-db.ts)
- **Description:** Implement automated restore script that safely imports collections from JSON backups with schema validation, transactional atomicity, and verification.
- **Acceptance Criteria:** Backing up and restoring a database produces identical collection counts and zero balance discrepancies.
- **Proposed Phase:** Phase 7 (Prompt 8)
- **Status:** `Pending`

### TASK-TST-004: Add Environment Guards to Database Management Scripts
- **Module:** Operations & Data Protection
- **Priority:** High
- **Dependencies:** None
- **Target Files:** [`scripts/cleanup-database.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/scripts/cleanup-database.ts), `scripts/verify-cleanup.ts`
- **Description:** Add strict environment guards to destructive scripts: throw immediately if `NODE_ENV === "production"` or `DATABASE_URL` points to production host.
- **Acceptance Criteria:** Running cleanup script in production throws an error without deleting any records.
- **Proposed Phase:** Phase 7 (Prompt 8)
- **Status:** `Pending`

### TASK-TST-005: Generate Excel Test Execution Tracker Artifact
- **Module:** Quality Assurance & Reporting
- **Priority:** Medium
- **Dependencies:** TASK-TST-002
- **Target Files:** `scripts/generate-test-tracker-excel.ts` (new file)
- **Description:** Write script using SheetJS (`xlsx`) that exports a structured, formatted Excel workbook (`FinLedger_Test_Execution_Tracker.xlsx`) detailing all test cases, statuses, execution timestamps, and pass/fail evidence.
- **Acceptance Criteria:** Generates a valid multi-tab Excel file adhering to the project testing standards.
- **Proposed Phase:** Phase 7 (Prompt 8)
- **Status:** `Pending`

### TASK-TST-006: Pre-Release Verification & Certification Gate
- **Module:** Release Management
- **Priority:** Medium
- **Dependencies:** All preceding tasks
- **Target Files:** `docs/quality/FINAL_CERTIFICATION_REPORT.md` (new file)
- **Description:** Execute final release verification gate: zero TypeScript errors, zero lint warnings, 100% test pass rate, verified backup/restore cycle, and reconciled financial statements.
- **Acceptance Criteria:** Formally signed off and ready for production deployment.
- **Proposed Phase:** Phase 7 (Prompt 8)
- **Status:** `Pending`
