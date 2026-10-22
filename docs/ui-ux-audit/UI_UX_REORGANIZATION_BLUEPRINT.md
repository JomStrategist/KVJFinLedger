# FinLedger ERP — UI/UX Reorganization Blueprint

**Organization:** KVJ Analytics  
**Application:** FinLedger Financial ERP  
**Blueprint Scope:** Implementation roadmap, phased milestones, invariant preservation requirements, risk mitigations, and acceptance criteria for future UI/UX implementation.  
**Strict Safety Boundary:** This blueprint constitutes architectural planning and recommendations only. No production or application code changes are authorized within Prompt 12.  

---

## 1. Statutory Accounting & Business Invariants (Non-Negotiable)

Any future implementation of this blueprint must strictly uphold the following 16 accounting and business invariants:

1. **Proforma Zero-Posting Rule:** Proforma Invoices must never create General Ledger journal vouchers, alter customer receivable balances, or impact tax liability registers.
2. **Single-Posting Tax Invoice Rule:** Confirming a Tax Invoice posts exactly one balanced double-entry voucher (`DR Accounts Receivable` / `CR Revenue` + `CR Output CGST/SGST/IGST`).
3. **Payment Audit Preservation:** Editing a confirmed Tax Invoice must strictly preserve historical payment receipts, customer TDS credits, and audit records.
4. **Flexible Customer Receipts:** Customer partial payments, multiple receipts against a single invoice, and overpayments (unallocated customer credit) must remain supported.
5. **Withholding Recognition:** Customer TDS (Section 194C/J) must be recognized as an asset (`DR TDS Receivable`) strictly when actually deducted upon payment receipt.
6. **Expense Categorization Integrity:** Configurable expense categories must retain their immutable mapping to the double-entry Chart of Accounts (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`).
7. **Anti-Duplication Employee Expense Rule:** Recording an expense paid out-of-pocket by an employee (`CR Employee Reimbursements Payable`) and subsequently reimbursing the employee (`DR Employee Reimbursements Payable` / `CR Bank`) must never double-count the underlying expense.
8. **Statutory Vendor TDS Withholding:** Vendor TDS must be recorded strictly when deducted (`CR TDS Payable Under Sec 194C/J`) and relieved only upon challan deposit.
9. **Granular Payroll Entry:** Monthly salary amounts, unpaid leave deductions, and statutory PF/ESI/PT/TDS withholding must remain editable per employee and month where required.
10. **Multi-Bank Attribution:** Every cash/bank receipt, payout, and fund transfer must strictly record the specific company bank account or cash ledger utilized.
11. **Neutrality of Internal Transfers:** Contra fund transfers between company bank accounts must have zero impact on Profit & Loss, GST liability, or TDS.
12. **Tax Challan Settlement Rule:** GST settlement and TDS challan deposits must offset existing statutory liabilities (`DR Output Tax` / `CR Input Tax` / `CR Bank`) without duplicating expenses.
13. **Fixed Asset Capitalization & Depreciation:** Capital asset acquisitions must capitalize to Balance Sheet Asset accounts, and depreciation runs must post standard SLM/WDV entries (`DR Depreciation Expense` / `CR Accumulated Depreciation`).
14. **Loan & Facility Double-Entry Accounting:** Loan disbursements must credit loan liability accounts, and repayments must correctly split principal reduction from deductible interest expense.
15. **Fiscal Period Continuity & Equilibrium:** Opening balances must carry forward exclusively Balance Sheet items (`ASSET`, `LIABILITY`, `EQUITY`). Trial Balance total debits must equal total credits at all times.
16. **Server-Side RBAC Enforcement:** UI visibility restrictions must always be backed by server-side session and role validation in Server Actions (`requireActionAdmin()`, `requireActionFinance()`, `requireActionAuth()`).

---

## 2. Phased Implementation Roadmap

To eliminate user confusion while guaranteeing zero operational downtime and zero accounting regressions, the reorganization is divided into **four discrete, verifiable phases**.

```
[Phase 1: Navigation & Consolidation] ──> [Phase 2: Action Restoration & Dead Control Elimination]
                                                               │
                                                               ▼
[Phase 4: Form & Modal Ergonomics]    <── [Phase 3: Reporting & Filter State Unification]
```

---

### Phase 1: Navigation Consolidation & Redundancy Elimination (P1)

- **Objective:** Establish the clean 7-pillar navigation model and eliminate duplicate counterparty subsystems.
- **Scope of Changes:**
  1. Update `components/Sidebar.tsx` to reflect the 7 primary pillars:
     - Dashboard (`/dashboard`)
     - Sales & Invoicing (`/invoices`)
     - Purchases & Expenses (`/expenses`)
     - Banking & Treasury (`/bank-transfers`)
     - General Ledger & Accounting (`/ledgers`)
     - Reports & Analytics (`/reports`)
     - Administration & Settings (`/settings`)
  2. Implement subnavigation tab headers in each parent module.
  3. Configure Next.js route redirects for legacy duplicate routes:
     - `/proforma-invoices` -> `/invoices?tab=proforma`
     - `/customers` -> `/invoices?tab=customers`
     - `/vendors` -> `/expenses?tab=vendors`
     - `/products` -> `/invoices?tab=products`
     - `/bank-transfers/reconciliation` -> `/bank-transfers?tab=reconciliation`
     - `/home` -> `/dashboard`
- **Dependencies:** None (Pure layout and routing configuration).
- **Risk Assessment:** Low risk. Existing URLs redirect smoothly; no data schema or backend services touched.
- **Acceptance Criteria:**
  - Sidebar exhibits clean 7-item layout.
  - Navigating to any legacy path automatically lands on the canonical tab without 404 errors.
  - Active tab highlighting accurately reflects current URL query parameter.

---

### Phase 2: Action Restoration & Dead Control Elimination (P0)

- **Objective:** Fix non-functional buttons and build missing UI wrappers around existing server actions.
- **Scope of Changes:**
  1. **Fix Customer Statement Print Button (DEF-001):** Wire `onClick={() => window.print()}` on `app/(dashboard)/customers/[id]/statement/page.tsx:L41`.
  2. **Restore Loan & Facility UI (DEF-002):**
     - Add `Loans & Facilities` tab under `/bank-transfers?tab=loans`.
     - Build `LoanFacilityClient.tsx` connecting directly to existing `createLoanAction`, `recordLoanRepaymentAction`, and `deleteLoanRepaymentAction` in `app/(dashboard)/finance/loan-actions.ts`.
  3. **Restore Backup & Recovery UI (DEF-003):**
     - Add `Backup & Disaster Recovery` tab in Settings (`/settings?tab=backup`).
     - Build `BackupManagerClient.tsx` connecting to `triggerBackupAction`, `listBackupsAction`, and `verifyBackupChecksumAction` in `app/(dashboard)/admin/backup-actions.ts`.
  4. **Restore Advanced Custom Role Builder (DEF-004):**
     - Update `app/(dashboard)/users/page.tsx` to render the fully equipped `UserManagementClient.tsx` instead of the primitive `UsersRolesClient.tsx`.
  5. **Align P&L Authorization Guard (DEF-009):**
     - Update `app/(dashboard)/profit-loss/page.tsx:L13` from `requireAdmin()` to allow `ADMIN`, `FINANCE`, `ACCOUNTANT`, and `AUDITOR` to match `/reports`.
- **Dependencies:** Phase 1 navigation structure.
- **Risk Assessment:** Low to Medium risk. Existing server actions are already unit-tested and verified; changes simply surface them in the DOM.
- **Acceptance Criteria:**
  - Clicking "Print Statement" on Customer Statement triggers browser print dialog.
  - Administrators can create term loans, record repayments, and view loan balances in the UI.
  - Administrators can initiate on-demand backups and verify SHA-256 checksums in the browser.
  - Administrators can create custom roles with modular permission checkboxes.
  - Accountants and auditors can access `/profit-loss` without being redirected.

---

### Phase 3: Reporting & Filter State Unification (P2)

- **Objective:** Unify report URL query parameters and eliminate filter loss during ledger drilldown.
- **Scope of Changes:**
  1. Standardize all report date filters to use unified `?from=YYYY-MM-DD&to=YYYY-MM-DD` query parameters.
  2. Implement `usePersistedFilter` hook utilizing `sessionStorage` so navigating from Trial Balance -> Account Ledger -> Back preserves the active date range.
  3. Wire Header Global Search Pill (DEF-010): Connect to lightweight command palette searching recent vouchers, active accounts, and customer names, or display clear shortcut hint.
- **Dependencies:** Phase 1 & 2.
- **Risk Assessment:** Low risk. Affects client-side query string synchronization.
- **Acceptance Criteria:**
  - Drilling down from Trial Balance into `/ledgers` and clicking browser back button retains selected fiscal period.
  - Export to Excel and PDF in all reports consistently respects active date filters.

---

### Phase 4: Form & Modal Ergonomics (P2 / P3)

- **Objective:** Reduce cognitive overload in complex financial forms and add safeguards against accidental data loss.
- **Scope of Changes:**
  1. **Batch Payroll Ergonomics (DEF-012):** Convert the 10-column `BatchPayrollModal` into a dedicated full-page screen (`/expenses/payroll/batch`) with sticky totals bar.
  2. **Opening Balance Deletion Guard (DEF-013):** Add confirmation dialog prior to executing `deleteOpeningBalanceAction()`.
  3. **Live Account Balance Indicators:** Display live ledger balance chips next to Bank Account selectors in `InvoicePaymentModal`, `RecordPaymentModal`, and `BankTransferModal`.
  4. **Invoice Creation Keyboard Navigation:** Support Tab-key auto-row creation in `TaxInvoiceForm` line items table.
  5. **Dashboard Transition Polish (DEF-014):** Utilize React 19 `startTransition` for period filter switches on `/dashboard` to eliminate layout shift.
- **Dependencies:** Phases 1 through 3.
- **Risk Assessment:** Low risk. Polishes UX ergonomics without modifying financial calculations.
- **Acceptance Criteria:**
  - Batch payroll can be completed comfortably on 13-inch displays without awkward table clipping.
  - Deleting an opening balance requires typing confirmation or clicking explicit confirmation dialog.
  - Users see bank account balances before committing disbursement transactions.

---

## 3. Risk Mitigation & Verification Checklist

Before and during any future implementation prompt, the following test suite must be executed to guarantee zero regressions:

```bash
# 1. Type-check validation
npm run lint

# 2. Accounting equilibrium validation
npx tsx scripts/audit-screens.ts

# 3. Double-entry engine regression suite
npx tsx scripts/verify-journal-foundation.ts
npx tsx scripts/verify-invoice-accounting.ts
npx tsx scripts/verify-expense-accounting.ts
npx tsx scripts/verify-prompt8-reporting.ts

# 4. Disaster recovery and dry-run migration validation
npx tsx scripts/verify-prompt9-backup-migration.ts
```
