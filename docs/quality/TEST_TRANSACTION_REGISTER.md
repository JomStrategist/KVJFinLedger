# FinLedger Quality Assurance — Phase 5: Test Transaction Register & Execution Plan

**Document Version:** 1.0.0  
**Test Suite:** End-to-End Financial Transaction Testing  
**Auditor / Architect:** Senior Software Architect & Indian Chartered Accountant  
**Baseline Date:** 9 October 2026  

---

## 1. Overview and Scope

This document specifies the complete, sequential suite of 10 real-world business transactions to be entered into FinLedger, tracing each from source voucher to journal entries, general ledger postings, and authoritative financial statements.

### Testing Principles
1. **Double-Entry Verifiability (`RULE-ACC-001`):** Every transaction must generate strictly balanced debit and credit journal lines ($\sum \text{Debits} = \sum \text{Credits}$).
2. **Indian Statutory Compliance (`RULE-GST-001`, `RULE-TDS-001`):** Verify IGST/CGST/SGST splitting, reverse charge, TDS Section 194J/194C withholding, and Round-Off handling.
3. **ICAI AS-10 / Schedule II Compliance (`RULE-AST-001`):** Fixed asset purchases capitalized to gross block, with depreciation posted to accumulated depreciation reserve.
4. **Data Preservation:** Existing 4 invoices, 1 Signtek expense, and opening balances (₹10L Bank, ₹10L Capital) must remain intact.

---

## 2. Test Transaction Schedule

### Transaction 1: Master Setup — Create Employee Master (`RULE-EMP-001`)
- **Action:** Create new employee record.
- **Details:**
  - Name: **Rahul Sharma**
  - Designation: Senior Software Engineer
  - Department: Engineering
  - Email: `rahul.sharma@kvjanalytics.com`
  - PAN: `ABCPS1234F`
  - Monthly CTC: ₹60,000
  - Status: Active
- **Expected Outcome:** Employee saved with auto-generated code `EMP-2026-001`, visible in Masters and Expenses Employee views.

---

### Transaction 2: Master Setup — Create Hardware Vendor (`RULE-VEN-001`)
- **Action:** Create vendor record for capital purchases.
- **Details:**
  - Legal Name: **TechSolutions Systems Pvt Ltd**
  - GSTIN: `32AABCT1234D1Z5` (Kerala Intra-State)
  - State: Kerala (`32`)
  - Email: `billing@techsolutions.in`
- **Expected Outcome:** Vendor registered with Trade/Sundry Creditor ledger mapping.

---

### Transaction 3: Operational Expense — Office Broadband Internet (`RULE-EXP-001`, `RULE-GST-002`)
- **Action:** Record Office Internet expense paid via HDFC Bank.
- **Details:**
  - Category: Office & Admin Expenses
  - Invoice Number: `AIRTEL-OCT-9921`
  - Base Amount: ₹2,000.00
  - GST Rate: 18% (CGST 9% ₹180 + SGST 9% ₹180 = ₹360.00)
  - Total Paid: ₹2,360.00
  - Payment Mode: Bank (HDFC Current Account)
- **Expected Accounting Entries:**
  - **Debit:** Office Expenses — ₹2,000.00
  - **Debit:** Input CGST — ₹180.00
  - **Debit:** Input SGST — ₹180.00
  - **Credit:** HDFC Bank Account — ₹2,360.00

---

### Transaction 4: Capital Asset Purchase — Development Laptop (`RULE-AST-001`)
- **Action:** Record laptop purchase from TechSolutions Systems, capitalized as Fixed Asset.
- **Details:**
  - Vendor: TechSolutions Systems Pvt Ltd
  - Voucher / Invoice: `TS-INV-8831`
  - Base Cost: ₹60,000.00
  - GST Rate: 18% (CGST ₹5,400 + SGST ₹5,400 = ₹10,800.00)
  - Capitalized Total Gross Block: ₹70,800.00 (or ₹60,000 + Input ITC ₹10,800)
  - Payment Status: Unpaid (Trade Payable)
  - Is Asset: `true` (Depreciation Rate: 40% WDV)
- **Expected Accounting Entries:**
  - **Debit:** Computer Equipment (Fixed Asset) — ₹60,000.00
  - **Debit:** Input CGST — ₹5,400.00
  - **Debit:** Input SGST — ₹5,400.00
  - **Credit:** Sundry Creditors (TechSolutions Systems) — ₹70,800.00

---

### Transaction 5: Employee Travel Reimbursement (`RULE-EMP-002`)
- **Action:** Record employee travel claim reimbursement for Rahul Sharma.
- **Details:**
  - Employee: Rahul Sharma
  - Category: Travel & Conveyance
  - Gross Claim: ₹3,000.00 (No GST / Nil-rated transport)
  - Paid via: HDFC Bank
- **Expected Accounting Entries:**
  - **Debit:** Travel & Conveyance Expense — ₹3,000.00
  - **Credit:** HDFC Bank Account — ₹3,000.00

---

### Transaction 6: Direct Salary Posting (`RULE-EMP-003`)
- **Action:** Record monthly net salary payout for Rahul Sharma.
- **Details:**
  - Employee: Rahul Sharma
  - Category: Employee Salaries & Benefits
  - Amount: ₹50,000.00
  - Paid via: HDFC Bank
- **Expected Accounting Entries:**
  - **Debit:** Salary & Wages Expense — ₹50,000.00
  - **Credit:** HDFC Bank Account — ₹50,000.00

---

### Transaction 7: Customer Tax Invoice — Software Analytics Consulting (`RULE-INV-001`, `RULE-GST-001`)
- **Action:** Create new sales tax invoice for Aparna Sara Mathew.
- **Details:**
  - Customer: Aparna Sara Mathew
  - Service Description: Cloud Architecture & Analytics Consulting
  - Taxable Value: ₹50,000.00
  - GST Rate: 18% Intra-State (CGST 9% ₹4,500 + SGST 9% ₹4,500 = ₹9,000.00)
  - Total Invoice Value: ₹59,000.00
- **Expected Accounting Entries:**
  - **Debit:** Sundry Debtors (Aparna Sara Mathew) — ₹59,000.00
  - **Credit:** Revenue from Operations — ₹50,000.00
  - **Credit:** Output CGST — ₹4,500.00
  - **Credit:** Output SGST — ₹4,500.00

---

### Transaction 8: Customer Payment Receipt with 10% TDS (Section 194J) (`RULE-REC-001`, `RULE-TDS-001`)
- **Action:** Record full settlement of the ₹59,000 consulting invoice with Section 194J TDS deduction.
- **Details:**
  - Invoice Total: ₹59,000.00
  - TDS Deducted by Customer (10% on ₹50,000 taxable base): ₹5,000.00
  - Net Amount Received in Bank: ₹54,000.00
- **Expected Accounting Entries:**
  - **Debit:** HDFC Bank Account — ₹54,000.00
  - **Debit:** TDS Receivable (Asset) — ₹5,000.00
  - **Credit:** Sundry Debtors (Aparna Sara Mathew) — ₹59,000.00

---

### Transaction 9: Banking Contra — Petty Cash Withdrawal (`RULE-BNK-002`)
- **Action:** Cash withdrawal from HDFC Bank to create office Petty Cash fund.
- **Details:**
  - Amount: ₹10,000.00
  - Transfer: HDFC Bank -> Petty Cash / Cash in Hand
- **Expected Accounting Entries:**
  - **Debit:** Cash in Hand / Petty Cash — ₹10,000.00
  - **Credit:** HDFC Bank Account — ₹10,000.00

---

### Transaction 10: Fixed Asset Depreciation Write-Off (`RULE-AST-002`)
- **Action:** Record annual depreciation on newly capitalized Laptop.
- **Details:**
  - Asset: Development Laptop (Gross: ₹60,000.00)
  - Rate: 40% WDV
  - Depreciation Amount: ₹24,000.00
- **Expected Accounting Entries:**
  - **Debit:** Depreciation Expense (P&L) — ₹24,000.00
  - **Credit:** Accumulated Depreciation (Balance Sheet Asset Contra) — ₹24,000.00

---

## 3. Financial Statement Reconciliation Checkpoints

After posting Transactions 1 through 10, the following mathematical validations will be verified:
1. **Trial Balance Equilibrium:**
   $$\sum \text{Debit Balances} = \sum \text{Credit Balances}$$
2. **Balance Sheet Equilibrium:**
   $$\text{Total Assets} = \text{Total Liabilities} + \text{Equity} + \text{Net Profit (Current FY)}$$
3. **Cash & Bank Equilibrium:**
   $$\text{Bank Closing Balance} = \text{Opening} - \text{Internet (₹2,360)} - \text{Travel (₹3,000)} - \text{Salary (₹50,000)} + \text{Customer (₹54,000)} - \text{Contra (₹10,000)}$$
   $$\text{Expected HDFC Bank} = 10,00,000 - 2,360 - 3,000 - 50,000 + 54,000 - 10,000 = ₹9,88,640.00$$
   $$\text{Expected Petty Cash} = ₹10,00,000 \text{ base} + ₹10,000 = ₹10,000.00$$
4. **GST Reconciliation:**
   - Output GST increased by ₹9,000.00
   - Input Tax Credit increased by ₹11,160.00 (₹360 + ₹10,800)
5. **Net Profit Calculation:**
   $$\text{Revenue} = \text{Base} + ₹50,000.00$$
   $$\text{Expenses} = \text{Base} + ₹2,000.00 (\text{Internet}) + ₹3,000.00 (\text{Travel}) + ₹50,000.00 (\text{Salary}) + ₹24,000.00 (\text{Depreciation})$$
