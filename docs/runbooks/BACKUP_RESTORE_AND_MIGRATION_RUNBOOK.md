# FINLEDGER ERP — OPERATIONAL RUNBOOK
## Backup, Restore, and Historical Migration Validation

**System:** FinLedger ERP (KVJ Analytics)  
**Database:** MongoDB Atlas (Replica Set Cluster)  
**ORM / Data Layer:** Prisma 6.19.3  
**Framework:** Next.js (App Router, Turbopack)  
**Document Version:** 1.0.0 (Prompt 9 Baseline)  
**Date:** 22 October 2026  

---

## 1. Executive Summary & Non-Negotiable Safety Rules

This operational runbook provides step-by-step procedures for FinLedger ERP system administrators and finance team leads to execute database backups, restore verifications, and historical migration dry runs safely.

> [!CAUTION]
> **MANDATORY PRODUCTION SAFETY INVARIANTS:**
> 1. **MongoDB Atlas Production Isolation:** Under NO circumstances may any destructive restore test or backfill script be connected to the production database `billing_erp`.
> 2. **Explicit Isolated Test Environment:** All restore tests must use an explicitly designated isolated database (e.g. `billing_erp_test`). The system contains hardcoded programmatic guardrails (`assertSafeIsolatedTestTarget`) that strictly terminate execution if a restore target matches or contains production indicators.
> 3. **Zero Credential Exposure:** Database URIs, passwords, API secrets, and connection strings must NEVER be printed in logs, commit messages, or exported manifests. All services apply automatic credential redaction.
> 4. **Zero Writes during Dry Runs:** Historical migration evaluation must be 100% read-only (`zeroWritesConfirmed: true`). Never create artificial balancing entries or silent patches.

---

## 2. Implemented Capabilities vs. External Infrastructure Requirements

| Operational Domain | Implemented In-App Capability | External Infrastructure Required (Unconfigured / Pending) |
| :--- | :--- | :--- |
| **Database Backup** | 39-collection BSON-preserving export via `BackupRestoreService.createBackup()` with SHA-256 manifest and integrity check | Automated cron scheduler / CI/CD scheduled job or AWS EventBridge trigger |
| **Disaster Recovery (Local)** | Timestamped, checksummed archives stored in `prisma/backups/` with automated retention cleanup | Off-site S3 / GCS immutable backup bucket replication |
| **Restore Verification** | Isolated test restoration via `scripts/restore-and-verify.ts` with automated Trial Balance equilibrium checks | Secondary standalone staging MongoDB cluster for complete network isolation |
| **Migration Readiness** | Read-only dry-run engine (`scripts/dry-run-migration.ts`) classifying candidates across 12 domains (`READY`, `BLOCKED`, `REQUIRES_REVIEW`) | Formal CA / CFO review and business sign-off |
| **Audit Logging** | Immutable `AuditLog` records tracking backup completions, test restorations, and user actions | Centralized log ingestion (e.g. Datadog / CloudWatch) |

---

## 3. How to Create and Verify a Database Backup

### A. Via Administrative CLI
Run the automated backup script from the application root:
```bash
npm run backup:db
```
Or directly with `tsx`:
```bash
npx tsx scripts/backup-db.ts
```

### B. Via Authenticated Server Action
Authorized administrators (`role === "ADMIN"`) can trigger backups programmatically:
```typescript
import { triggerBackupAction } from "@/app/(dashboard)/admin/backup-actions";

const response = await triggerBackupAction();
if (response.success) {
  console.log("Backup Created:", response.data.backupId);
}
```

### C. What Happens During Backup
1. **Lock Acquisition:** Checks `isBackupRunning` to prevent concurrent duplicate snapshots.
2. **Atomic 39-Collection Extraction:** Queries all 39 Prisma models (including `JournalEntry`, `JournalLine`, `FiscalPeriod`, `AuditLog`, `Counter`, `BankAccount`, and all operational records).
3. **BSON Type Preservation:** Preserves native dates, ObjectIds, and numerical values.
4. **Staging File:** Writes to `prisma/backups/<backupId>.tmp.json`.
5. **SHA-256 Checksumming:** Computes cryptographic SHA-256 digest of the entire archive payload.
6. **Atomic Rename:** Renames `.tmp.json` to `<backupId>.json`.
7. **Manifest Generation:** Creates `<backupId>.manifest.json` containing record counts, file size, checksum, and accounting audit summary.
8. **Immediate Integrity Read-Back:** Reads the newly written file from disk and recalculates the SHA-256 hash. If it does not match, the backup is marked `FAILED` and an alert is raised.

---

## 4. How to Verify Restored Data in an Isolated Recovery Environment

> [!IMPORTANT]
> The restore process is ONLY permitted against isolated databases whose connection string clearly contains `_test` (e.g. `billing_erp_test`). Any attempt to point to `billing_erp` triggers `ProductionRestoreBlockedError` and halts immediately.

### A. Executing the Restore Verification CLI
Run the restore verification command:
```bash
npm run restore:verify -- --confirm-destructive-restore
```
To restore a specific backup ID:
```bash
npx tsx scripts/restore-and-verify.ts --backup-id <backupId> --confirm-destructive-restore
```

### B. Automated Verification Checks Executed
The restore engine automatically executes and asserts:
1. **Target DB Safety Check:** Validates destination is not production and contains `_test`.
2. **Manifest & Checksum Verification:** Recalculates SHA-256 before touching the database.
3. **Dependency-Safe Purge:** Disconnects self-referencing foreign keys (`reversalOfId`, `parentId`) before purging test data.
4. **Topological Order Restore:** Restores masters first, then transactions, then journal entries and journal lines.
5. **Foreign Key Referential Coherence:** Asserts zero orphan lines (`JournalLine.entryId` matches valid `JournalEntry.id`).
6. **Double-Entry Trial Balance Equilibrium:** Executes `PersistentLedgerReportingService.getTrialBalance()` on the restored test database and asserts $\text{Debit} \equiv \text{Credit}$ ($\text{difference} = 0.00$).
7. **Audit & Fiscal Integrity:** Confirms audit log and fiscal period configuration recovery.

---

## 5. Troubleshooting & Failure Recovery

### Problem 1: Backup Fails with "A backup operation is currently in progress"
- **Cause:** A previous backup was interrupted or another administrator is creating a backup.
- **Resolution:** Verify if `prisma/backups/*.tmp.json` exists. If the previous process crashed, restart the server process to release the in-memory lock. The retention cleaner automatically purges `.tmp.json` files older than 1 hour.

### Problem 2: Restore Blocked by "FATAL SAFETY BLOCK: Restore target points to PRODUCTION database"
- **Cause:** The provided `DATABASE_URL` or `--target-url` points to `billing_erp` without `_test`.
- **Resolution:** This is a safety feature, not a bug. Change the target connection string to point to `billing_erp_test` before executing any restore test.

### Problem 3: Checksum Mismatch (`BackupIntegrityCorruptError`)
- **Cause:** The backup file was modified, truncated, or experienced disk corruption after creation.
- **Resolution:** Do NOT restore from a corrupt backup. Use `npm run restore:verify -- --backup-id <previousValidId>` to restore the previous known-good backup.

---

## 6. How to Run the Historical Migration Dry Run

The migration dry run analyzes historical operational records created before the persistent ledger was implemented, without making any modifications to the database (`zeroWritesConfirmed: true`).

### A. Running the CLI Tool
```bash
npm run migrate:dry-run
```

### B. Running via Server Action
```typescript
import { runHistoricalDryRunAction } from "@/app/(dashboard)/admin/backup-actions";

const result = await runHistoricalDryRunAction({ financialYear: "2025-26" });
console.log(result.data.statusBreakdown);
```

### C. Interpreting Candidate Classifications

1. **`READY`**:
   - The document is valid and complete.
   - All dates and monetary figures conform to business rules.
   - Accounts map cleanly to canonical Chart of Accounts identities.
   - Mathematically balanced in integer paise ($\sum Dr \equiv \sum Cr$).
   - Can be safely journalized during future backfill.

2. **`BLOCKED`**:
   - Critical inconsistency preventing migration.
   - *Examples:* Missing customer/vendor master record; non-accounting status (e.g. `DRAFT` or `CANCELLED` invoices trying to recognize sales); zero or negative gross amount; self-transfer bank transfer.
   - *Action:* Must be corrected in source data before migration.

3. **`REQUIRES_REVIEW`**:
   - Mathematical rounding variance (e.g. fraction-of-a-paise tax rounding mismatch).
   - Unlinked TDS deduction or missing challan reference.
   - Mismatched payment splits (e.g. loan principal + interest $\neq$ total disbursement).
   - *Action:* Requires Chartered Accountant / finance officer review to determine accounting treatment.

---

## 7. The 18 Historical Reconciliation Gates

Before any production cutover or backfill can occur, all 18 gates must be evaluated:

| Gate # | Name | Evaluation Criteria | Current Status |
| :---: | :--- | :--- | :---: |
| **1** | Backup Integrity & Restore Verification | Checksummed full backup restored and verified in isolated test DB | **PASSED** |
| **2** | Source-to-Ledger Coverage Analysis | Coverage report executed across 10 source domains | **PASSED** |
| **3** | Missing & Duplicate Journal Audit | Dry run identifies zero unresolvable blocked candidates | **PASSED** |
| **4** | Journal Relational Integrity | Zero orphan journal lines; foreign keys intact | **PASSED** |
| **5** | Trial Balance Equilibrium | Total Debits === Total Credits to zero paise ($\text{Diff} = 0.00$) | **PASSED** |
| **6** | Profit & Loss Nominal Classification | Balance sheet accounts 100% excluded from P&L | **PASSED** |
| **7** | Balance Sheet Accounting Equation | Total Assets === Total Liabilities + Total Equity | **PASSED** |
| **8** | Customer Receivables Reconciliation | Open invoice balance due reconciles to Trade Receivables GL | **PASSED** |
| **9** | Vendor Payables Reconciliation | Open vendor bills reconcile to Trade Payables GL | **PASSED** |
| **10** | Bank Account Balances Reconciliation | Bank balances reconcile to bank account ledger lines | **PASSED** |
| **11** | Statutory Tax Balances Reconciliation | Output GST, Input ITC, and TDS accounts reconcile | **PASSED** |
| **12** | Fixed Asset NBV Reconciliation | Gross Cost - Accumulated Depreciation === Net Book Value | **PASSED** |
| **13** | Loan Principal Balance Tracking | Outstanding principal = Drawdowns - Principal Repayments | **PASSED** |
| **14** | Opening Balances & Suspense Neutrality | Zero unexplained migration suspense balances | **PASSED** |
| **15** | Audit Trail & Fiscal Period Locking | Fiscal period boundaries and immutable audit logs active | **PASSED** |
| **16** | Ambiguous Historical Records Audit | Zero unaddressed ambiguous payment splits or orphan payments | **PASSED** |
| **17** | CA / Finance Executive Sign-Off | Written approval from KVJ Analytics CFO / CA | **UNVERIFIED** |
| **18** | Production Rollout & Rollback Plan | Scheduled maintenance window and rollback strategy approved | **UNVERIFIED** |

> [!NOTE]
> Because Gates 17 and 18 require manual business review and executive scheduling, the overall system readiness status is **`NOT_READY`** by design. The system will NOT allow production cutover until human sign-off is completed.

---

## 8. Rollback and Contingency Plan

If any future migration or backfill step encounters unrecoverable errors:
1. **Immediate Freeze:** Stop all backfill scripts immediately.
2. **Database State Verification:** Query `JournalEntry.count({ where: { idempotencyKey: { startsWith: "MIGRATE:" } } })`.
3. **Idempotent Removal (Rollback):**
   ```typescript
   // Target isolated test DB only
   await prisma.journalLine.deleteMany({
     where: { entry: { idempotencyKey: { startsWith: "MIGRATE:" } } }
   });
   await prisma.journalEntry.deleteMany({
     where: { idempotencyKey: { startsWith: "MIGRATE:" } }
   });
   ```
4. **Full Snapshot Restore (Disaster Recovery):**
   In the event of database corruption, restore from the pre-migration backup snapshot using `npm run restore:verify`.
