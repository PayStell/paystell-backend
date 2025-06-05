import type { Request, Response, NextFunction } from "express";
import { SubscriptionService } from "../services/SubscriptionService";
import { BillingInterval } from "../entities/Subscription";
import logger from "../utils/logger";
import { z } from "zod";

// Zod validation schemas
const createSubscriptionSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  customerEmail: z.string().email("Valid customer email is required"),
  merchantId: z.string().min(1, "Merchant ID is required"),
  amount: z.string().transform((val) => parseFloat(val)).pipe(z.number().positive("Amount must be greater than 0")),
  currency: z.string().min(1, "Currency is required"),
  tokenAddress: z.string().min(1, "Token address is required"),
  billingInterval: z.enum(["monthly", "yearly", "weekly", "custom"], {
    errorMap: () => ({ message: "Invalid billing interval" })
  }),
  intervalCount: z.string().transform((val) => parseInt(val)).pipe(z.number().int().positive("Interval count must be positive")).optional(),
  startDate: z.string().datetime("Invalid start date format").transform((val) => new Date(val)).optional(),
  metadata: z.record(z.any()).optional(),
});

const subscriptionIdSchema = z.object({
  subscriptionId: z.string().min(1, "Subscription ID is required"),
});

const merchantIdSchema = z.object({
  merchantId: z.string().min(1, "Merchant ID is required"),
});

export class SubscriptionController {
  private subscriptionService: SubscriptionService;

  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  async createSubscription(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Validate request using Zod
      const validationResult = createSubscriptionSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationResult.error.errors,
        });
        return;
      }

      const data = validationResult.data;

      const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount;
      const intervalCount = data.intervalCount && typeof data.intervalCount === 'string' ? parseInt(data.intervalCount) : data.intervalCount;

      const subscription = await this.subscriptionService.createSubscription({
        customerId: data.customerId,
        customerEmail: data.customerEmail,
        merchantId: data.merchantId,
        amount: amount,
        currency: data.currency,
        tokenAddress: data.tokenAddress,
        billingInterval: data.billingInterval as BillingInterval,
        intervalCount: intervalCount,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        metadata: data.metadata,
      });

      logger.info(`Subscription created: ${subscription.subscriptionId}`, {
        subscriptionId: subscription.subscriptionId,
        merchantId: data.merchantId,
      });

      res.status(201).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      logger.error("Error creating subscription:", error);
      next(error);
    }
  }

  async getSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request using Zod
      const validationResult = subscriptionIdSchema.safeParse(req.params);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationResult.error.errors,
        });
        return;
      }

      const { subscriptionId } = validationResult.data;
      const subscription = await this.subscriptionService.getSubscription(subscriptionId);

      res.status(200).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      logger.error("Error getting subscription:", error);
      next(error);
    }
  }

  async getMerchantSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request using Zod
      const validationResult = merchantIdSchema.safeParse(req.query);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationResult.error.errors,
        });
        return;
      }

      const { merchantId } = validationResult.data;
      const subscriptions = await this.subscriptionService.getSubscriptionsByMerchant(merchantId);

      res.status(200).json({
        success: true,
        data: subscriptions,
        count: subscriptions.length,
      });
    } catch (error) {
      logger.error("Error getting merchant subscriptions:", error);
      next(error);
    }
  }

  async pauseSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request using Zod
      const validationResult = subscriptionIdSchema.safeParse(req.params);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationResult.error.errors,
        });
        return;
      }

      const { subscriptionId } = validationResult.data;
      const subscription = await this.subscriptionService.pauseSubscription(subscriptionId);

      logger.info(`Subscription paused: ${subscriptionId}`);

      res.status(200).json({
        success: true,
        message: "Subscription paused successfully",
        data: subscription,
      });
    } catch (error) {
      logger.error("Error pausing subscription:", error);
      next(error);
    }
  }

  async resumeSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request using Zod
      const validationResult = subscriptionIdSchema.safeParse(req.params);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationResult.error.errors,
        });
        return;
      }

      const { subscriptionId } = validationResult.data;
      const subscription = await this.subscriptionService.resumeSubscription(subscriptionId);

      logger.info(`Subscription resumed: ${subscriptionId}`);

      res.status(200).json({
        success: true,
        message: "Subscription resumed successfully",
        data: subscription,
      });
    } catch (error) {
      logger.error("Error resuming subscription:", error);
      next(error);
    }
  }

  async cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request using Zod
      const validationResult = subscriptionIdSchema.safeParse(req.params);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationResult.error.errors,
        });
        return;
      }

      const { subscriptionId } = validationResult.data;
      const subscription = await this.subscriptionService.cancelSubscription(subscriptionId);

      logger.info(`Subscription cancelled: ${subscriptionId}`);

      res.status(200).json({
        success: true,
        message: "Subscription cancelled successfully",
        data: subscription,
      });
    } catch (error) {
      logger.error("Error cancelling subscription:", error);
      next(error);
    }
  }
}