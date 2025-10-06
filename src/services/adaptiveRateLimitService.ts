import type { Repository } from "typeorm";
import AppDataSource from "../config/db";
import { RateLimitConfig } from "../entities/RateLimitConfig";
import { RateLimitHistory } from "../entities/RateLimitHistory";
import logger from "../utils/logger";
import rateLimitConfigService from "./rateLimitConfigService";
import cron from "node-cron";

class AdaptiveRateLimitService {
  private configRepo: Repository<RateLimitConfig>;
  private historyRepo: Repository<RateLimitHistory>;
  private cronTask: cron.ScheduledTask | null = null;

  constructor() {
    if (AppDataSource.isInitialized) {
      this.configRepo = AppDataSource.getRepository(RateLimitConfig);
      this.historyRepo = AppDataSource.getRepository(RateLimitHistory);
    } else {
      AppDataSource.initialize()
        .then(() => {
          this.configRepo = AppDataSource.getRepository(RateLimitConfig);
          this.historyRepo = AppDataSource.getRepository(RateLimitHistory);
        })
        .catch((error) => {
          logger.error(
            "Failed to initialize AdaptiveRateLimitService repositories:",
            error,
          );
        });
    }
  }

  //   /**
  //    * Starts the periodic adjustment of rate limits using a cron job.
  //    * @param cronSchedule The cron schedule string (e.g., \'*/ 5;

  public startAdjustment(cronSchedule = "*/5 * * * *"): void {
    if (this.cronTask) {
      logger.warn("Adaptive rate limit adjustment cron job already running.");
      return;
    }
    logger.info(
      `Starting adaptive rate limit adjustment cron job with schedule: '${cronSchedule}'.`,
    );
    this.cronTask = cron.schedule(cronSchedule, () => this.adjustLimits(), {
      scheduled: true,
      timezone: "UTC",
    });
  }

  /**
   * Stops the periodic adjustment cron job.
   */
  public stopAdjustment(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      logger.info("Stopped adaptive rate limit adjustment cron job.");
    }
  }

  /**
   * Analyzes historical rate limit data and adjusts configurations.
   */
  public async adjustLimits(): Promise<void> {
    if (!this.configRepo || !this.historyRepo) {
      logger.warn(
        "AdaptiveRateLimitService repositories not initialized. Skipping adjustment.",
      );
      return;
    }

    logger.info("Running adaptive rate limit adjustment...");
    const now = new Date();
    const lookbackPeriodMs = 60 * 60 * 1000; // Look back 1 hour
    const startTime = new Date(now.getTime() - lookbackPeriodMs);

    try {
      const aggregatedData = await this.historyRepo
        .createQueryBuilder("history")
        .select("history.merchantId", "merchantId")
        .addSelect("history.endpoint", "endpoint")
        .addSelect("COUNT(*)", "totalRequests")
        .addSelect(
          "SUM(CASE WHEN history.wasThrottled = TRUE THEN 1 ELSE 0 END)",
          "throttledRequests",
        )
        .where("history.timestamp >= :startTime", { startTime })
        .groupBy("history.merchantId")
        .addGroupBy("history.endpoint")
        .getRawMany();

      for (const data of aggregatedData) {
        const { merchantId, endpoint, totalRequests, throttledRequests } = data;
        const total = Number.parseInt(totalRequests, 10);
        const throttled = Number.parseInt(throttledRequests, 10);

        if (total === 0) {
          continue;
        }

        const throttleRate = (throttled / total) * 100;

        const config = await this.configRepo.findOne({ where: { merchantId } });

        if (!config) {
          logger.warn(
            `No specific config found for merchant ${merchantId}. Skipping adjustment.`,
          );
          continue;
        }

        let updated = false;
        let newRequestsPerMinute = config.requestsPerMinute;
        const adjustmentFactor = 0.05; // 5% adjustment

        if (throttleRate < 1) {
          newRequestsPerMinute = Math.ceil(
            config.requestsPerMinute * (1 + adjustmentFactor),
          );
          logger.info(
            `Merchant ${merchantId} (Endpoint: ${endpoint}): Low throttle rate (${throttleRate.toFixed(2)}%). Increasing RPM from ${config.requestsPerMinute} to ${newRequestsPerMinute}.`,
          );
          updated = true;
        } else if (throttleRate > 10) {
          newRequestsPerMinute = Math.floor(
            config.requestsPerMinute * (1 - adjustmentFactor),
          );
          newRequestsPerMinute = Math.max(newRequestsPerMinute, 10); // Minimum limit
          logger.warn(
            `Merchant ${merchantId} (Endpoint: ${endpoint}): High throttle rate (${throttleRate.toFixed(2)}%). Decreasing RPM from ${config.requestsPerMinute} to ${newRequestsPerMinute}.`,
          );
          updated = true;
        } else {
          logger.info(
            `Merchant ${merchantId} (Endpoint: ${endpoint}): Stable throttle rate (${throttleRate.toFixed(2)}%). No adjustment needed.`,
          );
        }

        if (updated && newRequestsPerMinute !== config.requestsPerMinute) {
          const ratio = newRequestsPerMinute / config.requestsPerMinute;
          config.requestsPerSecond = Math.max(
            1,
            Math.ceil(config.requestsPerSecond * ratio),
          );
          config.requestsPerHour = Math.max(
            10,
            Math.ceil(config.requestsPerHour * ratio),
          );
          config.requestsPerDay = Math.max(
            100,
            Math.ceil(config.requestsPerDay * ratio),
          );
          config.requestsPerMinute = newRequestsPerMinute;

          await rateLimitConfigService.updateConfig(config.id!, config);
          logger.info(
            `Updated rate limit config for merchant ${merchantId}. New RPM: ${config.requestsPerMinute}`,
          );
        }
      }
      logger.info("Adaptive rate limit adjustment completed.");
    } catch (error) {
      logger.error("Error during adaptive rate limit adjustment:", error);
    }
  }
}

const adaptiveRateLimitService = new AdaptiveRateLimitService();
export default adaptiveRateLimitService;
