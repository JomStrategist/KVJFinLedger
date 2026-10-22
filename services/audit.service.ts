import { prisma } from "@/lib/prisma";
import { PrismaClient, Prisma, AuditLog } from "@prisma/client";

export interface LogAuditInput {
  actorId?: string | null;
  actorName: string;
  actorEmail: string;
  action: string;
  entity: string;
  entityId: string;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  changeSummary?: string | null;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditService {
  /**
   * Sanitizes sensitive fields before recording into the audit log.
   */
  private static sanitizeState(state?: Record<string, any> | null): Record<string, any> | null {
    if (!state || typeof state !== "object") return null;

    const sensitiveKeys = new Set(["password", "secret", "token", "auth_secret", "hash", "sessiontoken"]);
    const cleaned: Record<string, any> = {};

    for (const [key, val] of Object.entries(state)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        cleaned[key] = "[REDACTED]";
      } else if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
        cleaned[key] = this.sanitizeState(val);
      } else {
        cleaned[key] = val;
      }
    }

    return cleaned;
  }

  /**
   * Persists an audit log event atomically within an existing transaction or via standard prisma client.
   */
  static async logEvent(
    input: LogAuditInput,
    tx: PrismaClient | Prisma.TransactionClient = prisma
  ): Promise<AuditLog> {
    return await (tx as any).auditLog.create({
      data: {
        actorId: input.actorId || null,
        actorName: input.actorName,
        actorEmail: input.actorEmail,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        beforeState: this.sanitizeState(input.beforeState),
        afterState: this.sanitizeState(input.afterState),
        changeSummary: input.changeSummary || null,
        reason: input.reason || null,
      },
    });
  }

  /**
   * Retrieves audit trail records for a specific entity with newest entries first.
   */
  static async getLogsForEntity(
    entity: string,
    entityId: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    return await prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  }

  /**
   * General query for audit trail records.
   */
  static async getAuditLogs(params?: {
    actorId?: string;
    entity?: string;
    action?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    const { actorId, entity, action, fromDate, toDate, limit = 100 } = params || {};
    const where: any = {};

    if (actorId) where.actorId = actorId;
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (fromDate || toDate) {
      where.timestamp = {};
      if (fromDate) where.timestamp.gte = fromDate;
      if (toDate) where.timestamp.lte = toDate;
    }

    return await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  }
}
