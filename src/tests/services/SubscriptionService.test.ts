import { SubscriptionService } from "../../services/SubscriptionService";
import { BillingInterval, Subscription, SubscriptionStatus } from "../../entities/Subscription";
import { BillingCycle, BillingCycleStatus } from "../../entities/BillingCycle";
import { SubscriptionEvent, SubscriptionEventType } from "../../entities/SubscriptionEvent";
import { NotificationType, NotificationCategory } from "../../entities/InAppNotification.entity";
import AppDataSource from "../../config/db";
import { AppError } from "../../utils/AppError";
import { LessThanOrEqual, Repository } from "typeorm";
import { PaymentService } from "../../services/PaymentService";
import { NotificationService } from "../../services/inAppNotificationService";

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
  let mockSubscriptionRepository: Partial<Repository<Subscription>>;
  let mockBillingCycleRepository: Partial<Repository<BillingCycle>>;
  let mockEventRepository: Partial<Repository<SubscriptionEvent>>;
  let mockPaymentService: Partial<PaymentService>;
  let mockNotificationService: Partial<NotificationService>;

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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SubscriptionServiceClass = require("../../services/SubscriptionService").SubscriptionService;
    subscriptionService = new SubscriptionServiceClass();
    
    // Replace the service instances with mocks
    (subscriptionService as unknown as { paymentService: unknown; notificationService: unknown }).paymentService = mockPaymentService;
    (subscriptionService as unknown as { paymentService: unknown; notificationService: unknown }).notificationService = mockNotificationService;
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
      (mockSubscriptionRepository.save as jest.Mock).mockResolvedValueOnce(mockSubscriptionData);
      (mockBillingCycleRepository.save as jest.Mock).mockResolvedValueOnce({
        id: "cycle_1",
        subscriptionId: mockSubscriptionData.id,
        status: BillingCycleStatus.PENDING,
      });
      (mockEventRepository.save as jest.Mock).mockResolvedValueOnce({});
      (mockNotificationService.createNotification as jest.Mock).mockResolvedValueOnce({});

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

      (mockSubscriptionRepository.save as jest.Mock).mockResolvedValueOnce(mockSubscriptionData);
      (mockBillingCycleRepository.save as jest.Mock).mockResolvedValueOnce({});
      (mockEventRepository.save as jest.Mock).mockResolvedValueOnce({});
      (mockNotificationService.createNotification as jest.Mock).mockResolvedValueOnce({});

      await subscriptionService.createSubscription(paramsWithStartDate);

      const savedSubscription = (mockSubscriptionRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedSubscription.nextBillingDate.getMonth()).toBe(1); // February (0-indexed)
      expect(savedSubscription.nextBillingDate.getDate()).toBe(1);
    });

    it("should calculate next billing date correctly for weekly subscription", async () => {
      const weeklyParams = { ...createParams, billingInterval: BillingInterval.WEEKLY };
      const startDate = new Date("2024-01-01");
      const expectedNextDate = new Date("2024-01-08");

      (mockSubscriptionRepository.save as jest.Mock).mockResolvedValueOnce({
        ...mockSubscriptionData,
        billingInterval: BillingInterval.WEEKLY,
        nextBillingDate: expectedNextDate,
      });
      (mockBillingCycleRepository.save as jest.Mock).mockResolvedValueOnce({});
      (mockEventRepository.save as jest.Mock).mockResolvedValueOnce({});
      (mockNotificationService.createNotification as jest.Mock).mockResolvedValueOnce({});

      await subscriptionService.createSubscription({ ...weeklyParams, startDate });

      const savedSubscription = (mockSubscriptionRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedSubscription.nextBillingDate.getTime()).toBe(expectedNextDate.getTime());
    });

    it("should handle custom interval count", async () => {
      const customParams = { ...createParams, intervalCount: 3 };
      const startDate = new Date("2024-01-01");

      (mockSubscriptionRepository.save as jest.Mock).mockResolvedValueOnce(mockSubscriptionData);
      (mockBillingCycleRepository.save as jest.Mock).mockResolvedValueOnce({});
      (mockEventRepository.save as jest.Mock).mockResolvedValueOnce({});
      (mockNotificationService.createNotification as jest.Mock).mockResolvedValueOnce({});

      await subscriptionService.createSubscription({ ...customParams, startDate });

      const savedSubscription = (mockSubscriptionRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedSubscription.intervalCount).toBe(3);
      expect(savedSubscription.nextBillingDate.getMonth()).toBe(3); // April (3 months later)
    });

    it("should handle metadata", async () => {
      const metadata = { customField: "value", userId: 123 };
      const paramsWithMetadata = { ...createParams, metadata };

      (mockSubscriptionRepository.save as jest.Mock).mockResolvedValueOnce({ ...mockSubscriptionData, metadata });
      (mockBillingCycleRepository.save as jest.Mock).mockResolvedValueOnce({});
      (mockEventRepository.save as jest.Mock).mockResolvedValueOnce({});
      (mockNotificationService.createNotification as jest.Mock).mockResolvedValueOnce({});

      const result = await subscriptionService.createSubscription(paramsWithMetadata);

      expect(result.metadata).toEqual(metadata);
    });
  });

  describe("getSubscription", () => {
    it("should retrieve subscription with relations", async () => {
      (mockSubscriptionRepository.findOne as jest.Mock).mockResolvedValueOnce(mockSubscriptionData);

      const result = await subscriptionService.getSubscription("sub_abc123");

      expect(mockSubscriptionRepository.findOne).toHaveBeenCalledWith({
        where: { subscriptionId: "sub_abc123" },
        relations: ["merchant", "billingCycles", "events"],
      });
      expect(result).toEqual(mockSubscriptionData);
    });

    it("should throw AppError if subscription not found", async () => {
      (mockSubscriptionRepository.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        subscriptionService.getSubscription("non_existent")
      ).rejects.toThrow(AppError);
    });
  });

  describe("getSubscriptionsByMerchant", () => {
    it("should retrieve subscriptions for merchant", async () => {
      const subscriptions = [mockSubscriptionData];
      (mockSubscriptionRepository.find as jest.Mock).mockResolvedValueOnce(subscriptions);

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

      (mockSubscriptionRepository.findOne as jest.Mock).mockResolvedValueOnce(activeSubscription);
      (mockSubscriptionRepository.save as jest.Mock).mockResolvedValueOnce(pausedSubscription);
      (mockEventRepository.save as jest.Mock).mockResolvedValueOnce({});

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
      (mockSubscriptionRepository.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        subscriptionService.pauseSubscription("non_existent")
      ).rejects.toThrow(AppError);
    });
  });

  describe("resumeSubscription", () => {
    it("should resume a paused subscription", async () => {
      const pausedSubscription = { ...mockSubscriptionData, status: SubscriptionStatus.PAUSED };
      const activeSubscription = { ...pausedSubscription, status: SubscriptionStatus.ACTIVE };

      (mockSubscriptionRepository.findOne as jest.Mock).mockResolvedValueOnce(pausedSubscription);
      (mockSubscriptionRepository.save as jest.Mock).mockResolvedValueOnce(activeSubscription);
      (mockEventRepository.save as jest.Mock).mockResolvedValueOnce({});

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
      
      (mockSubscriptionRepository.findOne as jest.Mock).mockResolvedValueOnce(pausedSubscription);
      (mockSubscriptionRepository.save as jest.Mock).mockResolvedValueOnce(pausedSubscription);
      (mockEventRepository.save as jest.Mock).mockResolvedValueOnce({});

      const beforeResume = Date.now();
      await subscriptionService.resumeSubscription("sub_abc123");
      const afterResume = Date.now();

      const savedSubscription = (mockSubscriptionRepository.save as jest.Mock).mock.calls[0][0];
      const nextBillingTime = savedSubscription.nextBillingDate.getTime();
      
      // Next billing date should be approximately one month from now
      expect(nextBillingTime).toBeGreaterThan(beforeResume);
      expect(nextBillingTime).toBeLessThan(afterResume + (32 * 24 * 60 * 60 * 1000)); // 32 days
    });
  });

  describe("cancelSubscription", () => {
    it("should cancel an active subscription", async () => {
      const activeSubscription = { ...mockSubscriptionData, status: SubscriptionStatus.ACTIVE };
      
      (mockSubscriptionRepository.findOne as jest.Mock).mockResolvedValueOnce(activeSubscription);
      (mockSubscriptionRepository.save as jest.Mock).mockResolvedValueOnce({
        ...activeSubscription,
        status: SubscriptionStatus.CANCELLED,
        endDate: expect.any(Date),
      });
      (mockEventRepository.save as jest.Mock).mockResolvedValueOnce({});

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
      (mockBillingCycleRepository.find as jest.Mock).mockResolvedValueOnce([mockBillingCycle]);
      (mockBillingCycleRepository.save as jest.Mock).mockResolvedValue({});
      (mockPaymentService.processPayment as jest.Mock).mockResolvedValueOnce({});
      (mockEventRepository.save as jest.Mock).mockResolvedValueOnce({});
      (mockSubscriptionRepository.save as jest.Mock).mockResolvedValueOnce({});

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
      (mockBillingCycleRepository.find as jest.Mock).mockResolvedValueOnce([mockBillingCycle]);
      (mockBillingCycleRepository.save as jest.Mock).mockResolvedValue({});
      (mockPaymentService.processPayment as jest.Mock).mockResolvedValueOnce({});
      (mockEventRepository.save as jest.Mock).mockResolvedValueOnce({});
      (mockSubscriptionRepository.save as jest.Mock).mockResolvedValueOnce({});

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
      
      (mockBillingCycleRepository.find as jest.Mock).mockResolvedValueOnce([failingCycle]);
      (mockBillingCycleRepository.save as jest.Mock).mockResolvedValue({});
      (mockPaymentService.processPayment as jest.Mock).mockRejectedValueOnce(new Error("Payment failed"));
      (mockEventRepository.save as jest.Mock).mockResolvedValueOnce({});
      (mockSubscriptionRepository.save as jest.Mock).mockResolvedValueOnce({});

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
      
      (mockBillingCycleRepository.find as jest.Mock).mockResolvedValueOnce([maxRetriedCycle]);
      (mockBillingCycleRepository.save as jest.Mock).mockResolvedValue({});
      (mockPaymentService.processPayment as jest.Mock).mockRejectedValueOnce(new Error("Payment failed"));
      (mockEventRepository.save as jest.Mock).mockResolvedValueOnce({});
      (mockSubscriptionRepository.save as jest.Mock).mockResolvedValueOnce({});
      (mockNotificationService.createNotification as jest.Mock).mockResolvedValueOnce({});

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
      (mockBillingCycleRepository.find as jest.Mock).mockResolvedValueOnce([]);

      await subscriptionService.processScheduledPayments();

      expect(mockPaymentService.processPayment).not.toHaveBeenCalled();
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle database errors gracefully", async () => {
      (mockSubscriptionRepository.save as jest.Mock).mockRejectedValueOnce(new Error("Database error"));

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

      (mockSubscriptionRepository.save as jest.Mock).mockResolvedValueOnce({
        ...mockSubscriptionData,
        billingInterval: BillingInterval.YEARLY,
        amount: 99.99,
      });
      (mockBillingCycleRepository.save as jest.Mock).mockResolvedValueOnce({});
      (mockEventRepository.save as jest.Mock).mockResolvedValueOnce({});
      (mockNotificationService.createNotification as jest.Mock).mockResolvedValueOnce({});

      await subscriptionService.createSubscription(yearlyParams);

      const savedSubscription = (mockSubscriptionRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedSubscription.nextBillingDate.getFullYear()).toBe(2025);
    });
  });
});