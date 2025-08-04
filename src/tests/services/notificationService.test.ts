import { Repository, LessThan, Between } from "typeorm";
import { NotificationService } from "../../services/inAppNotificationService";
import { InAppNotificationEntity, NotificationType, NotificationCategory, NotificationStatus } from "../../entities/InAppNotification.entity";
import AppDataSource from "../../config/db";

// Mock the AppDataSource to prevent actual database connections during tests
jest.mock("../../config/db");

describe("NotificationService", () => {
  let notificationService: NotificationService;
  let mockRepository: jest.Mocked<Repository<InAppNotificationEntity>>;

  beforeEach(() => {
    // Before each test, create a mock repository with jest functions for each method
    mockRepository = {
      save: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    } as any;

    // Mock the getRepository method to return our mock repository
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
    notificationService = new NotificationService();
  });

  afterEach(() => {
    // Clear all mocks after each test to ensure a clean state
    jest.clearAllMocks();
  });

  describe("createNotification", () => {
    it("should create a notification successfully", async () => {
      const mockNotification = {
        id: "123",
        title: "Test Notification",
        message: "Test message",
        notificationType: NotificationType.MERCHANT,
        category: NotificationCategory.INFO,
        recipientId: "user123",
        isRead: false,
        status: NotificationStatus.UNREAD,
      } as InAppNotificationEntity;

      mockRepository.save.mockResolvedValue(mockNotification);

      const params = {
        title: "Test Notification",
        message: "Test message",
        notificationType: NotificationType.MERCHANT,
        category: NotificationCategory.INFO,
        recipientId: "user123",
      };

      const result = await notificationService.createNotification(params);

      // Verify that the save method was called with the correct parameters
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: params.title,
          message: params.message,
          notificationType: params.notificationType,
          category: params.category,
          recipientId: params.recipientId,
          isRead: false,
          status: NotificationStatus.UNREAD,
        })
      );
      expect(result).toEqual(mockNotification);
    });

    it("should handle repository error when creating a notification", async () => {
      const params = {
        title: "Test Notification",
        message: "Test message",
        notificationType: NotificationType.MERCHANT,
        category: NotificationCategory.INFO,
        recipientId: "user123",
      };

      // Mock a rejected promise to simulate a database error
      mockRepository.save.mockRejectedValue(new Error("Database error"));

      await expect(notificationService.createNotification(params)).rejects.toThrow("Database error");
    });
  });

  describe("getNotifications", () => {
    it("should return paginated notifications for a recipient", async () => {
      const mockNotifications = [
        { id: "1", title: "Notification 1" },
        { id: "2", title: "Notification 2" },
      ] as InAppNotificationEntity[];

      mockRepository.findAndCount.mockResolvedValue([mockNotifications, 2]);

      const filters = {
        recipientId: "user123",
        page: 1,
        limit: 20,
      };

      const result = await notificationService.getNotifications(filters);

      expect(result).toEqual({
        notifications: mockNotifications,
        total: 2,
        page: 1,
        limit: 20,
      });

      // Check if findAndCount was called with the correct query parameters
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { recipientId: "user123" },
        skip: 0,
        take: 20,
        order: { priority: "DESC", createdAt: "DESC" },
      });
    });

    it("should correctly filter notifications by category", async () => {
        const mockNotifications = [
            { id: "1", title: "Info Notification", category: NotificationCategory.INFO },
        ] as InAppNotificationEntity[];

        mockRepository.findAndCount.mockResolvedValue([mockNotifications, 1]);

        const filters = {
            recipientId: "user123",
            category: NotificationCategory.INFO,
            page: 1,
            limit: 20,
        };

        await notificationService.getNotifications(filters);

        expect(mockRepository.findAndCount).toHaveBeenCalledWith({
            where: {
                recipientId: "user123",
                category: NotificationCategory.INFO
            },
            skip: 0,
            take: 20,
            order: { priority: "DESC", createdAt: "DESC" },
        });
    });

    it("should correctly filter notifications by status", async () => {
        const mockNotifications = [
            { id: "1", title: "Unread Notification", status: NotificationStatus.UNREAD },
        ] as InAppNotificationEntity[];

        mockRepository.findAndCount.mockResolvedValue([mockNotifications, 1]);

        const filters = {
            recipientId: "user123",
            status: NotificationStatus.UNREAD,
            page: 1,
            limit: 20,
        };

        await notificationService.getNotifications(filters);

        expect(mockRepository.findAndCount).toHaveBeenCalledWith({
            where: {
                recipientId: "user123",
                status: NotificationStatus.UNREAD
            },
            skip: 0,
            take: 20,
            order: { priority: "DESC", createdAt: "DESC" },
        });
    });

    it("should filter by date range correctly", async () => {
        const dateFrom = new Date('2025-08-01T00:00:00.000Z');
        const dateTo = new Date('2025-08-31T00:00:00.000Z');
        const mockNotifications = [] as InAppNotificationEntity[];

        mockRepository.findAndCount.mockResolvedValue([mockNotifications, 0]);

        const filters = {
            recipientId: "user123",
            dateFrom,
            dateTo,
            page: 1,
            limit: 20,
        };

        await notificationService.getNotifications(filters);

        expect(mockRepository.findAndCount).toHaveBeenCalledWith({
            where: {
                recipientId: "user123",
                createdAt: Between(dateFrom, dateTo),
            },
            skip: 0,
            take: 20,
            order: { priority: "DESC", createdAt: "DESC" },
        });
    });
  });

  describe("markAsRead", () => {
    it("should mark a specific notification as read", async () => {
      const mockNotification = {
        id: "123",
        isRead: false,
        status: NotificationStatus.UNREAD,
      } as InAppNotificationEntity;

      const updatedNotification = {
        ...mockNotification,
        isRead: true,
        status: NotificationStatus.READ,
        readAt: expect.any(Date),
      };

      mockRepository.findOne.mockResolvedValue(mockNotification);
      mockRepository.save.mockResolvedValue(updatedNotification);

      const result = await notificationService.markAsRead("123", "user123");

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: "123", recipientId: "user123" },
      });
      // Ensure the save method is called with the updated read status and date
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isRead: true,
          status: NotificationStatus.READ,
          readAt: expect.any(Date),
        })
      );
      expect(result).toEqual(updatedNotification);
    });

    it("should throw an error if the notification to mark as read is not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        notificationService.markAsRead("123", "user123")
      ).rejects.toThrow("Notification not found");
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all unread notifications as read for a user", async () => {
      mockRepository.update.mockResolvedValue({ affected: 3 } as any);

      await notificationService.markAllAsRead("user123");

      // Verify update was called on the correct notifications with the correct new values
      expect(mockRepository.update).toHaveBeenCalledWith(
        { recipientId: "user123", isRead: false },
        {
          isRead: true,
          status: NotificationStatus.READ,
          readAt: expect.any(Date)
        }
      );
    });
  });

  describe("getUnreadCount", () => {
    it("should return the count of unread notifications", async () => {
      mockRepository.count.mockResolvedValue(5);

      const count = await notificationService.getUnreadCount("user123");

      expect(count).toBe(5);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: { recipientId: "user123", isRead: false },
      });
    });
  });

  describe("softDelete", () => {
    it("should archive a notification for a specific user", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await notificationService.softDelete("notif123", "user123");

      // Check if the notification status was updated to ARCHIVED
      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: "notif123", recipientId: "user123" },
        { status: NotificationStatus.ARCHIVED }
      );
    });
  });

  describe("deleteExpiredNotifications", () => {
    it("should delete notifications that have expired", async () => {
        mockRepository.delete.mockResolvedValue({ affected: 2 } as any);

        await notificationService.deleteExpiredNotifications();

        // Ensure delete is called with a condition to find notifications with an expiresAt date less than the current time
        expect(mockRepository.delete).toHaveBeenCalledWith({
            expiresAt: LessThan(expect.any(Date)),
        });
    });
  });

  describe("Template Methods", () => {
    it("createPaymentNotification should create a correctly formatted payment notification", async () => {
      const mockNotification = {} as InAppNotificationEntity;
      mockRepository.save.mockResolvedValue(mockNotification);

      const result = await notificationService.createPaymentNotification("user123", 100, "payment123");

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Payment Received",
          message: "You received a payment of $100",
          notificationType: NotificationType.MERCHANT,
          category: NotificationCategory.SUCCESS,
          recipientId: "user123",
          link: "/payments/payment123",
          metadata: { paymentId: "payment123", amount: 100 },
          priority: 5,
        })
      );
      expect(result).toEqual(mockNotification);
    });

    it("createFraudAlertNotification should create a correctly formatted fraud alert", async () => {
      const mockNotification = {} as InAppNotificationEntity;
      mockRepository.save.mockResolvedValue(mockNotification);

      const result = await notificationService.createFraudAlertNotification("user123", "txn123", "HIGH");

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Fraud Alert",
          message: "Suspicious activity detected on transaction txn123",
          notificationType: NotificationType.MERCHANT,
          category: NotificationCategory.WARNING,
          recipientId: "user123",
          link: "/fraud/alerts/txn123",
          metadata: { transactionId: "txn123", riskLevel: "HIGH" },
          priority: 10,
        })
      );
      expect(result).toEqual(mockNotification);
    });

    it("createSystemUpdateNotification should create a broadcast notification", async () => {
        const mockNotification = {} as InAppNotificationEntity;
        mockRepository.save.mockResolvedValue(mockNotification);

        const result = await notificationService.createSystemUpdateNotification(
            "System will be down for maintenance",
            "/maintenance"
        );

        expect(mockRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "System Update",
                message: "System will be down for maintenance",
                notificationType: NotificationType.BROADCAST,
                category: NotificationCategory.INFO,
                link: "/maintenance",
                priority: 3,
            })
        );
        expect(result).toEqual(mockNotification);
    });
  });

  describe("General Error Handling", () => {
    it("should handle database connection errors gracefully", async () => {
      mockRepository.save.mockRejectedValue(new Error("Connection timeout"));

      const params = {
        title: "Test",
        message: "Test message",
        notificationType: NotificationType.MERCHANT,
        category: NotificationCategory.INFO,
        recipientId: "user123",
      };

      await expect(notificationService.createNotification(params)).rejects.toThrow("Connection timeout");
    });

    it("should handle errors during findAndCount operations", async () => {
      mockRepository.findAndCount.mockRejectedValue(new Error("Query failed"));

      const filters = {
        recipientId: "user123",
        page: 1,
        limit: 20,
      };

      await expect(notificationService.getNotifications(filters)).rejects.toThrow("Query failed");
    });
  });
});
