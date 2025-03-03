import Queue from "bull";
import { Repository } from "typeorm";
import {
  WebhookPayload,
  MerchantWebhook,
} from "../interfaces/webhook.interfaces";
import { MerchantWebhookEventEntity } from "../entities/MerchantWebhookEvent.entity";
import AppDataSource from "../config/db";
import { MerchantWebhookEventEntityStatus } from "../enums/MerchantWebhookEventStatus";
import { NotificationService } from "./inAppNotification.service";
import {
  NotificationCategory,
  NotificationType,
} from "../entities/InAppNotification.entity";
import { WebhookNotificationService } from "./webhookNotification.service";

// Initialize the notification service for alerts
const notificationService = new NotificationService();

/**
 * Service responsible for reliable webhook delivery with retry capabilities
 * Manages queue processing, retry logic, and webhook event tracking
 */
export class MerchantWebhookQueueService {
  private webhookQueue: Queue.Queue;
  private merchantWebhookEventRepository: Repository<MerchantWebhookEventEntity>;
  private webhookNotificationService: WebhookNotificationService;
  private MERCHANT_WEBHOOK_QUEUE = "merchant-webhook-queue";

  constructor() {
    // Set up the Bull queue with Redis backing and exponential backoff
    this.webhookQueue = new Queue(this.MERCHANT_WEBHOOK_QUEUE, {
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
      },
      defaultJobOptions: {
        attempts: 5, // Maximum number of retry attempts
        backoff: {
          type: "exponential",
          delay: 5000, // 5 seconds initial delay
        },
        removeOnComplete: false, // Keep successful jobs for tracking
        removeOnFail: false, // Keep failed jobs for manual retries
      },
    });

    // Initialize repository for database operations
    this.merchantWebhookEventRepository = AppDataSource.getRepository(
      MerchantWebhookEventEntity
    );

    // Create webhook notification service for sending webhooks
    this.webhookNotificationService = new WebhookNotificationService();

    // Set up queue processing and event handling
    this.setupQueueProcessor();
    this.setupQueueEvents();
  }

  /**
   * Configures the queue processor to handle webhook delivery attempts
   * Processes each job and handles success/failure scenarios
   */
  private setupQueueProcessor() {
    this.webhookQueue.process(async (job: any) => {
      const { merchantWebhook, webhookPayload } = job.data;
      const attemptsMade = job.attemptsMade;

      try {
        // Attempt to send the webhook notification
        const result =
          await this.webhookNotificationService.notifyPaymentUpdate(
            merchantWebhook,
            webhookPayload
          );

        // If notification fails but doesn't throw an error
        if (!result) {
          throw new Error("Webhook notification failed");
        }

        // Update database record on successful delivery
        await this.merchantWebhookEventRepository.update(
          { jobId: job.id.toString() },
          {
            status: MerchantWebhookEventEntityStatus.COMPLETED,
            attemptsMade,
            completedAt: new Date(),
            nextRetry: undefined,
          }
        );

        console.log(
          `Webhook delivered successfully to ${merchantWebhook.url} after ${attemptsMade} attempt(s)`
        );

        return { success: true };
      } catch (error: any) {
        // Calculate delay for next retry using exponential backoff
        const nextRetryDelay = this.calculateNextRetryDelay(attemptsMade);
        const nextRetryDate = new Date(Date.now() + nextRetryDelay);

        // Determine if this is the final retry attempt
        const isLastAttempt = attemptsMade >= job.opts.attempts;

        // Update database record with failure information
        await this.merchantWebhookEventRepository.update(
          { jobId: job.id.toString() },
          {
            status: isLastAttempt
              ? MerchantWebhookEventEntityStatus.FAILED // Final failure
              : MerchantWebhookEventEntityStatus.PENDING, // Will retry
            error: error?.message || "Unknown error",
            attemptsMade,
            nextRetry: isLastAttempt ? undefined : nextRetryDate,
          }
        );

        console.error(
          `Webhook delivery attempt ${attemptsMade} failed for ${merchantWebhook.url}:`,
          error.message
        );

        // Rethrow error to trigger Bull's retry mechanism
        throw error;
      }
    });
  }

  /**
   * Sets up event handlers for the webhook queue
   * Handles failed jobs, creates notifications, and tracks metrics
   */
  private setupQueueEvents() {
    // Listen for failed jobs after all retries
    this.webhookQueue.on("failed", async (job, error) => {
      const attemptsMade = job.attemptsMade;
      const maxAttempts = job.opts.attempts || 5;
      const { merchantWebhook, webhookPayload } = job.data;

      // Calculate next retry time if not the final attempt
      let nextRetryTimestamp = null;
      if (attemptsMade < maxAttempts - 1) {
        const nextRetryDelay = this.calculateNextRetryDelay(attemptsMade);
        nextRetryTimestamp = new Date(Date.now() + nextRetryDelay);
      }

      // Log comprehensive details about the failure for debugging
      console.error("Webhook delivery failure details:", {
        merchantId: merchantWebhook.merchantId,
        originalPayload: webhookPayload,
        error: error.message,
        attemptNumber: attemptsMade + 1, // Make human-readable (1-based)
        maxAttempts: maxAttempts,
        isFinalAttempt: attemptsMade >= maxAttempts - 1,
        nextRetryTimestamp: nextRetryTimestamp,
        webhookUrl: merchantWebhook.url,
        jobId: job.id,
      });

      // If this was the final retry attempt that failed
      if (attemptsMade >= maxAttempts) {
        // Prepare alert data for notification and logging
        const alertData = {
          merchantId: merchantWebhook.merchantId,
          webhookUrl: merchantWebhook.url,
          transactionId: webhookPayload.transactionId,
          error: error.message,
          attemptNumber: attemptsMade + 1,
          jobId: job.id,
          timestamp: new Date().toISOString(),
        };

        // Log an alert about the final failure
        console.error(
          `ALERT: Webhook delivery failed after ${maxAttempts} attempts for job ${job.id}`,
          alertData
        );

        // Create in-app notification for administrators
        try {
          await notificationService.createNotification({
            title: "Webhook Delivery Failed",
            message: `Webhook to ${merchantWebhook.url} for transaction ${webhookPayload.transactionId} failed after ${maxAttempts} attempts.`,
            notificationType: NotificationType.ADMIN,
            category: NotificationCategory.ERROR,
            priority: 2, // Higher priority for failed webhooks
            metadata: {
              ...alertData,
              merchantWebhookId: merchantWebhook.id,
              asset: webhookPayload.asset,
              amount: webhookPayload.amount,
              eventType: webhookPayload.eventType,
            },
            link: `/admin/webhooks/failed/${job.id}`,
          });

          console.log("Created notification for failed webhook");
        } catch (notificationError) {
          console.error("Failed to create notification:", notificationError);
        }

        // Mark webhook as permanently failed in the database
        await this.merchantWebhookEventRepository.update(
          { jobId: job.id.toString() },
          {
            status: MerchantWebhookEventEntityStatus.FAILED,
            attemptsMade: maxAttempts,
            nextRetry: undefined,
            completedAt: new Date(),
          }
        );
      }
    });

    // Track completed jobs for metrics
    this.webhookQueue.on("completed", async (job) => {
      const { merchantWebhook } = job.data;
      const attemptsMade = job.attemptsMade;

      console.log(
        `Webhook to merchant ${merchantWebhook.merchantId} completed successfully after ${attemptsMade} attempt(s)`
      );
    });
  }

  /**
   * Calculates the delay for next retry using exponential backoff
   * Delay increases with each attempt, capped at maximum value
   */
  private calculateNextRetryDelay(attemptsMade: number): number {
    const baseDelay = 5000; // 5 seconds
    const maxDelay = 3600000; // 1 hour

    // Exponential backoff: 5s, 10s, 20s, 40s, etc.
    const delay = baseDelay * Math.pow(2, attemptsMade - 1);

    // Cap at maximum delay
    return Math.min(delay, maxDelay);
  }

  /**
   * Adds a webhook notification to the retry queue
   * Creates a database record to track the webhook status
   */
  async addToQueue(
    merchantWebhook: MerchantWebhook,
    webhookPayload: WebhookPayload
  ) {
    // Create a unique job ID for tracking
    const uniqueId = `${merchantWebhook.merchantId}-${webhookPayload.transactionId}-${Date.now()}`;

    // Add job to the queue with retry configuration
    const job = await this.webhookQueue.add(
      { merchantWebhook, webhookPayload },
      {
        jobId: uniqueId,
        attempts: 5, // Maximum retry attempts
      }
    );

    // Create database record to track this webhook delivery attempt
    const webhookEvent = new MerchantWebhookEventEntity();
    webhookEvent.jobId = job.id.toString();
    webhookEvent.merchantId = merchantWebhook.merchantId;
    webhookEvent.webhookUrl = merchantWebhook.url;
    webhookEvent.payload = webhookPayload;
    webhookEvent.status = MerchantWebhookEventEntityStatus.PENDING;
    webhookEvent.attemptsMade = 0;
    webhookEvent.maxAttempts = 5;
    webhookEvent.nextRetry = new Date(Date.now() + 5000); // Initial retry after 5s

    await this.merchantWebhookEventRepository.save(webhookEvent);

    // Log the queuing of the webhook
    console.log(`Webhook queued for delivery to ${merchantWebhook.url}`, {
      merchantId: merchantWebhook.merchantId,
      transactionId: webhookPayload.transactionId,
    });

    return job;
  }

  /**
   * Retrieves failed webhook events with pagination
   */
  async getFailedWebhookEvents(merchantId?: string, limit = 10, offset = 0) {
    // Build query for failed events
    const query = this.merchantWebhookEventRepository
      .createQueryBuilder("event")
      .where("event.status = :status", {
        status: MerchantWebhookEventEntityStatus.FAILED,
      })
      .orderBy("event.completedAt", "DESC") // Most recent failures first
      .limit(limit)
      .offset(offset);

    // Apply merchant filter if provided
    if (merchantId) {
      query.andWhere("event.merchantId = :merchantId", { merchantId });
    }

    return query.getMany();
  }

  /**
   * Retrieves pending webhook events with pagination
   *
   * @param merchantId - Optional filter by merchant ID
   * @param limit - Maximum number of records to retrieve
   * @param offset - Number of records to skip for pagination
   * @returns List of webhook events with PENDING status
   */
  async getPendingWebhookEvents(merchantId?: string, limit = 10, offset = 0) {
    // Build query for pending events
    const query = this.merchantWebhookEventRepository
      .createQueryBuilder("event")
      .where("event.status = :status", {
        status: MerchantWebhookEventEntityStatus.PENDING,
      })
      .orderBy("event.nextRetry", "ASC") // Sorted by next retry time
      .limit(limit)
      .offset(offset);

    // Apply merchant filter if provided
    if (merchantId) {
      query.andWhere("event.merchantId = :merchantId", { merchantId });
    }

    return query.getMany();
  }

  /**
   * Manually triggers a retry for a failed webhook
   *
   * @param jobId - ID of the webhook job to retry
   * @returns The updated job object
   */
  async retryWebhook(jobId: string) {
    // Get the job from the queue
    const job = await this.webhookQueue.getJob(jobId);

    if (!job) {
      throw new Error("Webhook job not found");
    }

    // Reset job attempt count for manual retry
    await job.retry();

    // Update database record to reflect retry
    await this.merchantWebhookEventRepository.update(
      { jobId: job.id.toString() },
      {
        status: MerchantWebhookEventEntityStatus.PENDING, // Set back to pending
        error: undefined, // Clear previous error
        nextRetry: new Date(), // Schedule immediate retry
      }
    );

    return job;
  }

  /**
   * Retrieves webhook queue metrics and statistics
   */
  async getQueueMetrics(merchantId?: string) {
    // Get queue-level statistics
    const [active, completed, failed, delayed, waiting] = await Promise.all([
      this.webhookQueue.getActiveCount(),
      this.webhookQueue.getCompletedCount(),
      this.webhookQueue.getFailedCount(),
      this.webhookQueue.getDelayedCount(),
      this.webhookQueue.getWaitingCount(),
    ]);

    // Calculate overall success rate
    const total = completed + failed;
    const successRate = total > 0 ? (completed / total) * 100 : 100;

    // Handle merchant-specific metrics if requested
    let merchantMetrics = {};
    if (merchantId) {
      // Get counts by status for this merchant
      const merchantEvents = await this.merchantWebhookEventRepository
        .createQueryBuilder("event")
        .select("event.status", "status")
        .addSelect("COUNT(*)", "count")
        .where("event.merchantId = :merchantId", { merchantId })
        .groupBy("event.status")
        .getRawMany();

      // Initialize counts for all statuses
      const statusCounts = merchantEvents.reduce(
        (acc, curr) => {
          acc[curr.status] = parseInt(curr.count);
          return acc;
        },
        {
          [MerchantWebhookEventEntityStatus.PENDING]: 0,
          [MerchantWebhookEventEntityStatus.COMPLETED]: 0,
          [MerchantWebhookEventEntityStatus.FAILED]: 0,
        }
      );

      // Calculate merchant-specific success rate
      const merchantTotal =
        statusCounts[MerchantWebhookEventEntityStatus.COMPLETED] +
        statusCounts[MerchantWebhookEventEntityStatus.FAILED];

      const merchantSuccessRate =
        merchantTotal > 0
          ? (statusCounts[MerchantWebhookEventEntityStatus.COMPLETED] /
              merchantTotal) *
            100
          : 100;

      // Prepare merchant metrics
      merchantMetrics = {
        completed: statusCounts[MerchantWebhookEventEntityStatus.COMPLETED],
        failed: statusCounts[MerchantWebhookEventEntityStatus.FAILED],
        pending: statusCounts[MerchantWebhookEventEntityStatus.PENDING],
        successRate: merchantSuccessRate,
      };
    }

    // Return combined metrics
    return {
      overall: {
        active,
        completed,
        failed,
        delayed,
        waiting,
        successRate,
      },
      merchant: merchantId ? merchantMetrics : undefined,
    };
  }
}
