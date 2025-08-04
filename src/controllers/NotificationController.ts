import { Request, Response, NextFunction } from "express";
import { NotificationService, NotificationFilters } from "../services/inAppNotificationService";
import { NotificationCategory, NotificationStatus } from "../entities/InAppNotification.entity";
import { AppError } from "../utils/AppError";

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id.toString();
      if (!userId) {
        throw new AppError("User not authenticated", 401);
      }

      const filters: NotificationFilters = {
        recipientId: userId,
        category: req.query.category as NotificationCategory,
        status: req.query.status as NotificationStatus,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      if (req.query.dateFrom) {
        filters.dateFrom = new Date(req.query.dateFrom as string);
      }
      if (req.query.dateTo) {
        filters.dateTo = new Date(req.query.dateTo as string);
      }

      const result = await this.notificationService.getNotifications(filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.id.toString();

      if (!userId) {
        throw new AppError("User not authenticated", 401);
      }

      const notification = await this.notificationService.markAsRead(notificationId, userId);

      res.status(200).json({
        success: true,
        data: notification,
        message: "Notification marked as read",
      });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id.toString();
      if (!userId) {
        throw new AppError("User not authenticated", 401);
      }

      await this.notificationService.markAllAsRead(userId);

      res.status(200).json({
        success: true,
        message: "All notifications marked as read",
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id.toString();
      if (!userId) {
        throw new AppError("User not authenticated", 401);
      }

      const count = await this.notificationService.getUnreadCount(userId);

      res.status(200).json({
        success: true,
        data: { unreadCount: count },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.id.toString();

      if (!userId) {
        throw new AppError("User not authenticated", 401);
      }

      await this.notificationService.softDelete(notificationId, userId);

      res.status(200).json({
        success: true,
        message: "Notification deleted",
      });
    } catch (error) {
      next(error);
    }
  }
}