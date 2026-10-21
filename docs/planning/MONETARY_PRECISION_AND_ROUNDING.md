# FINLEDGER ERP — MONETARY PRECISION & ROUNDING STRATEGY

**Organization:** KVJ Analytics (Indian IT & Analytics Services)  
**System:** FinLedger ERP  
**Document Type:** Monetary Precision, Numeric Representation & Rounding Specification  
**Baseline Date:** 21 October 2026  
**Document Status:** DESIGN FROZEN & EVIDENCE-BACKED (PROMPT 3)  

---

## 1. Executive Summary & Problem Definition

Financial systems in India require exact **two-decimal currency precision (INR ₹ and Paise)**. The current codebase exhibits two critical monetary precision challenges:
1. **IEEE-754 Floating-Point Representation:** All existing financial models (`TaxInvoice`, `Expense`, `InvoicePayment`, etc.) store monetary amounts using BSON `Double` (mapped to Prisma `Float`), and arithmetic is conducted using native JavaScript numbers. This introduces binary floating-point rounding quirks (e.g., `0.1 + 0.2 = 0.30000000000000004`).
2. **Tax Splitting Paise Discrepancy:** When splitting intra-state GST (`totalGST`) evenly between CGST and SGST using `.toFixed(2)`, odd-paise amounts create a 1-paisa imbalance (e.g., ₹15.25 total GST split into ₹7.63 CGST and ₹7.63 SGST totals ₹15.26, causing a ₹0.01 mismatch). Currently, `accounting-engine.service.ts` masks this by artificially injecting a synthetic `Rounding Off Adjustment` line for diffs up to 5 paise.

This document outlines a **safe, evidence-based monetary strategy** that completely eliminates rounding drift without breaking existing MongoDB collections, Next.js serialization, or approved invoice layouts.

---

## 2. In-Depth Audit of Current Numeric Fields & Calculation Paths

### 2.1 Inventory of Monetary Fields Across Models

| Domain / Model | Monetary Fields (All currently Prisma `Float` / BSON `Double`) | Calculation Engine / Service | Current Rounding Method |
|----------------|---------------------------------------------------------------|------------------------------|-------------------------|
| **Proforma Invoice** | `subtotal`, `totalDiscount`, `totalCGST`, `totalSGST`, `totalIGST`, `totalTax`, `tdsRate`, `tdsAmount`, `grossAmount`, `netAmount`, `totalAmount` | `lib/tax/index.ts`, `services/proforma-invoice.service.ts` | `Number(val.toFixed(2))` |
| **Proforma Items** | `quantity`, `unitPrice`, `discountPercent`, `taxableAmount`, `gstRate`, `cgstAmount`, `sgstAmount`, `igstAmount`, `totalGST`, `tdsAmount`, `totalAmount` | `lib/tax/gst-calculator.ts`, `tds-calculator.ts` | `Number(val.toFixed(2))` |
| **Tax Invoice** | `subtotal`, `totalDiscount`, `taxableAmount`, `totalCGST`, `totalSGST`, `totalIGST`, `totalGST`, `tdsAmount`, `grossAmount`, `netAmount` | `TaxEngine.calculateInvoiceTaxes` | `Number(val.toFixed(2))` |
| **Tax Invoice Items** | `quantity`, `unitPrice`, `discountPercent`, `discountAmount`, `taxableAmount`, `gstRate`, `cgstAmount`, `sgstAmount`, `igstAmount`, `totalGST`, `totalAmount` | `GSTCalculator.calculateGST` | `Number(val.toFixed(2))` |
| **Invoice Payments** | `paymentAmount`, `tdsRate`, `tdsAmount`, `bankReceipt`, `advanceAmount` | `services/tax-invoice.service.ts` | Raw float arithmetic with 50-paise tolerance (`invoiceTotal - 0.5`) |
| **Expenses** | `subtotal`, `discountAmount`, `taxableAmount`, `inputCGST`, `inputSGST`, `inputIGST`, `totalInputGST`, `tdsAmount`, `grossAmount`, `netAmount`, `paidAmount`, `balancePayable`, `advanceAmount` | `services/expense.service.ts` | Native JS operators with sporadic `.toFixed(2)` |
| **Expense Payments** | `amount` | `services/expense.service.ts` | Float assignment |
| **Payroll** | `salary`, `baseSalary`, `grossAmount`, `advanceDeduction`, `tdsAmount`, `netAmount`, `basic`, `hra`, `specialAllowance`, `providentFund`, `professionalTax` | `services/payroll.service.ts` | `Math.round(val)` for basic/HRA/PF; float subtraction |
| **Depreciation** | `rate`, `depreciationAmount` | `services/depreciation.service.ts` | `Math.round(val * 100) / 100` |
| **Asset Disposal** | `saleProceeds`, `grossCost`, `accumulatedDepreciation`, `netBookValue`, `gainOrLoss` | `services/asset-disposal.service.ts` | Float subtraction |
| **Loans** | `principalAmount`, `interestRate`, `totalAmount`, `interestAmount` | `services/loan.service.ts` | Float arithmetic |
| **GST Settlement** | `cgstPaid`, `sgstPaid`, `igstPaid`, `totalPaid`, `itcCgstUtilized`, `itcSgstUtilized`, `itcIgstUtilized` | `services/gst-settlement.service.ts` | Float sums |
| **TDS Deposit** | `amountPaid` | `services/tds-deposit.service.ts` | Float assignment |
| **Opening Balance** | `amount`, `outstandingAmount` | `services/opening-closing.service.ts` | Float assignment |

---

## 3. Technology Evaluation: Storage Types in Prisma 6 + MongoDB

We evaluated three potential storage and numeric representation strategies:

### Option A: Change All Existing `Float` Fields to `Decimal` (`@db.Decimal128`)
- **Prisma Support:** Prisma 6 supports `Decimal` on MongoDB via `@db.Decimal128` (BSON type 19).
- **Critical Risks & Failure Modes:**
  1. **Schema Mismatch Crash:** MongoDB is a schemaless document store. Existing documents store BSON `Double` (type 1). If Prisma schema is changed to `Decimal`, Prisma Client **throws runtime deserialization errors** when reading existing documents containing Double values.
  2. **Next.js Serialization Failure:** `Prisma.Decimal` instances are rich JavaScript objects (from `decimal.js`). When passed from Server Components or Server Actions across the Next.js boundary to Client Components, Next.js throws `Error: Only plain objects can be passed to Client Components from Server Components. Decimal is not supported.`
  3. **High Disruption:** Every single UI form, calculation hook, format utility, and export tool across the entire application would break.
- **Verdict:** **REJECTED AS HIGH RISK**.

### Option B: Store Amounts as Integer Paise (`Int` / `BigInt`) Everywhere
- **Implementation:** Store all monetary values in paise (₹100.50 stored as `10050`).
- **Critical Risks:**
  1. Breaking changes to all existing client components, form bindings, and database snapshots.
  2. Requires rewriting all operational document schemas and migration of existing production records.
- **Verdict:** **REJECTED FOR OPERATIONAL DOCUMENTS**.

### Option C: The Canonical Hybrid Precision Architecture (RECOMMENDED)
- **Principle:** Clear separation between **Operational Document Layer** and **Persistent General Ledger Layer**.
- **1. Operational Document Layer (`TaxInvoice`, `Expense`, `InvoicePayment`, etc.):**
  - Retain `Float` (BSON Double) in Prisma schema to ensure 100% non-breaking compatibility with existing documents, UI components, and Next.js client component serialization.
  - Enforce explicit two-decimal rounding rules (`roundToPaisa`) across all service boundaries and calculation engines.
- **2. Persistent General Ledger Layer (`JournalEntry`, `JournalLine`):**
  - Store `totalDebit`, `totalCredit`, `debit`, and `credit` with strict two-decimal precision.
  - In the ledger posting engine, amounts are normalized using integer paise during validation:
    $$\text{paisa}(\text{Debit}) \equiv \text{paisa}(\text{Credit})$$
    where $\text{paisa}(x) = \text{Math.round}((x + \varepsilon) \times 100)$.
  - This guarantees that $\sum \text{Dr} = \sum \text{Cr}$ holds down to 0 paise without floating-point inaccuracies.
- **Verdict:** **APPROVED & RECOMMENDED**.

---

## 4. Standardized Calculation & Rounding Rules

### 4.1 Canonical Rounding Function: `roundToPaisa`
All financial calculations must utilize a standardized rounding utility located at `lib/utils/currency.ts`:

```typescript
/**
 * Accurately rounds a monetary amount to 2 decimal places (exact Indian Paise).
 * Utilizes Number.EPSILON to eliminate IEEE-754 floating-point representation drift.
 */
export function roundToPaisa(amount: number | null | undefined): number {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 0;
  }
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Converts a rupee float to an exact integer number of paise.
 */
export function toPaise(rupees: number | null | undefined): number {
  if (rupees === null || rupees === undefined || isNaN(rupees)) {
    return 0;
  }
  return Math.round((rupees + Number.EPSILON) * 100);
}

/**
 * Converts integer paise back to a 2-decimal rupee number.
 */
export function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}
```

### 4.2 Exact Tax Splitting Rule (Eliminating the 1-Paisa GST Discrepancy)
Under the current `GSTCalculator.calculateGST`:
```typescript
// CURRENT FLAWED LOGIC:
cgstAmount = Number((totalGST / 2).toFixed(2));
sgstAmount = Number((totalGST / 2).toFixed(2));
// When totalGST is 15.25: cgst = 7.63, sgst = 7.63 -> sum = 15.26 (1-paisa error!)
```

**Proposed Standardized Tax Splitting Rule:**
```typescript
// PROPOSED EXACT LOGIC:
const totalGSTPaisa = toPaise(totalGST);
const cgstPaisa = Math.floor(totalGSTPaisa / 2);
const sgstPaisa = totalGSTPaisa - cgstPaisa; // Remainder absorbs the odd paisa

const cgstAmount = fromPaise(cgstPaisa);
const sgstAmount = fromPaise(sgstPaisa);
// When totalGST is 15.25 (1525 paise):
// cgstPaisa = 762 (7.62), sgstPaisa = 763 (7.63) -> sum = 1525 paise (15.25) exactly!
```
**Result:** Debits and credits balance identically to 0 paise at the line level. There is never a need to introduce artificial rounding lines to force a voucher or Trial Balance to balance.

### 4.3 Line Totals vs Invoice Totals
1. **Line Level:**
   - $\text{Taxable Amount} = \text{roundToPaisa}(\text{Quantity} \times \text{UnitPrice} \times (1 - \text{DiscountPercent} / 100))$
   - $\text{Total GST} = \text{roundToPaisa}(\text{Taxable Amount} \times \text{GSTRate} / 100)$
   - $\text{Line Total} = \text{roundToPaisa}(\text{Taxable Amount} + \text{Total GST})$
2. **Document Level:**
   - $\text{Invoice Subtotal} = \sum \text{Line Taxable Amounts}$
   - $\text{Invoice Total CGST} = \sum \text{Line CGST Amounts}$
   - $\text{Invoice Total SGST} = \sum \text{Line SGST Amounts}$
   - $\text{Invoice Total IGST} = \sum \text{Line IGST Amounts}$
   - $\text{Gross Amount} = \text{Invoice Subtotal} + \text{Invoice Total GST}$
   - $\text{Net Amount} = \text{Gross Amount} - \text{TDS Amount}$

### 4.4 Financial Reports & Aggregation
In the new persistent ledger:
- Running account balances are accumulated in integer paise and divided by 100 for display.
- Trial Balance sums all debit lines in paise ($\sum \text{DebitPaise}$) and all credit lines in paise ($\sum \text{CreditPaise}$).
- Condition for balance: $\sum \text{DebitPaise} - \sum \text{CreditPaise} \equiv 0$.
- No heuristic adjustments or tolerances are permitted.

---

## 5. Preservation of Approved Invoice UI & Regression Safeguards

1. **Approved UI Preservation:** Because `TaxInvoice` and `ProformaInvoice` retain their existing field names, types (`Float`), and 2-decimal display formatting (`₹X,XX,XXX.XX`), zero changes occur in the UI rendering, printable PDF templates, ribbon totals, or client views.
2. **Regression Testing Plan:**
   - Test suite executing 1,000 randomized tax calculations comparing legacy output against the new `roundToPaisa` engine.
   - Verify that all existing confirmed Tax Invoices in the database evaluate to identical gross, net, and tax totals.
