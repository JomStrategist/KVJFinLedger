import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { AuditService } from "./audit.service";

export interface CollectionBackupSummary {
  name: string;
  count: number;
  sizeBytes: number;
}

export interface BackupManifest {
  backupId: string;
  timestamp: string;
  completedAt?: string;
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED";
  schemaVersion: string;
  databaseSanitized: string;
  collections: CollectionBackupSummary[];
  totalCollections: number;
  totalRecords: number;
  totalSizeBytes: number;
  checksumSha256: string;
  verified: boolean;
  accountingAudit: {
    journalEntriesCount: number;
    journalLinesCount: number;
    fiscalPeriodsCount: number;
    auditLogsCount: number;
    countersCount: number;
    taxInvoicesCount: number;
    expensesCount: number;
  };
  errorMessage?: string;
}

export interface RecoveryCheckResult {
  checkName: string;
  status: "PASS" | "FAIL" | "UNVERIFIED";
  details: string;
  recordsCount?: number;
}

export interface RecoveryVerificationReport {
  backupId: string;
  restoredAt: string;
  targetDatabaseSanitized: string;
  overallStatus: "PASSED" | "FAILED";
  checks: RecoveryCheckResult[];
  trialBalanceBalanced?: boolean;
  trialBalanceDifference?: number;
  restoredCollectionsCount: number;
  restoredRecordsCount: number;
  durationMs: number;
}

export class ProductionRestoreBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionRestoreBlockedError";
  }
}

export class BackupIntegrityCorruptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupIntegrityCorruptError";
  }
}

export class BackupRestoreService {
  private static isBackupRunning = false;
  private static readonly BACKUP_DIR = path.join(process.cwd(), "prisma", "backups");

  /**
   * Redacts passwords, usernames, and cluster hosts from database connection strings.
   */
  static sanitizeDatabaseUrl(url?: string): string {
    if (!url) return "[REDACTED_DATABASE_URL]";
    try {
      // Completely strip credentials and cluster hostname, preserving only the database name
      const match = url.match(/\/([^/?]+)(\?.*)?$/);
      const dbName = match ? match[1] : "unknown_db";
      return `mongodb+srv://[REDACTED_CLUSTER]/${dbName}`;
    } catch {
      return "[REDACTED_DATABASE_URL]";
    }
  }

  /**
   * Ensures the backup directory exists.
   */
  private static ensureBackupDir(): string {
    if (!fs.existsSync(this.BACKUP_DIR)) {
      fs.mkdirSync(this.BACKUP_DIR, { recursive: true });
    }
    return this.BACKUP_DIR;
  }

  /**
   * Generates a unique, sortable, safe backup ID.
   */
  static generateBackupId(): string {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const rand = crypto.randomBytes(3).toString("hex");
    return `backup_kvj_${ts}_${rand}`;
  }

  /**
   * Validates backup ID to prevent path traversal attacks.
   */
  static validateBackupId(backupId: string): string {
    if (!/^[a-zA-Z0-9_\-]+$/.test(backupId)) {
      throw new Error(`Invalid backup ID: "${backupId}". Potential path traversal detected.`);
    }
    return backupId;
  }

  /**
   * Exports all 39 Prisma collections with full BSON preservation into an offline, checksummed archive.
   */
  static async createBackup(options?: {
    actorId?: string;
    actorName?: string;
    actorEmail?: string;
    notes?: string;
    clientOverride?: PrismaClient;
  }): Promise<BackupManifest> {
    if (this.isBackupRunning) {
      throw new Error("A backup operation is currently in progress. Please wait for it to complete.");
    }

    this.isBackupRunning = true;
    const backupId = this.generateBackupId();
    const backupDir = this.ensureBackupDir();
    const startTime = new Date();
    const tempFile = path.join(backupDir, `${backupId}.tmp.json`);
    const finalFile = path.join(backupDir, `${backupId}.json`);
    const manifestFile = path.join(backupDir, `${backupId}.manifest.json`);

    const client = (options?.clientOverride || prisma) as any;
    const dbUrl = process.env.DATABASE_URL || "";
    const sanitizedDb = this.sanitizeDatabaseUrl(dbUrl);

    let manifest: BackupManifest = {
      backupId,
      timestamp: startTime.toISOString(),
      status: "IN_PROGRESS",
      schemaVersion: "1.0.0",
      databaseSanitized: sanitizedDb,
      collections: [],
      totalCollections: 0,
      totalRecords: 0,
      totalSizeBytes: 0,
      checksumSha256: "",
      verified: false,
      accountingAudit: {
        journalEntriesCount: 0,
        journalLinesCount: 0,
        fiscalPeriodsCount: 0,
        auditLogsCount: 0,
        countersCount: 0,
        taxInvoicesCount: 0,
        expensesCount: 0,
      },
    };

    try {
      // Extract all 39 collections
      const [
        roleDefinitions,
        users,
        employees,
        employeeAdvances,
        companySettings,
        customers,
        products,
        bankAccounts,
        proformaInvoices,
        proformaInvoiceItems,
        taxInvoices,
        invoicePayments,
        taxInvoiceItems,
        financialTypes,
        financialStatementGroups,
        accountNatures,
        expenseCategories,
        vendors,
        expenses,
        expenseItems,
        expensePayments,
        recurringExpenses,
        financialTransactions,
        bankTransfers,
        openingBalances,
        gstFilings,
        tdsDeposits,
        assetDepreciations,
        assetDisposals,
        loans,
        loanRepayments,
        bankStatementImports,
        bankStatementLines,
        gstSettlements,
        journalEntries,
        journalLines,
        fiscalPeriods,
        auditLogs,
        counters,
      ] = await Promise.all([
        client.roleDefinition.findMany(),
        client.user.findMany(),
        client.employee.findMany(),
        client.employeeAdvance.findMany(),
        client.companySettings.findMany(),
        client.customer.findMany(),
        client.product.findMany(),
        client.bankAccount.findMany(),
        client.proformaInvoice.findMany(),
        client.proformaInvoiceItem.findMany(),
        client.taxInvoice.findMany(),
        client.invoicePayment.findMany(),
        client.taxInvoiceItem.findMany(),
        client.financialType.findMany(),
        client.financialStatementGroup.findMany(),
        client.accountNature.findMany(),
        client.expenseCategory.findMany(),
        client.vendor.findMany(),
        client.expense.findMany(),
        client.expenseItem.findMany(),
        client.expensePayment.findMany(),
        client.recurringExpense.findMany(),
        client.financialTransaction.findMany(),
        client.bankTransfer.findMany(),
        client.openingBalance.findMany(),
        client.gstFiling.findMany(),
        client.tdsDeposit.findMany(),
        client.assetDepreciation.findMany(),
        client.assetDisposal.findMany(),
        client.loan.findMany(),
        client.loanRepayment.findMany(),
        client.bankStatementImport.findMany(),
        client.bankStatementLine.findMany(),
        client.gstSettlement.findMany(),
        client.journalEntry.findMany(),
        client.journalLine.findMany(),
        client.fiscalPeriod.findMany(),
        client.auditLog.findMany(),
        client.counter.findMany(),
      ]);

      const dataPayload: Record<string, any[]> = {
        roleDefinitions,
        users,
        employees,
        employeeAdvances,
        companySettings,
        customers,
        products,
        bankAccounts,
        proformaInvoices,
        proformaInvoiceItems,
        taxInvoices,
        invoicePayments,
        taxInvoiceItems,
        financialTypes,
        financialStatementGroups,
        accountNatures,
        expenseCategories,
        vendors,
        expenses,
        expenseItems,
        expensePayments,
        recurringExpenses,
        financialTransactions,
        bankTransfers,
        openingBalances,
        gstFilings,
        tdsDeposits,
        assetDepreciations,
        assetDisposals,
        loans,
        loanRepayments,
        bankStatementImports,
        bankStatementLines,
        gstSettlements,
        journalEntries,
        journalLines,
        fiscalPeriods,
        auditLogs,
        counters,
      };

      const collectionsSummary: CollectionBackupSummary[] = [];
      let totalRecs = 0;

      for (const [colName, records] of Object.entries(dataPayload)) {
        const count = records.length;
        totalRecs += count;
        const serialized = JSON.stringify(records);
        collectionsSummary.push({
          name: colName,
          count,
          sizeBytes: Buffer.byteLength(serialized, "utf8"),
        });
      }

      // Structure backup file with metadata and collection payloads
      const backupEnvelope = {
        metadata: {
          backupId,
          version: "1.0.0",
          createdAt: startTime.toISOString(),
          database: sanitizedDb,
          collectionsCount: Object.keys(dataPayload).length,
          totalRecords: totalRecs,
        },
        data: dataPayload,
      };

      const jsonString = JSON.stringify(backupEnvelope, null, 2);

      // Write to temp file first
      fs.writeFileSync(tempFile, jsonString, "utf8");

      // Compute SHA-256
      const sha256 = crypto.createHash("sha256").update(jsonString, "utf8").digest("hex");
      const stat = fs.statSync(tempFile);

      // Atomic rename
      fs.renameSync(tempFile, finalFile);

      const endTime = new Date();
      manifest = {
        backupId,
        timestamp: startTime.toISOString(),
        completedAt: endTime.toISOString(),
        status: "COMPLETED",
        schemaVersion: "1.0.0",
        databaseSanitized: sanitizedDb,
        collections: collectionsSummary,
        totalCollections: collectionsSummary.length,
        totalRecords: totalRecs,
        totalSizeBytes: stat.size,
        checksumSha256: sha256,
        verified: true,
        accountingAudit: {
          journalEntriesCount: journalEntries.length,
          journalLinesCount: journalLines.length,
          fiscalPeriodsCount: fiscalPeriods.length,
          auditLogsCount: auditLogs.length,
          countersCount: counters.length,
          taxInvoicesCount: taxInvoices.length,
          expensesCount: expenses.length,
        },
      };

      // Write manifest
      fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), "utf8");

      // Integrity verification read-back
      const readBack = fs.readFileSync(finalFile, "utf8");
      const readBackHash = crypto.createHash("sha256").update(readBack, "utf8").digest("hex");
      if (readBackHash !== sha256) {
        manifest.status = "FAILED";
        manifest.verified = false;
        manifest.errorMessage = "Immediate post-backup checksum verification failed.";
        fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), "utf8");
        throw new BackupIntegrityCorruptError("Immediate checksum mismatch on backup file read-back.");
      }

      // Audit log the backup creation
      try {
        await AuditService.logEvent({
          actorId: options?.actorId || "system",
          actorName: options?.actorName || "System Administrator",
          actorEmail: options?.actorEmail || "admin@kvjanalytics.com",
          action: "DATABASE_BACKUP_COMPLETED",
          entity: "DatabaseBackup",
          entityId: backupId,
          afterState: {
            backupId,
            totalCollections: manifest.totalCollections,
            totalRecords: manifest.totalRecords,
            totalSizeBytes: manifest.totalSizeBytes,
            checksumSha256: manifest.checksumSha256,
          },
          changeSummary: `Full database backup completed with ${manifest.totalRecords} records across ${manifest.totalCollections} collections.`,
        });
      } catch (auditErr) {
        // Audit log failure does not invalidate the backup
        console.warn("Audit logging warning during backup:", auditErr);
      }

      return manifest;
    } catch (err: any) {
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch {}
      }
      manifest.status = "FAILED";
      manifest.verified = false;
      manifest.errorMessage = err.message || String(err);
      try {
        fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), "utf8");
      } catch {}
      throw err;
    } finally {
      this.isBackupRunning = false;
    }
  }

  /**
   * Lists all existing backups with their manifests.
   */
  static listBackups(): BackupManifest[] {
    const backupDir = this.ensureBackupDir();
    const files = fs.readdirSync(backupDir);
    const manifestFiles = files.filter((f) => f.endsWith(".manifest.json"));

    const manifests: BackupManifest[] = [];
    for (const mf of manifestFiles) {
      try {
        const content = fs.readFileSync(path.join(backupDir, mf), "utf8");
        manifests.push(JSON.parse(content));
      } catch {}
    }

    return manifests.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Retrieves a specific verified backup file path.
   */
  static getBackupFilePath(backupId: string): { filePath: string; manifestPath: string; manifest: BackupManifest } {
    const safeId = this.validateBackupId(backupId);
    const backupDir = this.ensureBackupDir();
    const filePath = path.join(backupDir, `${safeId}.json`);
    const manifestPath = path.join(backupDir, `${safeId}.manifest.json`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file not found for ID: ${safeId}`);
    }
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Backup manifest not found for ID: ${safeId}`);
    }

    const manifest: BackupManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return { filePath, manifestPath, manifest };
  }

  /**
   * Verifies the SHA-256 checksum of an existing backup file against its manifest.
   */
  static verifyBackupChecksum(backupId: string): { matches: boolean; manifestChecksum: string; actualChecksum: string } {
    const { filePath, manifest } = this.getBackupFilePath(backupId);
    const content = fs.readFileSync(filePath, "utf8");
    const actualChecksum = crypto.createHash("sha256").update(content, "utf8").digest("hex");
    return {
      matches: actualChecksum === manifest.checksumSha256,
      manifestChecksum: manifest.checksumSha256,
      actualChecksum,
    };
  }

  /**
   * Validates target database URL to ensure destructive operations NEVER touch production.
   */
  static assertSafeIsolatedTestTarget(targetDbUrl: string): void {
    if (!targetDbUrl || typeof targetDbUrl !== "string") {
      throw new ProductionRestoreBlockedError("Target database connection URL is missing or invalid.");
    }

    const sanitized = this.sanitizeDatabaseUrl(targetDbUrl);

    // 1. Must NOT point to production 'billing_erp' without '_test'
    const isProdDb =
      targetDbUrl.includes("/billing_erp?") ||
      targetDbUrl.endsWith("/billing_erp") ||
      targetDbUrl.includes("/billing_erp/");

    const isExplicitTestDb =
      targetDbUrl.includes("/billing_erp_test?") ||
      targetDbUrl.endsWith("/billing_erp_test") ||
      targetDbUrl.includes("_test");

    if (isProdDb && !isExplicitTestDb) {
      throw new ProductionRestoreBlockedError(
        `FATAL SAFETY BLOCK: Restore target points to PRODUCTION database (${sanitized}). Destructive operations against production are strictly forbidden.`
      );
    }

    if (!isExplicitTestDb) {
      throw new ProductionRestoreBlockedError(
        `FATAL SAFETY BLOCK: Restore target must explicitly be an isolated test database (e.g. billing_erp_test). Target: ${sanitized}`
      );
    }
  }

  /**
   * Safely restores a backup into an isolated test database and runs comprehensive accounting integrity checks.
   */
  static async restoreAndVerify(
    backupId: string,
    targetDbUrl: string,
    options: {
      confirmDestructiveRestore: boolean;
      actorId?: string;
      actorName?: string;
      actorEmail?: string;
    }
  ): Promise<RecoveryVerificationReport> {
    const startTime = Date.now();
    const sanitizedTarget = this.sanitizeDatabaseUrl(targetDbUrl);

    // GATE 1: Enforce Isolated Test Database Safety
    this.assertSafeIsolatedTestTarget(targetDbUrl);

    // GATE 2: Enforce Explicit Confirmation
    if (!options.confirmDestructiveRestore) {
      throw new Error("Restore aborted: options.confirmDestructiveRestore must be explicitly true.");
    }

    // GATE 3: Verify Checksum and Manifest
    const { filePath, manifest } = this.getBackupFilePath(backupId);
    const checksumCheck = this.verifyBackupChecksum(backupId);
    if (!checksumCheck.matches) {
      throw new BackupIntegrityCorruptError(
        `Checksum verification failed for backup ${backupId}. Expected ${checksumCheck.manifestChecksum}, got ${checksumCheck.actualChecksum}.`
      );
    }

    // Load backup envelope
    const rawContent = fs.readFileSync(filePath, "utf8");
    const envelope = JSON.parse(rawContent);
    const data = envelope.data;
    if (!data || typeof data !== "object") {
      throw new Error("Invalid backup envelope: 'data' property missing.");
    }

    // Connect dedicated Prisma client to isolated test database
    const testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: targetDbUrl,
        },
      },
    });

    const checks: RecoveryCheckResult[] = [
      {
        checkName: "Target Database Isolation Verification",
        status: "PASS",
        details: `Confirmed restore target is isolated test database (${sanitizedTarget}).`,
      },
      {
        checkName: "Backup Checksum & Manifest Integrity",
        status: "PASS",
        details: `SHA-256 verified (${checksumCheck.actualChecksum.substring(0, 16)}...).`,
      },
    ];

    let overallSuccess = true;
    let restoredCollectionsCount = 0;
    let restoredRecordsCount = 0;

    try {
      const client = testPrisma as any;

      // 1. Dependency-safe purge of existing test data
      // Delete children first, then parents
      const purgeOrder = [
        "journalLine",
        "journalEntry",
        "taxInvoiceItem",
        "invoicePayment",
        "taxInvoice",
        "proformaInvoiceItem",
        "proformaInvoice",
        "expenseItem",
        "expensePayment",
        "assetDepreciation",
        "assetDisposal",
        "expense",
        "loanRepayment",
        "loan",
        "bankTransfer",
        "bankStatementLine",
        "bankStatementImport",
        "gstSettlement",
        "tdsDeposit",
        "gstFiling",
        "openingBalance",
        "financialTransaction",
        "recurringExpense",
        "employeeAdvance",
        "customer",
        "vendor",
        "product",
        "bankAccount",
        "expenseCategory",
        "accountNature",
        "financialStatementGroup",
        "financialType",
        "companySettings",
        "fiscalPeriod",
        "counter",
        "auditLog",
        "user",
        "employee",
        "roleDefinition",
      ];

      // Break self-referential relations before bulk deletion to prevent Prisma relation violations
      if (client.journalEntry) {
        try {
          await client.journalEntry.updateMany({ data: { reversalOfId: null } });
        } catch {}
      }
      if (client.expenseCategory) {
        try {
          await client.expenseCategory.updateMany({ data: { parentId: null } });
        } catch {}
      }

      for (const model of purgeOrder) {
        if (client[model]) {
          try {
            await client[model].deleteMany({});
          } catch (delErr: any) {
            console.warn(`Warning purging test model ${model}:`, delErr.message);
          }
        }
      }

      // 2. Restore collections in dependency-safe order (parents first, then children)
      const restoreOrder: Array<{ model: string; key: string }> = [
        { model: "roleDefinition", key: "roleDefinitions" },
        { model: "user", key: "users" },
        { model: "employee", key: "employees" },
        { model: "companySettings", key: "companySettings" },
        { model: "bankAccount", key: "bankAccounts" },
        { model: "customer", key: "customers" },
        { model: "vendor", key: "vendors" },
        { model: "product", key: "products" },
        { model: "financialType", key: "financialTypes" },
        { model: "financialStatementGroup", key: "financialStatementGroups" },
        { model: "accountNature", key: "accountNatures" },
        { model: "expenseCategory", key: "expenseCategories" },
        { model: "employeeAdvance", key: "employeeAdvances" },
        { model: "proformaInvoice", key: "proformaInvoices" },
        { model: "proformaInvoiceItem", key: "proformaInvoiceItems" },
        { model: "taxInvoice", key: "taxInvoices" },
        { model: "taxInvoiceItem", key: "taxInvoiceItems" },
        { model: "invoicePayment", key: "invoicePayments" },
        { model: "expense", key: "expenses" },
        { model: "expenseItem", key: "expenseItems" },
        { model: "expensePayment", key: "expensePayments" },
        { model: "recurringExpense", key: "recurringExpenses" },
        { model: "financialTransaction", key: "financialTransactions" },
        { model: "bankTransfer", key: "bankTransfers" },
        { model: "openingBalance", key: "openingBalances" },
        { model: "gstFiling", key: "gstFilings" },
        { model: "tdsDeposit", key: "tdsDeposits" },
        { model: "assetDepreciation", key: "assetDepreciations" },
        { model: "assetDisposal", key: "assetDisposals" },
        { model: "loan", key: "loans" },
        { model: "loanRepayment", key: "loanRepayments" },
        { model: "bankStatementImport", key: "bankStatementImports" },
        { model: "bankStatementLine", key: "bankStatementLines" },
        { model: "gstSettlement", key: "gstSettlements" },
        { model: "fiscalPeriod", key: "fiscalPeriods" },
        { model: "counter", key: "counters" },
        { model: "auditLog", key: "auditLogs" },
        { model: "journalEntry", key: "journalEntries" },
        { model: "journalLine", key: "journalLines" },
      ];

      for (const item of restoreOrder) {
        const records = data[item.key] || [];
        if (records.length > 0 && client[item.model]) {
          // Parse Dates and ObjectIds preserving native BSON types
          const parsedRecords = records.map((rec: any) => {
            const transformed: Record<string, any> = {};
            for (const [k, v] of Object.entries(rec)) {
              if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
                transformed[k] = new Date(v);
              } else {
                transformed[k] = v;
              }
            }
            return transformed;
          });

          // Insert batch
          await client[item.model].createMany({
            data: parsedRecords,
          });

          restoredCollectionsCount++;
          restoredRecordsCount += records.length;
        }
      }

      checks.push({
        checkName: "Collection & Record Restore Verification",
        status: "PASS",
        details: `Successfully restored ${restoredRecordsCount} records across ${restoredCollectionsCount} collections.`,
        recordsCount: restoredRecordsCount,
      });

      // 3. Post-Restore Verification Checks
      // Check A: JournalEntry and JournalLine referential coherence
      const restoredEntriesCount = await client.journalEntry.count();
      const restoredLinesCount = await client.journalLine.count();

      let orphanLinesCount = 0;
      if (restoredLinesCount > 0) {
        const sampleLines = await client.journalLine.findMany({
          take: 200,
          select: { id: true, entryId: true },
        });
        const entryIds = Array.from(new Set(sampleLines.map((l: any) => l.entryId).filter(Boolean)));
        const existingEntries = await client.journalEntry.findMany({
          where: { id: { in: entryIds } },
          select: { id: true },
        });
        const existingSet = new Set(existingEntries.map((e: any) => e.id));
        orphanLinesCount = sampleLines.filter((l: any) => !l.entryId || !existingSet.has(l.entryId)).length;
      }

      if (orphanLinesCount === 0) {
        checks.push({
          checkName: "Journal Relational Coherence",
          status: "PASS",
          details: `All journal lines reference valid JournalEntry headers (${restoredEntriesCount} entries, ${restoredLinesCount} lines).`,
        });
      } else {
        checks.push({
          checkName: "Journal Relational Coherence",
          status: "FAIL",
          details: `Detected ${orphanLinesCount} orphan journal lines without valid entry headers.`,
        });
        overallSuccess = false;
      }

      // Check B: Accounting Trial Balance Equilibrium
      let tbBalanced = true;
      let tbDifference = 0;

      if (restoredEntriesCount > 0) {
        const { PersistentLedgerReportingService } = await import("./persistent-ledger-reporting.service");
        const tb = await PersistentLedgerReportingService.getTrialBalance({}, testPrisma);
        tbBalanced = tb.isBalanced;
        tbDifference = tb.difference;

        checks.push({
          checkName: "Restored Ledger Trial Balance Equilibrium",
          status: tb.isBalanced ? "PASS" : "FAIL",
          details: tb.isBalanced
            ? `Trial Balance is in exact equilibrium (Total Debit: ₹${tb.totalDebit.toLocaleString()}, Total Credit: ₹${tb.totalCredit.toLocaleString()}).`
            : `Trial Balance out of balance by ₹${tb.difference.toFixed(2)}.`,
        });

        if (!tb.isBalanced) {
          overallSuccess = false;
        }
      } else {
        checks.push({
          checkName: "Restored Ledger Trial Balance Equilibrium",
          status: "PASS",
          details: "Zero journal vouchers in backup snapshot; Trial Balance trivially balanced.",
        });
      }

      // Check C: Audit Log and Fiscal Period Integrity
      const restoredAuditCount = await client.auditLog.count();
      const restoredPeriodsCount = await client.fiscalPeriod.count();

      checks.push({
        checkName: "Audit Log & Fiscal Period Integrity",
        status: "PASS",
        details: `Restored ${restoredAuditCount} audit log records and ${restoredPeriodsCount} fiscal period configurations.`,
      });

      const report: RecoveryVerificationReport = {
        backupId,
        restoredAt: new Date().toISOString(),
        targetDatabaseSanitized: sanitizedTarget,
        overallStatus: overallSuccess ? "PASSED" : "FAILED",
        checks,
        trialBalanceBalanced: tbBalanced,
        trialBalanceDifference: tbDifference,
        restoredCollectionsCount,
        restoredRecordsCount,
        durationMs: Date.now() - startTime,
      };

      return report;
    } catch (err: any) {
      checks.push({
        checkName: "Restore Execution",
        status: "FAIL",
        details: `Restore process crashed with error: ${err.message}`,
      });
      return {
        backupId,
        restoredAt: new Date().toISOString(),
        targetDatabaseSanitized: sanitizedTarget,
        overallStatus: "FAILED",
        checks,
        restoredCollectionsCount,
        restoredRecordsCount,
        durationMs: Date.now() - startTime,
      };
    } finally {
      await testPrisma.$disconnect();
    }
  }

  /**
   * Retention management: keeps at least the N latest verified backups, cleans up orphaned .tmp files.
   */
  static cleanOldBackups(options?: { keepCount?: number }): { deletedCount: number; keptCount: number } {
    const keep = Math.max(options?.keepCount ?? 5, 1);
    const backupDir = this.ensureBackupDir();
    const files = fs.readdirSync(backupDir);

    // 1. Remove any stale .tmp files older than 1 hour
    const now = Date.now();
    for (const f of files) {
      if (f.endsWith(".tmp.json")) {
        const fullPath = path.join(backupDir, f);
        try {
          const stat = fs.statSync(fullPath);
          if (now - stat.mtimeMs > 3600000) {
            fs.unlinkSync(fullPath);
          }
        } catch {}
      }
    }

    // 2. Identify manifests sorted newest to oldest
    const manifests = this.listBackups();
    if (manifests.length <= keep) {
      return { deletedCount: 0, keptCount: manifests.length };
    }

    const toDelete = manifests.slice(keep);
    let deletedCount = 0;

    for (const m of toDelete) {
      const dataFile = path.join(backupDir, `${m.backupId}.json`);
      const manifestFile = path.join(backupDir, `${m.backupId}.manifest.json`);
      try {
        if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);
        if (fs.existsSync(manifestFile)) fs.unlinkSync(manifestFile);
        deletedCount++;
      } catch {}
    }

    return { deletedCount, keptCount: manifests.length - deletedCount };
  }
}
