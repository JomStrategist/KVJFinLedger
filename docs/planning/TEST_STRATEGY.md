# FINLEDGER ERP — COMPREHENSIVE TEST STRATEGY & QUALITY ASSURANCE PLAN

**Organization:** KVJ Analytics (Indian IT & Analytics Services)  
**System:** FinLedger ERP  
**Standard:** Enterprise Testing Standards & ICAI Accounting Verification  
**Baseline Date:** 21 October 2026  
**Document Status:** FROZEN TEST STRATEGY  

---

## 1. Testing Objectives & Philosophy

The FinLedger test strategy provides end-to-end verification of business workflows, statutory tax calculations, double-entry accounting integrity, application security, and disaster recovery.

### Guiding Principles:
1. **Real Transaction Testing:** Tests must execute against a real isolated MongoDB database instance (`DATABASE_URL_TEST`), not artificial in-memory mocks.
2. **Double-Entry Equilibrium ($\sum \text{Dr} = \sum \text{Cr}$):** Every test scenario that mutates financial data must verify that all generated journal vouchers are perfectly balanced.
3. **Zero UI Regression:** Automated tests must verify that existing approved Proforma and Tax Invoice layouts, printable views, and ribbon navigation remain unaffected.
4. **Permanent Traceability:** Test execution results will be recorded in automated test output and exported into an authoritative Excel Test Execution Tracker (`FinLedger_Test_Execution_Tracker.xlsx`).

---

## 2. Test Pyramid & Framework Architecture

```
                    ┌─────────────────────────┐
                    │  Browser E2E Tests     │  (Playwright)
                    │  15 User Workflows      │
                    ├─────────────────────────┤
                    │  Accounting & GL Tests  │  (Vitest Integration)
                    │  30 ICAI Scenarios (A-AD)│
                    ├─────────────────────────┤
                    │  Service & Action Tests │  (Vitest Integration)
                    │  Security, RBAC, CRUD   │
                    ├─────────────────────────┤
                    │  Unit Tests             │  (Vitest Unit)
                    │  Calculators, Precision │
                    └─────────────────────────┘
```

### Framework Selection:
- **Unit & Integration Test Runner:** **Vitest** (Fast execution with Native ESM, TypeScript support, and isolated worker threads).
- **End-to-End Browser Testing:** **Playwright** (Chromium headless browser automation for Next.js App Router).
- **Database Isolation:** An isolated MongoDB database specified via `DATABASE_URL_TEST` in `.env.test`. Test suites clean up created documents using transactional teardowns.
- **Reporting & Tracking:** Vitest JUnit/JSON reporter + custom SheetJS (`xlsx`) script generating the Excel execution tracker.

---

## 3. Test Suites & Coverage Scope

### 3.1 Unit Test Suites (`tests/unit/`)
1. **GST Calculation Engine (`gst-calculator.test.ts`):**
   - Intra-state (Kerala): 50% CGST + 50% SGST.
   - Inter-state: 100% IGST.
   - Zero-rated / SEZ supply under LUT (0% GST with statutory declaration).
   - Discount deduction before tax calculation.
2. **TDS Calculation Engine (`tds-calculator.test.ts`):**
   - Section 194J (Professional / Technical Services - 10% / 2%).
   - Section 194C (Contractor payments - 1% / 2%).
   - Section 192 (Salaries & Wages TDS slab calculation).
3. **Currency & Monetary Precision (`currency-precision.test.ts`):**
   - Fixed 2-decimal rounding with zero penny drift across 10,000 iterations.
   - Indian currency format (`₹1,00,000.00`) and number-to-words generator.
4. **Financial Year & Date Utilities (`financial-year.test.ts`):**
   - 1 April to 31 March boundary validation (e.g. 15-Jan-2027 belongs to FY 2026–27).
   - Short FY code formatting (`26-27`).

### 3.2 Integration Test Suites (`tests/integration/`)
1. **Invoice Lifecycle Integration (`invoice-lifecycle.test.ts`):**
   - Proforma invoice creation -> Status changes -> Conversion to Tax Invoice.
   - Atomic invoice numbering without race conditions under simulated concurrency.
   - Partial payment recording with TDS deduction -> Status change to `PARTIALLY_PAID` -> Full settlement to `PAID`.
   - Customer overpayment allocation as Customer Advance liability.
2. **Expense & Accounts Payable Integration (`expense-lifecycle.test.ts`):**
   - Vendor bill accrual -> Trade Payable liability creation -> Input GST asset recognition.
   - Expense payments via bank -> Reduction of Trade Payable and Bank balance.
   - Employee expense claims -> Reimbursement payment via bank.
   - Batch payroll run -> Automatic deduction of open employee advances and Section 192 TDS.
3. **Banking & Contra Transfers (`banking-transfers.test.ts`):**
   - Inter-bank transfer: Debit destination bank, Credit source bank.
   - Verification that no synthetic account IDs (`bank_dest_...`, `bank_src_...`) are created.
   - Owner drawings: Debit Owner Drawings (Equity), Credit Bank Account.
4. **Statutory Tax Settlements (`statutory-tax.test.ts`):**
   - GST Return Filing & Payment: Output GST offset against Input Tax Credit (ITC) with cash payment for balance.
   - Verification that zero duplicate payment vouchers or cash outflows occur.
   - TDS Deposit Challan (ITNS 281): Debit Statutory TDS Payable, Credit specific Bank Account.

### 3.3 Accounting Integrity & Reconciliation Test Suite (`tests/accounting/`)
Executes all **30 Mandated ICAI Scenarios** against the persistent General Ledger:
- **Scenario A:** Taxable customer invoice (Revenue Cr, GST Cr, Customer Dr).
- **Scenario B:** Intra-state invoice (CGST 9% + SGST 9%).
- **Scenario C:** Inter-state invoice (IGST 18%).
- **Scenario D:** Zero-rated export under LUT.
- **Scenario E:** Partial payment received without TDS.
- **Scenario F:** Partial payment received with 10% TDS (TDS Receivable Dr, Bank Dr, Customer Cr).
- **Scenario G:** Overpayment received (Customer Advance Cr).
- **Scenario H:** Operating expense with eligible Input GST.
- **Scenario I:** Operating expense with ineligible GST (GST capitalized to expense).
- **Scenario J:** Vendor payment disbursed against invoice.
- **Scenario K:** Employee personally paid expense (Employee Payable Cr).
- **Scenario L:** Employee reimbursement paid (Employee Payable Dr, Bank Cr).
- **Scenario M:** Employee advance issued (Employee Advance Dr, Bank Cr).
- **Scenario N:** Batch payroll run with advance recovery and TDS.
- **Scenario O:** Inter-bank contra transfer between two active bank accounts.
- **Scenario P:** Owner drawings withdrawal (Drawings Dr, Bank Cr).
- **Scenario Q:** Fixed asset acquisition (Fixed Asset Dr, Bank/Vendor Cr).
- **Scenario R:** Depreciation run under Companies Act Schedule II (Depreciation Dr, Acc Dep Cr).
- **Scenario S:** Fixed asset disposal with profit/loss recognition.
- **Scenario T:** Term loan disbursement (Bank Dr, Loan Liability Cr).
- **Scenario U:** Loan EMI repayment with principal/interest split.
- **Scenario V:** GSTR-3B statutory return settlement with ITC offset.
- **Scenario W:** Quarterly TDS payment via ITNS 281 challan.
- **Scenario X:** Opening balance sheet brought forward setup.
- **Scenario Y:** Multi-year retained earnings roll-forward across fiscal years.
- **Scenario Z:** Full Trial Balance equilibrium ($\sum \text{Dr} = \sum \text{Cr}$, Diff: ₹0.00).
- **Scenario AA:** Profit & Loss Statement reconciliation to GL operating revenue and expense accounts.
- **Scenario AB:** Balance Sheet Schedule III mathematical equilibrium ($\text{Assets} = \text{Liabilities} + \text{Equity}$).
- **Scenario AC:** Bank Reconciliation Statement timing difference matching.
- **Scenario AD:** Statutory MCA audit trail verification on record mutation.

### 3.4 Security & Access Control Test Suite (`tests/security/`)
1. **Unauthenticated Route Redirection:**
   - Unauthenticated GET requests to protected routes (`/dashboard`, `/invoices`, `/expenses`, `/reports`) redirect to `/login`.
2. **Server Action Authorization Guards:**
   - Invoking Server Actions without a valid JWT session throws `Unauthorized` and mutates zero database records.
3. **Role-Based Access Control (RBAC):**
   - Non-admin users attempting administrative actions (user management, settings) are rejected.
4. **Public Endpoint Exposure:**
   - Verify `/api/test-db` and `/api/ledgers/statement` cannot be accessed without authentication.

### 3.5 Disaster Recovery & Backup Verification (`tests/recovery/`)
1. **Automated Backup & Restore Cycle:**
   - Step 1: Record baseline entity counts and trial balance checksum.
   - Step 2: Execute `scripts/backup-db.ts` to export snapshot.
   - Step 3: Wipe test database collections.
   - Step 4: Execute `scripts/restore-db.ts` to restore snapshot.
   - Step 5: Verify entity counts, foreign key relations, and trial balance checksum match baseline with 100% fidelity.

---

## 4. Excel Test Execution Tracker Specification

A dedicated script (`scripts/generate-test-tracker-excel.ts`) will generate **`FinLedger_Test_Execution_Tracker.xlsx`** containing:
1. **Executive Dashboard Tab:** Total tests, passed, failed, execution timestamp, and environment.
2. **Workstream Test Matrix Tab:** Tests grouped by Workstream (Repository, Database, Invoicing, Accounting, Expenses, Security, Operations).
3. **ICAI 30 Scenarios Tab:** Detailed scenario log (Scenario A through AD), journal debit/credit amounts, expected vs actual balances, and pass/fail evidence.
4. **Defect Remediation Verification Tab:** Verification status of all previously identified defects.
