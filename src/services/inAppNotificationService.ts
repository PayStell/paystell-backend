import {
  Repository,
  FindManyOptions,
  LessThan,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  FindOptionsWhere,
} from "typeorm";
import AppDataSource from "../config/db";
import {
  InAppNotificationEntity,
  NotificationType,
  NotificationCategory,
  NotificationStatus,
} from "../entities/InAppNotification.entity";

type MetadataValue = string | number | boolean | null;

export interface NotificationMetadata {
  [key: string]: MetadataValue;
}

export interface CreateNotificationParams {
  title: string;
  message: string;
  notificationType: NotificationType;
  category: NotificationCategory;
  recipientId?: string;
  link?: string;
  metadata?: NotificationMetadata;
  priority?: number;
  expiresAt?: Date;
}

export interface NotificationFilters {
  category?: NotificationCategory;
  status?: NotificationStatus;
  recipientId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export class NotificationService {
  private notificationRepository: Repository<InAppNotificationEntity>;

  constructor() {
    this.notificationRepository = AppDataSource.getRepository(
      InAppNotificationEntity,
    );
  }

  async createNotification(
    params: CreateNotificationParams,
  ): Promise<InAppNotificationEntity> {
    const notification = new InAppNotificationEntity();
    notification.title = params.title;
    notification.message = params.message;
    notification.notificationType = params.notificationType;
    notification.category = params.category;

    if (params.recipientId !== undefined) {
      notification.recipientId = params.recipientId;
    }

    if (params.link !== undefined) {
      notification.link = params.link;
    }
    if (params.expiresAt) {
      notification.expiresAt = params.expiresAt;
    }

    notification.metadata = params.metadata ?? {};
    notification.priority = params.priority ?? 0;
    notification.status = NotificationStatus.UNREAD;
    notification.isRead = false;

    return this.notificationRepository.save(notification);
  }

  async getNotifications(filters: NotificationFilters): Promise<{
    notifications: InAppNotificationEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const whereConditions: FindOptionsWhere<InAppNotificationEntity> = {};

    if (filters.category) whereConditions.category = filters.category;
    if (filters.status) whereConditions.status = filters.status;
    if (filters.recipientId) whereConditions.recipientId = filters.recipientId;

    if (filters.dateFrom && filters.dateTo) {
      whereConditions.createdAt = Between(filters.dateFrom, filters.dateTo);
    } else if (filters.dateFrom) {
      whereConditions.createdAt = MoreThanOrEqual(filters.dateFrom);
    } else if (filters.dateTo) {
      whereConditions.createdAt = LessThanOrEqual(filters.dateTo);
    }

    const findOptions: FindManyOptions<InAppNotificationEntity> = {
      where: whereConditions,
      skip,
      take: limit,
      order: { priority: "DESC", createdAt: "DESC" },
    };

    const [notifications, total] =
      await this.notificationRepository.findAndCount(findOptions);

    return {
      notifications,
      total,
      page,
      limit,
    };
  }

  async markAsRead(
    notificationId: string,
    recipientId?: string,
  ): Promise<InAppNotificationEntity> {
    const whereConditions: FindOptionsWhere<InAppNotificationEntity> = {
      id: notificationId,
    };
    if (recipientId) whereConditions.recipientId = recipientId;

    const notification = await this.notificationRepository.findOne({
      where: whereConditions,
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    notification.isRead = true;
    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();

    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(recipientId: string): Promise<void> {
    await this.notificationRepository.update(
      { recipientId, isRead: false },
      {
        isRead: true,
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    );
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { recipientId, isRead: false },
    });
  }

  async softDelete(
    notificationId: string,
    recipientId?: string,
  ): Promise<void> {
    const whereConditions: FindOptionsWhere<InAppNotificationEntity> = {
      id: notificationId,
    };
    if (recipientId) whereConditions.recipientId = recipientId;

    await this.notificationRepository.update(whereConditions, {
      status: NotificationStatus.ARCHIVED,
    });
  }

  async deleteExpiredNotifications(): Promise<void> {
    const now = new Date();
    await this.notificationRepository.delete({
      expiresAt: LessThan(now),
    });
  }

  // Template methods for automatic notifications
  async createPaymentNotification(
    recipientId: string,
    amount: number,
    paymentId: string,
  ): Promise<InAppNotificationEntity> {
    return this.createNotification({
      title: "Payment Received",
      message: `You received a payment of $${amount}`,
      notificationType: NotificationType.MERCHANT,
      category: NotificationCategory.SUCCESS,
      recipientId,
      link: `/payments/${paymentId}`,
      metadata: { paymentId, amount },
      priority: 5,
    });
  }

  async createFraudAlertNotification(
    recipientId: string,
    transactionId: string,
    riskLevel: string,
  ): Promise<InAppNotificationEntity> {
    return this.createNotification({
      title: "Fraud Alert",
      message: `Suspicious activity detected on transaction ${transactionId}`,
      notificationType: NotificationType.MERCHANT,
      category: NotificationCategory.WARNING,
      recipientId,
      link: `/fraud/alerts/${transactionId}`,
      metadata: { transactionId, riskLevel },
      priority: 10,
    });
  }

  async createSystemUpdateNotification(
    message: string,
    link?: string,
  ): Promise<InAppNotificationEntity> {
    return this.createNotification({
      title: "System Update",
      message,
      notificationType: NotificationType.BROADCAST,
      category: NotificationCategory.INFO,
      link,
      priority: 3,
    });
  }
}
