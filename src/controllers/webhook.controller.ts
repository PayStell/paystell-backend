import { WebhookNotificationService } from "../services/webhookNotification.service";
import { WebhookPayload } from "../interfaces/webhook.interfaces";
import { MerchantAuthService } from "../services/merchant.service";
import { WebhookService } from "../services/webhook.service";
import { Request, Response } from "express";
import { CryptoGeneratorService } from "../services/cryptoGenerator.service";
import { Between, Like } from "typeorm";
import { WebhookLog } from "src/entities/webLog.entity";
import AppDataSource from "src/config/db";

// TODO: this initialization needs to be moved to dependency injection
const defaultWebhookService = new WebhookService();
const defaultMerchantAuthService = new MerchantAuthService();
const defaultCryptoGeneratorService = new CryptoGeneratorService();
const defaultWebhookNotificationService = new WebhookNotificationService(
  defaultMerchantAuthService,
  defaultCryptoGeneratorService,
);

export class WebhookController {
  private webhookService: WebhookService;
  private webhookNotificationService: WebhookNotificationService;
  private merchantAuthService: MerchantAuthService;

  constructor(
    webhookService?: WebhookService,
    merchantAuthService?: MerchantAuthService,
    webhookNotificationService?: WebhookNotificationService,
  ) {
    this.webhookService = webhookService || defaultWebhookService;
    this.merchantAuthService =
      merchantAuthService || defaultMerchantAuthService;
    this.webhookNotificationService =
      webhookNotificationService || defaultWebhookNotificationService;
  }

  async handleWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const { signature } = req.headers;
      const merchantId = req.params.merchantId;

      if (!signature || !merchantId) {
        return res.status(400).json({
          status: "error",
          code: "MISSING_PARAMETERS",
          message: "Missing required parameters",
        });
      }

      // Get merchant and webhook
      const merchant =
        await this.merchantAuthService.getMerchantById(merchantId);
      if (!merchant) {
        return res.status(404).json({
          status: "error",
          code: "MERCHANT_NOT_FOUND",
          message: "Merchant not found",
        });
      }

      const webhook = await this.webhookService.getMerchantWebhook(merchantId);
      if (!webhook) {
        return res.status(404).json({
          status: "error",
          code: "WEBHOOK_NOT_FOUND",
          message: "Webhook not found",
        });
      }

      // Verify signature
      const payload = req.body as WebhookPayload;
      const isValid =
        await this.webhookNotificationService.sendWebhookNotification(
          webhook.url,
          payload,
          merchantId,
        );

      if (!isValid) {
        return res.status(401).json({
          status: "error",
          code: "INVALID_SIGNATURE",
          message: "Invalid webhook signature",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Webhook processed successfully",
      });
    } catch (error) {
      console.error("Webhook error: ", error);
      return res.status(500).json({
        status: "error",
        code: "INTERNAL_ERROR",
        message: (error as Error).message,
      });
    }
  }

  async testWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const merchantId = req.user?.id?.toString();

      if (!merchantId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      // Get merchant and webhook
      const merchant =
        await this.merchantAuthService.getMerchantById(merchantId);
      if (!merchant) {
        return res.status(404).json({
          status: "error",
          message: "Merchant not found",
        });
      }

      const webhook = await this.webhookService.getMerchantWebhook(merchantId);
      if (!webhook) {
        return res.status(404).json({
          status: "error",
          message: "No webhook configured for this merchant",
        });
      }

      // Create test webhook payload
      const testPayload: WebhookPayload = {
        transactionId: `test-tx-${Date.now()}`,
        transactionType: "TEST_TRANSACTION",
        status: "completed",
        amount: "0.00",
        asset: "TEST",
        merchantId,
        timestamp: new Date().toISOString(),
        eventType: "test.completed",
        reqMethod: "POST",
        metadata: {
          isTest: true,
          testGenerated: new Date().toISOString(),
          message:
            "This is a test webhook notification. No actual transaction has occurred.",
        },
      };

      // Send test webhook
      const success =
        await this.webhookNotificationService.sendWebhookNotification(
          webhook.url,
          testPayload,
          merchantId,
        );

      if (!success) {
        return res.status(500).json({
          status: "error",
          message: "Failed to send test webhook",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Test webhook sent successfully",
        details: {
          webhookUrl: webhook.url,
          note: "This test webhook uses zero amounts and TEST values to avoid confusion with real transactions.",
          sentPayload: testPayload,
        },
      });
    } catch (error) {
      console.error("Test webhook error: ", error);
      return res.status(500).json({
        status: "error",
        message: (error as Error).message,
      });
    }
  }

  // Get webhook logs with optional filters: status, merchantId, date range, pagination
// Query params: status (success/failed), merchantId (string), startDate (ISO date), endDate (ISO date), page (number), limit (number)
async getWebhookLogs(req: Request, res: Response): Promise<Response> {
  try {
    const { status, merchantId, startDate, endDate, page = 1, limit = 10 } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, Number(page) || 1);  // Ensure page is at least 1
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));  // Ensure limit is between 1 and 100

    // Validate date parameters if provided
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (startDate) {
      parsedStartDate = new Date(startDate as string);
      if (isNaN(parsedStartDate.getTime())) {
        return res.status(400).json({
          status: "error",
          message: "Invalid startDate format",
        });
      }
    }

    if (endDate) {
      parsedEndDate = new Date(endDate as string);
      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({
          status: "error",
          message: "Invalid endDate format",
        });
      }
    }

    const webhookLogRepository = AppDataSource.getRepository(WebhookLog);

    const queryBuilder = webhookLogRepository.createQueryBuilder("webhook_log");

    if (status) {
      queryBuilder.andWhere("webhook_log.status = :status", { status });
    }

    if (merchantId) {
      queryBuilder.andWhere("webhook_log.merchantId = :merchantId", { merchantId });
    }

    if (parsedStartDate && parsedEndDate) {
      queryBuilder.andWhere("webhook_log.createdAt BETWEEN :startDate AND :endDate", {
        startDate: parsedStartDate,
        endDate: parsedEndDate,
      });
    } else if (parsedStartDate) {
      queryBuilder.andWhere("webhook_log.createdAt >= :startDate", {
        startDate: parsedStartDate,
      });
    } else if (parsedEndDate) {
      queryBuilder.andWhere("webhook_log.createdAt <= :endDate", {
        endDate: parsedEndDate,
      });
    }

    // Pagination: skip and take
    const skip = (pageNum - 1) * limitNum;
    queryBuilder.skip(skip).take(limitNum);

    // Order by latest first
    queryBuilder.orderBy("webhook_log.createdAt", "DESC");

    const [logs, total] = await queryBuilder.getManyAndCount();

    return res.status(200).json({
      status: "success",
      page: pageNum,
      limit: limitNum,
      total,
      data: logs,
    });
  } catch (error) {
    console.error("Error fetching webhook logs:", error);
    return res.status(500).json({
      status: "error",
      message: (error as Error).message,
    });
  }
}
}
