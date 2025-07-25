import { Repository, MoreThanOrEqual } from "typeorm";
import AppDataSource from "../config/db";
import { RateLimitHistory } from "../entities/RateLimitHistory";
import { redisClient } from "../config/redisConfig";
import logger from "../utils/logger";

interface AlertThresholds {
  warningThreshold: number;
  criticalThreshold: number;
  cooldownMinutes: number;
}

export class RateLimitAlertService {
  private historyRepository: Repository<RateLimitHistory>;
  private thresholds: AlertThresholds;

  constructor() {
    this.historyRepository = AppDataSource.getRepository(RateLimitHistory);
    this.thresholds = {
      warningThreshold: 80,
      criticalThreshold: 95,
      cooldownMinutes: 15,
    };
  }

  async checkUserThresholds(userId: string, merchantId: string): Promise<void> {
    try {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      // Get recent history for this user
      const recentHistory = await this.historyRepository.find({
        where: {
          userId,
          merchantId,
          timestamp: MoreThanOrEqual(oneMinuteAgo),
        },
        order: { timestamp: "DESC" },
      });

      if (recentHistory.length === 0) {
        return;
      }

      // Calculate current usage percentage
      const latestEntry = recentHistory[0];
      const usagePercentage = (latestEntry.requestCount / latestEntry.limitUsed) * 100;

      // Check if we should send an alert
      if (usagePercentage >= this.thresholds.criticalThreshold) {
        await this.sendAlert(userId, merchantId, "critical", usagePercentage);
      } else if (usagePercentage >= this.thresholds.warningThreshold) {
        await this.sendAlert(userId, merchantId, "warning", usagePercentage);
      }
    } catch (error) {
      logger.error(`Error checking user thresholds: ${error}`);
    }
  }

  private async sendAlert(
    userId: string,
    merchantId: string,
    level: "warning" | "critical",
    usagePercentage: number
  ): Promise<void> {
    try {
      const cooldownKey = `ratelimit:alert:${userId}:${level}`;
      const alertSent = await redisClient.get(cooldownKey);

      if (alertSent) {
        return; 
      }

      await redisClient.set(cooldownKey, "1", {
        EX: this.thresholds.cooldownMinutes * 60,
      });


      logger.warn(`RATE LIMIT ALERT [${level.toUpperCase()}]: User ${userId} at ${Math.round(usagePercentage)}% of their rate limit for merchant ${merchantId}`);
    } catch (error) {
      logger.error(`Error sending alert: ${error}`);
    }
  }
}

export default new RateLimitAlertService();