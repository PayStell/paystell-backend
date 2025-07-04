import { MerchantWebhookQueueService } from "../../services/merchantWebhookQueue.service";
import { WebhookService } from "../../services/webhook.service";
import { NotificationService } from "../../services/inAppNotificationService";
import { MerchantWebhookEventEntityStatus } from "../../enums/MerchantWebhookEventStatus";
import * as Bull from "bull";
import { WebhookPayload } from "../../interfaces/webhook.interfaces";

// Mocks
jest.mock("bull");
jest.mock("../../services/webhook.service");
jest.mock("../../services/inAppNotificationService");
jest.mock("../../config/db", () => ({
  getRepository: jest.fn().mockReturnValue({
    update: jest.fn().mockResolvedValue({}),
    save: jest.fn().mockResolvedValue({}),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    }),
  }),
}));

describe("MerchantWebhookQueueService", () => {
  let service: MerchantWebhookQueueService;

  // Definir tipos de mocks
  interface MockQueue {
    add: jest.Mock;
    process: jest.Mock;
    on: jest.Mock;
    getJobs: jest.Mock;
    getJob: jest.Mock;
    getJobCounts: jest.Mock;
    getActiveCount: jest.Mock;
    getCompletedCount: jest.Mock;
    getFailedCount: jest.Mock;
    getDelayedCount: jest.Mock;
    getWaitingCount: jest.Mock;
  }

  interface MockRepository {
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  }

  let mockQueue: MockQueue;
  let _mockWebhookService: jest.Mocked<WebhookService>;
  let _mockNotificationService: jest.Mocked<NotificationService>;
  let mockRepository: MockRepository;

  const mockMerchantWebhook = {
    id: "webhook-123",
    merchantId: "merchant-123",
    url: "https://example.com/webhook",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWebhookPayload = {
    transactionId: "tx-123",
    transactionType: "payment",
    status: "completed",
    amount: "100.00",
    asset: "USDC",
    merchantId: "merchant-123",
    timestamp: new Date().toISOString(),
    eventType: "payment.completed",
    reqMethod: "POST",
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock queue
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: "job-123" }),
      process: jest.fn(),
      on: jest.fn(),
      getJob: jest.fn().mockResolvedValue({
        id: "job-123",
        retry: jest.fn().mockResolvedValue({}),
      }),
      getJobs: jest.fn().mockResolvedValue([]),
      getJobCounts: jest.fn().mockResolvedValue({
        active: 1,
        completed: 5,
        failed: 2,
        delayed: 1,
        waiting: 3,
      }),
      getActiveCount: jest.fn().mockResolvedValue(1),
      getCompletedCount: jest.fn().mockResolvedValue(5),
      getFailedCount: jest.fn().mockResolvedValue(2),
      getDelayedCount: jest.fn().mockResolvedValue(1),
      getWaitingCount: jest.fn().mockResolvedValue(3),
    };
    (Bull as unknown as jest.Mock).mockImplementation(() => mockQueue);

    // Setup service
    service = new MerchantWebhookQueueService();
    _mockWebhookService =
      WebhookService as unknown as jest.Mocked<WebhookService>;
    _mockNotificationService =
      NotificationService as unknown as jest.Mocked<NotificationService>;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mockRepository = require("../../config/db").getRepository();
  });

  describe("addToQueue", () => {
    it("should add a webhook to the queue and save event record", async () => {
      const result = await service.addToQueue(
        mockMerchantWebhook,
        mockWebhookPayload as WebhookPayload,
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        {
          merchantWebhook: mockMerchantWebhook,
          webhookPayload: mockWebhookPayload,
        },
        { jobId: expect.any(String), attempts: 5 },
      );
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: "job-123",
          merchantId: "merchant-123",
          status: MerchantWebhookEventEntityStatus.PENDING,
          attemptsMade: 0,
        }),
      );
      expect(result).toEqual({ id: "job-123" });
    });
  });

  describe("retry mechanism", () => {
    it("should setup queue processor to handle webhook notifications", () => {
      expect(mockQueue.process).toHaveBeenCalled();
    });

    it("should setup queue event handlers", () => {
      expect(mockQueue.on).toHaveBeenCalledWith("failed", expect.any(Function));
      expect(mockQueue.on).toHaveBeenCalledWith(
        "completed",
        expect.any(Function),
      );
    });
  });

  describe("getQueueMetrics", () => {
    it("should return queue statistics", async () => {
      const metrics = await service.getQueueMetrics();

      expect(mockQueue.getActiveCount).toHaveBeenCalled();
      expect(mockQueue.getCompletedCount).toHaveBeenCalled();
      expect(mockQueue.getFailedCount).toHaveBeenCalled();
      expect(mockQueue.getDelayedCount).toHaveBeenCalled();
      expect(mockQueue.getWaitingCount).toHaveBeenCalled();

      expect(metrics).toEqual({
        overall: {
          active: 1,
          completed: 5,
          failed: 2,
          delayed: 1,
          waiting: 3,
          successRate: 71.42857142857143, // 5 / (5 + 2) * 100
        },
        merchant: undefined,
      });
    });

    it("should include merchant-specific metrics when merchantId is provided", async () => {
      mockRepository.createQueryBuilder().getRawMany.mockResolvedValue([
        { status: MerchantWebhookEventEntityStatus.COMPLETED, count: "3" },
        { status: MerchantWebhookEventEntityStatus.FAILED, count: "1" },
        { status: MerchantWebhookEventEntityStatus.PENDING, count: "2" },
      ]);

      const metrics = await service.getQueueMetrics("merchant-123");

      expect(metrics.merchant).toEqual({
        completed: 3,
        failed: 1,
        pending: 2,
        successRate: 75, // 3 / (3 + 1) * 100
      });
    });
  });

  describe("getFailedWebhookEvents", () => {
    it("should query for failed webhook events", async () => {
      await service.getFailedWebhookEvents();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder().where).toHaveBeenCalledWith(
        "event.status = :status",
        { status: MerchantWebhookEventEntityStatus.FAILED },
      );
    });

    it("should filter by merchantId when provided", async () => {
      await service.getFailedWebhookEvents("merchant-123");

      expect(mockRepository.createQueryBuilder().andWhere).toHaveBeenCalledWith(
        "event.merchantId = :merchantId",
        { merchantId: "merchant-123" },
      );
    });
  });

  describe("getPendingWebhookEvents", () => {
    it("should query for pending webhook events", async () => {
      await service.getPendingWebhookEvents();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder().where).toHaveBeenCalledWith(
        "event.status = :status",
        { status: MerchantWebhookEventEntityStatus.PENDING },
      );
    });
  });

  describe("retryWebhook", () => {
    it("should retry a webhook job and update the database record", async () => {
      await service.retryWebhook("job-123");

      expect(mockQueue.getJob).toHaveBeenCalledWith("job-123");
      expect(mockRepository.update).toHaveBeenCalledWith(
        { jobId: "job-123" },
        {
          status: MerchantWebhookEventEntityStatus.PENDING,
          error: undefined,
          nextRetry: expect.any(Date),
        },
      );
    });

    it("should throw an error if job is not found", async () => {
      mockQueue.getJob.mockResolvedValue(null);

      await expect(service.retryWebhook("non-existent-job")).rejects.toThrow(
        "Webhook job not found",
      );
    });
  });

  describe("calculateNextRetryDelay", () => {
    it("should apply exponential backoff", () => {
      // Using the private method via type assertion for testing
      const calculateNextRetryDelay = (
        service as unknown as {
          calculateNextRetryDelay(attemptsMade: number): number;
        }
      ).calculateNextRetryDelay.bind(service);

      // base delay - first attempt
      expect(calculateNextRetryDelay(0)).toBe(2500);
    });

    it("should cap delay at 1 hour", () => {
      const calculateNextRetryDelay = (
        service as unknown as {
          calculateNextRetryDelay(attemptsMade: number): number;
        }
      ).calculateNextRetryDelay.bind(service);

      // Testing with a high attempt number that would exceed 1 hour
      // 1 hour = 3600000ms
      expect(calculateNextRetryDelay(15)).toBe(3600000);
    });
  });
});
