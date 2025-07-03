import { Request, Response } from "express";
import { WebhookLogService } from "../services/WebhookLogService";

export class WebhookLogController {
  private webhookLogService: WebhookLogService;

  constructor() {
    this.webhookLogService = new WebhookLogService();
  }

  /**
   * Get webhook logs with filtering and pagination
   */
  async getWebhookLogs(req: Request, res: Response): Promise<Response> {
    try {
      const {
        merchantId,
        status,
        startDate,
        endDate,
        limit,
        offset,
      } = req.query;

      // Parse and validate query parameters
      const filters = {
        merchantId: typeof merchantId === "string" ? merchantId : undefined,
        status: (status === "success" || status === "failed") ? status as "success" | "failed" : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string, 10) : 10,
        offset: offset ? parseInt(offset as string, 10) : 0,
      };

      // Validate date parameters
      if (filters.startDate && isNaN(filters.startDate.getTime())) {
        return res.status(400).json({
          status: "error",
          message: "Invalid startDate format. Use ISO 8601 format.",
        });
      }

      if (filters.endDate && isNaN(filters.endDate.getTime())) {
        return res.status(400).json({
          status: "error",
          message: "Invalid endDate format. Use ISO 8601 format.",
        });
      }

      // Validate numeric parameters
      if (isNaN(filters.limit) || filters.limit < 1) {
        filters.limit = 10;
      }

      if (isNaN(filters.offset) || filters.offset < 0) {
        filters.offset = 0;
      }

      const result = await this.webhookLogService.getWebhookLogs(filters);

      return res.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      console.error("Error fetching webhook logs:", error);
      return res.status(500).json({
        status: "error",
        message: (error as Error).message,
      });
    }
  }

  /**
   * Get a specific webhook log by ID
   */
  async getWebhookLogById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          status: "error",
          message: "Webhook log ID is required",
        });
      }

      const webhookLog = await this.webhookLogService.getWebhookLogById(id);

      if (!webhookLog) {
        return res.status(404).json({
          status: "error",
          message: "Webhook log not found",
        });
      }

      return res.json({
        status: "success",
        data: webhookLog,
      });
    } catch (error) {
      console.error("Error fetching webhook log:", error);
      return res.status(500).json({
        status: "error",
        message: (error as Error).message,
      });
    }
  }

  /**
   * Get webhook log statistics
   */
  async getWebhookLogStats(req: Request, res: Response): Promise<Response> {
    try {
      const { merchantId } = req.query;

      const stats = await this.webhookLogService.getWebhookLogStats(
        typeof merchantId === "string" ? merchantId : undefined,
      );

      return res.json({
        status: "success",
        data: stats,
      });
    } catch (error) {
      console.error("Error fetching webhook log stats:", error);
      return res.status(500).json({
        status: "error",
        message: (error as Error).message,
      });
    }
  }

  /**
   * Get recent webhook activity
   */
  async getRecentActivity(req: Request, res: Response): Promise<Response> {
    try {
      const { merchantId, limit } = req.query;

      const parsedLimit = limit ? parseInt(limit as string, 10) : 20;
      const validLimit = isNaN(parsedLimit) || parsedLimit < 1 ? 20 : Math.min(parsedLimit, 50);

      const activity = await this.webhookLogService.getRecentActivity(
        typeof merchantId === "string" ? merchantId : undefined,
        validLimit,
      );

      return res.json({
        status: "success",
        data: activity,
      });
    } catch (error) {
      console.error("Error fetching recent webhook activity:", error);
      return res.status(500).json({
        status: "error",
        message: (error as Error).message,
      });
    }
  }
} 