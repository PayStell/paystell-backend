import { WebhookNotificationService } from "../services/webhookNotification.service";
import {
  StellarWebhookPayload,
  WebhookPayload,
} from "../interfaces/webhook.interfaces";
import { MerchantAuthService } from "../services/merchant.service";
import { WebhookService } from "../services/webhook.service";
import { Request, Response } from "express";
import { CryptoGeneratorService } from "../services/cryptoGenerator.service";
import { MerchantWebhookQueueService } from "../services/MerchantWebhookQueue.service";

// TODO: this initialization needs to be moved to dependency injection
const defaultWebhookService = new WebhookService();
const defaultMerchantAuthService = new MerchantAuthService();
const defaultCryptoGeneratorService = new CryptoGeneratorService();
const defaultWebhookNotificationService = new WebhookNotificationService(
  defaultMerchantAuthService,
  defaultCryptoGeneratorService
);
const merchantWebhookQueueService = new MerchantWebhookQueueService();

export class WebhookController {
  private webhookService: WebhookService;
  private webhookNotificationService: WebhookNotificationService;
  private merchantAuthService: MerchantAuthService;

  constructor(
    webhookService?: WebhookService,
    merchantAuthService?: MerchantAuthService,
    webhookNotificationService?: WebhookNotificationService
  ) {
    this.webhookService = webhookService ?? defaultWebhookService;
    this.merchantAuthService =
      merchantAuthService ?? defaultMerchantAuthService;
    this.webhookNotificationService =
      webhookNotificationService ?? defaultWebhookNotificationService;
  }

  async handleWebhook(req: Request, res: Response) {
    // const response = res
    try {
      const { payload }: StellarWebhookPayload = req.body;

      const merchant = await this.merchantAuthService.getMerchantById(
        payload.customer.id
      );

      if (!merchant || !merchant.isActive) {
        return res.status(404).json({
          status: "error",
          code: "MERCHANT_NOT_FOUND",
          message: merchant ? "Merchant not active" : "Merchant not found",
        });
      }

      const merchantWebhook = await this.webhookService.getMerchantWebhook(
        merchant.id
      );

      if (!merchantWebhook) {
        return res.status(404).json({
          status: "error",
          code: "WEBHOOK_NOT_FOUND",
          message: "Webhook not found",
        });
      }

      const webhookPayload: WebhookPayload = {
        transactionId: payload.transaction.id,
        transactionType: payload.transaction.type,
        status: payload.transaction.status,
        amount: payload.transaction.amount_in?.amount,
        asset: payload.transaction.amount_in?.asset,
        merchantId: payload.customer.id,
        timestamp: new Date().toISOString(),
        eventType: `${payload.transaction.type}.${payload.transaction.status}`,
        reqMethod: "POST",
      };

      await merchantWebhookQueueService.addToQueue(
        merchantWebhook,
        webhookPayload
      );

      return res.status(200).json({
        status: "success",
        message: "Webhook processed successfully",
      });
    } catch (err) {
      console.error("Webhook error: ", err);
      return res.status(500).json({
        status: "error",
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      });
    }
  }

  async testWebhook(req: Request, res: Response): Promise<any> {
    try {
      // Get the merchant from the request (set by auth middleware)
      const merchantId = req.user?.id;

      if (!merchantId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      // Fetch the merchant to verify they exist
      const merchant = await this.merchantAuthService.getMerchantById(
        merchantId.toString()
      );
      if (!merchant) {
        return res.status(404).json({
          status: "error",
          message: "Merchant not found",
        });
      }

      // Fetch the merchant's webhook
      const merchantWebhook = await this.webhookService.getMerchantWebhook(
        merchantId.toString()
      );
      if (!merchantWebhook) {
        return res.status(404).json({
          status: "error",
          message: "No webhook configured for this merchant",
        });
      }

      const webhookPayload: WebhookPayload = {
        transactionId: `test-tx-${Date.now()}`,
        transactionType: "TEST_TRANSACTION",
        status: "completed",
        amount: "0.00",
        asset: "TEST",
        merchantId: merchantId.toString(),
        timestamp: new Date().toISOString(),
        eventType: "TEST.completed",
        reqMethod: "POST",
        metadata: {
          isTest: true,
          testGenerated: new Date().toISOString(),
          message:
            "This is a test webhook notification. No actual transaction has occurred.",
          testOnly: true,
        },
      };

      // Add to the queue
      await merchantWebhookQueueService.addToQueue(
        merchantWebhook,
        webhookPayload
      );

      return res.json({
        status: "success",
        message: "Test webhook has been queued for delivery",
        details: {
          webhookUrl: merchantWebhook.url,
          note: "This test webhook uses zero amounts and TEST values to avoid confusion with real transactions.",
          sentPayload: webhookPayload,
        },
      });
    } catch (err: any) {
      console.error("Error sending test webhook:", err);
      return res.status(500).json({
        status: "error",
        message: "Failed to send test webhook",
        error: err.message,
      });
    }
  }
}
