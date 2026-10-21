# FINLEDGER ERP — SCHEMA CHANGE REGISTER

**Organization:** KVJ Analytics (Indian IT & Analytics Services)  
**System:** FinLedger ERP  
**Document Type:** Formal Schema & Data Model Change Register  
**Baseline Date:** 21 October 2026  
**Document Status:** PROPOSED & FROZEN (DESIGN-ONLY — PROMPT 3)  

---

## 1. Executive Summary

This register documents all proposed database schema modifications, new collections, index definitions, and foreign-key upgrades required to implement FinLedger's persistent General Ledger, atomic numbering, and audit compliance.

> [!IMPORTANT]
> **Strict Non-Destructive Policy:**
> In accordance with Prompt 3 non-negotiable rules, all schema changes are additive or backward-compatible extensions. No existing financial fields or collections will be deleted, renamed, or altered in data type.

---

## 2. Summary of Proposed Changes

| Change ID | Target Model / Collection | Change Category | Description | Impact Level |
|-----------|---------------------------|-----------------|-------------|--------------|
| `SCH-001` | `JournalEntry` | **New Model** | Persistent double-entry journal voucher header | Core Addition |
| `SCH-002` | `JournalLine` | **New Model** | Individual debit/credit lines belonging to a journal entry | Core Addition |
| `SCH-003` | `FiscalPeriod` | **New Model** | Accounting period boundaries, lock status & close metadata | Control Addition |
| `SCH-004` | `AuditLog` | **New Model** | Immutable MCA/Companies Act Rule 11(g) audit trail | Statutory Addition |
| `SCH-005` | `Counter` | **New Model** | Atomic sequential numbering counter for concurrency safety | Infrastructure |
| `SCH-006` | `BankTransfer` | **Field Upgrade** | Add optional `fromBankAccountId` and `toBankAccountId` foreign keys | Backward-Compatible |
| `SCH-007` | `InvoicePayment` | **Field Upgrade** | Add optional `bankAccountId` relation to track destination bank | Backward-Compatible |
| `SCH-008` | `ExpensePayment` | **Index Addition** | Add index on `paymentDate` and `bankAccountId` for fast statement reconciliation | Performance |

---

## 3. Detailed Specifications of New Models

### 3.1 Model: `JournalEntry` (Change ID: `SCH-001`)

```prisma
enum JournalEntryType {
  SALES
  PURCHASE
  RECEIPT
  PAYMENT
  CONTRA
  JOURNAL
  OPENING
  CLOSING
  REVERSAL
  ADJUSTMENT
}

enum PostingStatus {
  POSTED
  REVERSED
}

enum JournalSourceType {
  TAX_INVOICE
  INVOICE_PAYMENT
  EXPENSE
  EXPENSE_PAYMENT
  BANK_TRANSFER
  OPENING_BALANCE
  ASSET_DEPRECIATION
  ASSET_DISPOSAL
  LOAN_RECEIPT
  LOAN_REPAYMENT
  GST_SETTLEMENT
  TDS_DEPOSIT
  PERIOD_CLOSING
  MANUAL_ADJUSTMENT
}

model JournalEntry {
  id              String            @id @default(auto()) @map("_id") @db.ObjectId
  entryNumber     String            @unique
  entryType       JournalEntryType
  accountingDate  DateTime
  financialYear   String            // e.g. "2026-27"
  
  fiscalPeriodId  String?           @db.ObjectId
  fiscalPeriod    FiscalPeriod?     @relation(fields: [fiscalPeriodId], references: [id])

  sourceType      JournalSourceType
  sourceId        String            // ObjectId of source document
  sourceNumber    String?           // e.g. "KVJ/B2B/26-27/001"
  
  narration       String
  reference       String?

  totalDebit      Float
  totalCredit     Float
  isBalanced      Boolean           @default(true)
  status          PostingStatus     @default(POSTED)

  postedAt        DateTime          @default(now())
  postedBy        String?           @db.ObjectId
  authorizedBy    String?           @db.ObjectId

  idempotencyKey  String            @unique

  reversalOfId    String?           @unique @db.ObjectId
  reversalOf      JournalEntry?     @relation("EntryReversal", fields: [reversalOfId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  reversedBy      JournalEntry?     @relation("EntryReversal")
  reversalReason  String?
  reversedAt      DateTime?

  lines           JournalLine[]

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([accountingDate])
  @@index([financialYear])
  @@index([sourceType, sourceId])
  @@index([status])
}
```

- **Evidence & Need:** Required to eliminate in-memory dynamic voucher reconstruction in `accounting-engine.service.ts`.
- **Dependencies:** None.
- **Risks:** None to existing data; entirely new collection.
- **Acceptance Criteria:** Successfully stores balanced entries; rejects duplicate idempotency keys.

---

### 3.2 Model: `JournalLine` (Change ID: `SCH-002`)

```prisma
model JournalLine {
  id              String            @id @default(auto()) @map("_id") @db.ObjectId
  
  entryId         String            @db.ObjectId
  entry           JournalEntry      @relation(fields: [entryId], references: [id], onDelete: Cascade)
  
  lineNumber      Int
  
  accountId       String
  accountCode     String?
  accountName     String
  financialType   String            // ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
  statementGroup  String
  normalBalance   String            // DEBIT, CREDIT

  debit           Float             @default(0)
  credit          Float             @default(0)

  particulars     String?

  entityType      String?           // CUSTOMER, VENDOR, EMPLOYEE, BANK, LOAN, CATEGORY
  entityId        String?
  
  bankAccountId   String?           @db.ObjectId
  bankAccount     BankAccount?      @relation(fields: [bankAccountId], references: [id])

  createdAt       DateTime          @default(now())

  @@index([entryId])
  @@index([accountId])
  @@index([entityType, entityId])
  @@index([bankAccountId])
}
```

- **Evidence & Need:** Stores individual accounting legs. Enables point-in-time account ledger generation in sub-millisecond query times.
- **Dependencies:** `JournalEntry`, `BankAccount`.
- **Risks:** Cascade delete enabled from `JournalEntry` only for uncommitted or staging rollback.
- **Acceptance Criteria:** Queries for `accountId` with date ranges return chronological ledger statements instantly.

---

### 3.3 Model: `FiscalPeriod` (Change ID: `SCH-003`)

```prisma
model FiscalPeriod {
  id              String            @id @default(auto()) @map("_id") @db.ObjectId
  financialYear   String            // "2026-27"
  periodName      String            // "April 2026", "FY 2026-27"
  periodCode      String            @unique // "2026-04", "FY-2026-27"
  startDate       DateTime
  endDate         DateTime
  isLocked        Boolean           @default(false)
  lockedAt        DateTime?
  lockedBy        String?           @db.ObjectId
  lockReason      String?

  entries         JournalEntry[]

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([financialYear])
  @@index([isLocked])
}
```

- **Evidence & Need:** Prevents retroactive distortion of filed GST returns and statutory audits by locking closed periods.
- **Dependencies:** None.
- **Risks:** None.

---

### 3.4 Model: `AuditLog` (Change ID: `SCH-004`)

```prisma
model AuditLog {
  id              String            @id @default(auto()) @map("_id") @db.ObjectId
  actorId         String            @db.ObjectId
  actorName       String
  actorEmail      String
  action          String            // "POST_INVOICE", "CANCEL_INVOICE", "REVERSE_ENTRY", "MANUAL_ADJUSTMENT"
  entity          String            // "TaxInvoice", "JournalEntry", "Expense"
  entityId        String
  timestamp       DateTime          @default(now())
  ipAddress       String?
  userAgent       String?
  
  beforeState     Json?
  afterState      Json?
  changeSummary   String?
  reason          String?

  @@index([entity, entityId])
  @@index([actorId])
  @@index([timestamp])
}
```

- **Evidence & Need:** Required by Ministry of Corporate Affairs (MCA) Audit Trail Notification under the Companies Act, 2013.
- **Dependencies:** None.
- **Risks:** None.

---

### 3.5 Model: `Counter` (Change ID: `SCH-005`)

```prisma
model Counter {
  id              String            @id @map("_id") // Prefix key, e.g. "INV-B2B-26-27", "JV-202627"
  sequence        Int               @default(0)
  updatedAt       DateTime          @updatedAt
}
```

- **Evidence & Need:** Current `generateFormattedInvoiceNumber` in `lib/invoice-number.ts` uses `findMany + maxSeq`, which suffers from race condition collisions under concurrent requests.
- **Dependencies:** None.
- **Usage:** Atomic increment using MongoDB driver `findOneAndUpdate({ _id: prefix }, { $inc: { sequence: 1 } }, { upsert: true, returnDocument: 'after' })`.
- **Acceptance Criteria:** Concurrent requests reserve strictly unique, consecutive sequence numbers.

---

## 4. Upgrades to Existing Models (Non-Breaking)

### 4.1 Upgrade to `BankTransfer` (Change ID: `SCH-006`)
Add optional foreign keys to link transfers to real `BankAccount` records while preserving legacy string fields:

```prisma
model BankTransfer {
  id                  String        @id @default(auto()) @map("_id") @db.ObjectId
  date                DateTime      @default(now())
  
  // Legacy string fields preserved for backward compatibility
  fromAccount         String
  toAccount           String
  
  // Upgraded relational fields
  fromBankAccountId   String?       @db.ObjectId
  fromBankAccount     BankAccount?  @relation("TransferSourceBank", fields: [fromBankAccountId], references: [id])
  
  toBankAccountId     String?       @db.ObjectId
  toBankAccount       BankAccount?  @relation("TransferDestBank", fields: [toBankAccountId], references: [id])

  amount              Float
  reference           String?
  description         String?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
}
```

### 4.2 Upgrade to `InvoicePayment` (Change ID: `SCH-007`)
Add optional `bankAccountId` relation so receipts link directly to the target bank account:

```prisma
// In model InvoicePayment:
bankAccountId       String?       @db.ObjectId
bankAccount         BankAccount?  @relation(fields: [bankAccountId], references: [id])
```

---

## 5. Verification & Rollback Protocols

1. **Prisma Generation:** Execute `npx prisma generate` after modifying schema in implementation phase to verify type safety.
2. **MongoDB Atlas Index Verification:** Prisma will create indexes automatically upon `prisma db push` or during initial connection.
3. **Rollback Safety:** If required, all new collections can be removed without affecting existing operational models or production data.
