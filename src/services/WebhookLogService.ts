import { Repository } from "typeorm";
import { WebhookLog } from "../entities/WebhookLog";
import AppDataSource from "../config/db";

export class WebhookLogService {
  private _webhookLogRepository?: Repository<WebhookLog>;

  private get webhookLogRepository(): Repository<WebhookLog> {
    if (!this._webhookLogRepository) {
      if (!AppDataSource.isInitialized) {
        throw new Error(
          "Database connection not initialized. Cannot access webhook log repository.",
        );
      }
      this._webhookLogRepository = AppDataSource.getRepository(WebhookLog);
    }
    return this._webhookLogRepository;
  }

  /**
   * Retrieves webhook logs with optional filters and pagination
   */
  async getWebhookLogs(filters: {
    merchantId?: string;
    status?: "success" | "failed";
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const {
      merchantId,
      status,
      startDate,
      endDate,
      limit = 10,
      offset = 0,
    } = filters;

    // Build query with filters
    const query = this.webhookLogRepository
      .createQueryBuilder("webhook_log")
      .orderBy("webhook_log.createdAt", "DESC")
      .limit(Math.min(limit, 100)) // Cap at 100 to prevent excessive queries
      .offset(Math.max(offset, 0)); // Ensure offset is never negative

    // Apply filters
    if (merchantId) {
      query.andWhere("webhook_log.merchantId = :merchantId", { merchantId });
    }

    if (status) {
      query.andWhere("webhook_log.status = :status", { status });
    }

    if (startDate) {
      query.andWhere("webhook_log.createdAt >= :startDate", { startDate });
    }

    if (endDate) {
      query.andWhere("webhook_log.createdAt <= :endDate", { endDate });
    }

    const [logs, total] = await query.getManyAndCount();

    return {
      logs,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Retrieves a specific webhook log by ID
   */
  async getWebhookLogById(id: string): Promise<WebhookLog | null> {
    return this.webhookLogRepository.findOne({ where: { id } });
  }

  /**
   * Gets webhook log statistics for a merchant
   */
  async getWebhookLogStats(merchantId?: string) {
    const query = this.webhookLogRepository.createQueryBuilder("webhook_log");

    if (merchantId) {
      query.where("webhook_log.merchantId = :merchantId", { merchantId });
    }

    const [total, successful, failed] = await Promise.all([
      query.getCount(),
      query
        .clone()
        .andWhere("webhook_log.status = :status", { status: "success" })
        .getCount(),
      query
        .clone()
        .andWhere("webhook_log.status = :status", { status: "failed" })
        .getCount(),
    ]);

    const successRate = total > 0 ? (successful / total) * 100 : 100;

    return {
      total,
      successful,
      failed,
      successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Gets recent webhook activity for dashboard
   */
  async getRecentActivity(merchantId?: string, limit = 20) {
    const query = this.webhookLogRepository
      .createQueryBuilder("webhook_log")
      .orderBy("webhook_log.createdAt", "DESC")
      .limit(limit);

    if (merchantId) {
      query.where("webhook_log.merchantId = :merchantId", { merchantId });
    }

    return query.getMany();
  }
}
