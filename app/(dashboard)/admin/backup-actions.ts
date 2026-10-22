"use server";

import { requireActionAdmin, requireActionAuth } from "@/lib/auth-utils";
import { BackupRestoreService } from "@/services/backup-restore.service";
import { HistoricalMigrationService } from "@/services/historical-migration.service";

/**
 * Initiates an on-demand full database backup. Restricted to ADMIN.
 */
export async function triggerBackupAction() {
  try {
    const session = await requireActionAdmin();
    const user = (session.user as any) || {};

    const manifest = await BackupRestoreService.createBackup({
      actorId: user.id || "admin",
      actorName: user.name || "Administrator",
      actorEmail: user.email || "admin@kvjanalytics.com",
      notes: "Manual backup triggered from Administrative Console",
    });

    return { success: true, data: manifest };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to trigger database backup." };
  }
}

/**
 * Lists available backups and manifests. Restricted to ADMIN.
 */
export async function listBackupsAction() {
  try {
    await requireActionAdmin();
    const backups = BackupRestoreService.listBackups();
    return { success: true, data: backups };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to retrieve backup list." };
  }
}

/**
 * Verifies SHA-256 checksum of an existing backup. Restricted to ADMIN.
 */
export async function verifyBackupChecksumAction(backupId: string) {
  try {
    await requireActionAdmin();
    const result = BackupRestoreService.verifyBackupChecksum(backupId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Checksum verification failed." };
  }
}

/**
 * Executes a zero-write historical migration dry run. Restricted to authorized accounting/admin users.
 */
export async function runHistoricalDryRunAction(params?: { financialYear?: string }) {
  try {
    const session = await requireActionAuth();
    const user = (session.user as any) || {};
    // Ensure user has at least finance/accounting/admin role
    const allowedRoles = ["ADMIN", "FINANCE", "ACCOUNTANT", "AUDITOR"];
    if (!allowedRoles.includes(user.role)) {
      throw new Error("Forbidden: Only Finance, Accounting, and Admin roles can run migration dry runs.");
    }

    const summary = await HistoricalMigrationService.runHistoricalDryRun(params);
    return { success: true, data: summary };
  } catch (error: any) {
    return { success: false, error: error.message || "Historical migration dry run failed." };
  }
}

/**
 * Evaluates all 18 Historical Reconciliation Gates.
 */
export async function getReconciliationGatesAction() {
  try {
    const session = await requireActionAuth();
    const user = (session.user as any) || {};
    const allowedRoles = ["ADMIN", "FINANCE", "ACCOUNTANT", "AUDITOR"];
    if (!allowedRoles.includes(user.role)) {
      throw new Error("Forbidden: Insufficient privileges to view reconciliation gates.");
    }

    const report = await HistoricalMigrationService.evaluateHistoricalReconciliationGates();
    return { success: true, data: report };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to evaluate reconciliation gates." };
  }
}

/**
 * Triggers backup retention cleanup, preserving latest verified backups. Restricted to ADMIN.
 */
export async function cleanOldBackupsAction(keepCount: number = 5) {
  try {
    await requireActionAdmin();
    const result = BackupRestoreService.cleanOldBackups({ keepCount });
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to clean old backups." };
  }
}
