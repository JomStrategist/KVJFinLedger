# FINLEDGER — MASTER TESTING PLAN & AUDIT MATRICES (PHASE 1)
**Organization:** KVJ Analytics  
**Document Type:** Comprehensive Testing Architecture & Quality Assurance Protocol  
**Version:** 1.0.0  
**Status:** Approved for Phase 2 Execution  
**Inspection Date:** 09-Oct-2026

---

## 1. Quality Assurance Charter

This test plan defines the formal test suites, validation criteria, test matrices, and execution protocols for FinLedger. The plan spans the combined disciplines of:
- **Statutory Accounting & Tax Integrity** (ICAI standards, Schedule III, Indian GST & TDS)
- **Software Architecture & Data Persistence** (Next.js 16, Prisma ORM, MongoDB)
- **UI/UX & User Interaction** (Tactile feedback, validation states, accessibility)
- **Automation & Regression Quality** (Deterministic verification, performance benchmarks)

---

## 2. Test Matrices & Execution Protocols

### 2.1 UI, Usability & Interactive Controls Matrix

| Test ID | Module / Screen | Control / Action | Test Steps | Expected Result | Pass Criteria | Severity | Mapped Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `TEST-UI-001` | Sidebar | 11 Navigation Links | Click each of the 11 sidebar items sequentially | Route changes smoothly without page flicker, active link highlights in emerald | Clean routing, zero 404s | High | `RULE-NAV-001` |
| `TEST-UI-002` | Sidebar | Mobile Drawer Toggle | Toggle hamburger button on &lt; 768px viewport | Sidebar expands cleanly with backdrop; closes on backdrop tap or item selection | Responsive drawer | Medium | `RULE-NAV-001` |
| `TEST-UI-003` | Invoice Ribbon | 3 Sub-tabs | Click Confirmed &rarr; Proforma &rarr; Customers | Optimistic tab transition executes under 100ms without full page re-render | Fast ribbon switch | Medium | `RULE-NAV-002` |
| `TEST-UI-004` | Expense Ribbon | 3 Sub-tabs | Click Expenses &rarr; Vendors &rarr; Employees | Active view switches with proper toolbar buttons reflecting active context | Contextual toolbars | Medium | `RULE-NAV-003` |
| `TEST-UI-005` | Masters Hub | 6 Sub-tabs | Switch across Customers, Vendors, Employees, Products, Categories, Bank Accounts | Table data updates instantly; counter badges show accurate entity counts | Consistent counters | Medium | `RULE-NAV-004` |
| `TEST-UI-006` | Masters Hub | `+ Add Record` Button | Click `+ Add Record` on any master tab | Modal opens with 5 tabs (Customer, Party, Employee, Product, Category), defaulting to current tab | Complete master tabs | High | `RULE-EMP-009` |
| `TEST-UI-007` | Reports Hub | 11 Category Tabs | Switch across all 11 report categories | Each category renders its respective reporting sub-views without crash | Zero runtime errors | Critical | `RULE-RPT-001` |
| `TEST-UI-008` | Reports &rarr; Statements | 5 Financial Statements | Switch across TB, P&L, BS, Cash Flow, Comparative | All statements render cleanly with formatted currency and zero undefined errors | Seamless statement tabs | Critical | `RULE-RPT-002` |

---

### 2.2 Master Data & Forms Validation Matrix

| Test ID | Module | Feature / Field | Validation Steps | Expected Behavior | Pass Criteria | Severity | Mapped Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `TEST-MST-001` | Customer Form | Legal Name (Required) | Attempt save with empty customer name | Submission blocked; inline feedback displays "Legal name is required" | Form validation | High | `RULE-SALES-003` |
| `TEST-MST-002` | Customer Form | B2B GSTIN Auto-Extraction | Enter `32AACCE5058R2Z9` in GSTIN field | PAN auto-populates as `AACCE5058R`; State auto-sets to `Kerala` (32) | Smart tax extraction | Medium | `RULE-GST-002` |
| `TEST-MST-003` | Vendor Form | Party Name & State | Enter vendor details with state `Tamil Nadu` (33) | Vendor persisted; default Place of Supply for future bills set to inter-state | Correct state tag | High | `RULE-EXP-002` |
| `TEST-MST-004` | Employee Form | Add New Employee | Open modal &rarr; select Employee tab &rarr; enter Name "Ajay", Dept "Engineering" &rarr; Save | Employee created; auto-assigned code `EMP-001`; persists after browser refresh | Working creation | Critical | `RULE-EMP-009` |
| `TEST-MST-005` | Employee Form | Edit Employee Details | Click `Edit` on existing employee &rarr; change Designation &rarr; Save | Updated designation reflected across UI and expense claims | Persistent update | High | `RULE-EMP-001` |
| `TEST-MST-006` | Employee Form | Status Toggle | Click `Deactivate` on employee | Status toggles to `Inactive`; employee excluded from active expense dropdowns | Clean soft-disable | Medium | `RULE-EMP-001` |
| `TEST-MST-007` | Chart of Accounts | Financial Type Routing | Create new category "Cloud Infrastructure" with Type `EXPENSE` | Statement automatically assigned to `Profit & Loss`; Normal Balance set to `Debit` | Correct COA rules | Critical | `RULE-GEN-004` |

---

### 2.3 Accounting Transactions & Double-Entry Matrix

| Test ID | Workflow Scenario | Inputs & Values | Expected Accounting Entries | Equilibrium Verification | Pass Criteria | Mapped Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `TEST-TXN-001` | Confirmed B2B Tax Invoice | Service ₹10,000 + 18% GST (₹1,800) = ₹11,800 | **Dr** AR ₹11,800<br>**Cr** Revenue ₹10,000<br>**Cr** Output GST ₹1,800 | $\sum \text{Dr} = \sum \text{Cr} = 11,800$<br>P&L Revenue is strictly ₹10,000 | Double entry balance | `RULE-SALES-001` |
| `TEST-TXN-002` | Export Invoice (Zero-Rated) | IT Consulting ₹1,00,000, POS = 96 Outside India | **Dr** AR ₹1,00,000<br>**Cr** Revenue ₹1,00,000<br>GST charged = ₹0 | $\sum \text{Dr} = \sum \text{Cr} = 1,00,000$<br>Zero GST liability | Export tax compliance | `RULE-GST-004` |
| `TEST-TXN-003` | Customer Partial Receipt | Invoice ₹11,800; Cash received ₹5,000 | **Dr** Bank ₹5,000<br>**Cr** AR ₹5,000 | Outstanding = ₹6,800<br>Status = `PARTIALLY_PAID`<br>Zero new revenue | Accurate status | `RULE-RCPT-004` |
| `TEST-TXN-004` | Combined Settlement with TDS | Invoice ₹11,800; Bank ₹10,800; TDS ₹1,000 | **Dr** Bank ₹10,800<br>**Dr** TDS Receivable ₹1,000<br>**Cr** AR ₹11,800 | Outstanding = ₹0<br>Status = `PAID`<br>TDS recognized on receipt | Unified settlement | `RULE-RCPT-010` |
| `TEST-TXN-005` | Customer Unallocated Advance | Bank receipt of ₹25,000 with no invoice | **Dr** Bank ₹25,000<br>**Cr** Customer Advance ₹25,000 | Current Liability ₹25,000<br>P&L revenue = ₹0 | Advance tracking | `RULE-RCPT-005` |
| `TEST-TXN-006` | Vendor Bill with Eligible ITC | Software bill ₹5,000 + 18% GST (₹900) = ₹5,900 | **Dr** Expense ₹5,000<br>**Dr** Input GST ₹900<br>**Cr** Vendor AP ₹5,900 | P&L expense = ₹5,000<br>Input GST = ₹900 (Asset) | ITC excluded from cost | `RULE-EXP-003` |
| `TEST-TXN-007` | Fixed Asset Capitalization | Laptop purchase ₹60,000 + 18% GST (₹10,800) | **Dr** Fixed Assets ₹60,000<br>**Dr** Input GST ₹10,800<br>**Cr** Bank/AP ₹70,800 | Balance sheet asset ₹60,000<br>Operating expense = ₹0 | Capitalization rule | `RULE-EXP-009` |
| `TEST-TXN-008` | Employee-Paid Business Expense | Staff pays ₹3,000 travel personally | **Dr** Travel Expense ₹3,000<br>**Cr** Employee Payable ₹3,000 | Bank outflow = ₹0<br>Employee liability = ₹3,000 | Employee payable head | `RULE-MOD-004` |
| `TEST-TXN-009` | Employee Full Reimbursement | Disburse ₹3,000 to employee via Bank | **Dr** Employee Payable ₹3,000<br>**Cr** Bank Account ₹3,000 | Liability cleared to ₹0<br>Zero second expense | Clean reimbursement | `RULE-MOD-006` |
| `TEST-TXN-010` | Salary without TDS | Gross salary ₹50,000 paid from Bank | **Dr** Salary Expense ₹50,000<br>**Cr** Bank Account ₹50,000 | Classified as Personnel Cost<br>Never Sundry Creditors | Personnel cost | `RULE-EMP-006` |
| `TEST-TXN-011` | Salary with Section 192 TDS | Gross ₹50,000; TDS ₹5,000; Bank ₹45,000 | **Dr** Salary Expense ₹50,000<br>**Cr** Bank Account ₹45,000<br>**Cr** TDS Payable ₹5,000 | Statutory liability ₹5,000<br>Net disbursement ₹45,000 | Salary TDS | `RULE-EMP-007` |
| `TEST-TXN-012` | Vendor Bill Settlement with TDS | Bill ₹30,000; Bank ₹28,000; TDS ₹2,000 | **Dr** Vendor AP ₹30,000<br>**Cr** Bank ₹28,000<br>**Cr** TDS Payable ₹2,000 | Vendor cleared ₹30,000<br>TDS Payable = ₹2,000 | Full bill settlement | `RULE-VTDS-004` |
| `TEST-TXN-013` | Internal Contra Bank Transfer | Transfer ₹10,000 from Primary to Petty Cash | **Dr** Petty Cash ₹10,000<br>**Cr** Primary Bank ₹10,000 | Net Bank Asset unchanged<br>Zero P&L effect | Contra validity | `RULE-BNK-001` |
| `TEST-TXN-014` | Loan Disbursal Receipt | Receive loan of ₹1,00,000 into Bank | **Dr** Bank ₹1,00,000<br>**Cr** Loan Liability ₹1,00,000 | Liability increased<br>Zero operating income | Loan liability | `RULE-BNK-005` |
| `TEST-TXN-015` | Loan Principal Repayment | Disburse ₹10,000 principal to bank | **Dr** Loan Liability ₹10,000<br>**Cr** Bank Account ₹10,000 | Liability reduced<br>Zero operating expense | Principal exclusion | `RULE-BNK-006` |

---

### 2.4 Financial Statements & Reports Audit Matrix

| Test ID | Report / Statement | Target Equilibrium Criteria | Audit Procedure | Pass Criteria | Severity | Mapped Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `TEST-RPT-001` | Trial Balance | $\sum \text{Debits} - \sum \text{Credits} = 0.00$ | Run `getTrialBalance()` across all financial years | Total Debit = Total Credit with exact 0.00 variance | Critical | `RULE-RPT-003` |
| `TEST-RPT-002` | Balance Sheet | $\text{Assets} = \text{Liabilities} + \text{Equity}$ | Run `getBalanceSheet()` under Schedule III format | Assets exactly balance Equity & Liabilities | Critical | `RULE-RPT-004` |
| `TEST-RPT-003` | Profit & Loss | Revenue & Expenses adhere strictly to accrual | Verify revenue matches invoice taxable amounts and expenses match incurred bills | Zero inclusion of GST, loan principal, or contra transfers | Critical | `RULE-SALES-002` |
| `TEST-RPT-004` | Cash Flow Statement | Closing Cash reconciles to Balance Sheet Cash & Bank | Compare Cash Flow closing balance with Balance Sheet Cash & Cash Equivalents | Exact reconciliation between CF and BS cash | Critical | `RULE-RPT-005` |
| `TEST-RPT-005` | General Ledger Drilldown | Account balance equals sum of voucher lines | Select random accounts and compare computed balance against sum of debits/credits | 100% agreement between vouchers and balances | High | `RULE-RPT-006` |
| `TEST-RPT-006` | GST Reports | Outward supplies match Output GST liability; ITC matches Input GST asset | Cross-verify GSTR-1 and GSTR-3B summaries with GL tax accounts | Exact match between statutory reports and ledgers | High | `RULE-GST-001` |
| `TEST-RPT-007` | TDS Reports | TDS 194J/194C report matches TDS Payable ledger | Reconcile total deducted vendor TDS with liability ledger | Zero variance between TDS register and GL | High | `RULE-VTDS-003` |

---

### 2.5 Security, Error Recovery & Regression Protocol

| Test ID | Area | Test Condition | Expected System Behavior | Pass Criteria | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TEST-SEC-001` | Authentication | Access protected route (`/dashboard`) while unauthenticated | System redirects to `/login` with clean callback parameter | Unauthorized access blocked | Critical |
| `TEST-SEC-002` | Role Authorization | Non-admin user attempts access to `/settings` or `/users` | Access denied / redirected to `/home` | Role permission enforced | High |
| `TEST-REC-001` | Network / DB Drop | API request times out or database connection interrupts | User-friendly toast / alert displayed; form values preserved; no data corruption | Graceful recovery | High |
| `TEST-REC-002` | Duplicate Click | User double-clicks "Confirm Invoice" or "Record Payment" button | Action button disables during pending transition; duplicate request ignored | Zero duplicate vouchers | Critical |
| `TEST-REG-001` | Regression | Full automated test suite execution | `npx tsx tests/accounting-integrity.test.ts` & `npx tsx tests/accounting-verification-audit.test.ts` | 100% scenarios pass (44/44 total) | Critical |
| `TEST-REG-002` | Production Build | Full Next.js production build (`npm run build`) | All 40+ routes compile cleanly without type or bundling errors | Zero build errors | Critical |
