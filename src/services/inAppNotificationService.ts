import { Repository } from "typeorm";
import AppDataSource from "../config/db";
import {
  InAppNotificationEntity,
  NotificationType,
  NotificationCategory,
  NotificationStatus,
} from "../entities/InAppNotification.entity";

export interface NotificationMetadata {
  [key: string]: string | number | boolean | null | undefined;
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

export class NotificationService {
  private notificationRepository: Repository<InAppNotificationEntity>;

  constructor() {
    this.notificationRepository = AppDataSource.getRepository(
      InAppNotificationEntity
    );
  }

  async createNotification(
    params: CreateNotificationParams
  ): Promise<InAppNotificationEntity> {
    const notification = new InAppNotificationEntity();
    notification.title = params.title;
    notification.message = params.message;
    notification.notificationType = params.notificationType;
    notification.category = params.category;

    // Only assign if defined
    if (params.recipientId !== undefined) {
      notification.recipientId = params.recipientId;
    }

    // Only assign if defined
    if (params.link !== undefined) {
      notification.link = params.link;
    }

    notification.metadata = params.metadata ?? {};
    notification.priority = params.priority ?? 0;
    notification.status = NotificationStatus.UNREAD;
    notification.isRead = false;

    return this.notificationRepository.save(notification);
  }
}
