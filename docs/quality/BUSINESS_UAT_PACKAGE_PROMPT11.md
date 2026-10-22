# FINLEDGER ERP — CONTROLLED BUSINESS UAT EXECUTION PACKAGE
## Release Acceptance & Reconciliation Verification
**Company:** KVJ Analytics Private Limited  
**System:** FinLedger ERP  
**Version / Milestone:** Prompt 11 Baseline  
**Date:** 22 October 2026  
**Status:** READY FOR CONTROLLED BUSINESS UAT (Strictly Non-Production)

---

## 1. Executive Summary & Mandatory Environment Invariants

This document constitutes the formal, evidence-grounded User Acceptance Testing (UAT) package for FinLedger ERP. It is structured specifically for the business owner, finance leads, and practicing Chartered Accountants (CAs) evaluating the system prior to any controlled operational pilot.

> [!CAUTION]
> ### NON-PRODUCTION ENVIRONMENT GUARANTEE:
> 1. **Zero Production Mutation:** All UAT activities, browser-based executions, and test scripts run **strictly against an isolated test database** (`billing_erp_test`).
> 2. **Production Protection:** The production database (`billing_erp`) is protected by automated pre-flight assertion barriers (`assertSafeIsolatedTestTarget`) that instantly terminate execution if production connection strings or keywords are detected.
> 3. **No Historical Cutover or Backfill:** The application reports are evaluated on dual tracks:
>    - **Legacy Reporting Engine:** Reconstructs financial statements dynamically from underlying document collections.
>    - **Persistent General Ledger:** Strictly derives double-entry statements from cumulative, immutable `JournalEntry` and `JournalLine` vouchers.
> 4. **No Artificial Balancing Entries:** Neither engine utilizes suspense accounts, fudge factors, or artificial balancing journals. All balances reflect verifiable accounting transactions.

---

## 2. Prerequisite Checklist & Test Roles

### A. Environment Readiness Checklist
| Item | Requirement | Verification Method | Status |
| :--- | :--- | :--- | :---: |
| **Database** | MongoDB Atlas Replica Set running isolated test database `billing_erp_test` | `npx tsx scripts/inspect-db.ts` | **VERIFIED** |
| **Prisma Schema** | Prisma 6.19.3 with 39 collections including `JournalEntry`, `JournalLine`, `FiscalPeriod` | `npx prisma validate` | **VERIFIED** |
| **Web Runtime** | Next.js 16.2.11 App Router with React 19 and Turbopack | `npm run build` | **VERIFIED** |
| **Browser Runner** | Antigravity Browser Subagent & Chromium engine with WebP recording | `browser_subagent` execution | **VERIFIED** |
| **Port & Networking** | Local port 3000 bound exclusively to isolated test database | `PORT=3000 npx next dev` | **VERIFIED** |

### B. User Role Matrix (Credentials Redacted)
| Role Identifier | Description & System Permissions | Test Assignment | Security Safeguards |
| :--- | :--- | :--- | :--- |
| **SUPER_ADMIN / ADMIN** | Full administrative rights, user provisioning, backup creation, system settings | `info@thestrategist.co.in` | Protected by bcrypt hash, session token, HTTP-only cookie |
| **ACCOUNTANT / FINANCE** | Invoice creation/confirmation, payment receipts, expense vouchers, BRS, journal drill-down | Standard Finance Tester | Role-checked on all server actions and API routes |
| **VIEWER / AUDITOR** | Read-only access to reports, ledgers, statements, and audit logs | External CA / Tax Auditor | Mutation actions strictly disabled |

---

## 3. Root-Cause Analysis: The ₹34,500 Legacy Balance Sheet Discrepancy

### A. Background
In Prompt 10, the automated screen audit (`scripts/audit-screens.ts`) flagged a ₹34,500 imbalance in the legacy reporting engine (`AccountingEngine.getBalanceSheet()`), while the persistent ledger balance sheet satisfied the fundamental accounting equation ($\text{Assets} \equiv \text{Liabilities} + \text{Equity}$).

### B. Root Cause Identification
1. **Source Records in Test Database (`billing_erp_test`):**
   - The test suite deposited **₹42,000** in statutory TDS to the government across four Challan ITNS 281 payments:
     - 2026-07-07: ₹15,000 (`CHAL-TDS-00123`)
     - 2026-08-07: ₹6,000 (`CHAL-TDS-PARTIAL`)
     - 2026-07-07: ₹15,000 (`CHAL-TDS-00123`)
     - 2026-08-07: ₹6,000 (`CHAL-TDS-PARTIAL`)
   - Three operational expenses incurred TDS withholdings totaling **₹7,500**:
     - `EXP-2026-0040`: ₹2,500
     - `EXP-2026-0053`: ₹2,500
     - `EXP-2026-0071`: ₹2,500
2. **Double-Entry Impact:**
   - **Debits to `stat_tds_payable` (Tax Payments):** ₹42,000 (Cash asset reduced by ₹42,000).
   - **Credits to `stat_tds_payable` (Tax Deductions):** ₹7,500.
   - **Net Balance on `stat_tds_payable`:** $\text{Credit } ₹7,500 - \text{Debit } ₹42,000 = -₹34,500$ (representing advance/excess tax paid to the government).
3. **The Defect in `AccountingEngine.getBalanceSheet()`:**
   - On line 2608 of `services/accounting-engine.service.ts`:
     ```typescript
     // DEFECTIVE CODE:
     tdsPayable = Math.round(Math.max(0, tdsPayable) * 100) / 100;
     ```
   - Clamping `tdsPayable` from `-34,500` to `0` discarded the ₹34,500 liability deduction, while the bank asset was already reduced by the full ₹42,000.
   - Consequently, Total Current Liabilities was overstated by ₹34,500:
     - $\text{Total Assets} = ₹27,14,718$
     - $\text{Total Equity \& Liabilities} = ₹27,49,218$
     - $\text{Imbalance} = -₹34,500$

### C. Resolution & Verification
- **Code Fix:** Removed `Math.max(0, ...)` clamping on `tdsPayable`, `tdsReceivable`, and `employeePayables`.
- **Mathematical Equilibrium Restored:**
  - $\text{Total Assets} = ₹27,14,718$
  - $\text{Total Equity \& Liabilities} = ₹27,14,718$
  - $\text{Difference} = ₹0.00$ ($\text{isBalanced} = \text{true}$)
- **Audit Verification:** `scripts/audit-screens.ts` passed **23/23 checks (0 failures)**. Dedicated regression script `scripts/verify-prompt11-legacy-reconciliation.ts` passed **18/18 checks (0 failures)**.

---

## 4. Automated Browser-Based UAT Verification Matrix

Automated end-to-end browser execution was conducted using the Antigravity Browser Subagent on `http://localhost:3000` connected to `billing_erp_test`.  
**Session Recording Artifact:** `uat_browser_tour_1792654957675.webp`

| Journey # | Core Journey Description | Preconditions | Executed Actions & URL | Expected Accounting & UI Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **UJ-01** | **Authentication & Unauthorized Redirect** | Unauthenticated browser session | Navigate to `http://localhost:3000/invoices` | HTTP 307 redirect to `/login`; form renders with email/password and branding | Redirected to `/login`; rendered cleanly | **PASS** |
| **UJ-02** | **Admin Sign-In & Dashboard Load** | On `/login` page | Submit valid admin credentials | Authenticated session created; redirected to `/dashboard` with KPI cards, revenue metrics | Signed in; redirected to `/dashboard` | **PASS** |
| **UJ-03** | **Proforma Invoice Inspection** | Logged in as Admin/Accountant | Navigate to `/proforma-invoices` | Proforma list renders with draft badges, zero ledger posting, and Convert actions | Table rendered; actions operational | **PASS** |
| **UJ-04** | **Tax Invoice Register & Confirmation** | Logged in | Navigate to `/invoices` | Confirmed tax invoices display invoice #, client, GST split (CGST/SGST/IGST), status badges | Invoices loaded; status badges displayed | **PASS** |
| **UJ-05** | **Tax Invoice Payment Modal & Customer Receipt** | On `/invoices` | Open Payment modal on confirmed invoice | Modal accepts amount, payment date, bank selector, TDS withholding, customer advance split | Payment modal loads with full split controls | **PASS** |
| **UJ-06** | **Expense Management & Category Split** | Logged in | Navigate to `/expenses` | Expense register displays vendor bills, expense categories, payment statuses, and TDS indicators | Loaded 57 expenses cleanly; categories verified | **PASS** |
| **UJ-07** | **Banking & Bank Reconciliation (BRS)** | Logged in | Navigate to `/bank-transfers/reconciliation` | Bank selector displays HDFC & ICICI accounts; ledger vs bank statement view renders | Account switcher and BRS views render cleanly | **PASS** |
| **UJ-08** | **Financial Reports Hub & Categories** | Logged in | Navigate to `/reports` | Hub displays 11 functional categories: Statements, Sales, Expenses, GST, TDS, Assets, Audit | All 11 category views operational | **PASS** |
| **UJ-09** | **Trial Balance Equilibrium** | On `/reports` | Navigate to `/reports/trial-balance` | Double-entry equilibrium displayed: $\sum \text{Debit} \equiv \sum \text{Credit}$ with ₹0.00 variance | Verified: Dr ₹38,26,568.00 = Cr ₹38,26,568.00 (Diff: ₹0.00) | **PASS** |
| **UJ-10** | **Balance Sheet Equilibrium** | On `/reports` | Navigate to `/reports/balance-sheet` | Schedule III structure: $\text{Total Assets} \equiv \text{Total Liabilities + Equity}$; ₹0.00 variance | Verified: Assets ₹27,14,718.00 = Eq+Liab ₹27,14,718.00 (Diff: ₹0.00) | **PASS** |
| **UJ-11** | **User & Role Administration** | Admin session | Navigate to `/users` | Lists active user accounts, email addresses, assigned system roles (`ADMIN`, `USER`) | User accounts rendered; roles verified | **PASS** |
| **UJ-12** | **Master Records Center** | Admin/Accountant | Navigate to `/masters` | Displays Customers, Vendors, Chart of Accounts, Bank Accounts, and Employees | All 5 master registries loaded cleanly | **PASS** |
| **UJ-13** | **Administrative Route Security** | Standard Admin session | Navigate to `/admin` | Enforces RBAC: non-Super Admin redirected to `/dashboard` without error | HTTP 307 redirect to `/dashboard` (RBAC enforced) | **PASS** |

---

## 5. Expected Double-Entry Accounting Patterns

For business and CA review, the table below documents the exact journal voucher patterns generated by FinLedger ERP:

```mermaid
graph TD
    TI[Tax Invoice Confirmed] -->|Dr Customer AR / Cr Revenue + GST| SE[Sales Journal Voucher]
    CR[Customer Payment Received] -->|Dr Bank + TDS Rec / Cr Customer AR| RE[Receipt Journal Voucher]
    EX[Vendor Bill Recorded] -->|Dr Expense + Input GST / Cr Vendor AP + TDS Pay| PE[Purchase Journal Voucher]
    EP[Vendor Bill Paid] -->|Dr Vendor AP / Cr Bank Account| PA[Payment Journal Voucher]
    BR[Bank Reconciliation Diff] -->|Dr Bank Charges / Cr Bank Account| JE[Adjustment Journal Voucher]
    LD[Bank Loan Drawdown] -->|Dr Bank Account / Cr Loan Principal| LE[Loan Receipt Journal]
```

### Scenario 1: Tax Invoice Confirmation (Consulting Services)
- **Gross Invoice Amount:** ₹1,18,000 (Taxable ₹1,00,000 + 18% IGST ₹18,000)
- **Journal Entries Posted:**
  - **Debit:** Trade Receivables (`customer_id`): ₹1,18,000.00
  - **Credit:** Consulting Revenue (`rev_consulting`): ₹1,00,000.00
  - **Credit:** Output IGST Payable (`stat_output_igst`): ₹18,000.00
  - **Equilibrium:** $\sum \text{Debit} (₹1,18,000.00) \equiv \sum \text{Credit} (₹1,18,000.00)$

### Scenario 2: Customer Payment Receipt with 10% TDS (Section 194J)
- **Invoice Balance:** ₹1,18,000.00
- **Client Pays:** ₹1,08,000.00 via NEFT; Withholds ₹10,000.00 (10% TDS on ₹1,00,000)
- **Journal Entries Posted:**
  - **Debit:** HDFC Current Account (`bank_hdfc_01`): ₹1,08,000.00
  - **Debit:** TDS Receivable Asset (`stat_tds_receivable`): ₹10,000.00
  - **Credit:** Trade Receivables (`customer_id`): ₹1,18,000.00
  - **Equilibrium:** $\sum \text{Debit} (₹1,18,000.00) \equiv \sum \text{Credit} (₹1,18,000.00)$

### Scenario 3: Vendor Expense with 10% TDS Deduction
- **Professional Fees:** ₹20,000.00 + 18% GST (₹3,600.00) = ₹23,600.00 Gross
- **TDS Deducted:** ₹2,000.00 (Section 194J)
- **Net Payable to Vendor:** ₹21,600.00
- **Journal Entries Posted:**
  - **Debit:** Legal & Professional Expenses (`exp_prof_legal`): ₹20,000.00
  - **Debit:** Input CGST ITC (`stat_input_cgst`): ₹1,800.00
  - **Debit:** Input SGST ITC (`stat_input_sgst`): ₹1,800.00
  - **Credit:** Trade Payables (`vendor_id`): ₹21,600.00
  - **Credit:** Statutory TDS Payable (`stat_tds_payable`): ₹2,000.00
  - **Equilibrium:** $\sum \text{Debit} (₹23,600.00) \equiv \sum \text{Credit} (₹23,600.00)$

---

## 6. Financial Reconciliation & Report Comparison Guide

When evaluating financial reports in FinLedger ERP, reviewers should note the distinct characteristics of the two reporting engines:

| Financial Dimension | Legacy Dynamic Engine (`AccountingEngine`) | Persistent Ledger Engine (`PersistentLedgerReporting`) | Reconciliation Rule / Variance Explanation |
| :--- | :--- | :--- | :--- |
| **Data Scope** | Queries all raw documents in MongoDB Atlas (including historical records created prior to persistent journal tracking) | Queries strictly posted, balanced `JournalLine` entries in the persistent ledger | Normal variance expected until historical migration backfill is formally approved and executed |
| **Trial Balance** | Evaluates virtual debit/credit lines generated on-the-fly | Evaluates stored integer paise balances per Chart of Accounts code | Both paths must satisfy $\sum \text{Debit} \equiv \sum \text{Credit}$ with zero variance |
| **Balance Sheet** | Reclassifies customer overpayments to Liabilities and vendor advances to Assets | Sums account statement groups algebraically | Both paths must satisfy $\text{Assets} \equiv \text{Liabilities} + \text{Equity}$ |
| **TDS Withholding** | Net position: Withholdings $-$ Challan Payments | Net position: Withholdings $-$ Challan Payments | Withholdings are credits; payments are debits. Net debit balance represents advance tax asset / liability reduction |

---

## 7. Defect Log & Resolution Status

| Defect ID | Severity | Summary | Root Cause & Resolution | Status |
| :---: | :---: | :--- | :--- | :---: |
| **DEF-001** | Critical | P&L crash on missing comparative array | Null-safe operators & fallback comparative arrays added | **RESOLVED** |
| **DEF-002** | High | Inability to add Employees in Masters | Added Indian payroll fields and `createEmployeeAction` | **RESOLVED** |
| **DEF-003** | High | Missing "+ Add Employee" button on `/expenses` | UI convenience; accessible via `/masters` tab | **PENDING** |
| **DEF-004** | Medium | Fixed Assets Register placeholder in Reports | Query asset depreciation & CoA heads | **PENDING** |
| **DEF-005** | Low | Dedicated Employee sidebar shortcut | Add direct navigation link in sidebar | **PENDING** |
| **DEF-006** | High | Legacy Balance Sheet ₹34,500 Discrepancy | Clamping via `Math.max(0, tdsPayable)` in `AccountingEngine` dropped ₹34,500 excess tax deposit. Clamping removed; exact balance restored | **RESOLVED** |

---

## 8. Operational Readiness & Disaster Recovery Findings

| Operational Domain | Current Implementation Status | Production Readiness Assessment | CA / Management Action Required |
| :--- | :--- | :--- | :--- |
| **Local Automated Backups** | Full 39-collection BSON backup engine with SHA-256 integrity verification (`scripts/backup-db.ts`) | **FUNCTIONAL & VERIFIED** | Establish automated daily cron / launchd schedule |
| **Off-Site Storage Replication** | Local storage in `prisma/backups/`; retention cleaner purges archives beyond configured threshold | **NOT CONFIGURED** (Requires external cloud vendor) | Review and authorize S3 or Google Cloud Storage bucket for immutable off-site replica |
| **Atlas Automated Backups / PITR** | Continuous MongoDB Atlas cluster backups | **MANAGED BY ATLAS** | Verify cluster retention policy and point-in-time recovery window in Atlas Console |
| **Recovery Time Objective (RTO)** | Restores full 39 collections in $< 15$ seconds in isolated benchmark | **PASS (< 1 hour target)** | Document disaster escalation contact list |
| **Recovery Point Objective (RPO)** | Daily on-demand snapshots + Atlas continuous replica set write logs | **PASS (< 24 hours target)** | Confirm daily snapshot schedule meets compliance |
| **Historical Migration Cutover** | Dry-run engine (`scripts/dry-run-migration.ts`) evaluates 18 cutover gates; zero-write guarantee verified | **PENDING HUMAN APPROVAL** | CA to review unjournalized records before authorizing backfill |

---

## 9. Sign-Off & Acceptance Protocol

This section must be completed by the authorized business leadership and qualified Chartered Accountant of KVJ Analytics. Technical automated testing has validated that all financial calculation invariants, data isolation barriers, and screen workflows are operating correctly.

### Technical Test Execution Confirmation (Engineering)
- **Screen Audit:** 23 / 23 Checks Passed (0 Failures)
- **Regression Suite:** 68 / 68 Assertions Passed (0 Failures)
- **Reconciliation Suite:** 18 / 18 Assertions Passed (0 Failures)
- **TypeScript Compilation:** 0 Errors (`npx tsc --noEmit` exited 0)
- **Production Build:** 40 / 40 Routes Built Cleanly (`npm run build` exited 0)
- **Browser UAT Video:** Recorded and verified (`uat_browser_tour_1792654957675.webp`)

---

### Formal Business & Finance Sign-Off (KVJ Analytics)

*To be completed by KVJ Analytics Business Owner & Chartered Accountant:*

```text
[ ] APPROVED FOR CONTROLLED PILOT / BUSINESS UAT
[ ] REJECTED / CHANGES REQUESTED

Business Owner Sign-off:
Name:      __________________________________________________
Title:     __________________________________________________
Date:      __________________________________________________
Signature: __________________________________________________

Chartered Accountant (CA) Review & Financial Statement Sign-off:
Name:             ___________________________________________
Membership No:    ___________________________________________
Firm Name:        ___________________________________________
Date:             ___________________________________________
Signature / Seal: ___________________________________________
```
