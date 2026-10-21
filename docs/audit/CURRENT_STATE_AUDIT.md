# FINLEDGER CODEBASE AUDIT — CURRENT STATE AUDIT REPORT

**Organization:** KVJ Analytics (Indian IT & Analytics Services)  
**System:** FinLedger ERP  
**Audit Standard:** Read-Only Static Analysis & Repository Baseline Inspection  
**Audit Date:** 21 October 2026  
**Auditor:** Antigravity AI Senior Systems & Accounting Architect  
**Classification:** Confirmed Baseline Audit (Read-Only)  

---

## 1. Executive Summary

This report establishes the baseline technical and architectural state of the **FinLedger** Indian Financial Management and Billing ERP application. The audit was conducted strictly using read-only static analysis and code inspection across all directories, models, services, routes, actions, and configuration files without modifying code, database records, schema, or configuration.

### Baseline Status Overview
While FinLedger features a sophisticated Indian IT service billing workflow, comprehensive tax calculations (GST & TDS), and finalized invoice presentation screens, our audit confirms significant architectural, data-integrity, security, and operational divergences between the actual codebase and an enterprise-grade ERP standard.

Notably, previous quality and audit reports (`docs/quality/FINAL_APPLICATION_QUALITY_REPORT.md` and `docs/quality/DEFECT_REGISTER.md`) claimed the application was "100% production-ready and fully verified" with "100% double-entry symmetry." However, source code inspection reveals:
1. **No Persistent General Ledger:** All journal vouchers are dynamically generated in-memory on every request by loading entire MongoDB collections. There is no persistent `JournalEntry` or `JournalLine` table.
2. **Floating-Point Currency Types:** All monetary fields across all 34 Prisma models use standard IEEE 754 `Float` types rather than fixed-point decimal or integer paise, causing arithmetic rounding drift that previously required manual plug adjustments.
3. **Severe Authentication & Access Control Gaps:** NextAuth is configured without `middleware.ts`, critical server actions (invoicing, payments, expenses, bank transfers) lack server-side session checks, and hardcoded backdoor credentials exist in source code.
4. **Accounting Engine Flaws:** Duplicate GST settlement paths cause duplicate cash outflows; inter-bank contra transfers create synthetic disconnected ledger accounts; prior-year retained earnings are dropped across financial year boundaries.
5. **No Automated Test Framework:** No unit, integration, or E2E testing framework (Jest, Vitest, Playwright) is installed in `package.json`. Tests exist only as ad-hoc standalone scripts.
6. **No Database Restore Capability:** While an export snapshot script exists (`scripts/backup-db.ts`), there is no restore script, and database cleanup scripts lack production safeguards.

---

## 2. Workstream 1: Repository and Architecture

### 2.1 Technology Stack Inventory

| Component | Verified Technology | Actual Version (package.json / lockfile) | File Evidence | Notes / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `16.2.11` | [`package.json`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/package.json#L15) | Server Components + Server Actions (`--turbo`) |
| **Runtime** | Node.js | `>= 20.x` | [`package.json`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/package.json#L25) | Execution runtime on macOS Darwin arm64 |
| **Language** | TypeScript | `^5.x` | [`package.json`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/package.json#L33) | Strict type checking in `tsconfig.json` |
| **Database** | MongoDB Atlas | MongoDB Document Store | [`prisma/schema.prisma`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/prisma/schema.prisma#L9-L12) | Provider: `mongodb`, connection via `DATABASE_URL` |
| **ORM** | Prisma ORM | `^6.19.3` (`@prisma/client`) | [`package.json`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/package.json#L13) | Schema has 34 models |
| **Styling** | Tailwind CSS / PostCSS | `@tailwindcss/postcss` `^4`, `tailwindcss` `^4` | [`package.json`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/package.json#L23-L31) | Tailwind v4 with `@theme` variables in `globals.css` |
| **Authentication** | NextAuth.js | `^5.0.0-beta.32` | [`package.json`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/package.json#L16) | NextAuth v5 Beta, Credentials Provider, JWT session |
| **Charts** | Recharts | `^3.10.0` | [`package.json`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/package.json#L19) | Financial dashboard visualizations |
| **Spreadsheet** | SheetJS (`xlsx`) | `^0.18.5` | [`package.json`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/package.json#L20) | Excel exports for ledgers & reports |
| **Password Hashing** | bcryptjs | `^3.0.3` | [`package.json`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/package.json#L14) | Credentials authentication |
| **Script Runner** | tsx | `^4.23.1` | [`package.json`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/package.json#L32) | Running Prisma seed and ad-hoc scripts |

### 2.2 Application Structure & Module Boundaries

The project adopts the Next.js App Router structure:
- **Routes (`app/(dashboard)/`):** 21 authenticated business route groups: `dashboard`, `invoices`, `proforma-invoices`, `customers`, `expenses`, `vendors`, `bank-transfers`, `ledgers`, `journals`, `masters`, `opening-closing`, `reports`, `financial-statements`, `users`, `settings`, etc.
- **Server Actions:** Mutations are executed via Next.js Server Actions (`"use server"`). Nineteen separate action modules exist across route folders (e.g., `invoices/actions.ts`, `expenses/actions.ts`, `bank-transfers/actions.ts`).
- **Domain Services (`services/`):** 32 service classes handle business logic and database access. The largest is `accounting-engine.service.ts` (144.7 KB, 3,653 lines).
- **Shared Utilities (`lib/`):** Contains `tax/` (GST/TDS calculators), `utils/` (formatting, Indian currency words, financial year helpers), `constants/`, and `auth-utils.ts`.

### 2.3 Build, Lint, and Execution Scripts
- **Development Server:** `npm run dev` (`next dev --turbo`)
- **Build Command:** `npm run build` (`prisma generate && next build`)
- **Lint Command:** `npm run lint` (`eslint`)
- **Clean Command:** `npm run clean` (`rm -rf .next node_modules/.cache *.tsbuildinfo`)
- **Test Command:** **NONE**. `package.json` contains no `test` script, and no testing framework is installed.

---

## 3. Workstream 2: Database and Data Model

### 3.1 Model Inventory
The Prisma schema ([`prisma/schema.prisma`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/prisma/schema.prisma)) defines **34 models**:

1. `RoleDefinition`: Role-based permission assignments (JSON field for permissions).
2. `User`: Application users with bcrypt password, role, and active status.
3. `Employee`: Staff details, designation, CTC, PAN, bank account.
4. `EmployeeAdvance`: Employee advances, recoveries, and balance tracking.
5. `CompanySettings`: Business legal name, GSTIN, PAN, address, contact details.
6. `Customer`: B2B/B2C client directory, GSTIN, state code, credit limits.
7. `Product`: Goods and services master, HSN/SAC, default unit rate, GST rate.
8. `BankAccount`: Company bank accounts, account numbers, IFSC, branches.
9. `ProformaInvoice`: Quotation documents with items, taxes, snapshots (zero GL impact).
10. `ProformaInvoiceItem`: Line items for proforma invoices.
11. `TaxInvoice`: Confirmed sales invoices, snapshots, payment status, GST remittance status.
12. `InvoicePayment`: Customer payments, partial receipts, actual TDS withheld, bank receipt.
13. `TaxInvoiceItem`: Confirmed tax invoice line items with HSN/SAC, rates, tax breakdowns.
14. `FinancialType`: COA classification (ASSET, LIABILITY, EQUITY, INCOME, EXPENSE).
15. `FinancialStatementGroup`: Balance sheet and P&L groupings.
16. `AccountNature`: Normal balance specification (DEBIT or CREDIT).
17. `ExpenseCategory`: Hierarchical expense categories, tax applicability, classification.
18. `Vendor`: Suppliers, GSTIN, vendor type, default expense category.
19. `Expense`: Operating vendor bills, employee reimbursement claims, asset purchases.
20. `ExpenseItem`: Line items for expenses with SAC/HSN, GST, TDS, category link.
21. `ExpensePayment`: Disbursements against expenses, bank account link, payment method.
22. `RecurringExpense`: Expense scheduling templates (monthly, quarterly, annual).
23. `FinancialTransaction`: Shadow transaction table for historical tracking.
24. `BankTransfer`: Inter-account contra transfers and owner drawings.
25. `OpeningBalance`: Brought-forward balances by financial year and position.
26. `GstFiling`: Statutory GST filing logs (GSTR-3B/1/9), taxable turnover, tax paid.
27. `TdsDeposit`: Statutory TDS quarterly challans (ITNS 281), BSR code, challan serial.
28. `AssetDepreciation`: Fixed asset depreciation runs (WDV/SLM rate, annual write-off).
29. `AssetDisposal`: Fixed asset disposal, scrap, sales proceeds, gain/loss calculation.
30. `Loan`: Long-term borrowings, lenders, principal amount, interest rate.
31. `LoanRepayment`: Loan EMI payments split into principal and interest components.
32. `BankStatementImport`: Bank statement import batch header.
33. `BankStatementLine`: Individual bank statement line items for reconciliation.
34. `GstSettlement`: Secondary statutory GST settlement and ITC offset record.

### 3.2 Floating-Point Currency Defect
All monetary fields across all models are defined as `Float`:
- `TaxInvoice`: `subtotal`, `taxableAmount`, `totalCGST`, `totalSGST`, `totalIGST`, `totalGST`, `tdsAmount`, `grossAmount`, `netAmount`.
- `InvoicePayment`: `paymentAmount`, `tdsAmount`, `bankReceipt`, `advanceAmount`.
- `Expense`: `subtotal`, `taxableAmount`, `totalInputGST`, `tdsAmount`, `grossAmount`, `netAmount`, `paidAmount`, `balancePayable`.
- `BankTransfer`: `amount`.
- `OpeningBalance`: `amount`.

**Risk:** IEEE 754 floating-point arithmetic induces precision drift (e.g., `0.1 + 0.2 = 0.30000000000000004`). In financial accounting, this causes pennies/paise to drop or accumulate over thousands of ledger lines. In fact, `FINAL_APPLICATION_QUALITY_REPORT.md` (line 57) recorded a **`-₹712.01 rounding adjustment`** directly on the live balance sheet to force equilibrium.

### 3.3 Missing Relational Integrity & Weak Schemas
1. **Unlinked Bank Transfers:** `BankTransfer` ([`prisma/schema.prisma#L737-L747`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/prisma/schema.prisma#L737-L747)) defines `fromAccount String` and `toAccount String` as free-text strings instead of `@db.ObjectId` foreign keys to `BankAccount`.
2. **Missing Bank Link in Invoice Payments:** `InvoicePayment` ([`prisma/schema.prisma#L326-L344`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/prisma/schema.prisma#L326-L344)) lacks a `bankAccountId` relation. The accounting engine must guess the bank account from the original invoice snapshot or primary bank.
3. **No General Ledger / Journal Models:** Neither `JournalEntry` nor `JournalLine` exists in the schema.
4. **No Audit Trail Model:** Neither `AuditLog` nor historical version tracking models exist in the schema.
5. **No Fiscal Period Model:** Financial years exist only as free-form strings (`financialYear String`), preventing rigid period closing locks.

---

## 4. Workstream 3: Invoice Preservation & Accounting

### 4.1 Interface and Workflow Preservation
The existing Proforma Invoice and Tax Invoice UI designs have been reviewed:
- **Proforma Invoice:** Quotation workflow with multi-line items, HSN/SAC codes, discount, CGST/SGST/IGST, TDS options, customer snapshots, and bank account details.
- **Conversion Workflow:** `convertProformaToTaxInvoice` ([`services/tax-invoice.service.ts#L337-L480`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/tax-invoice.service.ts#L337-L480)) atomically copies snapshots, creates the `TaxInvoice`, marks the proforma `CONVERTED`, and updates status.
- **Tax Invoice View & Print:** Formatted invoice card ([`app/(dashboard)/invoices/[id]/page.tsx`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/app/%28dashboard%29/invoices/%5Bid%5D/page.tsx)) with clean separation between the customer-facing printable section and internal payment history.
- **Compliance with Protection Rules:** The field structure, layouts, and calculations must remain strictly intact as mandated.

### 4.2 Invoice Defects & Technical Gaps Identified
1. **Invoice Numbering Concurrency Race Condition:**  
   In [`lib/invoice-number.ts#L59-L96`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/lib/invoice-number.ts#L59-L96), sequence numbers are calculated by querying `findMany({ where: { startsWith: prefix } })` and iterating in memory to find `maxSeq`. Under concurrent submissions, multiple transactions will read the same `maxSeq` and generate duplicate invoice numbers, triggering database `P2002` uniqueness errors.
2. **Hardcoded Company Information in Invoice Views:**  
   In [`app/(dashboard)/invoices/[id]/page.tsx#L78-L103`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/app/%28dashboard%29/invoices/%5Bid%5D/page.tsx#L78-L103), GSTIN (`32BIDPK3118B1Z2`), PAN (`BIDPK3118B`), address, and phone numbers are hardcoded in JSX rather than reading from `CompanySettings`.
3. **No Bank Account Selector in Invoice Payment Modal:**  
   [`app/(dashboard)/invoices/InvoicePaymentModal.tsx`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/app/%28dashboard%29/invoices/InvoicePaymentModal.tsx) allows entering payment amount, date, TDS, and reference, but provides no dropdown to select which company bank account received the funds.
4. **Non-Idempotent Payment Submissions:**  
   Submitting customer payments via `recordInvoicePaymentAction` lacks idempotency keys or request deduplication. Repeated clicks or network retries create duplicate payments.

---

## 5. Workstream 4: Accounting Engine and Financial Statements

### 5.1 Dynamic In-Memory Voucher Generation Architecture
Rather than persisting balanced double-entry vouchers to a General Ledger collection, [`AccountingEngine`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/services/accounting-engine.service.ts#L347-L437) executes `buildAllRawVouchers()`:
- It issues `Promise.all` fetching all rows from 15 separate collections: `TaxInvoice`, `InvoicePayment`, `Expense`, `BankTransfer`, `OpeningBalance`, `GstFiling`, `GstSettlement`, `TdsDeposit`, `AssetDepreciation`, `Loan`, `AssetDisposal`, `BankAccount`, `Customer`, `Vendor`, and `ExpenseCategory`.
- It reconstructs an array of in-memory `JournalVoucher` objects using JavaScript iteration.
- It caches this array in process memory with a 30-second TTL (`VOUCHER_CACHE_TTL_MS = 30000`).

**Impact:**
- **Zero Database Immutability:** No permanent ledger vouchers exist in MongoDB. If code changes, historical vouchers change retroactively.
- **Scalability Ceiling:** In production with tens of thousands of invoices and expense items, loading 15 full collections into RAM will cause Node.js heap exhaustion (OOM crashes) and severe CPU spikes.
- **Serverless Incompatibility:** On platforms like Vercel, serverless instances do not share in-memory cache, forcing cold-start full collection fetches on almost every API invocation.

### 5.2 Critical Accounting Discrepancies
1. **Duplicate GST Outflows:**  
   Both `GstFiling` (lines 1365-1409) and `GstSettlement` (lines 1698-1820) generate Payment vouchers crediting Bank and debiting Output GST. Recording a filing and a settlement for the same tax period causes duplicate cash outflows on reports.
2. **Synthetic Bank Accounts in Bank Transfers:**  
   Lines 1273 and 1284 generate account IDs as `bank_dest_${t.toAccount.replace(/\s+/g, "_")}` and `bank_src_${t.fromAccount.replace(/\s+/g, "_")}`. This fragments the real bank balance across disconnected phantom accounts instead of linking to master `BankAccount` IDs (`bank_${id}`).
3. **Missing Prior-Year Retained Earnings:**  
   In `getBalanceSheet()` (line 2599), `reservesAndSurplus` is calculated exclusively as `currentYearProfit` from current P&L. Accumulated net profit from prior financial years is completely dropped from equity, throwing multi-year balance sheets out of balance.
4. **Dual Expense Accrual Paths:**  
   Single-step expenses (paid on entry without `ExpensePayment` records) directly credit Bank in the primary voucher. Multi-step expenses credit Trade Payable and generate a secondary payment voucher. This creates structural inconsistency across accounts payable reporting.

---

## 6. Workstream 5: Expenses and Other Business Modules

1. **Batch Payroll Sequencing:** In `services/payroll.service.ts#L149-L150`, batch payroll generation loops over employees, querying `prisma.expense.count()` on each iteration to construct `EXP-YYYY-NNNN`. Under concurrent batch processing, duplicate expense numbers occur.
2. **Fixed Asset Register vs Disposal:** `AssetDisposal` ([`prisma/schema.prisma#L826-L840`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/prisma/schema.prisma#L826-L840)) tracks sale proceeds and accumulated depreciation, but lacks automated validation against the remaining net book value in `AssetDepreciation`.
3. **Vendor Advance Reclassification:** When an advance is recorded against an expense, it creates an asset voucher (`vend_adv_...`), but subsequent bill settlements do not automatically debit/credit the advance clearing ledger.

---

## 7. Workstream 6: Authentication and Security Audit

### 7.1 Vulnerability Summary

| Vulnerability ID | Severity | File & Location | Description |
| :--- | :---: | :--- | :--- |
| **SEC-01** | **Critical** | [`auth.ts#L9`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/auth.ts#L9), [`auth.config.ts#L5`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/auth.config.ts#L5) | Hardcoded default fallback JWT secret: `"ATG7kBWRrKlZnzMiJ8wYXjFt5O2eQc3p"`. If `AUTH_SECRET` is unset, tokens can be forged. |
| **SEC-02** | **Critical** | [`auth.ts#L23-L41`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/auth.ts#L23-L41) | Hardcoded backdoor admin and user credentials in credentials provider bypass database authentication and password policies. |
| **SEC-03** | **Critical** | Missing `middleware.ts` | No Edge middleware is configured to intercept and validate JWT sessions. NextAuth `callbacks.authorized` in `auth.config.ts` is inactive. |
| **SEC-04** | **High** | `app/(dashboard)/**/actions.ts` | 17 out of 19 Server Action files (including tax invoice, payment, expense, bank transfer, and master actions) omit `requireAuth()`, leaving mutations open to unauthenticated callers. |
| **SEC-05** | **High** | [`app/api/test-db/route.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/app/api/test-db/route.ts#L4-L25) | Public diagnostic endpoint leaking admin email, user counts, env secret lengths, and complete error stack traces. |
| **SEC-06** | **High** | [`app/api/ledgers/statement/route.ts`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/app/api/ledgers/statement/route.ts#L4-L21) | Public unauthenticated API route exposing full general ledger statements for any `accountId`. |

---

## 8. Workstream 7: Testing and Quality Assurance

1. **No Automated Test Framework:** Inspection of `package.json` confirms that neither Jest, Vitest, Cypress, nor Playwright is installed.
2. **Synthetic Mock Tests:** Existing test files in `tests/` (e.g., `tests/accounting-verification-audit.test.ts`) do not test database persistence or real API transactions. Instead, they build mock in-memory `JournalVoucherLine` arrays and pass them to `AccountingEngine.balanceVoucher()`.
3. **Absence of Test DB Isolation:** When test scripts (such as `tests/record-expense-category-management.test.ts`) are executed via `tsx`, they connect directly to whatever database is defined in `.env`.
4. **Dangerous Data Scripts:** `scripts/cleanup-database.ts` executes raw `deleteMany()` calls across invoices, expenses, and transactions without verifying `NODE_ENV !== "production"`.

---

## 9. Workstream 8: Reports, Performance, and Operations

1. **Reports Hub Heavy Payload:** Opening `/reports?category=statements` triggers 12 parallel async functions in [`app/(dashboard)/reports/page.tsx#L95-L121`](file:///Users/apple/Downloads/Antigravity/Billing%20ERP%20System/app/%28dashboard%29/reports/page.tsx#L95-L121), issuing multiple `generateAllVouchers()` calls simultaneously.
2. **No Database Restore Tooling:** While `scripts/backup-db.ts` exports collections to a JSON file, no corresponding `restore-db.ts` script exists in the repository.
3. **No Logging or Telemetry:** No structured logger (e.g., Pino, Winston) is configured; errors are logged via unstructured `console.error` and `console.warn`.

---

## 10. Audit Verification Confirmation

This audit was conducted strictly in read-only inspection mode. **Zero application source code, zero database schemas, zero business records, zero UI layouts, zero environment secrets, and zero dependency versions were altered during this audit.**
