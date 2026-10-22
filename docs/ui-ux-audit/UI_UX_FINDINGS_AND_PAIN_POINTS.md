# FinLedger ERP — UI/UX Findings and Pain Points Register

**Organization:** KVJ Analytics  
**Application:** FinLedger Financial ERP  
**Audit Date:** October 2026  
**Baseline Git Commit:** `1dadc98`  
**Classification Scheme:** P0 (Blocker / Dead / Orphaned), P1 (High Severity / Structural Redundancy), P2 (Medium Severity / Ergonomic Friction), P3 (Low Severity / Polish)  

---

## 1. Executive Summary of Findings

During this comprehensive UI/UX discovery audit of FinLedger ERP, **14 distinct systemic usability and structural defects** were uncovered across the application's 58 routes and 180+ interactive controls.

The application contains sophisticated, production-grade double-entry accounting engines, full GST/TDS tax compliance services, and automated payroll pipelines. However, the user interface suffers from:
1. **Dead Controls & Misleading Affordances:** Buttons and search inputs that visually promise functionality but contain zero event handlers.
2. **Orphaned Backend Capabilities:** Fully coded server actions and services (Loans, Backups, Custom Roles) that completely lack user interfaces.
3. **Severe Data Navigation Redundancy:** Core business entities (Customers, Vendors, Bank Accounts, Proformas, Bank Reconciliation) duplicated across 2 to 3 disjointed locations.
4. **Information Architecture Overload:** Individual navigation tabs (e.g. Expenses) loaded with 5 radically distinct subsystems (Operational Bills, Payroll, Recurring Vouchers, Vendor Masters, Chart Categories).
5. **Session & Filter State Amnesia:** Navigating between summary reports and account ledgers destroys date filters, forcing accountants to re-enter dates repeatedly.

---

## 2. Prioritized Defect Register

### Category A: Dead & Misleading Controls (P0 / P2)

#### DEF-001 [P0]: Customer Statement of Account Print Button Contains No `onClick` Handler
- **Location:** `app/(dashboard)/customers/[id]/statement/page.tsx:L41-L47`
- **Component:** `app/(dashboard)/customers/[id]/statement/page.tsx`
- **Code Evidence:**
  ```tsx
  <button 
    className="px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:bg-theme-primary-dark"
    style={{ '@media print': { display: 'none' } } as any}
    // A simple JS print on click
  >
    Print Statement
  </button>
  ```
- **Observed Behavior:** Clicking the prominent blue "Print Statement" button does nothing at all. There is no `onClick` handler attached to trigger `window.print()`.
- **User Impact:** Accountants attempting to print or PDF-export an official Statement of Account for a customer cannot do so from this screen.
- **Recommended Remediation:** Replace with standard interactive client component `<PrintButton label="Print Statement" />` or add `onClick={() => window.print()}`.

---

#### DEF-010 [P2]: Global Search Pill in Top Header is a Static Non-Interactive `<div>`
- **Location:** `components/Header.tsx:L85-L91`
- **Component:** `Header.tsx`
- **Code Evidence:**
  ```tsx
  {/* Global Search Pill (Desktop) */}
  <div className="hidden md:flex items-center gap-2 bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-400 font-medium cursor-pointer transition-all shadow-xs">
    <svg className="w-3.5 h-3.5 text-slate-400" ... />
    <span>Search vouchers, accounts, invoices...</span>
    <kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-mono text-slate-500 shadow-xs">⌘K</kbd>
  </div>
  ```
- **Observed Behavior:** The search bar displays `cursor-pointer` and a `⌘K` keyboard badge, but has no click listener, no modal trigger, and no global keyboard event listener.
- **User Impact:** Frustrates users who expect a modern command palette for quick navigation to vouchers, accounts, or invoices.
- **Recommended Remediation:** Wire this control to a functional command palette dialog (searching Invoices, Vouchers, Accounts, Customers) or remove the interactive affordance (`cursor-pointer` / `⌘K`) until implemented.

---

### Category B: Orphaned Backend Services & Actions Lacking User Interfaces (P0 / P1)

#### DEF-002 [P0]: Complete Loan & Facility Accounting Backend Lacks Frontend Interface
- **Location:** `app/(dashboard)/finance/page.tsx`, `app/(dashboard)/finance/loan-actions.ts`, `services/loan.service.ts`
- **Code Evidence:**
  ```tsx
  // app/(dashboard)/finance/page.tsx
  import { redirect } from 'next/navigation';

  export default function FinancePage() {
    redirect('/bank-transfers');
  }
  ```
  ```typescript
  // app/(dashboard)/finance/loan-actions.ts
  export async function createLoanAction(data: CreateLoanInput) { ... }
  export async function recordLoanRepaymentAction(data: RecordRepaymentInput) { ... }
  export async function deleteLoanRepaymentAction(repaymentId: string) { ... }
  ```
- **Observed Behavior:** Navigating to `/finance` redirects immediately to `/bank-transfers`. The entire `LoanService` (supporting principal tracking, interest expense, and repayment schedules) has full server actions but zero UI representation.
- **User Impact:** Management and accounting teams cannot record term loans, working capital facilities, or director loans through the web application.
- **Recommended Remediation:** Build a "Loans & Facilities" tab within the Banking & Treasury module to surface these existing actions.

---

#### DEF-003 [P0]: Database Backup, Checksum Verification & Disaster Recovery Lack Web Interface
- **Location:** `app/admin/page.tsx`, `app/(dashboard)/admin/backup-actions.ts`, `services/backup-restore.service.ts`
- **Code Evidence:**
  ```tsx
  // app/admin/page.tsx
  import { redirect } from 'next/navigation';

  export default function AdminPage() {
    redirect('/dashboard');
  }
  ```
  ```typescript
  // app/(dashboard)/admin/backup-actions.ts
  export async function triggerBackupAction() { ... }
  export async function listBackupsAction() { ... }
  export async function verifyBackupChecksumAction(backupId: string) { ... }
  export async function runHistoricalDryRunAction(params?: { financialYear?: string }) { ... }
  ```
- **Observed Behavior:** `/admin` redirects to `/dashboard`. Administrators have no web-based UI to view existing backups, trigger on-demand backups, or verify SHA-256 integrity checksums.
- **User Impact:** Disaster recovery controls are restricted to CLI commands, leaving business operators unable to verify backup status in production.
- **Recommended Remediation:** Provide a "Backup & Disaster Recovery" tab in the Settings/Administration console.

---

#### DEF-004 [P1]: Advanced Custom Role & Permission Builder is Orphaned in Source Code
- **Location:** `app/(dashboard)/users/UserManagementClient.tsx` vs `app/(dashboard)/users/UsersRolesClient.tsx`
- **Code Evidence:**
  - `UserManagementClient.tsx` (552 lines) contains a complete role creation modal (`RoleFormModal.tsx`), granular module permission checkboxes (`getEffectiveUserPermissions`), user detail modal (`UserViewModal.tsx`), and department filters.
  - `app/(dashboard)/users/page.tsx` renders `UsersRolesClient.tsx` (a basic 100-line table with no role creation or modal views).
- **Observed Behavior:** High-value role-based customization code is completed in the repository but completely bypassed at the page level.
- **User Impact:** Administrators cannot create custom organizational roles or inspect user permission sets.
- **Recommended Remediation:** Swap `UsersRolesClient` for `UserManagementClient` on `app/(dashboard)/users/page.tsx`.

---

### Category C: Navigation & Data Subsystem Redundancies (P1)

#### DEF-005 [P1]: Triple-Duplication of Customer Master Data
- **Location:**
  1. Standalone: `/customers`
  2. Tab inside Invoices: `/invoices?tab=customers`
  3. Tab inside Masters: `/masters?tab=customers`
- **Observed Behavior:** Three distinct routes render customer directories with minor differences in search behavior and action button styles.
- **User Impact:** Confusion among sales and accounting personnel about where customer records should be updated or reviewed.
- **Recommended Remediation:** Designate `Sales -> Customers` as the single canonical route; redirect `/masters?tab=customers` and `/invoices?tab=customers` with clear sub-navigation.

---

#### DEF-006 [P1]: Triple-Duplication of Vendor Master Data
- **Location:**
  1. Standalone: `/vendors`
  2. Tab inside Expenses: `/expenses?tab=vendors`
  3. Tab inside Masters: `/masters?tab=vendors`
- **Observed Behavior:** Vendor directory is accessible in three separate places.
- **User Impact:** Disjointed vendor management and fragmented bookmarks.
- **Recommended Remediation:** Consolidate under `Purchases & Expenses -> Vendors`.

---

#### DEF-007 [P1]: Standalone `/proforma-invoices` Duplicates `/invoices?tab=proforma`
- **Location:** `app/(dashboard)/proforma-invoices/page.tsx` vs `app/(dashboard)/invoices/page.tsx`
- **Observed Behavior:** Both routes load the identical `ProformaInvoiceClientList` component.
- **User Impact:** Redundant route footprint in the codebase and confusion in browser history.
- **Recommended Remediation:** Make `/invoices?tab=proforma` the canonical view; make `/proforma-invoices` a permanent redirect.

---

#### DEF-008 [P1]: Standalone `/bank-transfers/reconciliation` Duplicates Banking Tab
- **Location:** `app/(dashboard)/bank-transfers/reconciliation/page.tsx` vs `app/(dashboard)/bank-transfers/page.tsx?tab=reconciliation`
- **Observed Behavior:** Standalone route renders identical `BankReconciliationClient` as the tabbed route.
- **User Impact:** Redundant navigation paths and maintenance overhead.
- **Recommended Remediation:** Consolidate into canonical `Banking -> Reconciliation`.

---

### Category D: Authorization & Access Inconsistencies (P1)

#### DEF-009 [P1]: Standalone Profit & Loss Route Enforces `requireAdmin()` While Reports Hub Allows Accountants
- **Location:** `app/(dashboard)/profit-loss/page.tsx:L13` vs `app/(dashboard)/reports/page.tsx`
- **Code Evidence:**
  ```tsx
  // app/(dashboard)/profit-loss/page.tsx
  export default async function ProfitLossPage(...) {
    await requireAdmin(); // Strictly blocks non-ADMIN
    ...
  }
  ```
  ```tsx
  // app/(dashboard)/reports/page.tsx
  export default async function ReportsPage(...) {
    await requireAuth(); // Allows ADMIN, FINANCE, ACCOUNTANT, AUDITOR
    ...
  }
  ```
- **Observed Behavior:** An accountant or auditor can view the P&L statement via the Reports Hub (`/reports?category=financial`), but if they navigate directly to `/profit-loss`, they are blocked and redirected to `/dashboard`.
- **User Impact:** Inconsistent access experience for financial staff performing audit and period-end reviews.
- **Recommended Remediation:** Change authorization guard in `/profit-loss` to allow `ADMIN`, `FINANCE`, `ACCOUNTANT`, and `AUDITOR`.

---

### Category E: Ergonomics, Information Density & State Loss (P2)

#### DEF-011 [P2]: Report Date Filter State is Lost During Drilldown into Account Ledgers
- **Location:** `app/(dashboard)/reports/trial-balance/page.tsx` -> `app/(dashboard)/ledgers/page.tsx`
- **Observed Behavior:** When viewing a Trial Balance for a historical period (e.g. `01 Apr 2025 – 31 Mar 2026`), clicking on an Account Name navigates to `/ledgers?accountId=...`. When the user clicks the browser Back button or navigates back to Reports, the date filter resets to the default current date.
- **User Impact:** High friction during financial audits; accountants must repeatedly re-select custom date ranges.
- **Recommended Remediation:** Persist active date filters in URL parameters across drilldowns or store active audit period in `sessionStorage`.

---

#### DEF-012 [P2]: Batch Payroll Spreadsheet is Constrained Inside a Narrow Modal Dialog
- **Location:** `app/(dashboard)/expenses/BatchPayrollModal.tsx`
- **Observed Behavior:** The monthly payroll register contains 10+ financial columns (Basic, HRA, Allowances, PF, ESI, PT, TDS, Net Payable, Bank Account, Status) rendered inside a standard max-width modal with cramped horizontal scrolling.
- **User Impact:** High risk of data-entry errors when modifying employee salary deductions on standard laptop screens.
- **Recommended Remediation:** Elevate Batch Payroll to a full-page workflow or wide drawer.

---

#### DEF-013 [P2]: Opening Balance Row Deletion Lacks Confirmation Dialog
- **Location:** `app/(dashboard)/opening-closing/OpeningClosingClient.tsx:L180`
- **Code Evidence:**
  ```tsx
  <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700">
    <TrashIcon />
  </button>
  ```
- **Observed Behavior:** Clicking the trash icon immediately invokes `deleteOpeningBalanceAction(id)` without asking for user confirmation.
- **User Impact:** Accidental click deletes an opening balance line, instantly throwing the General Ledger Trial Balance out of equilibrium.
- **Recommended Remediation:** Add a modal confirmation dialog: `"Are you sure you want to delete opening balance for [Category] (₹[Amount])? This will impact Trial Balance equilibrium."`

---

#### DEF-014 [P3]: Dashboard Date Filter Causes Full-Page Reload with Layout Shift
- **Location:** `app/(dashboard)/dashboard/page.tsx`
- **Observed Behavior:** Switching between "This Month", "Last Month", and "This FY" executes a full server reload, causing a visible layout shift and momentary flash of empty chart containers.
- **User Impact:** Minor visual polish issue.
- **Recommended Remediation:** Utilize React 19 `useTransition` or client-side chart data refetching for smooth transitions.
