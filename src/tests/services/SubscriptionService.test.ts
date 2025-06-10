import { SubscriptionService } from "../../services/SubscriptionService";
import { BillingInterval, SubscriptionStatus } from "../../entities/Subscription";
import { BillingCycleStatus } from "../../entities/BillingCycle";
import { SubscriptionEventType } from "../../entities/SubscriptionEvent";
import { NotificationType, NotificationCategory } from "../../entities/InAppNotification.entity";
import AppDataSource from "../../config/db";
import { AppError } from "../../utils/AppError";
import { LessThanOrEqual } from "typeorm";

// Mock dependencies
jest.mock("../../config/db");
jest.mock("../../services/PaymentService");
jest.mock("../../services/inAppNotificationService");
jest.mock("../../utils/logger");

jest.mock("nanoid", () => ({
  customAlphabet: () => () => "123456789012",
}));

// Mock generatePaymentId
jest.mock("../../utils/generatePaymentId", () => ({
  generatePaymentId: () => "sub_abc123",
}));

describe("SubscriptionService", () => {
  let subscriptionService: SubscriptionService;
  let mockSubscriptionRepository: any;
  let mockBillingCycleRepository: any;
  let mockEventRepository: any;
  let mockPaymentService: any;
  let mockNotificationService: any;

  const mockSubscriptionData = {
    id: "sub_123",
    subscriptionId: "sub_abc123",
    customerId: "cust_123",
    customerEmail: "test@example.com",
    merchantId: "merchant_123",
    amount: 9.99,
    currency: "USD",
    tokenAddress: "token_abc",
    billingInterval: BillingInterval.MONTHLY,
    intervalCount: 1,
    status: SubscriptionStatus.ACTIVE,
    startDate: new Date("2024-01-01"),
    nextBillingDate: new Date("2024-02-01"),
    failedPaymentCount: 0,
    maxRetries: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSubscriptionRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockBillingCycleRepository = {
      save: jest.fn(),
      find: jest.fn(),
    };

    mockEventRepository = {
      save: jest.fn(),
    };

    mockPaymentService = {
      processPayment: jest.fn(),
    };

    mockNotificationService = {
      createNotification: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity.name === "Subscription") return mockSubscriptionRepository;
      if (entity.name === "BillingCycle") return mockBillingCycleRepository;
      if (entity.name === "SubscriptionEvent") return mockEventRepository;
    });

    // Mock the service instances
    const SubscriptionServiceClass = require("../../services/SubscriptionService").SubscriptionService;
    subscriptionService = new SubscriptionServiceClass();
    
    // Replace the service instances with mocks
    (subscriptionService as any).paymentService = mockPaymentService;
    (subscriptionService as any).notificationService = mockNotificationService;
  });

  describe("createSubscription", () => {
    const createParams = {
      customerId: "cust_123",
      customerEmail: "test@example.com",
      merchantId: "merchant_123",
      amount: 9.99,
      currency: "USD",
      tokenAddress: "token_abc",
      billingInterval: BillingInterval.MONTHLY,
    };

    it("should create a new subscription successfully", async () => {
      mockSubscriptionRepository.save.mockResolvedValueOnce(mockSubscriptionData);
      mockBillingCycleRepository.save.mockResolvedValueOnce({
        id: "cycle_1",
        subscriptionId: mockSubscriptionData.id,
        status: BillingCycleStatus.PENDING,
      });
      mockEventRepository.save.mockResolvedValueOnce({});
      mockNotificationService.createNotification.mockResolvedValueOnce({});

      const result = await subscriptionService.createSubscription(createParams);

      expect(mockSubscriptionRepository.save).toHaveBeenCalledTimes(2); // Once for subscription, once for updating next billing date
      expect(mockBillingCycleRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: mockSubscriptionData.id,
          eventType: SubscriptionEventType.CREATED,
        })
      );
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        title: "Subscription Created",
        message: `New subscription created for ${createParams.customerEmail}`,
        notificationType: NotificationType.MERCHANT,
        category: NotificationCategory.SUCCESS,
        recipientId: createParams.merchantId,
        metadata: { subscriptionId: "sub_abc123" },
      });
      expect(result).toEqual(mockSubscriptionData);
    });

    it("should calculate next billing date correctly for monthly subscription", async () => {
      const startDate = new Date("2024-01-01");
      const paramsWithStartDate = { ...createParams, startDate };

      mockSubscriptionRepository.save.mockResolvedValueOnce(mockSubscriptionData);
      mockBillingCycleRepository.save.mockResolvedValueOnce({});
      mockEventRepository.save.mockResolvedValueOnce({});
      mockNotificationService.createNotification.mockResolvedValueOnce({});

      await subscriptionService.createSubscription(paramsWithStartDate);

      const savedSubscription = mockSubscriptionRepository.save.mock.calls[0][0];
      expect(savedSubscription.nextBillingDate.getMonth()).toBe(1); // February (0-indexed)
      expect(savedSubscription.nextBillingDate.getDate()).toBe(1);
    });

    it("should calculate next billing date correctly for weekly subscription", async () => {
      const weeklyParams = { ...createParams, billingInterval: BillingInterval.WEEKLY };
      const startDate = new Date("2024-01-01");
      const expectedNextDate = new Date("2024-01-08");

      mockSubscriptionRepository.save.mockResolvedValueOnce({
        ...mockSubscriptionData,
        billingInterval: BillingInterval.WEEKLY,
        nextBillingDate: expectedNextDate,
      });
      mockBillingCycleRepository.save.mockResolvedValueOnce({});
      mockEventRepository.save.mockResolvedValueOnce({});
      mockNotificationService.createNotification.mockResolvedValueOnce({});

      await subscriptionService.createSubscription({ ...weeklyParams, startDate });

      const savedSubscription = mockSubscriptionRepository.save.mock.calls[0][0];
      expect(savedSubscription.nextBillingDate.getTime()).toBe(expectedNextDate.getTime());
    });

    it("should handle custom interval count", async () => {
      const customParams = { ...createParams, intervalCount: 3 };
      const startDate = new Date("2024-01-01");

      mockSubscriptionRepository.save.mockResolvedValueOnce(mockSubscriptionData);
      mockBillingCycleRepository.save.mockResolvedValueOnce({});
      mockEventRepository.save.mockResolvedValueOnce({});
      mockNotificationService.createNotification.mockResolvedValueOnce({});

      await subscriptionService.createSubscription({ ...customParams, startDate });

      const savedSubscription = mockSubscriptionRepository.save.mock.calls[0][0];
      expect(savedSubscription.intervalCount).toBe(3);
      expect(savedSubscription.nextBillingDate.getMonth()).toBe(3); // April (3 months later)
    });

    it("should handle metadata", async () => {
      const metadata = { customField: "value", userId: 123 };
      const paramsWithMetadata = { ...createParams, metadata };

      mockSubscriptionRepository.save.mockResolvedValueOnce({ ...mockSubscriptionData, metadata });
      mockBillingCycleRepository.save.mockResolvedValueOnce({});
      mockEventRepository.save.mockResolvedValueOnce({});
      mockNotificationService.createNotification.mockResolvedValueOnce({});

      const result = await subscriptionService.createSubscription(paramsWithMetadata);

      expect(result.metadata).toEqual(metadata);
    });
  });

  describe("getSubscription", () => {
    it("should retrieve subscription with relations", async () => {
      mockSubscriptionRepository.findOne.mockResolvedValueOnce(mockSubscriptionData);

      const result = await subscriptionService.getSubscription("sub_abc123");

      expect(mockSubscriptionRepository.findOne).toHaveBeenCalledWith({
        where: { subscriptionId: "sub_abc123" },
        relations: ["merchant", "billingCycles", "events"],
      });
      expect(result).toEqual(mockSubscriptionData);
    });

    it("should throw AppError if subscription not found", async () => {
      mockSubscriptionRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        subscriptionService.getSubscription("non_existent")
      ).rejects.toThrow(AppError);
    });
  });

  describe("getSubscriptionsByMerchant", () => {
    it("should retrieve subscriptions for merchant", async () => {
      const subscriptions = [mockSubscriptionData];
      mockSubscriptionRepository.find.mockResolvedValueOnce(subscriptions);

      const result = await subscriptionService.getSubscriptionsByMerchant("merchant_123");

      expect(mockSubscriptionRepository.find).toHaveBeenCalledWith({
        where: { merchantId: "merchant_123" },
        relations: ["billingCycles"],
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual(subscriptions);
    });
  });

  describe("pauseSubscription", () => {
    it("should pause an active subscription", async () => {
      const activeSubscription = { ...mockSubscriptionData, status: SubscriptionStatus.ACTIVE };
      const pausedSubscription = { ...activeSubscription, status: SubscriptionStatus.PAUSED };

      mockSubscriptionRepository.findOne.mockResolvedValueOnce(activeSubscription);
      mockSubscriptionRepository.save.mockResolvedValueOnce(pausedSubscription);
      mockEventRepository.save.mockResolvedValueOnce({});

      const result = await subscriptionService.pauseSubscription("sub_abc123");

      expect(mockEventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: activeSubscription.id,
          eventType: SubscriptionEventType.PAUSED,
        })
      );
      expect(result.status).toBe(SubscriptionStatus.PAUSED);
    });

    it("should throw error if subscription not found", async () => {
      mockSubscriptionRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        subscriptionService.pauseSubscription("non_existent")
      ).rejects.toThrow(AppError);
    });
  });

  describe("resumeSubscription", () => {
    it("should resume a paused subscription", async () => {
      const pausedSubscription = { ...mockSubscriptionData, status: SubscriptionStatus.PAUSED };
      const activeSubscription = { ...pausedSubscription, status: SubscriptionStatus.ACTIVE };

      mockSubscriptionRepository.findOne.mockResolvedValueOnce(pausedSubscription);
      mockSubscriptionRepository.save.mockResolvedValueOnce(activeSubscription);
      mockEventRepository.save.mockResolvedValueOnce({});

      const result = await subscriptionService.resumeSubscription("sub_abc123");

      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(mockEventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: pausedSubscription.id,
          eventType: SubscriptionEventType.RESUMED,
        })
      );
    });

    it("should update next billing date when resuming", async () => {
      const pausedSubscription = { ...mockSubscriptionData, status: SubscriptionStatus.PAUSED };
      
      mockSubscriptionRepository.findOne.mockResolvedValueOnce(pausedSubscription);
      mockSubscriptionRepository.save.mockResolvedValueOnce(pausedSubscription);
      mockEventRepository.save.mockResolvedValueOnce({});

      const beforeResume = Date.now();
      await subscriptionService.resumeSubscription("sub_abc123");
      const afterResume = Date.now();

      const savedSubscription = mockSubscriptionRepository.save.mock.calls[0][0];
      const nextBillingTime = savedSubscription.nextBillingDate.getTime();
      
      // Next billing date should be approximately one month from now
      expect(nextBillingTime).toBeGreaterThan(beforeResume);
      expect(nextBillingTime).toBeLessThan(afterResume + (32 * 24 * 60 * 60 * 1000)); // 32 days
    });
  });

  describe("cancelSubscription", () => {
    it("should cancel an active subscription", async () => {
      const activeSubscription = { ...mockSubscriptionData, status: SubscriptionStatus.ACTIVE };
      
      mockSubscriptionRepository.findOne.mockResolvedValueOnce(activeSubscription);
      mockSubscriptionRepository.save.mockResolvedValueOnce({
        ...activeSubscription,
        status: SubscriptionStatus.CANCELLED,
        endDate: expect.any(Date),
      });
      mockEventRepository.save.mockResolvedValueOnce({});

      const result = await subscriptionService.cancelSubscription("sub_abc123");

      expect(result.status).toBe(SubscriptionStatus.CANCELLED);
      expect(mockEventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: activeSubscription.id,
          eventType: SubscriptionEventType.CANCELLED,
        })
      );
    });
  });

  describe("processScheduledPayments", () => {
    const mockBillingCycle = {
      id: "cycle_1",
      subscription: {
        id: "sub_1",
        customerId: "cust_1",
        merchantId: "merchant_1",
        tokenAddress: "token_1",
        billingInterval: BillingInterval.MONTHLY,
        intervalCount: 1,
        maxRetries: 3,
        failedPaymentCount: 0,
        subscriptionId: "sub_abc123",
      },
      amount: 9.99,
      status: BillingCycleStatus.PENDING,
      retryCount: 0,
    };

    it("should process due billing cycles successfully", async () => {
      mockBillingCycleRepository.find.mockResolvedValueOnce([mockBillingCycle]);
      mockBillingCycleRepository.save.mockResolvedValue({});
      mockPaymentService.processPayment.mockResolvedValueOnce({});
      mockEventRepository.save.mockResolvedValueOnce({});
      mockSubscriptionRepository.save.mockResolvedValueOnce({});

      await subscriptionService.processScheduledPayments();

      expect(mockBillingCycleRepository.find).toHaveBeenCalledWith({
        where: {
          status: BillingCycleStatus.PENDING,
          dueDate: LessThanOrEqual(expect.any(Date)),
        },
        relations: ["subscription"],
      });
      expect(mockPaymentService.processPayment).toHaveBeenCalledWith(
        mockBillingCycle.subscription.customerId,
        mockBillingCycle.subscription.merchantId,
        mockBillingCycle.amount,
        mockBillingCycle.subscription.tokenAddress,
        `sub_${mockBillingCycle.id}`,
        expect.any(Number), // expiration timestamp
        expect.any(String) // payment ID
      );
    });

    it("should handle payment success correctly", async () => {
      mockBillingCycleRepository.find.mockResolvedValueOnce([mockBillingCycle]);
      mockBillingCycleRepository.save.mockResolvedValue({});
      mockPaymentService.processPayment.mockResolvedValueOnce({});
      mockEventRepository.save.mockResolvedValueOnce({});
      mockSubscriptionRepository.save.mockResolvedValueOnce({});

      await subscriptionService.processScheduledPayments();

      // Verify payment success event is logged
      expect(mockEventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: mockBillingCycle.subscription.id,
          eventType: SubscriptionEventType.PAYMENT_SUCCESS,
          eventData: { billingCycleId: mockBillingCycle.id },
        })
      );
    });

    it("should handle payment failure and retry", async () => {
      const failingCycle = { ...mockBillingCycle, retryCount: 0 };
      
      mockBillingCycleRepository.find.mockResolvedValueOnce([failingCycle]);
      mockBillingCycleRepository.save.mockResolvedValue({});
      mockPaymentService.processPayment.mockRejectedValueOnce(new Error("Payment failed"));
      mockEventRepository.save.mockResolvedValueOnce({});
      mockSubscriptionRepository.save.mockResolvedValueOnce({});

      await subscriptionService.processScheduledPayments();

      // Verify retry event is logged
      expect(mockEventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: failingCycle.subscription.id,
          eventType: SubscriptionEventType.PAYMENT_RETRY,
          eventData: { billingCycleId: failingCycle.id, retryCount: 1 },
        })
      );
    });

    it("should start dunning process after max retries", async () => {
      const maxRetriedCycle = { ...mockBillingCycle, retryCount: 3 };
      
      mockBillingCycleRepository.find.mockResolvedValueOnce([maxRetriedCycle]);
      mockBillingCycleRepository.save.mockResolvedValue({});
      mockPaymentService.processPayment.mockRejectedValueOnce(new Error("Payment failed"));
      mockEventRepository.save.mockResolvedValueOnce({});
      mockSubscriptionRepository.save.mockResolvedValueOnce({});
      mockNotificationService.createNotification.mockResolvedValueOnce({});

      await subscriptionService.processScheduledPayments();

      // Verify dunning started event
      expect(mockEventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: maxRetriedCycle.subscription.id,
          eventType: SubscriptionEventType.DUNNING_STARTED,
          eventData: { billingCycleId: maxRetriedCycle.id },
        })
      );

      // Verify notification sent
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        title: "Payment Failed",
        message: `Subscription payment failed after ${maxRetriedCycle.subscription.maxRetries} attempts`,
        notificationType: NotificationType.MERCHANT,
        category: NotificationCategory.ERROR,
        recipientId: maxRetriedCycle.subscription.merchantId,
        metadata: { subscriptionId: maxRetriedCycle.subscription.subscriptionId },
      });
    });

    it("should handle empty billing cycles", async () => {
      mockBillingCycleRepository.find.mockResolvedValueOnce([]);

      await subscriptionService.processScheduledPayments();

      expect(mockPaymentService.processPayment).not.toHaveBeenCalled();
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle database errors gracefully", async () => {
      mockSubscriptionRepository.save.mockRejectedValueOnce(new Error("Database error"));

      await expect(
        subscriptionService.createSubscription({
          customerId: "cust_123",
          customerEmail: "test@example.com",
          merchantId: "merchant_123",
          amount: 9.99,
          currency: "USD",
          tokenAddress: "token_abc",
          billingInterval: BillingInterval.MONTHLY,
        })
      ).rejects.toThrow("Database error");
    });

    it("should handle yearly billing interval", async () => {
      const yearlyParams = {
        customerId: "cust_123",
        customerEmail: "test@example.com",
        merchantId: "merchant_123",
        amount: 99.99,
        currency: "USD",
        tokenAddress: "token_abc",
        billingInterval: BillingInterval.YEARLY,
        startDate: new Date("2024-01-01"),
      };

      mockSubscriptionRepository.save.mockResolvedValueOnce({
        ...mockSubscriptionData,
        billingInterval: BillingInterval.YEARLY,
        amount: 99.99,
      });
      mockBillingCycleRepository.save.mockResolvedValueOnce({});
      mockEventRepository.save.mockResolvedValueOnce({});
      mockNotificationService.createNotification.mockResolvedValueOnce({});

      await subscriptionService.createSubscription(yearlyParams);

      const savedSubscription = mockSubscriptionRepository.save.mock.calls[0][0];
      expect(savedSubscription.nextBillingDate.getFullYear()).toBe(2025);
    });
  });
});