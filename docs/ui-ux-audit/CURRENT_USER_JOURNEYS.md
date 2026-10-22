# FinLedger ERP — Current User Journeys Audit

**Organization:** KVJ Analytics  
**Application:** FinLedger Financial ERP  
**Audit Purpose:** Deep evaluation of all 18 critical operational, accounting, and administrative end-to-end workflows.  
**Audit Method:** Code-trace inspection of page components, form inputs, validation schemas, server actions, and double-entry General Ledger side effects.  

---

## Journey 1: Create and Convert a Proforma Invoice to a Tax Invoice

- **Starting Point:** Left Sidebar -> Invoices -> "Proforma" tab (or standalone `/proforma-invoices`).
- **Exact Route & Navigation Sequence:**
  1. `/invoices?tab=proforma`
  2. Click `+ New Proforma` -> Navigates to `/proforma-invoices/new`
  3. Enter customer details, valid until date, line items -> Click `Save & Issue Proforma` -> Redirects to `/proforma-invoices/[id]`
  4. On Proforma Detail page -> Click `Convert to Tax Invoice` -> Confirms modal dialog -> Redirects to newly generated `/invoices/[new-tax-invoice-id]`
- **Buttons / Controls Used:**
  - Tab Switcher `Proforma`
  - Button `+ New Proforma`
  - Customer selector, line item inputs, tax percentage dropdowns
  - Button `Save & Issue Proforma`
  - Button `Convert to Tax Invoice`
  - Button `Confirm Conversion` in modal
- **Required User Decisions:**
  - Selecting valid customer.
  - Setting validity date.
  - Specifying product line items with HSN/SAC, quantity, unit rate, and GST rate.
  - Deciding when the commercial deal is agreed to execute conversion.
- **Current Step Count:** 4 distinct page/modal transitions.
- **Validation & Error Behavior:**
  - Proforma creation requires at least one line item with valid quantity and rate.
  - Conversion validates that Proforma status is `DRAFT` or `ISSUED`. Fails if already `CONVERTED` or `CANCELLED`.
- **Resulting Business Outcome:**
  - Proforma status transitions to `CONVERTED`.
  - A permanent GST Tax Invoice is created with sequential invoice number.
- **Accounting & Data Side Effects:**
  - **Proforma Creation:** ZERO accounting effect (Proforma does not touch General Ledger).
  - **Conversion to Tax Invoice:** Automatically creates confirmed Tax Invoice and executes double-entry General Ledger posting:
    - `DR Accounts Receivable (Customer)` [Gross Amount]
    - `CR Sales / Revenue Account` [Taxable Base]
    - `CR Output CGST Payable` [CGST Portion]
    - `CR Output SGST Payable` [SGST Portion]
    - `CR Output IGST Payable` [IGST Portion]
- **Current Pain Points:**
  - Standalone `/proforma-invoices` duplicates `/invoices?tab=proforma`, confusing users about canonical path.
  - The conversion confirmation modal does not allow adjusting the invoice date, payment terms, or place of supply prior to final posting.
- **Simplification Opportunities:**
  - Consolidate under Sales -> Invoices.
  - Provide a "Review & Convert" step allowing date selection before confirming.

---

## Journey 2: Edit a Tax Invoice While Preserving Payment History

- **Starting Point:** Left Sidebar -> Invoices -> Confirmed Invoices tab.
- **Exact Route & Navigation Sequence:**
  1. `/invoices` (defaults to `?tab=confirmed`)
  2. Click Invoice Row -> Navigates to `/invoices/[id]`
  3. Click `Edit Invoice` -> Navigates to `/invoices/[id]/edit`
  4. Modify editable fields (e.g., terms, line description, or items if total >= paid) -> Click `Update Invoice` -> Redirects to `/invoices/[id]`
- **Buttons / Controls Used:**
  - Invoice row link
  - Button `Edit Invoice` (hidden if user is not `ADMIN` or `FINANCE`)
  - Form fields in `TaxInvoiceForm`
  - Button `Update Invoice`
- **Required User Decisions:**
  - Determining whether edits are allowed given existing payment receipts.
  - Updating line items without reducing invoice total below the cumulative sum of recorded payments.
- **Current Step Count:** 3 navigation steps.
- **Validation & Error Behavior:**
  - Server action `updateTaxInvoiceAction` enforces invariant check: `newTotalAmount >= existingPaymentsSum`. If violated, returns error `"Cannot reduce invoice total below received payments of ₹X"`.
- **Resulting Business Outcome:**
  - Invoice record is updated with new line items and recalculations.
- **Accounting & Data Side Effects:**
  - General Ledger journal entry for the original invoice is updated or reversed and reposted for the net difference:
    - Net increase: `DR Accounts Receivable` / `CR Revenue + Output Tax`
    - Net decrease: `DR Revenue + Output Tax` / `CR Accounts Receivable`
  - Payment vouchers and customer ledger credits remain untouched and intact.
- **Current Pain Points:**
  - The form does not display a live indicator of the minimum required amount (cumulative payments already received).
  - No side-by-side comparison of old vs new GL impact.
- **Simplification Opportunities:**
  - Display a locked banner: `"₹X received against this invoice. Minimum total: ₹X"`.

---

## Journey 3: Record Customer Receipt, Partial Payment, Customer TDS, or Overpayment

- **Starting Point:** Invoice Detail page (`/invoices/[id]`) or Invoices table row action.
- **Exact Route & Navigation Sequence:**
  1. `/invoices/[id]`
  2. Click `Record Payment` -> Opens `InvoicePaymentModal`
  3. Enter payment date, method, bank account, amount paid, and customer TDS amount -> Click `Confirm Payment` -> Modal closes, invoice status updates
- **Buttons / Controls Used:**
  - Button `Record Payment`
  - Date input `Payment Date`
  - Dropdown `Payment Method` (Bank Transfer, Cheque, Cash, UPI)
  - Dropdown `Bank Account`
  - Numeric input `Amount Paid`
  - Numeric input `Customer TDS Deducted`
  - Text input `Reference / UTR Number`
  - Button `Save Payment`
- **Required User Decisions:**
  - Allocating bank account where funds landed.
  - Entering TDS deducted by customer under Section 194C / 194J.
  - Deciding whether receipt is partial, full, or overpayment.
- **Current Step Count:** 2 steps (Modal workflow).
- **Validation & Error Behavior:**
  - `amountPaid` must be > 0.
  - Bank account required unless method is `CASH`.
  - Overpayment warning if `amountPaid + customerTds > balanceDue`.
- **Resulting Business Outcome:**
  - Payment record linked to invoice. Invoice status updates to `PARTIALLY_PAID` or `PAID`.
- **Accounting & Data Side Effects:**
  - Posts double-entry General Ledger voucher:
    - `DR Bank Account / Cash Account` [Net Cash Received]
    - `DR TDS Receivable (Current Asset)` [TDS Withheld by Customer]
    - `CR Accounts Receivable (Customer)` [Gross Settlement Amount]
- **Current Pain Points:**
  - Bank Account selector does not show current bank balance in the modal.
  - TDS certificate (Form 16A) reference cannot be captured during payment entry.
- **Simplification Opportunities:**
  - Show live bank balance next to each account in dropdown.
  - Add Form 16A acknowledgement tracking.

---

## Journey 4: Create and Record an Operational Expense

- **Starting Point:** Left Sidebar -> Expenses.
- **Exact Route & Navigation Sequence:**
  1. `/expenses`
  2. Click `+ Record Expense` -> Opens `ExpenseModal`
  3. Fill Category, Vendor, Description, Amount, GST toggle, Paid By (Company Bank) -> Click `Save Expense` -> Modal closes, expense appears in table
- **Buttons / Controls Used:**
  - Button `+ Record Expense`
  - Category dropdown
  - Vendor dropdown
  - Date picker
  - Numeric input `Amount`
  - Checkbox `GST Applicable`
  - Dropdown `GST Rate` (5%, 12%, 18%, 28%)
  - Checkbox `Eligible for Input Tax Credit (ITC)`
  - Segmented toggle `Paid By` (Company Bank)
  - Dropdown `Bank Account`
  - Button `Save Expense`
- **Required User Decisions:**
  - Proper Chart of Accounts expense category classification.
  - ITC eligibility (GSTR-3B compliance).
  - Selecting bank account.
- **Current Step Count:** 2 steps (In-page modal).
- **Validation & Error Behavior:**
  - Category, Date, and Amount > 0 are mandatory.
  - If GST applicable, GST rate must be selected.
- **Resulting Business Outcome:**
  - Expense record created with status `PAID` (if paid via company bank) or `RECORDED`.
- **Accounting & Data Side Effects:**
  - Generates General Ledger voucher:
    - `DR Expense Account` [Taxable Base]
    - `DR Input CGST / SGST / IGST Receivable` [Tax Amount if ITC eligible]
    - `CR Bank Account` [Total Paid]
- **Current Pain Points:**
  - Very tall modal with multiple checkboxes and nested fields causing vertical scrolling on standard laptop displays.
- **Simplification Opportunities:**
  - Progressive disclosure: hide GST and TDS sections unless toggled.

---

## Journey 5: Record Expense Paid by Employee and Later Reimburse Employee

- **Starting Point:** Left Sidebar -> Expenses.
- **Exact Route & Navigation Sequence:**
  1. `/expenses` -> Click `+ Record Expense` -> Opens `ExpenseModal`
  2. Toggle `Paid By: Employee` -> Select Employee -> Click `Save Expense` -> Creates expense with `paidByEmployee: true`, `isReimbursed: false`
  3. Navigate to `/expenses/[id]`
  4. Click `Record Reimbursement` -> Opens `RecordPaymentModal`
  5. Select company payout bank account, date, and reference -> Click `Confirm Reimbursement` -> Status updates to `isReimbursed: true`
- **Buttons / Controls Used:**
  - Button `+ Record Expense`
  - Toggle `Paid By: Employee`
  - Dropdown `Employee`
  - Button `Save Expense`
  - Table row click -> `/expenses/[id]`
  - Button `Record Reimbursement`
  - Dropdown `Payout Bank Account`
  - Button `Confirm Reimbursement`
- **Required User Decisions:**
  - Designating out-of-pocket employee payment.
  - Verifying bill legitimacy.
  - Selecting company bank account for repayment.
- **Current Step Count:** 4 distinct steps across 2 screens.
- **Validation & Error Behavior:**
  - Reimbursement button only enabled when `paidByEmployee == true` and `isReimbursed == false`.
- **Resulting Business Outcome:**
  - Employee payable liability is recognized, then extinguished upon bank disbursement. Zero duplicate expense counting.
- **Accounting & Data Side Effects:**
  - **Step 1 (Expense Claim):**
    - `DR Expense Account` [Taxable Base]
    - `DR Input GST Receivable` [GST if valid bill]
    - `CR Employee Reimbursements Payable (Current Liability)` [Total]
  - **Step 2 (Reimbursement Payout):**
    - `DR Employee Reimbursements Payable` [Total]
    - `CR Company Bank Account` [Total]
- **Current Pain Points:**
  - Employee's bank account / UPI ID is not pre-populated in the reimbursement payout modal.
  - Requires navigating to expense detail page rather than offering one-click "Reimburse" from the list table.
- **Simplification Opportunities:**
  - Add inline "Reimburse" row action in Expenses table.
  - Auto-display employee's saved bank IFSC/Account.

---

## Journey 6: Create a Vendor Bill and Record Partial Payment with TDS

- **Starting Point:** Left Sidebar -> Expenses -> Vendors tab.
- **Exact Route & Navigation Sequence:**
  1. `/expenses?tab=vendors` -> Click Vendor -> Navigates to `/vendors/[id]`
  2. Click `Record Bill` -> Opens `ExpenseModal` pre-filled with Vendor
  3. Enter bill amount, enable `TDS Applicable`, select section (194C / 194J) -> Click `Save Expense`
  4. On expense detail (`/expenses/[id]`) -> Click `Record Payment` -> Enter partial payment amount -> Click `Confirm Payment`
- **Buttons / Controls Used:**
  - Tab `Vendors`
  - Button `Record Bill`
  - Checkbox `TDS Applicable`
  - Dropdown `TDS Section`
  - Button `Save Expense`
  - Button `Record Payment`
  - Numeric input `Amount`
  - Button `Confirm Payment`
- **Required User Decisions:**
  - Verifying Section 194C (Contractors @ 1% or 2%) vs 194J (Professional fees @ 10%).
  - Calculating exact net vendor payable after statutory withholding.
- **Current Step Count:** 4 steps.
- **Validation & Error Behavior:**
  - TDS section required if TDS checkbox is ticked.
  - Partial payment must not exceed total bill amount minus TDS.
- **Resulting Business Outcome:**
  - Vendor bill posted with liability split between Vendor Payable and TDS Payable. Partial payout recorded.
- **Accounting & Data Side Effects:**
  - **Bill Posting:**
    - `DR Expense Account` [Taxable Base]
    - `DR Input GST Receivable` [GST]
    - `CR Accounts Payable (Vendor)` [Net Payable]
    - `CR TDS Payable Under Sec 194C/J (Current Liability)` [TDS Withheld]
  - **Partial Payout:**
    - `DR Accounts Payable (Vendor)` [Partial Amount]
    - `CR Company Bank Account` [Partial Amount]
- **Current Pain Points:**
  - No automated warning if cumulative vendor payments cross statutory threshold (e.g., ₹1,00,000 for Section 194C).
- **Simplification Opportunities:**
  - Display vendor's cumulative fiscal-year billing in the bill creation modal.

---

## Journey 7: Enter Monthly Salary and Record Partial or Full Salary Payment

- **Starting Point:** Left Sidebar -> Expenses -> Employees tab (or Sidebar -> Employees).
- **Exact Route & Navigation Sequence:**
  1. `/expenses?tab=employees`
  2. Click `Process Batch Payroll` -> Opens `BatchPayrollModal`
  3. Select Payroll Month, review auto-calculated basic, allowances, PF, ESI, Professional Tax, and TDS -> Adjust line items if needed -> Click `Confirm & Process Payroll`
  4. (Optional) Click `Corporate Banking Export` -> Download CSV for bank portal upload
- **Buttons / Controls Used:**
  - Tab `Employees`
  - Button `Process Batch Payroll`
  - Dropdown `Payroll Month`
  - Line item inputs in payroll modal table
  - Dropdown `Payout Bank Account`
  - Button `Confirm & Process Payroll`
  - Button `Corporate Banking Export`
- **Required User Decisions:**
  - Month selection (e.g., October 2026).
  - Adjusting for unpaid leave, incentives, or bonus payments.
  - Verifying statutory PF/ESI rates.
- **Current Step Count:** 3 steps.
- **Validation & Error Behavior:**
  - Server validates that salary for employee + month does not double-post.
  - Bank account required.
- **Resulting Business Outcome:**
  - Monthly payroll register posted and marked paid or accrued.
- **Accounting & Data Side Effects:**
  - General Ledger double-entry posting:
    - `DR Salaries & Wages Expense` [Gross Salary]
    - `CR Employee PF Payable (Current Liability)` [PF Withheld]
    - `CR Employee ESI Payable (Current Liability)` [ESI Withheld]
    - `CR Professional Tax Payable` [PT Withheld]
    - `CR TDS Payable Under Sec 192` [TDS Withheld]
    - `CR Company Bank Account` [Net Salary Disbursed]
- **Current Pain Points:**
  - `BatchPayrollModal` is crowded with 10+ columns in a modal window, making it hard to read without horizontal scroll.
  - IFSC errors in employee master are only detected after downloading the bank CSV.
- **Simplification Opportunities:**
  - Transform Batch Payroll into a dedicated full-page wizard.
  - Validate employee bank details upfront with warning badges.

---

## Journey 8: Transfer Funds Between Bank Accounts

- **Starting Point:** Left Sidebar -> Banking & Cash -> Transfers tab.
- **Exact Route & Navigation Sequence:**
  1. `/bank-transfers`
  2. Click `+ New Fund Transfer` -> Opens `BankTransferModal`
  3. Select From Account, To Account, Amount, Date, Reference -> Click `Execute Transfer` -> Modal closes, transfer listed
- **Buttons / Controls Used:**
  - Button `+ New Fund Transfer`
  - Dropdown `From Account`
  - Dropdown `To Account`
  - Numeric input `Amount`
  - Date input `Transfer Date`
  - Text input `Reference / UTR Number`
  - Button `Execute Transfer`
- **Required User Decisions:**
  - Selecting source and destination accounts.
  - Verifying sufficient source balance.
- **Current Step Count:** 2 steps.
- **Validation & Error Behavior:**
  - `fromAccountId !== toAccountId`.
  - Amount must be > 0.
- **Resulting Business Outcome:**
  - Internal contra fund transfer recorded.
- **Accounting & Data Side Effects:**
  - General Ledger double-entry contra voucher:
    - `DR Destination Bank Account` [Amount]
    - `CR Source Bank Account` [Amount]
  - **Zero impact** on P&L, GST, or TDS.
- **Current Pain Points:**
  - Does not show current balance of either account in the transfer modal.
- **Simplification Opportunities:**
  - Display live balance chips: `HDFC Bank: ₹12,45,000` -> `ICICI Bank: ₹3,10,000`.

---

## Journey 9: Reconcile a Bank Statement

- **Starting Point:** Left Sidebar -> Banking & Cash -> Reconciliation tab (or `/bank-transfers/reconciliation`).
- **Exact Route & Navigation Sequence:**
  1. `/bank-transfers?tab=reconciliation`
  2. Select Bank Account and Statement Date Range
  3. Select Bank Statement Line and corresponding General Ledger Voucher -> Click `Reconcile Selected` -> Status updates to `RECONCILED`
- **Buttons / Controls Used:**
  - Tab `Reconciliation`
  - Dropdown `Bank Account`
  - Table checkboxes for statement lines and ledger entries
  - Button `Reconcile Selected`
  - Button `Clear Match`
- **Required User Decisions:**
  - Verifying date proximity and exact amount equivalence.
- **Current Step Count:** 3 steps.
- **Validation & Error Behavior:**
  - Prevents reconciling transactions where amounts do not match.
- **Resulting Business Outcome:**
  - Transaction pair marked `RECONCILED` with audit timestamp.
- **Accounting & Data Side Effects:**
  - Does not alter financial amounts. Updates `isReconciled: true` and `reconciledAt: timestamp`.
- **Current Pain Points:**
  - Route duplication (`/bank-transfers?tab=reconciliation` vs `/bank-transfers/reconciliation`).
  - No automated fuzzy matching suggestion for statement narration.
- **Simplification Opportunities:**
  - Consolidate onto single canonical route with AI/algorithmic match suggestion.

---

## Journey 10: Record GST Settlement and TDS Deposit

- **Starting Point:** Left Sidebar -> Reports -> Tax Reports (GST or TDS).
- **Exact Route & Navigation Sequence:**
  1. For GST: `/reports/gst/input-tax-credit` -> Click `Record GST Settlement` -> Opens `RecordGstSettlementModal`
  2. Select Return Period, offset Output Tax against Input Tax Credit, select Bank Account for cash challan -> Click `Confirm Settlement`
  3. For TDS: `/reports/tds` -> Click `Record TDS Deposit Challan` -> Opens `RecordTdsDepositModal`
  4. Enter Challan BSR code, Challan Number, Date, Amount -> Click `Save Challan`
- **Buttons / Controls Used:**
  - Report navigation links
  - Button `Record GST Settlement`
  - Button `Record TDS Deposit Challan`
  - Challan BSR & Challan # inputs
  - Bank Account selector
  - Button `Confirm`
- **Required User Decisions:**
  - Verifying eligible ITC matches GSTR-2B.
  - Recording Government Challan identification numbers (CIN/BSR).
- **Current Step Count:** 3 steps for each tax type.
- **Validation & Error Behavior:**
  - Period must be open. Bank account required for cash balance payments.
- **Resulting Business Outcome:**
  - Statutory tax liability settled and challan vouchers posted.
- **Accounting & Data Side Effects:**
  - **GST Settlement:**
    - `DR Output CGST / SGST / IGST Payable` [Total Output Tax]
    - `CR Input CGST / SGST / IGST Receivable` [Utilized ITC]
    - `CR Bank Account` [Net Cash Tax Paid via PMT-06 Challan]
  - **TDS Deposit:**
    - `DR TDS Payable Under Sec 194C / 194J / 192` [Withheld Liability]
    - `CR Bank Account` [Disbursed via ITNS-281 Challan]
- **Current Pain Points:**
  - These two statutory compliance workflows are buried inside deep report detail pages rather than in a unified Tax & Compliance section.
- **Simplification Opportunities:**
  - Create a dedicated "Statutory Compliance & Tax Filing" hub in the navigation.

---

## Journey 11: Record a Fixed Asset and Review Depreciation / Disposal

- **Starting Point:** Left Sidebar -> Settings -> Fixed Assets tab.
- **Exact Route & Navigation Sequence:**
  1. `/settings?tab=assets`
  2. Click `+ Add Fixed Asset` -> Opens modal -> Enter Asset Name, Category, Purchase Date, Cost, Method (WDV/SLM), Depreciation Rate -> Click `Save Asset`
  3. Periodically -> Click `Run Depreciation Calculation` -> Review computed depreciation per asset -> Click `Confirm & Post Depreciation`
- **Buttons / Controls Used:**
  - Tab `Fixed Assets`
  - Button `+ Add Fixed Asset`
  - Form fields in asset modal
  - Button `Run Depreciation Calculation`
  - Button `Confirm & Post Depreciation`
- **Required User Decisions:**
  - Selecting depreciation method (WDV under Income Tax Act vs SLM under Companies Act).
  - Verifying useful life and scrap value.
- **Current Step Count:** 3 steps.
- **Validation & Error Behavior:**
  - Asset cost > 0, depreciation rate between 0% and 100%.
- **Resulting Business Outcome:**
  - Asset capitalized on Balance Sheet and scheduled depreciation posted to GL.
- **Accounting & Data Side Effects:**
  - **Capitalization:**
    - `DR Fixed Asset (e.g. Computers & IT Equipment)` [Cost]
    - `CR Bank Account / Vendor Payable` [Cost]
  - **Depreciation Run:**
    - `DR Depreciation Expense (P&L Operating Expense)` [Depreciation Amount]
    - `CR Accumulated Depreciation (Balance Sheet Asset Contra)` [Depreciation Amount]
- **Current Pain Points:**
  - Fixed Asset management is buried inside system Settings rather than being treated as an operational accounting module.
- **Simplification Opportunities:**
  - Elevate Fixed Assets to the General Ledger / Accounting navigation group.

---

## Journey 12: Record a Loan and its Principal/Interest Repayment (ORPHANED WORKFLOW)

- **Starting Point:** Left Sidebar -> Finance (Currently redirects to `/bank-transfers`!).
- **Exact Route & Navigation Sequence:**
  1. User navigates to `/finance` -> **BLOCKED:** Route executes `redirect('/bank-transfers')`.
  2. Backend service `LoanService` (`services/loan.service.ts`) and server actions (`app/(dashboard)/finance/loan-actions.ts`) exist:
     - `createLoanAction()`
     - `recordLoanRepaymentAction()`
     - `deleteLoanRepaymentAction()`
  3. **Current User Experience:** There is ZERO user interface in the application to perform this workflow.
- **Buttons / Controls Used:**
  - NONE AVAILABLE IN UI.
- **Required User Decisions:**
  - Loan category (Term Loan, Working Capital Overdraft, Director Loan).
  - Principal amount, interest rate, tenure, repayment bank account.
- **Current Step Count:** 0 (Inaccessible via browser).
- **Validation & Error Behavior:**
  - Server actions validate principal > 0, interest >= 0, and valid counterparty bank account.
- **Resulting Business Outcome:**
  - Currently unreachable from web browser.
- **Accounting & Data Side Effects (Backend Ready):**
  - **Disbursement:** `DR Bank Account` / `CR Loan Liability Account`
  - **Repayment:** `DR Loan Liability (Principal)` + `DR Interest Expense (P&L)` / `CR Bank Account`
- **Current Pain Points:**
  - **CRITICAL DEFECT (DEF-002):** Complete lack of frontend UI for loan accounting.
- **Simplification Opportunities:**
  - Build a clean "Loans & Facilities" tab under Banking & Treasury module.

---

## Journey 13: Review and Drill Down into Trial Balance, P&L, and Balance Sheet

- **Starting Point:** Left Sidebar -> Reports -> Financial Statements.
- **Exact Route & Navigation Sequence:**
  1. `/reports` (select `Financial` category)
  2. Click `Trial Balance` -> Navigates to `/reports/trial-balance`
  3. Review debit/credit equilibrium banner (Total Debits == Total Credits)
  4. Click on any Account Name in table -> Navigates to `/ledgers?accountId=...` showing individual vouchers
- **Buttons / Controls Used:**
  - Category card `Trial Balance`
  - Date range selector
  - Table row link on Account Name
  - Button `Export to Excel` / `Export to PDF`
- **Required User Decisions:**
  - Selecting As of Date or fiscal year.
  - Investigating unexpected balances.
- **Current Step Count:** 3 steps with deep drilldown.
- **Validation & Error Behavior:**
  - Trial Balance displays live difference warning if debits != credits (currently 0.00 in verified DB).
- **Resulting Business Outcome:**
  - Complete transparent verification from statutory summary statement down to the underlying voucher.
- **Accounting & Data Side Effects:**
  - Read-only data presentation; zero mutation.
- **Current Pain Points:**
  - Navigating back from `/ledgers` to `/reports/trial-balance` loses the selected date filter.
- **Simplification Opportunities:**
  - Retain report query parameters in session storage or URL state during drilldown.

---

## Journey 14: Apply, Preserve, and Reset Report Date Filters

- **Starting Point:** Any report screen (`/reports/trial-balance`, `/reports/sales`, etc.).
- **Exact Route & Navigation Sequence:**
  1. Open Report
  2. Select `From Date` and `To Date`
  3. Click `Apply Filter` -> Report refreshes with filtered dataset
  4. Click `Reset Filter` -> Resets to current financial year
- **Buttons / Controls Used:**
  - Date input `From Date`
  - Date input `To Date`
  - Button `Apply Filter`
  - Button `Reset`
- **Required User Decisions:**
  - Specifying reporting period (Monthly, Quarterly, Annual, or Custom).
- **Current Step Count:** 2 steps.
- **Validation & Error Behavior:**
  - `To Date` must be >= `From Date`.
- **Resulting Business Outcome:**
  - Recalculated financial balances for selected range.
- **Accounting & Data Side Effects:**
  - Read-only.
- **Current Pain Points:**
  - Different reports use different URL parameter names (some use `?from=&to=`, others use `?startDate=&endDate=`, others use `?fy=`).
- **Simplification Opportunities:**
  - Standardize all report date parameters to unified `?from=YYYY-MM-DD&to=YYYY-MM-DD`.

---

## Journey 15: Review Customer, Vendor, Employee, and Bank Ledgers

- **Starting Point:** Left Sidebar -> Ledgers.
- **Exact Route & Navigation Sequence:**
  1. `/ledgers`
  2. Select Chart of Account from dropdown
  3. Select Date Range
  4. Click `Export Statement` -> Downloads spreadsheet
- **Buttons / Controls Used:**
  - Dropdown `Select Account`
  - Date picker
  - Button `Export Statement`
- **Required User Decisions:**
  - Finding specific counterparty account in dropdown.
- **Current Step Count:** 2 steps.
- **Validation & Error Behavior:**
  - Requires valid account selection.
- **Resulting Business Outcome:**
  - Chronological voucher ledger with running balance.
- **Accounting & Data Side Effects:**
  - Read-only.
- **Current Pain Points:**
  - Single flat dropdown contains hundreds of mixed accounts without category optgroups (e.g. Customers mixed with Expense categories and Banks).
- **Simplification Opportunities:**
  - Group accounts in dropdown by Asset, Liability, Equity, Revenue, and Expense with search filtering.

---

## Journey 16: Manage Masters, Users, and Permissions

- **Starting Point:** Left Sidebar -> Users (or Settings).
- **Exact Route & Navigation Sequence:**
  1. `/users`
  2. View user list in `UsersRolesClient`
  3. Click `Add User` -> Enter Name, Email, Password, select Role (ADMIN, FINANCE, ACCOUNTANT, AUDITOR) -> Submit
- **Buttons / Controls Used:**
  - Button `Add User`
  - Form fields
  - Role dropdown
  - Status toggle switch
- **Required User Decisions:**
  - Assigning appropriate access level.
- **Current Step Count:** 2 steps.
- **Validation & Error Behavior:**
  - Requires unique email and strong password.
- **Resulting Business Outcome:**
  - User record created and permissions applied.
- **Accounting & Data Side Effects:**
  - Administrative metadata update.
- **Current Pain Points:**
  - **DEF-004:** `/users` renders basic `UsersRolesClient`, while the rich `UserManagementClient` with custom role creation and granular permission toggles is orphaned in source code.
- **Simplification Opportunities:**
  - Activate `UserManagementClient` on `/users`.

---

## Journey 17: Perform Opening-Balance or Fiscal-Period Actions

- **Starting Point:** Left Sidebar -> Opening/Closing.
- **Exact Route & Navigation Sequence:**
  1. `/opening-closing`
  2. Select Financial Year (e.g., `FY 2026–27`)
  3. Click `+ Add Opening Balance` -> Opens modal -> Select Balance Sheet Category (Asset/Liability/Equity), enter Amount -> Click `Save`
  4. (To Delete) Click delete trash icon on row -> Balance removed
- **Buttons / Controls Used:**
  - Dropdown `Financial Year`
  - Button `+ Add Opening Balance`
  - Form inputs in modal
  - Trash icon button `Delete`
- **Required User Decisions:**
  - Ensuring opening Assets equal opening Liabilities + Equity.
- **Current Step Count:** 3 steps.
- **Validation & Error Behavior:**
  - Server-side pre-filters categories to only Balance Sheet types (Income & Expense categories are blocked).
- **Resulting Business Outcome:**
  - Opening balances recorded for persistent General Ledger.
- **Accounting & Data Side Effects:**
  - Establishes starting debit/credit balances for the financial year.
- **Current Pain Points:**
  - Row deletion has no confirmation dialog (DEF-013).
  - Backend `FiscalPeriodService.lockPeriod` has no UI toggle to lock completed financial years.
- **Simplification Opportunities:**
  - Add confirmation modal on deletion.
  - Add "Lock Financial Period" toggle with password verification.

---

## Journey 18: Access Backup Status and Administrative Controls (ORPHANED WORKFLOW)

- **Starting Point:** Left Sidebar -> Admin (Currently redirects to `/dashboard`!).
- **Exact Route & Navigation Sequence:**
  1. User navigates to `/admin` -> **BLOCKED:** Route executes `redirect('/dashboard')`.
  2. Backend service `BackupRestoreService` (`services/backup-restore.service.ts`) and server actions (`app/(dashboard)/admin/backup-actions.ts`) exist:
     - `triggerBackupAction()`
     - `listBackupsAction()`
     - `verifyBackupChecksumAction()`
     - `runHistoricalDryRunAction()`
  3. **Current User Experience:** There is ZERO user interface in the application to view backup status, trigger an on-demand archive, or verify SHA-256 integrity.
- **Buttons / Controls Used:**
  - NONE AVAILABLE IN UI.
- **Required User Decisions:**
  - Scheduling or initiating on-demand backups.
  - Reviewing backup manifest checksums.
- **Current Step Count:** 0 (Inaccessible via browser).
- **Validation & Error Behavior:**
  - Server actions restricted to `ADMIN`.
- **Resulting Business Outcome:**
  - Currently unreachable from web browser.
- **Accounting & Data Side Effects (Backend Ready):**
  - Generates zero-data-loss JSON/BSON database archives with SHA-256 integrity manifests.
- **Current Pain Points:**
  - **CRITICAL DEFECT (DEF-003):** Complete lack of frontend UI for disaster recovery and backup management.
- **Simplification Opportunities:**
  - Add a dedicated "Backup & Data Management" tab inside Settings.
