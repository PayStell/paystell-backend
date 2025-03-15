import { Request, Response } from "express";
import { MerchantWebhookQueueService } from "../services/merchantWebhookQueue.service";

/**
 * Singleton instance of the queue service for webhook management
 */
const merchantWebhookQueueService = new MerchantWebhookQueueService();

/**
 * Controller for managing webhook queue operations and admin interfaces
 * Provides endpoints for viewing webhook statuses and metrics
 */
export class MerchantWebhookQueueController {
  /**
   * Retrieves failed webhook events with pagination
   * Allows filtering by merchantId
   */
  async getFailedWebhooks(req: Request, res: Response): Promise<Response> {
    try {
      // Extract query parameters with type safety
      const merchantId = typeof req.query.merchantId === 'string' 
        ? req.query.merchantId 
        : undefined;
      
      // Set limit with upper bound to prevent excessive queries
      const limitNum = Math.min(
        parseInt(req.query.limit as string) || 10, 
        100
      );
      
      // Ensure offset is never negative
      const offsetNum = Math.max(
        parseInt(req.query.offset as string) || 0,
        0
      );

      // Fetch failed webhook events from database
      const failedWebhooks = await merchantWebhookQueueService.getFailedWebhookEvents(
        merchantId,
        limitNum,
        offsetNum
      );

      return res.json({
        status: "success",
        data: failedWebhooks,
      });
    } catch (error) {
      console.error("Error fetching failed webhooks:", error);
      return res.status(500).json({
        status: "error",
        message: (error as Error).message,
      });
    }
  }

  /**
   * Retrieves pending webhook events with pagination
   * Shows webhooks that are scheduled for retry
   */
  async getPendingWebhooks(req: Request, res: Response): Promise<Response> {
    try {
      // Extract query parameters with type safety
      const merchantId = typeof req.query.merchantId === 'string' 
        ? req.query.merchantId 
        : undefined;
      
      // Set limit with upper bound to prevent excessive queries
      const limitNum = Math.min(
        parseInt(req.query.limit as string) || 10, 
        100
      );
      
      // Ensure offset is never negative
      const offsetNum = Math.max(
        parseInt(req.query.offset as string) || 0,
        0
      );

      // Fetch pending webhook events from database
      const pendingWebhooks = await merchantWebhookQueueService.getPendingWebhookEvents(
        merchantId,
        limitNum,
        offsetNum
      );

      return res.json({
        status: "success",
        data: pendingWebhooks,
      });
    } catch (error) {
      console.error("Error fetching pending webhooks:", error);
      return res.status(500).json({
        status: "error",
        message: (error as Error).message,
      });
    }
  }

  /**
   * Manually triggers a retry for a failed webhook
   * Resets the retry counter and updates status
   */
  async retryWebhook(req: Request, res: Response): Promise<Response> {
    try {
      // Get job ID from URL parameter
      const { jobId } = req.params;

      // Validate job ID is provided
      if (!jobId) {
        return res.status(400).json({
          status: "error",
          message: "Job ID is required",
        });
      }

      // Queue webhook for retry
      await merchantWebhookQueueService.retryWebhook(jobId);

      return res.json({
        status: "success",
        message: "Webhook queued for retry",
      });
    } catch (error) {
      console.error("Error retrying webhook:", error);
      return res.status(500).json({
        status: "error",
        message: (error as Error).message,
      });
    }
  }

  /**
   * Retrieves webhook queue metrics
   * Shows active, completed, failed, and pending webhooks
   * Includes success rate calculations
   */
  async getQueueMetrics(req: Request, res: Response): Promise<Response> {
    try {
      // Extract merchantId for filtering metrics
      const merchantId = typeof req.query.merchantId === 'string' 
        ? req.query.merchantId 
        : undefined;
      
      // Fetch queue metrics including success rates
      const metrics = await merchantWebhookQueueService.getQueueMetrics(merchantId);

      return res.json({
        status: "success",
        data: metrics,
      });
    } catch (error) {
      console.error("Error fetching queue metrics:", error);
      return res.status(500).json({
        status: "error",
        message: (error as Error).message,
      });
    }
  }
}