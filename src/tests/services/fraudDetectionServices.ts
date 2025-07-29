import { FraudDetectionService } from "../../services/FraudDetectionService"
import AppDataSource from "../../config/db"
import { RateLimitHistory } from "../../entities/RateLimitHistory"
import { Transaction, TransactionStatus } from "../../entities/Transaction"
import { MerchantFraudConfig } from "../../entities/MerchantFraudConfig"
import { BlacklistType, BlacklistReason } from "../../entities/RateLimitBlacklist"
import whitelistBlacklistService from "../../services/whitelistBlacklistService"
import type { Repository } from "typeorm"
import { RiskLevel } from "../../entities/FraudAlert"
import { jest, describe, beforeAll, beforeEach, it, expect } from "@jest/globals"

// Mock external dependencies
jest.mock("../config/db", () => ({
  initialize: jest.fn().mockResolvedValue(undefined),
  getRepository: jest.fn(() => ({
    create: jest.fn((entity) => entity),
    save: jest.fn(),
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
      getMany: jest.fn(),
    })),
  })),
  isInitialized: true, // Assume initialized for tests
}))
jest.mock("../services/whitelistBlacklistService")
jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

// Define interfaces for raw query results
interface RawCountResult {
  count: string
}

interface RawEndpointCountResult {
  endpointCount: string
}

interface RawIpCountResult {
  ip: string
  count: string
}

interface RawUserCountResult {
  userId: string
  count: string
}

// Create a mockable version of FraudDetectionService to allow mocking private/protected methods
class MockableFraudDetectionService extends FraudDetectionService {
  public getAverageTransactionAmount: jest.Mock // Make it public for mocking
  constructor() {
    super()
    this.getAverageTransactionAmount = jest.fn()
  }
}

describe("FraudDetectionService - Rate Limit Integration", () => {
  let service: MockableFraudDetectionService
  let mockRateLimitHistoryRepo: jest.Mocked<Repository<RateLimitHistory>>
  let mockTransactionRepo: jest.Mocked<Repository<Transaction>>
  let mockMerchantConfigRepo: jest.Mocked<Repository<MerchantFraudConfig>>

  const defaultMerchantConfig: MerchantFraudConfig = {
    id: "config1",
    merchantId: "merchant123",
    businessType: "standard",
    requestsPerSecond: 10,
    requestsPerMinute: 600,
    requestsPerHour: 36000,
    requestsPerDay: 864000,
    burstMultiplier: 1.5,
    burstDurationSeconds: 30,
    criticalRiskThreshold: 80,
    highRiskThreshold: 60,
    mediumRiskThreshold: 30,
    autoBlockCritical: true,
    autoBlockHighRisk: false,
    maxTransactionAmount: 10000,
    maxTransactionsPerHour: 100,
    maxTransactionsPerDay: 1000,
    dailyLimit: 50000,
    maxSameAmountInHour: 5,
    maxFailedAttemptsPerHour: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeAll(() => {
    service = new MockableFraudDetectionService()
    mockRateLimitHistoryRepo = AppDataSource.getRepository(RateLimitHistory) as jest.Mocked<
      Repository<RateLimitHistory>
    >
    mockTransactionRepo = AppDataSource.getRepository(Transaction) as jest.Mocked<Repository<Transaction>>
    mockMerchantConfigRepo = AppDataSource.getRepository(MerchantFraudConfig) as jest.Mocked<
      Repository<MerchantFraudConfig>
    >
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // Default mock for getMerchantConfig
    mockMerchantConfigRepo.findOne.mockResolvedValue(defaultMerchantConfig)

    // Default mock for original checkTransaction dependencies
    mockTransactionRepo.count.mockResolvedValue(0)
    mockTransactionRepo.createQueryBuilder().getRawOne.mockResolvedValue({ total: 0 } as RawCountResult)
    mockTransactionRepo.find.mockResolvedValue([])
    service.getAverageTransactionAmount.mockResolvedValue(100) // Mock internal helper
  })

  describe("checkRateLimitingPatterns", () => {
    it("should add score for excessive rate limiting", async () => {
      mockRateLimitHistoryRepo.count.mockResolvedValueOnce(6) // Excessive rate limits
      mockRateLimitHistoryRepo.count.mockResolvedValue(0) // Other counts
      mockRateLimitHistoryRepo
        .createQueryBuilder()
        .getRawOne.mockResolvedValue({ endpointCount: 0 } as RawEndpointCountResult)
      const result = await service.checkRateLimitingPatterns("user123", "192.168.1.1", "merchantABC")
      expect(result.riskScore).toBe(25)
      expect(result.rulesTriggered).toContain("EXCESSIVE_RATE_LIMITING")
    })

    it("should add score for IP rate limit abuse", async () => {
      mockRateLimitHistoryRepo.count.mockResolvedValueOnce(0) // Excessive rate limits
      mockRateLimitHistoryRepo.count.mockResolvedValueOnce(11) // IP rate limits
      mockRateLimitHistoryRepo.count.mockResolvedValue(0) // Other counts
      mockRateLimitHistoryRepo
        .createQueryBuilder()
        .getRawOne.mockResolvedValue({ endpointCount: 0 } as RawEndpointCountResult)
      const result = await service.checkRateLimitingPatterns("user123", "192.168.1.1", "merchantABC")
      expect(result.riskScore).toBe(30)
      expect(result.rulesTriggered).toContain("IP_RATE_LIMIT_ABUSE")
    })

    it("should add score for burst mode abuse", async () => {
      mockRateLimitHistoryRepo.count.mockResolvedValueOnce(0)
      mockRateLimitHistoryRepo.count.mockResolvedValueOnce(0)
      mockRateLimitHistoryRepo.count.mockResolvedValueOnce(4) // Burst mode abuse
      mockRateLimitHistoryRepo.count.mockResolvedValue(0)
      mockRateLimitHistoryRepo
        .createQueryBuilder()
        .getRawOne.mockResolvedValue({ endpointCount: 0 } as RawEndpointCountResult)
      const result = await service.checkRateLimitingPatterns("user123", "192.168.1.1", "merchantABC")
      expect(result.riskScore).toBe(15)
      expect(result.rulesTriggered).toContain("BURST_MODE_ABUSE")
    })

    it("should add score for rapid endpoint switching", async () => {
      mockRateLimitHistoryRepo.count.mockResolvedValue(0)
      mockRateLimitHistoryRepo
        .createQueryBuilder()
        .getRawOne.mockResolvedValue({ endpointCount: 11 } as RawEndpointCountResult) // Rapid endpoint switching
      mockRateLimitHistoryRepo.count.mockResolvedValue(0)
      const result = await service.checkRateLimitingPatterns("user123", "192.168.1.1", "merchantABC")
      expect(result.riskScore).toBe(20)
      expect(result.rulesTriggered).toContain("RAPID_ENDPOINT_SWITCHING")
    })

    it("should add score for high volume pattern", async () => {
      mockRateLimitHistoryRepo.count.mockResolvedValue(0)
      mockRateLimitHistoryRepo
        .createQueryBuilder()
        .getRawOne.mockResolvedValue({ endpointCount: 0 } as RawEndpointCountResult)
      mockRateLimitHistoryRepo.count.mockResolvedValueOnce(6) // High volume pattern
      const result = await service.checkRateLimitingPatterns("user123", "192.168.1.1", "merchantABC")
      expect(result.riskScore).toBe(20)
      expect(result.rulesTriggered).toContain("HIGH_VOLUME_PATTERN")
    })
  })

  describe("checkTransactionWithRateLimit", () => {
    const mockTransaction: Transaction = {
      id: "trans1",
      merchantId: "merchant123",
      payerId: "user123",
      amount: 100,
      status: TransactionStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    }
    const mockContext = { transaction: mockTransaction, ipAddress: "192.168.1.1" }

    it("should combine risk score from original check and rate limit patterns", async () => {
      // Mock original checkTransaction to return a base score
      jest.spyOn(service, "checkTransaction").mockResolvedValueOnce({
        riskScore: 20,
        riskLevel: RiskLevel.LOW,
        shouldBlock: false,
        rulesTriggered: ["SOME_RULE"],
        requiresReview: false,
      })

      // Mock rate limiting patterns to add score
      jest.spyOn(service, "checkRateLimitingPatterns").mockResolvedValueOnce({
        riskScore: 30, // e.g., from IP_RATE_LIMIT_ABUSE
        rulesTriggered: ["IP_RATE_LIMIT_ABUSE"],
      })

      const result = await service.checkTransactionWithRateLimit(mockContext)
      expect(result.riskScore).toBe(50) // 20 (original) + 30 (rate limit)
      expect(result.rulesTriggered).toContain("SOME_RULE")
      expect(result.rulesTriggered).toContain("IP_RATE_LIMIT_ABUSE")
      expect(result.riskLevel).toBe(RiskLevel.MEDIUM) // Assuming 50 falls into MEDIUM
    })

    it("should blacklist user if rate limit risk score is high", async () => {
      jest.spyOn(service, "checkTransaction").mockResolvedValueOnce({
        riskScore: 0,
        riskLevel: RiskLevel.LOW,
        shouldBlock: false,
        rulesTriggered: [],
        requiresReview: false,
      })
      jest.spyOn(service, "checkRateLimitingPatterns").mockResolvedValueOnce({
        riskScore: 35, // High enough to trigger blacklist
        rulesTriggered: ["EXCESSIVE_RATE_LIMITING"],
      })

      await service.checkTransactionWithRateLimit(mockContext)
      expect(whitelistBlacklistService.addToBlacklist).toHaveBeenCalledWith(
        BlacklistType.USER,
        mockTransaction.payerId,
        BlacklistReason.ABUSE,
        expect.stringContaining("High risk score from rate limiting patterns: 35"),
        "fraud-system",
        expect.any(Date),
      )
    })

    it("should blacklist IP if rate limit risk score is high and IP is present", async () => {
      jest.spyOn(service, "checkTransaction").mockResolvedValueOnce({
        riskScore: 0,
        riskLevel: RiskLevel.LOW,
        shouldBlock: false,
        rulesTriggered: [],
        requiresReview: false,
      })
      jest.spyOn(service, "checkRateLimitingPatterns").mockResolvedValueOnce({
        riskScore: 26, // High enough to trigger IP blacklist
        rulesTriggered: ["IP_RATE_LIMIT_ABUSE"],
      })

      await service.checkTransactionWithRateLimit(mockContext)
      expect(whitelistBlacklistService.addToBlacklist).toHaveBeenCalledWith(
        BlacklistType.IP,
        mockContext.ipAddress,
        BlacklistReason.ABUSE,
        expect.stringContaining("IP associated with high-risk rate limiting patterns. Risk score: 26"),
        "fraud-system",
        expect.any(Date),
      )
    })
  })

  describe("getRateLimitFraudStats", () => {
    it("should return aggregated rate limit fraud statistics", async () => {
      const mockHistoryData: RateLimitHistory[] = [
        {
          wasThrottled: true,
          wasBurst: false,
          ip: "1.1.1.1",
          userId: "userA",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        },
        {
          wasThrottled: true,
          wasBurst: false,
          ip: "1.1.1.1",
          userId: "userA",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        },
        {
          wasThrottled: true,
          wasBurst: false,
          ip: "1.1.1.1",
          userId: "userA",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        },
        {
          wasThrottled: true,
          wasBurst: false,
          ip: "1.1.1.1",
          userId: "userA",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        },
        {
          wasThrottled: true,
          wasBurst: false,
          ip: "1.1.1.1",
          userId: "userA",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        },
        {
          wasThrottled: true,
          wasBurst: false,
          ip: "1.1.1.1",
          userId: "userA",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        }, // 6 throttled for userA
        {
          wasThrottled: true,
          wasBurst: false,
          ip: "2.2.2.2",
          userId: "userB",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        },
        {
          wasThrottled: true,
          wasBurst: false,
          ip: "2.2.2.2",
          userId: "userB",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        },
        {
          wasThrottled: true,
          wasBurst: false,
          ip: "2.2.2.2",
          userId: "userB",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        },
        {
          wasThrottled: true,
          wasBurst: false,
          ip: "2.2.2.2",
          userId: "userB",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        },
        {
          wasThrottled: true,
          wasBurst: false,
          ip: "2.2.2.2",
          userId: "userB",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        },
        {
          wasThrottled: true,
          wasBurst: false,
          ip: "2.2.2.2",
          userId: "userB",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        },
        {
          wasThrottled: true,
          wasBurst: false,
          ip: "2.2.2.2",
          userId: "userB",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        },
        {
          wasThrottled: true,
          wasBurst: false,
          ip: "2.2.2.2",
          userId: "userB",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        },
        {
          wasThrottled: true,
          wasBurst: false,
          ip: "2.2.2.2",
          userId: "userB",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        },
        {
          wasThrottled: true,
          wasBurst: false,
          ip: "2.2.2.2",
          userId: "userB",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        }, // 11 throttled for IP 2.2.2.2
        {
          wasThrottled: false,
          wasBurst: true,
          ip: "3.3.3.3",
          userId: "userC",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        },
        {
          wasThrottled: false,
          wasBurst: true,
          ip: "3.3.3.3",
          userId: "userC",
          timestamp: new Date(),
          merchantId: "merchant123",
          endpoint: "/api/test",
          requestCount: 1,
          limitUsed: 10,
          userAgent: "test",
        },
      ]
      mockRateLimitHistoryRepo.createQueryBuilder().getMany.mockResolvedValue(mockHistoryData)
      mockRateLimitHistoryRepo
        .createQueryBuilder()
        .getRawMany.mockResolvedValueOnce([{ ip: "2.2.2.2", count: "11" }] as RawIpCountResult[]) // suspiciousIPs
        .mockResolvedValueOnce([{ userId: "userA", count: "6" }] as RawUserCountResult[]) // suspiciousUsers

      const stats = await service.getRateLimitFraudStats("merchant123", 30)
      expect(stats.totalEvents).toBe(mockHistoryData.length)
      expect(stats.throttledEvents).toBe(11) // 11 IPs, 6 users
      expect(stats.burstEvents).toBe(2)
      expect(stats.suspiciousActivity.suspiciousIPs).toEqual([{ ip: "2.2.2.2", throttledCount: 11 }])
      expect(stats.suspiciousActivity.suspiciousUsers).toEqual([{ userId: "userA", throttledCount: 6 }])
      expect(stats.riskIndicators.highRiskIPs).toBe(1)
      expect(stats.riskIndicators.highRiskUsers).toBe(1)
    })
  })
})
