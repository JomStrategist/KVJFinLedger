# FinLedger ERP — Proposed Information Architecture

**Organization:** KVJ Analytics  
**Application:** FinLedger Financial ERP  
**Blueprint Objective:** Transform the current fragmented, redundant 58-route interface into an intuitive, elegant, 7-pillar information architecture that preserves 100% of underlying business logic and accounting controls.  

---

## 1. Architectural Core Principles

1. **Functional Alignment by Business Task:** Navigation must mirror the standard mental model of Indian accounting and enterprise finance:
   - Sales & Invoicing (Revenue & Customers)
   - Purchases & Expenses (Payables, Bills & Vendors)
   - Banking & Treasury (Contra Transfers, Bank Statements, Loans)
   - General Ledger & Accounting (Manual Journals, Ledger Drilldowns, Period Management)
   - Financial & Tax Reports (Trial Balance, P&L, Balance Sheet, GST, TDS)
   - Administration & Masters (Settings, Users, Roles, Backups, Catalogs)
2. **Zero Route Loss / Complete Action Traceability:** Every existing button, modal, form, and server action must have an explicitly documented home.
3. **Consolidation of Redundant Subsystems:** Eliminate the 3 parallel customer views, 3 parallel vendor views, 2 parallel proforma views, and 2 parallel bank reconciliation views.
4. **Surface Orphaned Capabilities:** Provide first-class user interfaces for Loan Management, Backup & Disaster Recovery, and Advanced Role Permissions.
5. **Backwards Compatibility:** Maintain automatic 308 redirects from legacy paths (`/proforma-invoices`, `/customers`, `/vendors`, `/finance`, `/admin`) to their canonical positions.

---

## 2. Proposed Navigation Structure (The 7 Pillars)

```
[FINLEDGER ERP]
├── 1. Dashboard (Executive & Operational KPI Hub)
├── 2. Sales & Invoicing
│   ├── 2.1 Tax Invoices (Confirmed & Active)
│   ├── 2.2 Proforma Invoices (Quotations & Estimates)
│   └── 2.3 Customers (CRM, Outstanding Ledgers & Statements)
├── 3. Purchases & Expenses
│   ├── 3.1 Expenses & Bills (Operational & Vendor Bills)
│   ├── 3.2 Employee Payroll (Salaries, Advances, Corporate Banking Export)
│   ├── 3.3 Recurring Expenses (Scheduled Templates)
│   └── 3.4 Vendors (Supplier Profiles, TDS Rates & Payables)
├── 4. Banking & Treasury
│   ├── 4.1 Bank Accounts (Balances, IFSC, Account Setup)
│   ├── 4.2 Fund Transfers (Internal Contra Transfers)
│   ├── 4.3 Bank Reconciliation (Statement Import & Voucher Matching)
│   └── 4.4 Loans & Facilities (Term Loans, Overdrafts, Repayments)  <-- RESTORED
├── 5. General Ledger & Accounting
│   ├── 5.1 Account Ledgers (Chart of Accounts Explorer & Statement Export)
│   ├── 5.2 Journal Vouchers (Manual Double-Entry & Reversals)
│   ├── 5.3 Fixed Assets (Asset Capitalization & Depreciation Engine)
│   └── 5.4 Fiscal Periods (Opening Balances & Year-End Period Lock)
├── 6. Financial & Tax Reports
│   ├── 6.1 Statutory Statements (Trial Balance, Profit & Loss, Balance Sheet, Cash Flow)
│   ├── 6.2 Tax & Statutory Compliance (GSTR-1 Outward, GSTR-3B ITC, TDS Summary)
│   └── 6.3 Operational Reports (Sales Breakdown, Expense Burn, AR/AP Aging)
└── 7. Administration & Settings
    ├── 7.1 Company Profile & Branding (Legal Name, PAN, CIN, Logo)
    ├── 7.2 Tax & GST Configuration (GSTIN, Rates, Composition)
    ├── 7.3 Users & Permissions (Custom Role Builder, Access Matrix)  <-- RESTORED
    └── 7.4 Backup & Disaster Recovery (On-Demand Backup, SHA-256 Checksum) <-- RESTORED
```

---

## 3. Destination Mapping of Discovered Routes

Every existing route in the current system is accounted for below:

| Current Route | Current Module | Proposed Canonical Route | Proposed Module | Navigation Method | Redundancy Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | Root | `/` | Root | Automatic session check -> `/dashboard` or `/login` | Maintained |
| `/login` | Auth | `/login` | Auth | Canonical login screen | Maintained |
| `/change-password` | Auth | `/change-password` | User Profile | Accessible via user dropdown in top header | Maintained |
| `/admin` | Admin | `/settings?tab=backup` | Admin / Settings | Permanent 308 redirect to new Backup & Recovery tab | **Redirected** (Resolves DEF-003) |
| `/home` | Dashboard | `/dashboard` | Dashboard | Permanent 308 redirect to `/dashboard` | **Redirected** (Removes redundant home) |
| `/dashboard` | Dashboard | `/dashboard` | Dashboard | Primary Sidebar destination (Pillar 1) | Maintained |
| `/invoices` | Invoices | `/invoices` | Sales & Invoicing | Primary Sidebar destination (Pillar 2) | Maintained |
| `/invoices/new` | Invoices | `/invoices/new` | Sales & Invoicing | Header "+ Create Invoice" button | Maintained |
| `/invoices/[id]` | Invoices | `/invoices/[id]` | Sales & Invoicing | Row click on invoice table | Maintained |
| `/invoices/[id]/edit`| Invoices | `/invoices/[id]/edit` | Sales & Invoicing | "Edit Invoice" button on detail page | Maintained |
| `/proforma-invoices` | Invoices / Proforma | `/invoices?tab=proforma` | Sales & Invoicing | Permanent 308 redirect to Invoices Proforma Tab | **Redirected** (Resolves DEF-007) |
| `/proforma-invoices/new` | Invoices / Proforma | `/proforma-invoices/new` | Sales & Invoicing | "+ New Proforma" button on Proforma Tab | Maintained |
| `/proforma-invoices/[id]` | Invoices / Proforma | `/proforma-invoices/[id]` | Sales & Invoicing | Row click on Proforma list | Maintained |
| `/proforma-invoices/[id]/edit` | Invoices / Proforma | `/proforma-invoices/[id]/edit` | Sales & Invoicing | "Edit Proforma" button | Maintained |
| `/customers` | Customers | `/customers` (or `/invoices?tab=customers` alias) | Sales & Invoicing | Sub-navigation tab under Sales | **Consolidated** (Resolves DEF-005) |
| `/customers/new` | Customers | `/customers/new` | Sales & Invoicing | "+ Add Customer" button | Maintained |
| `/customers/[id]` | Customers | `/customers/[id]` | Sales & Invoicing | Row click on Customer list | Maintained |
| `/customers/[id]/edit` | Customers | `/customers/[id]/edit` | Sales & Invoicing | "Edit Customer" button | Maintained |
| `/customers/[id]/statement` | Customers | `/customers/[id]/statement` | Sales & Invoicing | "View Statement" button | Maintained (DEF-001 fixed) |
| `/expenses` | Expenses | `/expenses` | Purchases & Expenses | Primary Sidebar destination (Pillar 3) | Maintained |
| `/expenses/new` | Expenses | `/expenses/new` | Purchases & Expenses | Header "+ Record Expense" button | Maintained |
| `/expenses/[id]` | Expenses | `/expenses/[id]` | Purchases & Expenses | Row click on Expense table | Maintained |
| `/expenses/[id]/edit`| Expenses | `/expenses/[id]/edit` | Purchases & Expenses | "Edit Expense" button | Maintained |
| `/vendors` | Vendors | `/vendors` (or `/expenses?tab=vendors` alias) | Purchases & Expenses | Sub-navigation tab under Purchases | **Consolidated** (Resolves DEF-006) |
| `/vendors/new` | Vendors | `/vendors/new` | Purchases & Expenses | "+ Add Vendor" button | Maintained |
| `/vendors/[id]` | Vendors | `/vendors/[id]` | Purchases & Expenses | Row click on Vendor list | Maintained |
| `/vendors/[id]/edit` | Vendors | `/vendors/[id]/edit` | Purchases & Expenses | "Edit Vendor" button | Maintained |
| `/bank-transfers` | Banking | `/bank-transfers` | Banking & Treasury | Primary Sidebar destination (Pillar 4) | Maintained |
| `/bank-transfers/reconciliation` | Banking | `/bank-transfers?tab=reconciliation` | Banking & Treasury | Permanent 308 redirect to Banking Reconciliation tab | **Redirected** (Resolves DEF-008) |
| `/finance` | Finance / Loans | `/bank-transfers?tab=loans` | Banking & Treasury | Surfaces orphaned `loan-actions.ts` UI | **Restored** (Resolves DEF-002) |
| `/ledgers` | Ledgers | `/ledgers` | General Ledger & Accounting | Primary Sidebar destination (Pillar 5) | Maintained |
| `/journals` | Journals | `/journals` | General Ledger & Accounting | Primary Sidebar destination (Pillar 5) | Maintained |
| `/opening-closing` | Opening/Closing | `/opening-closing` | General Ledger & Accounting | Primary Sidebar destination (Pillar 5) | Maintained |
| `/settings?tab=assets` | Settings | `/fixed-assets` (or `/settings?tab=assets` alias) | General Ledger & Accounting | Elevate Fixed Assets to accounting pillar | **Elevated** (Resolves JRN-011) |
| `/reports` | Reports | `/reports` | Financial & Tax Reports | Primary Sidebar destination (Pillar 6) | Maintained |
| `/reports/trial-balance` | Reports | `/reports/trial-balance` | Financial & Tax Reports | Reports Hub card or direct route | Maintained |
| `/reports/balance-sheet` | Reports | `/reports/balance-sheet` | Financial & Tax Reports | Reports Hub card or direct route | Maintained |
| `/profit-loss` | Reports | `/reports/profit-loss` | Financial & Tax Reports | Aligns permissions to allow Accountants/Auditors | **Fixed Guard** (Resolves DEF-009) |
| `/financial-statements` | Reports | `/reports?category=financial` | Financial & Tax Reports | Permanent 308 redirect | Maintained |
| `/analysis` | Reports | `/reports?category=analysis` | Financial & Tax Reports | Permanent 308 redirect | Maintained |
| `/reports/sales` | Reports | `/reports/sales` | Financial & Tax Reports | Direct route under Reports Hub | Maintained |
| `/reports/expenses` | Reports | `/reports/expenses` | Financial & Tax Reports | Direct route under Reports Hub | Maintained |
| `/reports/receivables` | Reports | `/reports/receivables` | Financial & Tax Reports | Direct route under Reports Hub | Maintained |
| `/reports/payables` | Reports | `/reports/payables` | Financial & Tax Reports | Direct route under Reports Hub | Maintained |
| `/reports/tds` | Reports | `/reports/tds` | Financial & Tax Reports | Direct route under Reports Hub | Maintained |
| `/reports/gst/outward-supplies` | Reports | `/reports/gst/outward-supplies` | Financial & Tax Reports | Direct route under Reports Hub | Maintained |
| `/reports/gst/input-tax-credit` | Reports | `/reports/gst/input-tax-credit` | Financial & Tax Reports | Direct route under Reports Hub | Maintained |
| `/reports/invoice-statement` | Reports | `/reports/invoice-statement` | Financial & Tax Reports | Direct route under Reports Hub | Maintained |
| `/masters` | Masters | Consolidated into respective Pillars | Admin & Masters | Tabs point to canonical directories | **Reorganized** |
| `/products` | Catalog | `/products` (under Sales & Invoicing) | Sales & Invoicing | Direct route for products & services catalog | Maintained |
| `/products/new` | Catalog | `/products/new` | Sales & Invoicing | "+ Add Product" button | Maintained |
| `/products/[id]` | Catalog | `/products/[id]` | Sales & Invoicing | Row click on Product list | Maintained |
| `/products/[id]/edit` | Catalog | `/products/[id]/edit` | Sales & Invoicing | "Edit Product" button | Maintained |
| `/settings` | Settings | `/settings` | Administration & Settings | Primary Sidebar destination (Pillar 7) | Maintained |
| `/users` | Users | `/users` | Administration & Settings | Renders `UserManagementClient` with custom roles | **Restored** (Resolves DEF-004) |
| `/users-roles` | Users | `/users` | Administration & Settings | Permanent 308 redirect to `/users` | Maintained |
| `/api/auth/[...nextauth]` | API | `/api/auth/[...nextauth]` | API | Unchanged | Maintained |
| `/api/ledgers/statement` | API | `/api/ledgers/statement` | API | Unchanged | Maintained |
| `/api/test-db` | API | `/api/test-db` | API | Unchanged | Maintained |

---

## 4. Subnavigation & Contextual Tab Architecture

### Pillar 2: Sales & Invoicing
- **Header Tabs:**
  - `[ Tax Invoices ]` (Default: `/invoices?tab=confirmed`) -> Lists all confirmed GST invoices, statuses, receipt actions.
  - `[ Proforma Quotes ]` (`/invoices?tab=proforma`) -> Quotations, estimates, one-click conversion.
  - `[ Customers ]` (`/invoices?tab=customers`) -> Customer directory, outstanding receivables, account statements.
  - `[ Products & Services ]` (`/invoices?tab=products`) -> HSN/SAC catalog, default GST rates.
- **Header Primary Actions:**
  - `[ + Create Invoice ]` (Primary blue button)
  - `[ + New Proforma ]` (Secondary outlined button)

### Pillar 3: Purchases & Expenses
- **Header Tabs:**
  - `[ Expenses & Bills ]` (Default: `/expenses?tab=expenses`) -> Operational expenses, vendor bills, payment status.
  - `[ Employee Payroll ]` (`/expenses?tab=employees`) -> Monthly salaries, advance tracking, corporate bank CSV export.
  - `[ Recurring Expenses ]` (`/expenses?tab=recurring`) -> Scheduled expense templates.
  - `[ Vendors ]` (`/expenses?tab=vendors`) -> Supplier directory, default TDS sections, payables.
- **Header Primary Actions:**
  - `[ + Record Expense ]` (Primary blue button)
  - `[ Process Batch Payroll ]` (Available when Payroll tab is active)

### Pillar 4: Banking & Treasury
- **Header Tabs:**
  - `[ Bank Accounts ]` (Default: `/bank-transfers?tab=accounts`) -> Live balances, IFSC, primary account flag.
  - `[ Internal Transfers ]` (`/bank-transfers?tab=transfers`) -> Contra fund transfers between company accounts.
  - `[ Bank Reconciliation ]` (`/bank-transfers?tab=reconciliation`) -> Statement import, statement line matching.
  - `[ Loans & Facilities ]` (`/bank-transfers?tab=loans`) -> **NEW:** Surfaces `LoanService`, facility tracking, repayments.
- **Header Primary Actions:**
  - `[ + New Fund Transfer ]` (Primary blue button)
  - `[ + Add Bank Account ]` (When on Accounts tab)

### Pillar 5: General Ledger & Accounting
- **Header Tabs:**
  - `[ Account Ledgers ]` (`/ledgers`) -> Chart of Accounts explorer, running balance, statement export.
  - `[ Manual Journals ]` (`/journals`) -> Double-entry vouchers, adjustment entries, reversals.
  - `[ Fixed Assets ]` (`/settings?tab=assets` or `/fixed-assets`) -> Asset capitalization, Schedule II useful life, depreciation runs.
  - `[ Fiscal Periods ]` (`/opening-closing`) -> FY opening balances, net worth calculation, year-end period lock.
- **Header Primary Actions:**
  - `[ + Create Journal Voucher ]` (When on Journals)
  - `[ + Add Fixed Asset ]` (When on Assets)
  - `[ + Add Opening Balance ]` (When on Fiscal Periods)

### Pillar 6: Financial & Tax Reports
- **Header Tabs:**
  - `[ Statutory Statements ]` (`/reports?category=financial`) -> Trial Balance, P&L, Balance Sheet, Cash Flow.
  - `[ GST & TDS Compliance ]` (`/reports?category=tax`) -> GSTR-1, GSTR-3B ITC Reconciliation, TDS Withholding Summary.
  - `[ Operational Reports ]` (`/reports?category=operational`) -> Sales Breakdown, Expense Analysis, AR/AP Aging.
- **Header Secondary Controls:**
  - Unified Date Filter Component (`[ From Date ]` - `[ To Date ]` + `[ Apply ]` + `[ Reset ]`) that persists state across drilldowns.

### Pillar 7: Administration & Settings
- **Header Tabs:**
  - `[ Company Profile ]` (`/settings?tab=business`) -> Legal name, PAN, CIN, registered address, FY settings.
  - `[ Tax & GST ]` (`/settings?tab=tax`) -> GSTIN, composition scheme, reverse charge settings.
  - `[ Users & Roles ]` (`/users`) -> Surfaces `UserManagementClient` with custom role creation and module permissions.
  - `[ Backup & Disaster Recovery ]` (`/settings?tab=backup`) -> **NEW:** Surfaces `BackupRestoreService`, on-demand backups, SHA-256 verify.
