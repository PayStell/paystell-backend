import { Repository } from "typeorm";
import AppDataSource from "../config/db";
import { AuditLog } from "../entities/AuditLog";
import { Request } from "express";

export interface AuditContext {
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
}

export interface CreateAuditLogParams {
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  context: AuditContext;
}

export class AuditService {
  private auditLogRepository: Repository<AuditLog>;

  constructor() {
    this.auditLogRepository = AppDataSource.getRepository(AuditLog);
  }

  async createAuditLog(params: CreateAuditLogParams): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      oldValues: this.sanitizeData(params.oldValues),
      newValues: this.sanitizeData(params.newValues),
      userId: params.context.userId,
      userEmail: params.context.userEmail,
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
      sessionId: params.context.sessionId,
    });

    return await this.auditLogRepository.save(auditLog);
  }

  async getAuditLogs(filters: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const queryBuilder = this.auditLogRepository.createQueryBuilder("audit");

    if (filters.entityType) {
      queryBuilder.andWhere("audit.entityType = :entityType", {
        entityType: filters.entityType,
      });
    }

    if (filters.entityId) {
      queryBuilder.andWhere("audit.entityId = :entityId", {
        entityId: filters.entityId,
      });
    }

    if (filters.userId) {
      queryBuilder.andWhere("audit.userId = :userId", {
        userId: filters.userId,
      });
    }

    if (filters.action) {
      queryBuilder.andWhere("audit.action = :action", {
        action: filters.action,
      });
    }

    if (filters.startDate) {
      queryBuilder.andWhere("audit.createdAt >= :startDate", {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      queryBuilder.andWhere("audit.createdAt <= :endDate", {
        endDate: filters.endDate,
      });
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100); // Max 100 records per page
    const offset = (page - 1) * limit;

    queryBuilder.orderBy("audit.createdAt", "DESC").skip(offset).take(limit);

    const [logs, total] = await queryBuilder.getManyAndCount();

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private sanitizeData(
    data?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!data) return undefined;

    const sensitiveFields = [
      "password",
      "secret",
      "apiKey",
      "token",
      "refreshToken",
      "verificationCode",
      "twoFactorSecret",
    ];

    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  static extractContextFromRequest(req: Request): AuditContext {
    return {
      userId: req.user?.id?.toString(),
      userEmail: req.user?.email,
      ipAddress:
        req.validatedIp || req.ip || req.connection.remoteAddress || "unknown",
      userAgent: req.get("User-Agent") || "unknown",
      sessionId: req.headers["x-session-id"] as string,
    };
  }
}

export const auditService = new AuditService();
