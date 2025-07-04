import { WebhookLogService } from "../../services/WebhookLogService";
import { WebhookLog } from "../../entities/WebhookLog";
import AppDataSource from "../../config/db";
import { WebhookPayload } from "../../interfaces/webhook.interfaces";

// Mock dependencies
jest.mock("../../config/db");

describe("WebhookLogService", () => {
  let webhookLogService: WebhookLogService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockWebhookLogRepository: jest.Mocked<any>;

  const mockWebhookLogData: Partial<WebhookLog> = {
    id: "log_123",
    merchantId: "merchant_123",
    webhookUrl: "https://example.com/webhook",
    status: "success",
    payload: {
      transactionId: "payment_123",
      transactionType: "payment",
      status: "completed",
      amount: "100",
      asset: "USD",
      merchantId: "merchant_123",
      timestamp: "2024-01-01T00:00:00Z",
      eventType: "payment.success",
      reqMethod: "POST",
    } as WebhookPayload,
    response: { status: "ok" },
    statusCode: 200,
    retryCount: 0,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockWebhookLogRepository = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getCount: jest.fn(),
      getMany: jest.fn(),
      clone: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockWebhookLogRepository);
    Object.defineProperty(AppDataSource, 'isInitialized', { value: true, writable: true });

    webhookLogService = new WebhookLogService();
  });

  describe("getWebhookLogs", () => {
    const mockFilters = {
      merchantId: "merchant_123",
      status: "success" as const,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      limit: 10,
      offset: 0,
    };

    it("should retrieve webhook logs with filters successfully", async () => {
      const mockLogs = [mockWebhookLogData];
      const mockTotal = 1;
      mockWebhookLogRepository.getManyAndCount.mockResolvedValueOnce([mockLogs, mockTotal]);

      const result = await webhookLogService.getWebhookLogs(mockFilters);

      expect(mockWebhookLogRepository.createQueryBuilder).toHaveBeenCalledWith("webhook_log");
      expect(mockWebhookLogRepository.orderBy).toHaveBeenCalledWith("webhook_log.createdAt", "DESC");
      expect(mockWebhookLogRepository.limit).toHaveBeenCalledWith(10);
      expect(mockWebhookLogRepository.offset).toHaveBeenCalledWith(0);
      expect(mockWebhookLogRepository.andWhere).toHaveBeenCalledWith("webhook_log.merchantId = :merchantId", { merchantId: "merchant_123" });
      expect(mockWebhookLogRepository.andWhere).toHaveBeenCalledWith("webhook_log.status = :status", { status: "success" });
      expect(mockWebhookLogRepository.andWhere).toHaveBeenCalledWith("webhook_log.createdAt >= :startDate", { startDate: mockFilters.startDate });
      expect(mockWebhookLogRepository.andWhere).toHaveBeenCalledWith("webhook_log.createdAt <= :endDate", { endDate: mockFilters.endDate });

      expect(result).toEqual({
        logs: mockLogs,
        total: mockTotal,
        limit: 10,
        offset: 0,
        hasMore: false,
      });
    });

    it("should handle default pagination values", async () => {
      const mockLogs = [mockWebhookLogData];
      const mockTotal = 1;
      mockWebhookLogRepository.getManyAndCount.mockResolvedValueOnce([mockLogs, mockTotal]);

      const result = await webhookLogService.getWebhookLogs({});

      expect(mockWebhookLogRepository.limit).toHaveBeenCalledWith(10);
      expect(mockWebhookLogRepository.offset).toHaveBeenCalledWith(0);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it("should cap limit at 100", async () => {
      const mockLogs = [mockWebhookLogData];
      const mockTotal = 1;
      mockWebhookLogRepository.getManyAndCount.mockResolvedValueOnce([mockLogs, mockTotal]);

      await webhookLogService.getWebhookLogs({ limit: 150 });

      expect(mockWebhookLogRepository.limit).toHaveBeenCalledWith(100);
    });

    it("should ensure offset is never negative", async () => {
      const mockLogs = [mockWebhookLogData];
      const mockTotal = 1;
      mockWebhookLogRepository.getManyAndCount.mockResolvedValueOnce([mockLogs, mockTotal]);

      await webhookLogService.getWebhookLogs({ offset: -5 });

      expect(mockWebhookLogRepository.offset).toHaveBeenCalledWith(0);
    });

    it("should calculate hasMore correctly", async () => {
      const mockLogs = Array(10).fill(mockWebhookLogData);
      const mockTotal = 25;
      mockWebhookLogRepository.getManyAndCount.mockResolvedValueOnce([mockLogs, mockTotal]);

      const result = await webhookLogService.getWebhookLogs({ limit: 10, offset: 10 });

      expect(result.hasMore).toBe(true);
    });

    it("should work without filters", async () => {
      const mockLogs = [mockWebhookLogData];
      const mockTotal = 1;
      mockWebhookLogRepository.getManyAndCount.mockResolvedValueOnce([mockLogs, mockTotal]);

      const result = await webhookLogService.getWebhookLogs({});

      expect(mockWebhookLogRepository.createQueryBuilder).toHaveBeenCalledWith("webhook_log");
      expect(mockWebhookLogRepository.andWhere).not.toHaveBeenCalled();
      expect(result.logs).toEqual(mockLogs);
    });
  });

  describe("getWebhookLogById", () => {
    it("should retrieve a webhook log by ID", async () => {
      mockWebhookLogRepository.findOne.mockResolvedValueOnce(mockWebhookLogData);

      const result = await webhookLogService.getWebhookLogById("log_123");

      expect(mockWebhookLogRepository.findOne).toHaveBeenCalledWith({ where: { id: "log_123" } });
      expect(result).toEqual(mockWebhookLogData);
    });

    it("should return null if webhook log not found", async () => {
      mockWebhookLogRepository.findOne.mockResolvedValueOnce(null);

      const result = await webhookLogService.getWebhookLogById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getWebhookLogStats", () => {
    it("should calculate stats correctly with merchantId", async () => {
      mockWebhookLogRepository.getCount
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(85)  // successful
        .mockResolvedValueOnce(15); // failed

      const result = await webhookLogService.getWebhookLogStats("merchant_123");

      expect(mockWebhookLogRepository.createQueryBuilder).toHaveBeenCalledWith("webhook_log");
      expect(mockWebhookLogRepository.where).toHaveBeenCalledWith("webhook_log.merchantId = :merchantId", { merchantId: "merchant_123" });
      expect(mockWebhookLogRepository.clone).toHaveBeenCalledTimes(2);
      expect(mockWebhookLogRepository.andWhere).toHaveBeenCalledWith("webhook_log.status = :status", { status: "success" });
      expect(mockWebhookLogRepository.andWhere).toHaveBeenCalledWith("webhook_log.status = :status", { status: "failed" });

      expect(result).toEqual({
        total: 100,
        successful: 85,
        failed: 15,
        successRate: 85.0,
      });
    });

    it("should calculate stats correctly without merchantId", async () => {
      mockWebhookLogRepository.getCount
        .mockResolvedValueOnce(50)  // total
        .mockResolvedValueOnce(40)  // successful
        .mockResolvedValueOnce(10); // failed

      const result = await webhookLogService.getWebhookLogStats();

      expect(mockWebhookLogRepository.createQueryBuilder).toHaveBeenCalledWith("webhook_log");
      expect(mockWebhookLogRepository.where).not.toHaveBeenCalled();

      expect(result).toEqual({
        total: 50,
        successful: 40,
        failed: 10,
        successRate: 80.0,
      });
    });

    it("should handle zero total logs", async () => {
      mockWebhookLogRepository.getCount
        .mockResolvedValueOnce(0)  // total
        .mockResolvedValueOnce(0)  // successful
        .mockResolvedValueOnce(0); // failed

      const result = await webhookLogService.getWebhookLogStats("merchant_123");

      expect(result).toEqual({
        total: 0,
        successful: 0,
        failed: 0,
        successRate: 100,
      });
    });

    it("should round success rate to 2 decimal places", async () => {
      mockWebhookLogRepository.getCount
        .mockResolvedValueOnce(3)  // total
        .mockResolvedValueOnce(2)  // successful
        .mockResolvedValueOnce(1); // failed

      const result = await webhookLogService.getWebhookLogStats("merchant_123");

      expect(result.successRate).toBe(66.67); // 2/3 * 100 = 66.666... rounded to 66.67
    });
  });

  describe("getRecentActivity", () => {
    it("should get recent activity with merchantId", async () => {
      const mockLogs = [mockWebhookLogData];
      mockWebhookLogRepository.getMany.mockResolvedValueOnce(mockLogs);

      const result = await webhookLogService.getRecentActivity("merchant_123", 20);

      expect(mockWebhookLogRepository.createQueryBuilder).toHaveBeenCalledWith("webhook_log");
      expect(mockWebhookLogRepository.orderBy).toHaveBeenCalledWith("webhook_log.createdAt", "DESC");
      expect(mockWebhookLogRepository.limit).toHaveBeenCalledWith(20);
      expect(mockWebhookLogRepository.where).toHaveBeenCalledWith("webhook_log.merchantId = :merchantId", { merchantId: "merchant_123" });
      expect(result).toEqual(mockLogs);
    });

    it("should get recent activity without merchantId", async () => {
      const mockLogs = [mockWebhookLogData];
      mockWebhookLogRepository.getMany.mockResolvedValueOnce(mockLogs);

      const result = await webhookLogService.getRecentActivity();

      expect(mockWebhookLogRepository.createQueryBuilder).toHaveBeenCalledWith("webhook_log");
      expect(mockWebhookLogRepository.orderBy).toHaveBeenCalledWith("webhook_log.createdAt", "DESC");
      expect(mockWebhookLogRepository.limit).toHaveBeenCalledWith(20);
      expect(mockWebhookLogRepository.where).not.toHaveBeenCalled();
      expect(result).toEqual(mockLogs);
    });

    it("should use custom limit", async () => {
      const mockLogs = [mockWebhookLogData];
      mockWebhookLogRepository.getMany.mockResolvedValueOnce(mockLogs);

      await webhookLogService.getRecentActivity("merchant_123", 50);

      expect(mockWebhookLogRepository.limit).toHaveBeenCalledWith(50);
    });
  });

  describe("Database initialization check", () => {
    it("should throw error when database is not initialized", () => {
      Object.defineProperty(AppDataSource, 'isInitialized', { value: false, writable: true });
      const newService = new WebhookLogService();

      expect(() => {
        // Trigger the getter by accessing the repository
        void (newService as unknown as { webhookLogRepository: unknown }).webhookLogRepository;
      }).toThrow("Database connection not initialized. Cannot access webhook log repository.");
    });
  });
});
