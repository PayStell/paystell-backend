import { WebhookNotificationService } from "../services/webhookNotification.service";
import { WebhookPayload, WebhookSubscriptionRequest } from "../interfaces/webhook.interfaces";
import { MerchantAuthService } from "../services/merchant.service";
import { WebhookService } from "../services/webhook.service";
import { Request, Response } from "express";
import { CryptoGeneratorService } from "../services/cryptoGenerator.service";
import { validateWebhookUrl } from "../validators/webhook.validators";

// Interface extension for Express Request with rawBody
interface RequestWithRawBody extends Request {
  rawBody?: Buffer | string;
}

// TODO: this initialization needs to be moved to dependency injection
const defaultWebhookService = new WebhookService();
const defaultMerchantAuthService = new MerchantAuthService();
const defaultCryptoGeneratorService = new CryptoGeneratorService();
const defaultWebhookNotificationService = new WebhookNotificationService(
  defaultMerchantAuthService,
  defaultCryptoGeneratorService,
  defaultWebhookService
);

export class WebhookController {
  private webhookService: WebhookService;
  private webhookNotificationService: WebhookNotificationService;
  private merchantAuthService: MerchantAuthService;
  private cryptoGeneratorService: CryptoGeneratorService;

  constructor(
    webhookService?: WebhookService,
    merchantAuthService?: MerchantAuthService,
    webhookNotificationService?: WebhookNotificationService,
    cryptoGeneratorService?: CryptoGeneratorService
  ) {
    this.webhookService = webhookService || defaultWebhookService;
    this.merchantAuthService =
      merchantAuthService || defaultMerchantAuthService;
    this.webhookNotificationService =
      webhookNotificationService || defaultWebhookNotificationService;
    this.cryptoGeneratorService =
      cryptoGeneratorService || defaultCryptoGeneratorService;
  }

  /**
   * Register a new webhook subscription
   */
  async registerWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const { url, secretKey, eventTypes, maxRetries, initialRetryDelay, maxRetryDelay } = req.body;
      const merchantId = req.user?.id?.toString();

      if (!merchantId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      // Validate webhook URL
      if (!url || !validateWebhookUrl(url)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid webhook URL",
        });
      }

      // Check for existing webhook
      const existingWebhook = await this.webhookService.getMerchantWebhook(merchantId, true);
      if (existingWebhook) {
        return res.status(400).json({
          status: "error",
          message: "Webhook already exists for this merchant. Use update endpoint instead.",
        });
      }
      
      // Validate event types if provided
      if (eventTypes) {
        const validEventTypes = await this.webhookService.getAvailableEventTypes();
        if (!eventTypes.every((e: string) => validEventTypes.includes(e))) {
          return res.status(400).json({
            status: "error",
            message: "One or more event types are invalid",
          });
        }
      }

      // Create the webhook subscription
      const webhookData: WebhookSubscriptionRequest = {
        url,
        secretKey,
        eventTypes,
        maxRetries,
        initialRetryDelay,
        maxRetryDelay
      };

      const webhook = await this.webhookService.register(merchantId, webhookData);

      return res.status(201).json({
        status: "success",
        message: "Webhook registered successfully",
        data: {
          id: webhook.id,
          url: webhook.url,
          eventTypes: webhook.eventTypes,
          createdAt: webhook.createdAt,
          // Don't return the secret key in the response
        }
      });
    } catch (error) {
      console.error("Webhook registration error:", error);
      return res.status(500).json({
        status: "error",
        message: (error as Error).message || "Failed to register webhook",
      });
    }
  }

  /**
   * Update an existing webhook subscription
   */
  async updateWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const { url, secretKey, eventTypes, maxRetries, initialRetryDelay, maxRetryDelay } = req.body;
      const merchantId = req.user?.id?.toString();

      if (!merchantId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      // If URL is provided, validate it
      if (url && !validateWebhookUrl(url)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid webhook URL",
        });
      }

      // Check that webhook exists
      const existingWebhook = await this.webhookService.getMerchantWebhook(merchantId, true);
      if (!existingWebhook) {
        return res.status(404).json({
          status: "error",
          message: "No webhook found for this merchant. Register a webhook first.",
        });
      }
      
      // Validate event types if provided
      if (eventTypes) {
        const validEventTypes = await this.webhookService.getAvailableEventTypes();
        if (!eventTypes.every((e: string) => validEventTypes.includes(e))) {
          return res.status(400).json({
            status: "error",
            message: "One or more event types are invalid",
          });
        }
      }

      // Update the webhook
      const webhookData: Partial<WebhookSubscriptionRequest> = {};
      if (url) webhookData.url = url;
      if (secretKey) webhookData.secretKey = secretKey;
      if (eventTypes) webhookData.eventTypes = eventTypes;
      if (maxRetries !== undefined) webhookData.maxRetries = maxRetries;
      if (initialRetryDelay !== undefined) webhookData.initialRetryDelay = initialRetryDelay;
      if (maxRetryDelay !== undefined) webhookData.maxRetryDelay = maxRetryDelay;

      const updatedWebhook = await this.webhookService.update(merchantId, webhookData);

      return res.status(200).json({
        status: "success",
        message: "Webhook updated successfully",
        data: {
          id: updatedWebhook.id,
          url: updatedWebhook.url,
          eventTypes: updatedWebhook.eventTypes,
          updatedAt: updatedWebhook.updatedAt,
        }
      });
    } catch (error) {
      console.error("Webhook update error:", error);
      return res.status(500).json({
        status: "error",
        message: (error as Error).message || "Failed to update webhook",
      });
    }
  }

  /**
   * Get details of a webhook subscription
   */
  async getWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const merchantId = req.user?.id?.toString();

      if (!merchantId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const webhook = await this.webhookService.getMerchantWebhook(merchantId, true);
      if (!webhook) {
        return res.status(404).json({
          status: "error",
          message: "No webhook found for this merchant",
        });
      }

      return res.status(200).json({
        status: "success",
        data: {
          id: webhook.id,
          url: webhook.url,
          eventTypes: webhook.eventTypes,
          isActive: webhook.isActive,
          createdAt: webhook.createdAt,
          updatedAt: webhook.updatedAt,
          // Don't return the secret key in the response
        }
      });
    } catch (error) {
      console.error("Get webhook error:", error);
      return res.status(500).json({
        status: "error",
        message: (error as Error).message || "Failed to get webhook details",
      });
    }
  }

  /**
   * Delete a webhook subscription (soft delete)
   */
  async deleteWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const merchantId = req.user?.id?.toString();

      if (!merchantId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const success = await this.webhookService.deleteWebhook(merchantId);
      if (!success) {
        return res.status(404).json({
          status: "error",
          message: "No webhook found for this merchant",
        });
      }

      return res.status(204).send();
    } catch (error) {
      console.error("Delete webhook error:", error);
      return res.status(500).json({
        status: "error",
        message: (error as Error).message || "Failed to delete webhook",
      });
    }
  }

  /**
   * Get available webhook event types
   */
  async getEventTypes(req: Request, res: Response): Promise<Response> {
    try {
      const eventTypes = await this.webhookService.getAvailableEventTypes();
      
      return res.status(200).json({
        status: "success",
        data: {
          eventTypes
        }
      });
    } catch (error) {
      console.error("Get event types error:", error);
      return res.status(500).json({
        status: "error",
        message: (error as Error).message || "Failed to get event types",
      });
    }
  }

  /**
   * Handle incoming webhooks from external services
   */
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

      // Verify signature if we have a secret key
      if (webhook.secretKey) {
        if (!signature) {
          return res.status(401).json({
            status: "error",
            code: "MISSING_SIGNATURE",
            message: "Signature header is required for this webhook",
          });
        }
        
        // Use rawBody if available (needs express configuration), otherwise fallback to body
        const rawBody = (req as RequestWithRawBody).rawBody;
        const isValid = this.cryptoGeneratorService.verifySignature(
          rawBody || req.body,
          signature.toString(),
          webhook.secretKey
        );
        
        if (!isValid) {
          return res.status(401).json({
            status: "error",
            code: "INVALID_SIGNATURE",
            message: "Invalid webhook signature",
          });
        }
      }

      // Process the webhook
      const payload = req.body as WebhookPayload;
      const success = await this.webhookNotificationService.sendWebhookNotification(
        webhook,
        payload
      );

      if (!success) {
        return res.status(500).json({
          status: "error",
          message: "Failed to process webhook",
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

  /**
   * Send a test webhook to test the subscription
   */
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
        eventType: "test.webhook",
        reqMethod: "POST",
        metadata: {
          isTest: true,
          testGenerated: new Date().toISOString(),
          message:
            "This is a test webhook notification. No actual transaction has occurred.",
        },
      };

      // Send test webhook
      const success = await this.webhookNotificationService.sendWebhookNotification(
        webhook,
        testPayload
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

  /**
   * Get webhook delivery events for a specific webhook
   * Shows the history of delivery attempts with status and retry info
   */
  async getWebhookEvents(req: Request, res: Response): Promise<Response> {
    try {
      const merchantId = req.user?.id?.toString();
      const webhookId = req.params.id;

      if (!merchantId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      if (!webhookId) {
        return res.status(400).json({
          status: "error",
          message: "Webhook ID is required",
        });
      }

      // Check that webhook exists and belongs to the merchant
      const webhook = await this.webhookService.getWebhookById(webhookId);
      if (!webhook || webhook.merchantId !== merchantId) {
        return res.status(404).json({
          status: "error",
          message: "Webhook not found or access denied",
        });
      }

      // Set pagination parameters with reasonable defaults and limits
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

      // Filter by status if provided
      const status = req.query.status as string | undefined;

      // Get events from webhook service
      const events = await this.webhookService.getWebhookEvents(
        webhookId,
        limit,
        offset,
        status
      );

      // Get count for pagination
      const totalCount = await this.webhookService.getWebhookEventsCount(
        webhookId,
        status
      );

      return res.status(200).json({
        status: "success",
        data: {
          events,
          pagination: {
            total: totalCount,
            limit,
            offset,
            hasMore: offset + events.length < totalCount,
          },
        },
      });
    } catch (error) {
      console.error("Get webhook events error:", error);
      return res.status(500).json({
        status: "error",
        message: (error as Error).message || "Failed to get webhook events",
      });
    }
  }

  /**
   * Get webhook delivery metrics for a specific webhook
   */
  async getWebhookMetrics(req: Request, res: Response): Promise<Response> {
    try {
      const merchantId = req.user?.id?.toString();
      const webhookId = req.params.id;

      if (!merchantId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      // If webhook ID is provided, check it belongs to the merchant
      if (webhookId) {
        const webhook = await this.webhookService.getWebhookById(webhookId);
        if (!webhook || webhook.merchantId !== merchantId) {
          return res.status(404).json({
            status: "error",
            message: "Webhook not found or access denied",
          });
        }
      }

      // Get webhook metrics from service
      const metrics = await this.webhookService.getWebhookMetrics(merchantId, webhookId);

      return res.status(200).json({
        status: "success",
        data: metrics,
      });
    } catch (error) {
      console.error("Get webhook metrics error:", error);
      return res.status(500).json({
        status: "error",
        message: (error as Error).message || "Failed to get webhook metrics",
      });
    }
  }
}
