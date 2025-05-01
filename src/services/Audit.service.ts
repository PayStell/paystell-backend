import { AuditLog } from "../entities/AuditLog.entity";
import {
  CreateAditLogParams,
  FindAuditLogParams,
} from "src/interfaces/audit.interface";
import { auditConfigService } from "./AuditConfig.service";
import { DataSource, Repository } from "typeorm";

export class AuditService {
  private auditLogRepository: Repository<AuditLog>;

  constructor(private dataSource: DataSource) {
    // Initialize repository in constructor
    this.auditLogRepository = dataSource.getRepository(AuditLog);
  }
  async createAuditLogs(payload: CreateAditLogParams) {
    try {
      const maskedOldValues = payload.oldValues
        ? auditConfigService.maskSensitiveData(
            payload.entityType,
            payload.oldValues,
          )
        : undefined;

      const maskedNewValues = payload.newValues
        ? auditConfigService.maskSensitiveData(
            payload.entityType,
            payload.newValues,
          )
        : undefined;

      // const auditLogRepository = this.dataSource.getRepository(AuditLog);
      const auditLog = this.auditLogRepository.create({
        ...payload,
        oldValues: maskedOldValues,
        newValues: maskedNewValues,
      });

      return this.auditLogRepository.save(auditLog);
    } catch (error) {
      console.log({ error });
    }
  }

  async findAuditLogs(filters: FindAuditLogParams) {
    // const auditLogRepository = this.dataSource.getRepository(AuditLog);
    const query = this.auditLogRepository.createQueryBuilder("auditLog");

    if (filters.entityType) {
      query.andWhere("auditLog.entityType = :entityType", {
        entityType: filters.entityType,
      });
    }

    if (filters.entityId) {
      query.andWhere("auditLog.entityId = :entityId", {
        entityId: filters.entityId,
      });
    }

    if (filters.userId) {
      query.andWhere("auditLog.userId = :userId", { userId: filters.userId });
    }

    if (filters.action) {
      query.andWhere("auditLog.action = :action", { action: filters.action });
    }

    if (filters.startDate) {
      query.andWhere("auditLog.createdAt >= :startDate", {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query.andWhere("auditLog.createdAt <= :endDate", {
        endDate: filters.endDate,
      });
    }

    // Add pagination
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit);
    query.orderBy("auditLog.createdAt", "DESC");

    const [items, count] = await query.getManyAndCount();

    return {
      items,
      meta: {
        totalItems: count,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
      },
    };
  }
}
