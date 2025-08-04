import { Request, Response, NextFunction } from "express";
import { NotificationService } from "../services/inAppNotificationService";
import logger from "../utils/logger";

interface PaymentCompletedEvent {
  type: "payment_completed";
  recipientId: string;
  amount: number;
  paymentId: string;
}

interface FraudDetectedEvent {
  type: "fraud_detected";
  recipientId: string;
  transactionId: string;
  riskLevel: string;
}

interface SystemUpdateEvent {
  type: "system_update";
  message: string;
  link?: string;
}

type NotificationEvent = PaymentCompletedEvent | FraudDetectedEvent | SystemUpdateEvent;

export class NotificationEventMiddleware {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  // Middleware to attach notification events to response
  attachNotificationEvent() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to check for notification events
      res.json = (body: any) => {
        // Check if response contains notification events
        if (body.notificationEvent) {
          this.processNotificationEvent(body.notificationEvent);
        }

        return originalJson(body);
      };

      next();
    };
  }

  private async processNotificationEvent(event: NotificationEvent): Promise<void> {
    try {
      switch (event.type) {
        case "payment_completed":
          await this.notificationService.createPaymentNotification(
            event.recipientId,
            event.amount,
            event.paymentId
          );
          break;

        case "fraud_detected":
          await this.notificationService.createFraudAlertNotification(
            event.recipientId,
            event.transactionId,
            event.riskLevel
          );
          break;

        case "system_update":
          await this.notificationService.createSystemUpdateNotification(
            event.message,
            event.link
          );
          break;

        default:
          logger.warn("Unknown notification event type", { event });
      }
    } catch (error) {
      logger.error("Failed to process notification event", { error, event });
    }
  }

  // Helper methods for controllers to trigger notifications
  static triggerPaymentNotification(
    res: Response,
    recipientId: string,
    amount: number,
    paymentId: string
  ): void {
    const currentBody = res.locals.responseBody || {};
    currentBody.notificationEvent = {
      type: "payment_completed" as const,
      recipientId,
      amount,
      paymentId,
    };
    res.locals.responseBody = currentBody;
  }

  static triggerFraudNotification(
    res: Response,
    recipientId: string,
    transactionId: string,
    riskLevel: string
  ): void {
    const currentBody = res.locals.responseBody || {};
    currentBody.notificationEvent = {
      type: "fraud_detected" as const,
      recipientId,
      transactionId,
      riskLevel,
    };
    res.locals.responseBody = currentBody;
  }

  static triggerSystemUpdateNotification(
    res: Response,
    message: string,
    link?: string
  ): void {
    const currentBody = res.locals.responseBody || {};
    currentBody.notificationEvent = {
      type: "system_update" as const,
      message,
      link,
    };
    res.locals.responseBody = currentBody;
  }
}

export const notificationEventMiddleware = new NotificationEventMiddleware();