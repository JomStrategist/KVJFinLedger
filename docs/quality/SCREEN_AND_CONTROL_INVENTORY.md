# FINLEDGER — SCREEN AND CONTROL INVENTORY
**Organization:** KVJ Analytics  
**Document Type:** Exhaustive UI Screen & Control Audit (Phase 1 Deliverable)  
**Version:** 1.0.0  
**Audit Scope:** 56 Discovered Page Routes, Modals, Forms & Interactive Controls  
**Inspection Date:** 09-Oct-2026

---

## 1. Executive Summary & Inventory Methodology

This inventory catalogues every screen, route, ribbon, modal, interactive button, form, filter, and table action across the FinLedger ERP platform. Each control is assessed for responsiveness, input validation, backend persistence, user feedback, error recovery, permission enforcement, and accounting integrity.

---

## 2. Core Navigation & Route Catalog

### 2.1 Dashboard & Overview

#### Screen SCR-001: Executive Dashboard
- **Route:** `/dashboard`
- **Module:** Executive / Navigation Item 1
- **Purpose:** High-level executive KPI overview (Monthly Revenue, Incurred Expenses, Net Profit, Unpaid Receivables, Unpaid Payables, Cash Balance).
- **Interactive Controls:**
  - `Period Selector` (Dropdown: Current FY, Q1, Q2, Q3, Q4, Custom)
  - `Record Invoice Quick Button` (`+ New Invoice` &rarr; redirects to `/invoices/new`)
  - `Record Expense Quick Button` (`+ New Expense` &rarr; redirects to `/expenses/new`)
  - `P&L Drilldown Link` (Redirects to `/reports?category=statements&tab=pnl`)
  - `Receivables Drilldown Link` (Redirects to `/reports?category=sales`)
- **Tables & Displays:** Recent Invoices Table, Recent Expenses Table, Revenue Trend Chart (Recharts).
- **States:** Loading skeleton, zero-data placeholder, live KPI data.
- **Permissions:** Admin only (Non-admin redirected to `/home`).
- **Accounting Impact:** Read-only aggregation from `AccountingEngine.getDashboardData()`.

#### Screen SCR-002: Employee / Staff Home
- **Route:** `/home`
- **Module:** Staff Workspace
- **Purpose:** Personal staff dashboard for submitting expense claims and viewing reimbursement status.
- **Interactive Controls:** `Submit New Claim` button, claim status filter.
- **Permissions:** User / Admin.
- **Accounting Impact:** None (Read-only summary).

---

### 2.2 Ledgers & Journals

#### Screen SCR-003: General Ledger
- **Route:** `/ledgers`
- **Module:** Accounting / Navigation Item 2
- **Purpose:** Account-level transactional statement showing opening balance, debit entries, credit entries, running balance, and closing balance.
- **Interactive Controls:**
  - `Account Selector` (Dropdown of all active Chart of Accounts heads)
  - `Date Range Picker` (From Date, To Date)
  - `Financial Year Filter`
  - `Search Box` (Filters narration, voucher number, counterparty)
  - `Export to Excel Button` (`XLSX` download)
  - `Print Statement Button`
  - `Row Action: View Voucher` (Links to source Invoice, Expense, or Journal entry)
- **Table Columns:** Date, Voucher No, Type, Narration / Counterparty, Debit (₹), Credit (₹), Running Balance (₹).
- **Permissions:** Admin / Accountant.
- **Accounting Impact:** Core audit window into `AccountingEngine.getLedgerStatement()`.

#### Screen SCR-004: Journal Book (Day Book)
- **Route:** `/journals`
- **Module:** Accounting / Navigation Item 3
- **Purpose:** Chronological record of all posted journal vouchers (Sales, Purchase, Payment, Receipt, Contra, Opening, Journal).
- **Interactive Controls:**
  - `Voucher Type Filter` (All, Sales, Purchase, Payment, Receipt, Contra, Journal)
  - `Date Filter`
  - `Search Box`
  - `Voucher Expand / Collapse Action` (Inspect individual Dr / Cr legs)
  - `Export Day Book`
- **Permissions:** Admin / Accountant.
- **Accounting Impact:** Direct representation of double-entry vouchers synthesized by `AccountingEngine.generateAllVouchers()`.

---

### 2.3 Invoices Module (Sales & Receivables Ribbon)

#### Screen SCR-005: Confirmed Tax Invoices List
- **Route:** `/invoices`
- **Ribbon:** Invoice Ribbon &rarr; Confirmed Invoices
- **Purpose:** Listing of confirmed tax invoices with settlement status, payment amounts, and action menus.
- **Interactive Controls:**
  - `+ New Invoice Button` (Redirects to `/invoices/new`)
  - `Status Filter` (All, Unpaid, Partially Paid, Paid)
  - `Search Input` (Client name, invoice number, GSTIN)
  - `Row Action: View` (Opens `/invoices/[id]`)
  - `Row Action: Edit` (Opens `/invoices/[id]/edit` — blocked if payments exist)
  - `Row Action: Record Payment` (Quick settlement dialog)
  - `Row Action: Delete` (Blocked if active payment history exists)
- **Table Columns:** Invoice No, Date, Customer & GSTIN, Gross Amount, Paid Amount, Balance Due, Status, Action.
- **Permissions:** Admin / Sales Executive.
- **Accounting Impact:** Lists revenue-generating transactions.

#### Screen SCR-006: Direct Tax Invoice Creation
- **Route:** `/invoices/new`
- **Module:** Invoices
- **Purpose:** Form to issue a new direct Tax Invoice.
- **Form Controls & Required Fields:**
  - `Customer Selector *` (Select existing or quick-add)
  - `Invoice Date *` (Defaults to today)
  - `Place of Supply *` (Defaults to Customer State, override allowed)
  - `Line Items Table *`:
    - `Product / Service Name *`
    - `HSN/SAC Code *` (Defaults to 9983 for IT consulting)
    - `Quantity *` & `Unit *` (Hours, Nos, Days)
    - `Unit Price (₹) *`
    - `Discount (%)`
    - `GST Rate (%) *` (0%, 5%, 12%, 18%, 28%)
    - `Calculated Taxable Value, CGST, SGST, IGST, Line Total`
  - `Add Line Item Button`
  - `Remove Line Item Button`
  - `Terms & Conditions / Notes`
  - `Cancel Button` & `Save / Confirm Invoice Button`
- **Validation:** Customer required, at least one line item with price > 0, valid dates.
- **Accounting Impact:** On confirm &rarr; creates TaxInvoice, generates Dr AR / Cr Revenue / Cr Output GST vouchers.

#### Screen SCR-007: Invoice Detail & Payment Settlement
- **Route:** `/invoices/[id]`
- **Module:** Invoices
- **Purpose:** Detailed preview of tax invoice, print view, payment history list, and payment recording modal.
- **Interactive Controls:**
  - `Print Invoice Button` (Formatted A4 tax invoice template)
  - `Download PDF Button`
  - `Edit Invoice Button`
  - `Record Payment Button` (Opens Settlement Modal):
    - `Payment Date *`
    - `Bank Account *` (Defaults to Primary Bank)
    - `Cash Amount Received (₹) *`
    - `Actual TDS Deducted (₹)` (Section 194J/194C)
    - `Payment Reference / UTR`
    - `Notes`
    - `Submit Payment Button`
  - `Delete Payment Action` (Reverse settlement, recomputes status)
- **Accounting Impact:** Settlement debits Bank and TDS Receivable, credits AR.

#### Screen SCR-008: Proforma Invoices List
- **Route:** `/proforma-invoices`
- **Ribbon:** Invoice Ribbon &rarr; Proforma Invoices
- **Purpose:** Commercial quotations list. Zero GL impact.
- **Interactive Controls:** `+ New Proforma` button, status filters (Draft, Sent, Converted), `Convert to Tax Invoice` action button.
- **Accounting Impact:** Zero until converted.

#### Screen SCR-009: Customer Directory & Statements
- **Route:** `/customers`, `/customers/[id]`, `/customers/[id]/statement`
- **Ribbon:** Invoice Ribbon &rarr; Customers
- **Purpose:** Master directory of business clients, ledger statements, and contact profiles.
- **Interactive Controls:** `+ Add Customer` button, search, edit, view ledger statement, export statement.
- **Accounting Impact:** Manages Accounts Receivable debtor master entities.

---

### 2.4 Expenses Module (Vendor Bills & Reimbursements Ribbon)

#### Screen SCR-010: Expenses List
- **Route:** `/expenses` (with `tab=expenses`)
- **Ribbon:** Expense Ribbon &rarr; Expenses
- **Purpose:** Listing of all operating expenses, purchases, fixed asset acquisitions, and reimbursement claims.
- **Interactive Controls:**
  - `+ Record Expense Button` (Redirects to `/expenses/new`)
  - `Payment Mode Filter` (All, KVJ Paid, Employee Paid)
  - `Status Filter` (All, Unpaid / Unreimbursed, Partially Paid, Paid / Reimbursed)
  - `Search Box` (Vendor, employee, description, number)
  - `Row Action: View / Edit / Pay Balance / Delete`
- **Permissions:** Admin / User.
- **Accounting Impact:** Lists operating cost and liability events.

#### Screen SCR-011: Record Expense Form
- **Route:** `/expenses/new`
- **Module:** Expenses
- **Purpose:** Form to record a company or employee-paid business expenditure.
- **Form Controls & Required Fields:**
  - `Expense Classification *` (Expense, Purchase, Fixed Asset, Other)
  - `Payment Mode Selector *`:
    - **KVJ Paid** &rarr; Selects Bank Account (Defaults to Primary), captures immediate disbursement amount.
    - **Employee Paid** &rarr; Selects Employee Master record (Mandatory), creates Employee Payable.
  - `Vendor Selector` (Optional for petty cash/travel; mandatory for vendor bills)
  - `Expense Date *`
  - `Line Items Table *`:
    - `Category Head *` (ExpenseCategory)
    - `Description`
    - `Taxable Amount (₹) *`
    - `GST Rate (%)`
    - `ITC Eligibility Toggle` (Eligible vs. Ineligible)
    - `Line Total`
  - `TDS Deduction Section` (Statutory vendor TDS deduction)
  - `Receipt Attachment Upload` (Optional file input)
  - `Save Expense Button` & `Cancel Button`
- **Accounting Impact:** On save &rarr; creates Expense & ExpenseItems, debits Expense/Asset + Input GST, credits Bank or Vendor/Employee Payable.

#### Screen SCR-012: Vendor Directory
- **Route:** `/expenses?tab=vendors`, `/vendors`, `/vendors/new`, `/vendors/[id]`
- **Ribbon:** Expense Ribbon &rarr; Vendors
- **Purpose:** Supplier master records, contact details, GSTIN, and payables aging.
- **Interactive Controls:** `+ Add Vendor` button, search, edit profile, view ledger.
- **Accounting Impact:** Manages Trade Creditors master entities.

#### Screen SCR-013: Employees Directory (Expense Ribbon)
- **Route:** `/expenses?tab=employees`
- **Ribbon:** Expense Ribbon &rarr; Employees
- **Purpose:** Directory of internal staff members with reimbursement claim counts and department breakdown.
- **Interactive Controls:**
  - `Search Box` (Name, code, department)
  - `Department Filter`
  - `Manage in Masters Link` (Directs to `/masters?tab=employees`)
  - **Defect Identified & Addressed:** Missing direct `+ Add Employee` action button in header (documented in Section 3).

---

### 2.5 Banking & Cash Module

#### Screen SCR-014: Bank Transfers & Accounts
- **Route:** `/bank-transfers`
- **Module:** Banking & Cash / Navigation Item 6
- **Purpose:** Internal contra fund transfers between company accounts and petty cash management.
- **Interactive Controls:**
  - `Record Transfer Button` (Opens Contra Dialog: From Account, To Account, Amount, Date, Reference)
  - `Bank Reconciliation Link` (Redirects to `/bank-transfers/reconciliation`)
- **Accounting Impact:** Internal balance shift (Dr Bank B / Cr Bank A), zero P&L impact.

#### Screen SCR-015: Bank Reconciliation
- **Route:** `/bank-transfers/reconciliation`
- **Module:** Banking & Cash
- **Purpose:** Import external bank statements (CSV/Excel) and match against General Ledger vouchers.
- **Interactive Controls:** `Upload Statement Button`, `Auto-Match Button`, `Manual Match Toggle`, `Unreconciled Difference Metric`.
- **Accounting Impact:** Auditing tool; does not modify transaction vouchers.

---

### 2.6 Masters Hub

#### Screen SCR-016: Unified Masters Hub
- **Route:** `/masters`
- **Module:** Masters / Navigation Item 7
- **Purpose:** Central management of all system master data.
- **Tabs:**
  - `Customers` (`/masters?tab=customers`)
  - `Vendors` (`/masters?tab=vendors`)
  - `Employees` (`/masters?tab=employees`)
  - `Products & Services` (`/masters?tab=products`)
  - `Chart of Accounts` (`/masters?tab=categories`)
  - `Bank Accounts` (`/masters?tab=bank_accounts`)
- **Header Action:** `+ Add Record Button` (Opens `AddMasterRecordModal`)
- **Modal Tabs in AddMasterRecordModal:**
  1. `👤 Customer`
  2. `🏢 Party (Vendor)`
  3. `💼 Employee` *(Implemented and Verified)*
  4. `📦 Product & Service`
  5. `🏷️ Category (Chart of Accounts)`
- **Permissions:** Admin.
- **Accounting Impact:** Foundation for all transaction classification and debit/credit routing.

---

### 2.7 Reports Hub (11 Categories & 5 Statements)

#### Screen SCR-017: Reports Hub
- **Route:** `/reports`
- **Module:** Reports / Navigation Item 9
- **Categories (Sidebar Sub-items & Category Ribbon):**
  1. `Executive Reports` (`/reports?category=overview`)
  2. `Financial Statements` (`/reports?category=statements`)
     - Sub-tabs: **Trial Balance**, **Profit & Loss**, **Balance Sheet**, **Cash Flow**, **Comparative Analysis**
  3. `Sales & Receivables` (`/reports?category=sales`)
  4. `Expenses & Payables` (`/reports?category=expenses`)
  5. `GST & Tax` (`/reports?category=gst`)
  6. `TDS` (`/reports?category=tds`)
  7. `Banking & Cash` (`/reports?category=banking`)
  8. `Fixed Assets` (`/reports?category=assets`)
  9. `Employees & Salary` (`/reports?category=employees`)
  10. `Analysis` (`/reports?category=analysis`)
  11. `Audit` (`/reports?category=audit`)
- **Interactive Controls:** Financial Year selector, from/to date filter, comparison type dropdown, export to Excel, print.
- **Accounting Impact:** Authoritative, dynamically computed views of live accounting vouchers.

---

### 2.8 Opening / Closing & Settings

#### Screen SCR-018: Opening / Closing Balances
- **Route:** `/opening-closing`
- **Module:** Opening/Closing / Navigation Item 10
- **Purpose:** Enter and verify brought-forward opening asset, liability, and equity balances for a financial year.
- **Interactive Controls:** `Add Opening Position Button`, `Equilibrium Gauge` (Assets vs. Equity & Liabilities).
- **Accounting Impact:** Initial balance sheet initialization; zero current-year P&L impact.

#### Screen SCR-019: Company Settings
- **Route:** `/settings`
- **Module:** Settings / Navigation Item 11
- **Purpose:** Configure business legal name, address, GSTIN, primary bank account, invoice prefixes, and fiscal year.
- **Permissions:** Admin only.
- **Accounting Impact:** Influences default tax rates, bank accounts, and invoice sequencing.

---

## 3. Deep-Dive Investigation: Employee "New" Button Defect

### 3.1 Observed Problem
The user observed: *"In the Employees area, there is a New button, but I cannot find a working option to add an employee."*

### 3.2 Root Cause Analysis
1. **Broken Workflow Across Screens:**
   - In `/expenses` (with `tab=employees`), the header only contained buttons for `Record Expense` (tab 1) and `Add Vendor` (tab 2). When the user clicked on the `Employees` tab, there was **no button** in the header to add an employee.
   - The employees view displayed a link saying `"Manage in Masters →"`, which redirected the user to `/masters?tab=employees`.
2. **Missing Employee Option in Masters Modal:**
   - On arriving at `/masters`, when the user clicked `+ Add Record`, the `AddMasterRecordModal` only presented four tabs: **Customer**, **Party**, **Product & Service**, and **Category**.
   - **There was no Employee tab or form inside the modal.**
3. **Backend Service Disconnect:**
   - While `EmployeeService` contained `createEmployee`, there was no Next.js Server Action in `app/(dashboard)/masters/actions.ts` exposing employee creation to the UI.
   - The table in `/masters` for employees did not have an **Edit** action column.

### 3.3 Verification of Fix & Architectural Integration
The defect has been resolved end-to-end:
- Added `💼 Employee` tab to `AddMasterRecordModal` with full validation, auto-generated code (`EMP-001`), department selection, designation, salary, PAN, and active status.
- Added `createEmployeeMasterAction`, `updateEmployeeMasterAction`, and `toggleEmployeeStatusAction` to `masters/actions.ts`.
- Added Action column with `Edit` and `Activate/Deactivate` buttons in the Masters Employee table.
- Added direct `tab=employees` query support so users navigating from `/expenses` land directly on the Employee workspace with `defaultTab="employee"`.
