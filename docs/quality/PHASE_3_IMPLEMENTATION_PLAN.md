# FinLedger Quality Assurance — Phase 3: Implementation Plan for Defect Resolution

**Document Version:** 1.0.0  
**Target Completion:** Phase 4 Execution  
**Architect:** Senior Software Architect & Indian Chartered Accountant  
**Target Repository:** KVJFinLedger (`Billing ERP System`)  

---

## 1. Overview and Objectives

This implementation plan details the precise architectural modifications and user-interface enhancements required to resolve all open defects identified in `docs/quality/DEFECT_REGISTER.md` (`DEF-003`, `DEF-004`, `DEF-005`).

Each fix is designed to uphold:
1. **Accounting Integrity:** Ensure any asset register reflects real ledger balance entries.
2. **User Experience:** Seamless one-click employee management from the Expenses center.
3. **Clean Code & Type Safety:** Zero TypeScript errors, strict Zod schema validation, and Next.js 16 App Router compliance.

---

## 2. Implementation Work Breakdown

### Work Package 1: Expenses Center Employee Action Integration (`DEF-003`)
- **Target Files:**
  - `app/(dashboard)/expenses/page.tsx`
  - `app/(dashboard)/expenses/ExpenseEmployeesView.tsx`
- **Architectural Design:**
  1. In `app/(dashboard)/expenses/page.tsx`:
     - When `tab === 'employees'`, render a prominent primary button: `+ Add Employee` with an `UserPlus` icon.
     - Provide quick modal trigger or route linking to open the Employee creation modal directly.
  2. In `app/(dashboard)/expenses/ExpenseEmployeesView.tsx`:
     - Embed an interactive client modal or quick drawer trigger that allows users to create an employee directly without leaving the Expenses tab.
     - Integrate with the existing `createEmployeeAction` server action.
     - On successful creation, automatically revalidate data using `router.refresh()` so the new employee appears in the table immediately.

---

### Work Package 2: Fixed Assets Register Report Implementation (`DEF-004`)
- **Target Files:**
  - `app/(dashboard)/reports/page.tsx`
  - `app/(dashboard)/reports/FixedAssetsRegisterClient.tsx` (New Component)
- **Architectural Design:**
  1. In `app/(dashboard)/reports/page.tsx`:
     - Replace the placeholder `{ message: 'Fixed assets register' }` with a database query fetching all Fixed Asset ledger accounts (e.g. Computers, Furniture, Office Equipment) and any recorded asset purchases or depreciation schedules (`prisma.assetDepreciation`).
  2. Create `FixedAssetsRegisterClient.tsx`:
     - Display a formal Chartered Accountant compliant Fixed Asset Schedule:
       - Asset Code / Tag
       - Asset Description / Category
       - Capitalisation Date
       - Gross Block (Opening Cost, Additions, Deletions)
       - Depreciation (Opening, For Period, Total Accumulated)
       - Net Block (Closing Net Book Value)
     - Include export options (CSV / PDF / Print).

---

### Work Package 3: Global Sidebar Employee Link (`DEF-005`)
- **Target Files:**
  - `components/layout/Sidebar.tsx`
- **Architectural Design:**
  1. Add an "Employees" navigation link or submenu under HR/Payroll or within Masters so users have a 1-click jump to staff records.
  2. Ensure active route highlighting when viewing `/expenses?tab=employees` or `/masters?tab=employees`.

---

## 3. Verification & Quality Gates

Before declaring Phase 4 complete, the following quality gates must pass:
1. **Type Checking:** `npx tsc --noEmit` must report 0 errors.
2. **Route Auditing:** Automated HTTP probes to `/expenses?tab=employees`, `/reports?category=assets`, and `/masters` must return status `200 OK`.
3. **State Integrity:** Existing 4 invoice records, 1 expense record, and 2 opening balances must remain 100% intact.
4. **Git Sync:** Changes committed and pushed to `origin main` per repository guidelines.
