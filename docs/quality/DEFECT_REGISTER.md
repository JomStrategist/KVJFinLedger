# FinLedger Quality Assurance — Defect Register

**Document Version:** 1.0.0  
**Project:** FinLedger ERP (KVJ Analytics)  
**Maintained By:** Lead QA & Full-Stack Architect  
**Last Updated:** 9 October 2026  

---

## 1. Summary of Defect Lifecycle

This register logs every functional, accounting, UI/UX, and performance defect uncovered during application auditing, tracking each through identification, root-cause analysis, code fix, and regression verification.

### Defect Status Breakdown
| Severity | Total Discovered | Resolved / Verified | Pending Implementation |
| :--- | :---: | :---: | :---: |
| **Critical / Blocker** | 1 | 1 | 0 |
| **High** | 2 | 1 | 1 |
| **Medium** | 1 | 0 | 1 |
| **Low** | 1 | 0 | 1 |
| **Total** | **5** | **2** | **3** |

---

## 2. Detailed Defect Logs

### DEF-001: P&L Statement Crash on Missing Comparative Array
- **Defect ID:** `DEF-001`
- **Severity:** Blocker / Critical
- **Affected URL:** `/reports?category=statements` (Profit & Loss tab)
- **Reported By:** User (Chat Prompt 1)
- **Root Cause:** When `comparativePeriod` was empty or had no corresponding accounts in the prior fiscal period, the calculation engine attempted to access `.map()` and property accessors on undefined array objects, causing a Next.js server/client component runtime exception.
- **Resolution:** Updated `accounting-engine.service.ts`, `reports/page.tsx`, and `FinancialStatementsClient.tsx` to include null-safe coalescing operators, fallback zero-filled comparative rows, and defensive array maps.
- **Status:** **RESOLVED & VERIFIED** (Passes live audit check `[TEST 23]` and browser automation).

---

### DEF-002: Inability to Add Employees in Masters Modal
- **Defect ID:** `DEF-002`
- **Severity:** High
- **Affected URL:** `/masters` (`AddMasterRecordModal`)
- **Reported By:** User (Chat Prompt 2)
- **Root Cause:** The `AddMasterRecordModal` only defined tabs for Customer, Vendor, Chart of Accounts, Bank Account, and Tax Rate. There was no Employee tab or server action connected to `prisma.employee.create`.
- **Resolution:**
  1. Added `Employee` tab with full Indian payroll fields: Employee Code (`EMP-YYYY-NNN`), Full Name, Designation, Department, Email, Phone, PAN, Date of Joining, Monthly CTC, Bank Details.
  2. Implemented `createEmployeeAction` in `app/(dashboard)/masters/actions.ts` using strict Zod validation.
  3. Added auto-generated sequence generator for Employee codes.
- **Status:** **RESOLVED & VERIFIED** (Passes browser automation inspection).

---

### DEF-003: Missing Direct "+ Add Employee" Button on Expenses Center
- **Defect ID:** `DEF-003`
- **Severity:** High
- **Affected URL:** `/expenses?tab=employees`
- **Root Cause:** The top toolbar in `app/(dashboard)/expenses/page.tsx` conditionally displayed `+ Record Expense` (tab=expenses) and `+ Add Vendor` (tab=vendors), but did not provide a button when `tab=employees`. Furthermore, `ExpenseEmployeesView.tsx` only had a passive text link ("Manage in Masters →").
- **Target Resolution:**
  1. Add `+ Add Employee` button to `/expenses` header when `tab === 'employees'`.
  2. Wire up the button to either open the Add Employee modal or deep-link with query parameter to `/masters?tab=employees&action=new`.
  3. Enhance `ExpenseEmployeesView.tsx` with an active "+ Add Employee" button that opens an inline creation drawer/modal.
- **Status:** **PENDING IMPLEMENTATION (Phase 4)**

---

### DEF-004: Fixed Assets Register Report Placeholder in Reports Hub
- **Defect ID:** `DEF-004`
- **Severity:** Medium
- **Affected URL:** `/reports?category=assets`
- **Root Cause:** In `app/(dashboard)/reports/page.tsx`, the `assets` category case returned a static placeholder `{ message: 'Fixed assets register' }` instead of querying `prisma.assetDepreciation` and Fixed Asset Chart of Account heads.
- **Target Resolution:**
  1. Query active Fixed Assets ledger heads (`asset` class) from Prisma.
  2. Build a dedicated `FixedAssetsRegisterReport.tsx` component displaying Asset Tag, Description, Acquisition Date, Original Cost, Depreciation Rate, Accumulated Depreciation, and Net Book Value (`RULE-AST-001`, `RULE-AST-002`).
- **Status:** **PENDING IMPLEMENTATION (Phase 4)**

---

### DEF-005: Dedicated Employee Navigation Shortcut
- **Defect ID:** `DEF-005`
- **Severity:** Low
- **Affected URL:** Global Navigation Sidebar (`app/(dashboard)/layout.tsx` / `Sidebar.tsx`)
- **Root Cause:** Employees were buried under Masters and Expenses sub-tabs, requiring multiple clicks to locate staff records and payroll status.
- **Target Resolution:**
  1. Add an "Employees" sub-navigation or quick-link under HR/Payroll or Masters in the Sidebar.
- **Status:** **PENDING IMPLEMENTATION (Phase 4)**

---

## 3. Defect Resolution Schedule (Phase 3 & Phase 4)

| Defect ID | Target File(s) | Lead Assignee | Target Phase |
| :--- | :--- | :--- | :--- |
| `DEF-003` | `app/(dashboard)/expenses/page.tsx`, `ExpenseEmployeesView.tsx` | Full-Stack Architect | Phase 4 |
| `DEF-004` | `app/(dashboard)/reports/page.tsx`, `reports/FixedAssetsRegister.tsx` | Chartered Accountant | Phase 4 |
| `DEF-005` | `components/layout/Sidebar.tsx` | UI/UX Developer | Phase 4 |
