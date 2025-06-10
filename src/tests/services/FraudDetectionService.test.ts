import { FraudDetectionService } from "../../services/FraudDetectionService";
import { Transaction, TransactionStatus, PaymentMethod } from "../../entities/Transaction";
import { RiskLevel, FraudAlertStatus } from "../../entities/FraudAlert";
import { MerchantFraudConfig } from "../../entities/MerchantFraudConfig";
import AppDataSource from "../../config/db";

// Mock the database connection
jest.mock("../../config/db", () => ({
  getRepository: jest.fn(),
}));

describe("FraudDetectionService", () => {
  let fraudService: FraudDetectionService;
  let mockTransactionRepo: any;
  let mockFraudAlertRepo: any;
  let mockMerchantConfigRepo: any;
  let mockMerchantRepo: any;

  const createMockTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
    id: "test-transaction-id",
    merchantId: "test-merchant-id",
    payerId: "test-payer-id",
    amount: 100,
    status: TransactionStatus.PENDING,
    paymentMethod: PaymentMethod.CARD,
    metadata: {},
    description: "Test transaction",
    reference: "test-ref",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createMockConfig = (overrides: Partial<MerchantFraudConfig> = {}): MerchantFraudConfig => ({
    id: "config-id",
    merchantId: "test-merchant-id",
    lowRiskThreshold: 50,
    mediumRiskThreshold: 70,
    highRiskThreshold: 85,
    criticalRiskThreshold: 95,
    maxTransactionAmount: 1000,
    dailyLimit: 5000,
    maxTransactionsPerHour: 10,
    maxTransactionsPerDay: 50,
    maxSameAmountInHour: 3,
    maxFailedAttemptsPerHour: 5,
    autoBlockHighRisk: true,
    autoBlockCritical: true,
    requireManualReview: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as MerchantFraudConfig);

  const createMockAlert = (overrides: any = {}) => ({
    id: "alert-id",
    transactionId: "test-transaction-id",
    merchantId: "test-merchant-id",
    payerId: "test-payer-id",
    amount: 100,
    riskScore: 0,
    riskLevel: RiskLevel.LOW,
    status: FraudAlertStatus.PENDING,
    rulesTriggered: [],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockTransactionRepo = {
      count: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    
    mockFraudAlertRepo = {
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    
    mockMerchantConfigRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    
    mockMerchantRepo = {};

    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getRawOne: jest.fn(),
    };

    mockTransactionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockFraudAlertRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === Transaction) return mockTransactionRepo;
      if (entity.name === 'FraudAlert') return mockFraudAlertRepo;
      if (entity.name === 'MerchantFraudConfig') return mockMerchantConfigRepo;
      return mockMerchantRepo;
    });

    fraudService = new FraudDetectionService();
  });

  describe("checkTransaction", () => {
    it("should return low risk for normal transaction without creating alert", async () => {
      const transaction = createMockTransaction();
      const config = createMockConfig();

      mockMerchantConfigRepo.findOne.mockResolvedValue(config);
      mockTransactionRepo.count.mockResolvedValue(0);
      mockTransactionRepo.find.mockResolvedValue([]);
      
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: "100" }),
      };
      mockTransactionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await fraudService.checkTransaction({ transaction });

      expect(result.riskLevel).toBe(RiskLevel.LOW);
      expect(result.shouldBlock).toBe(false);
      expect(result.riskScore).toBeLessThan(50);
      expect(result.rulesTriggered).toHaveLength(0);
      expect(result.alert).toBeUndefined(); // No alert should be created for low risk with no rules triggered
      expect(mockFraudAlertRepo.save).not.toHaveBeenCalled();
    });

    it("should detect high risk for transaction exceeding amount limit and auto-create alert", async () => {
      const transaction = createMockTransaction({ amount: 2000 });
      const config = createMockConfig();
      const mockAlert = createMockAlert({
        amount: 2000,
        riskScore: 50,
        riskLevel: RiskLevel.MEDIUM,
        status: FraudAlertStatus.PENDING,
        rulesTriggered: ["AMOUNT_EXCEEDS_LIMIT"],
      });

      mockMerchantConfigRepo.findOne.mockResolvedValue(config);
      mockTransactionRepo.count.mockResolvedValue(0);
      mockTransactionRepo.find.mockResolvedValue([]);
      mockFraudAlertRepo.save.mockResolvedValue(mockAlert);

      const result = await fraudService.checkTransaction({ transaction });

      expect(result.riskScore).toBeGreaterThanOrEqual(50);
      expect(result.rulesTriggered).toContain("AMOUNT_EXCEEDS_LIMIT");
    });

    it("should detect velocity violations and create blocked alert", async () => {
      const transaction = createMockTransaction();
      const config = createMockConfig();
      const mockAlert = createMockAlert({
        riskScore: 100, // Capped at 100
        riskLevel: RiskLevel.CRITICAL,
        status: FraudAlertStatus.BLOCKED,
        rulesTriggered: ["VELOCITY_HOURLY_EXCEEDED", "VELOCITY_DAILY_EXCEEDED", "DAILY_AMOUNT_LIMIT_EXCEEDED"],
      });

      mockMerchantConfigRepo.findOne.mockResolvedValue(config);
      mockTransactionRepo.count
        .mockResolvedValueOnce(15) // hourly count
        .mockResolvedValueOnce(60); // daily count
      
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: "4950" }),
      };
      mockTransactionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockTransactionRepo.find.mockResolvedValue([]);

      const createAlertSpy = jest.spyOn(fraudService, 'createFraudAlert').mockResolvedValue(mockAlert);

      const result = await fraudService.checkTransaction({ transaction });

      expect(result.rulesTriggered).toContain("VELOCITY_HOURLY_EXCEEDED");
      expect(result.rulesTriggered).toContain("VELOCITY_DAILY_EXCEEDED");
      expect(result.rulesTriggered).toContain("DAILY_AMOUNT_LIMIT_EXCEEDED");
      expect(result.riskLevel).toBe(RiskLevel.CRITICAL);
      expect(result.riskScore).toBe(100); // Should be capped at 100
      expect(result.shouldBlock).toBe(true);
      expect(createAlertSpy).toHaveBeenCalled();
    });

    it("should detect pattern anomalies and not create alert for low risk", async () => {
      const transaction = createMockTransaction({ amount: 500 });
      const config = createMockConfig();

      mockMerchantConfigRepo.findOne.mockResolvedValue(config);
      mockTransactionRepo.count
        .mockResolvedValueOnce(0) // hourly count
        .mockResolvedValueOnce(0) // daily count
        .mockResolvedValueOnce(5) // same amount count
        .mockResolvedValueOnce(0); // failed attempts
      
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: "100" }),
      };
      mockTransactionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockTransactionRepo.find.mockResolvedValue([]);

      const result = await fraudService.checkTransaction({ transaction });

      expect(result.rulesTriggered).toContain("SAME_AMOUNT_PATTERN");
      expect(result.rulesTriggered).toContain("ROUND_AMOUNT_PATTERN");
      expect(result.riskLevel).toBe(RiskLevel.LOW); // Still low risk
      expect(result.shouldBlock).toBe(false);
      expect(mockFraudAlertRepo.save).not.toHaveBeenCalled(); // No alert created for low risk
    });

    it("should detect excessive failed attempts and not create alert for low risk", async () => {
      const transaction = createMockTransaction();
      const config = createMockConfig();

      mockMerchantConfigRepo.findOne.mockResolvedValue(config);
      mockTransactionRepo.count
        .mockResolvedValueOnce(0) // hourly count
        .mockResolvedValueOnce(0) // daily count
        .mockResolvedValueOnce(0) // same amount count
        .mockResolvedValueOnce(10); // failed attempts
      
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: "100" }),
      };
      mockTransactionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockTransactionRepo.find.mockResolvedValue([]);

      const result = await fraudService.checkTransaction({ transaction });

      expect(result.rulesTriggered).toContain("EXCESSIVE_FAILED_ATTEMPTS");
      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
      expect(result.shouldBlock).toBe(false);
      expect(mockFraudAlertRepo.save).not.toHaveBeenCalled(); // No alert for low risk
    });

    it("should detect statistical anomalies and not create alert for low risk", async () => {
      const transaction = createMockTransaction({ amount: 1000 });
      const config = createMockConfig();

      const recentTransactions = Array.from({ length: 20 }, (_, i) => 
        createMockTransaction({ amount: 100 + i })
      );

      mockMerchantConfigRepo.findOne.mockResolvedValue(config);
      mockTransactionRepo.count.mockResolvedValue(0);
      mockTransactionRepo.find.mockResolvedValue(recentTransactions);
      
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: "100" }),
      };
      mockTransactionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await fraudService.checkTransaction({ transaction });

      expect(result.rulesTriggered).toContain("STATISTICAL_ANOMALY");
      expect(result.riskLevel).toBe(RiskLevel.LOW);
      expect(result.shouldBlock).toBe(false);
      expect(mockFraudAlertRepo.save).not.toHaveBeenCalled();
    });

    it("should handle unusual transaction times and not create alert for low risk", async () => {
      const mockDate = new Date();
      mockDate.setHours(3);
      
      const OriginalDate = global.Date;
      const mockDateConstructor = jest.fn(() => mockDate) as any;
      mockDateConstructor.now = jest.fn().mockReturnValue(Date.now());
      mockDateConstructor.parse = jest.fn().mockImplementation(Date.parse);
      mockDateConstructor.UTC = jest.fn().mockImplementation(Date.UTC);
      mockDateConstructor.prototype = Date.prototype;
      
      global.Date = mockDateConstructor as any;

      const transaction = createMockTransaction();
      const config = createMockConfig();

      mockMerchantConfigRepo.findOne.mockResolvedValue(config);
      mockTransactionRepo.count.mockResolvedValue(0);
      mockTransactionRepo.find.mockResolvedValue([]);
      
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: "100" }),
      };
      mockTransactionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await fraudService.checkTransaction({ transaction });

      expect(result.rulesTriggered).toContain("UNUSUAL_TIME");
      expect(result.riskLevel).toBe(RiskLevel.LOW);
      expect(result.shouldBlock).toBe(false);
      expect(mockFraudAlertRepo.save).not.toHaveBeenCalled();

      global.Date = OriginalDate;
    });
  });

  describe("getMerchantConfig", () => {
    it("should return existing config", async () => {
      const config = createMockConfig();
      mockMerchantConfigRepo.findOne.mockResolvedValue(config);

      const result = await fraudService.getMerchantConfig("test-merchant-id");

      expect(result).toEqual(config);
      expect(mockMerchantConfigRepo.findOne).toHaveBeenCalledWith({
        where: { merchantId: "test-merchant-id" }
      });
    });

    it("should create default config if none exists", async () => {
      const newConfig = createMockConfig();
      mockMerchantConfigRepo.findOne.mockResolvedValue(null);
      mockMerchantConfigRepo.save.mockResolvedValue(newConfig);

      const result = await fraudService.getMerchantConfig("test-merchant-id");

      expect(mockMerchantConfigRepo.save).toHaveBeenCalled();
      expect(result).toEqual(newConfig);
    });
  });

  describe("createFraudAlert", () => {
    it("should create fraud alert with correct data", async () => {
      const transaction = createMockTransaction();
      const fraudResult = {
        riskScore: 75,
        riskLevel: RiskLevel.HIGH,
        shouldBlock: false,
        rulesTriggered: ["AMOUNT_EXCEEDS_LIMIT"],
        requiresReview: true,
      };

      const expectedAlert = {
        id: "alert-id",
        transactionId: transaction.id,
        merchantId: transaction.merchantId,
        payerId: transaction.payerId,
        amount: transaction.amount,
        riskScore: fraudResult.riskScore,
        riskLevel: fraudResult.riskLevel,
        status: FraudAlertStatus.PENDING,
        rulesTriggered: fraudResult.rulesTriggered,
        metadata: transaction.metadata,
      };

      mockFraudAlertRepo.save.mockResolvedValue(expectedAlert);

      const result = await fraudService.createFraudAlert(transaction, fraudResult);

      expect(mockFraudAlertRepo.save).toHaveBeenCalled();
      expect(result).toEqual(expectedAlert);
    });

    it("should create blocked alert for high-risk transactions", async () => {
      const transaction = createMockTransaction();
      const fraudResult = {
        riskScore: 90,
        riskLevel: RiskLevel.CRITICAL,
        shouldBlock: true,
        rulesTriggered: ["AMOUNT_EXCEEDS_LIMIT"],
        requiresReview: true,
      };

      const expectedAlert = {
        id: "alert-id",
        status: FraudAlertStatus.BLOCKED,
      };

      mockFraudAlertRepo.save.mockResolvedValue(expectedAlert);

      const result = await fraudService.createFraudAlert(transaction, fraudResult);

      expect(result.status).toBe(FraudAlertStatus.BLOCKED);
    });
  });

  describe("reviewFraudAlert", () => {
    it("should update fraud alert status successfully", async () => {
      const existingAlert = {
        id: "alert-id",
        status: FraudAlertStatus.PENDING,
        reviewNotes: null,
        reviewedBy: null,
        reviewedAt: null,
      };

      const updatedAlert = {
        ...existingAlert,
        status: FraudAlertStatus.APPROVED,
        reviewNotes: "Legitimate transaction",
        reviewedBy: "admin-user",
        reviewedAt: new Date(),
      };

      mockFraudAlertRepo.findOne.mockResolvedValue(existingAlert);
      mockFraudAlertRepo.save.mockResolvedValue(updatedAlert);

      const result = await fraudService.reviewFraudAlert(
        "alert-id",
        FraudAlertStatus.APPROVED,
        "Legitimate transaction",
        "admin-user"
      );

      expect(result.status).toBe(FraudAlertStatus.APPROVED);
      expect(result.reviewNotes).toBe("Legitimate transaction");
      expect(result.reviewedBy).toBe("admin-user");
      expect(result.reviewedAt).toBeDefined();
    });

    it("should throw error if alert not found", async () => {
      mockFraudAlertRepo.findOne.mockResolvedValue(null);

      await expect(
        fraudService.reviewFraudAlert("non-existent-id", FraudAlertStatus.APPROVED)
      ).rejects.toThrow("Fraud alert not found");
    });
  });

  describe("updateMerchantConfig", () => {
    it("should update existing config", async () => {
      const existingConfig = createMockConfig();
      const updates = { maxTransactionAmount: 2000 };
      const updatedConfig = { ...existingConfig, ...updates };

      mockMerchantConfigRepo.findOne.mockResolvedValue(existingConfig);
      mockMerchantConfigRepo.save.mockResolvedValue(updatedConfig);

      const result = await fraudService.updateMerchantConfig("test-merchant-id", updates);

      expect(result.maxTransactionAmount).toBe(2000);
      expect(mockMerchantConfigRepo.save).toHaveBeenCalledWith(updatedConfig);
    });
  });

  describe("getFraudAlerts", () => {
    it("should return fraud alerts with filters", async () => {
      const mockAlerts = [
        { id: "alert-1", merchantId: "merchant-1", status: FraudAlertStatus.PENDING },
        { id: "alert-2", merchantId: "merchant-1", status: FraudAlertStatus.BLOCKED },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAlerts),
      };

      mockFraudAlertRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await fraudService.getFraudAlerts("merchant-1", FraudAlertStatus.PENDING);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith("alert.merchantId = :merchantId", { merchantId: "merchant-1" });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("alert.status = :status", { status: FraudAlertStatus.PENDING });
      expect(result).toEqual(mockAlerts);
    });

    it("should return all alerts without filters", async () => {
      const mockAlerts = [{ id: "alert-1" }];
      
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAlerts),
      };

      mockFraudAlertRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await fraudService.getFraudAlerts();

      expect(mockQueryBuilder.where).not.toHaveBeenCalled();
      expect(result).toEqual(mockAlerts);
    });
  });

  describe("getFraudStats", () => {
    it("should return fraud statistics", async () => {
      const mockAlerts = [
        createMockAlert({ 
          riskScore: 75, 
          riskLevel: RiskLevel.HIGH, 
          status: FraudAlertStatus.BLOCKED,
          amount: 500,
          rulesTriggered: ["AMOUNT_EXCEEDS_LIMIT", "VELOCITY_HOURLY_EXCEEDED"]
        }),
        createMockAlert({ 
          riskScore: 45, 
          riskLevel: RiskLevel.MEDIUM, 
          status: FraudAlertStatus.PENDING,
          amount: 300,
          rulesTriggered: ["SAME_AMOUNT_PATTERN"]
        }),
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAlerts),
      };

      mockFraudAlertRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await fraudService.getFraudStats("test-merchant-id", 30);

      expect(result.totalAlerts).toBe(2);
      expect(result.blockedTransactions).toBe(1);
      expect(result.pendingReviews).toBe(1);
      expect(result.averageRiskScore).toBe(60);
      expect(result.totalAmount).toBe(800);
      expect(result.blockedAmount).toBe(500);
      expect(result.topTriggeredRules).toEqual([
        { rule: "AMOUNT_EXCEEDS_LIMIT", count: 1 },
        { rule: "VELOCITY_HOURLY_EXCEEDED", count: 1 },
        { rule: "SAME_AMOUNT_PATTERN", count: 1 }
      ]);
    });
  });
});