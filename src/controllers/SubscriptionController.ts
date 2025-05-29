import type { Request, Response, NextFunction } from "express";
import { SubscriptionService } from "../services/SubscriptionService";
import { BillingInterval } from "../entities/Subscription";
import logger from "../utils/logger";
import { validationResult } from "express-validator";

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
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const {
        customerId,
        customerEmail,
        merchantId,
        amount,
        currency,
        tokenAddress,
        billingInterval,
        intervalCount,
        startDate,
        metadata,
      } = req.body;

      if (!merchantId) {
        res.status(400).json({
          success: false,
          message: "Merchant ID is required",
        });
        return;
      }

      const subscription = await this.subscriptionService.createSubscription({
        customerId,
        customerEmail,
        merchantId,
        amount: parseFloat(amount),
        currency,
        tokenAddress,
        billingInterval: billingInterval as BillingInterval,
        intervalCount: intervalCount ? parseInt(intervalCount) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        metadata,
      });

      logger.info(`Subscription created: ${subscription.subscriptionId}`, {
        subscriptionId: subscription.subscriptionId,
        merchantId,
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
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { subscriptionId } = req.params;
      const subscription = await this.subscriptionService.getSubscription(subscriptionId);

      if (!subscription) {
        res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
        return;
      }

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
      const { merchantId } = req.query;

      if (!merchantId || typeof merchantId !== 'string') {
        res.status(400).json({
          success: false,
          message: "Merchant ID is required as query parameter",
        });
        return;
      }

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
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { subscriptionId } = req.params;
      const subscription = await this.subscriptionService.pauseSubscription(subscriptionId);

      if (!subscription) {
        res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
        return;
      }

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
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { subscriptionId } = req.params;
      const subscription = await this.subscriptionService.resumeSubscription(subscriptionId);

      if (!subscription) {
        res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
        return;
      }

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
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { subscriptionId } = req.params;
      const subscription = await this.subscriptionService.cancelSubscription(subscriptionId);

      if (!subscription) {
        res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
        return;
      }

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