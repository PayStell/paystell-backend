import axios from "axios";
import {
  WebhookPayload,
  MerchantWebhook,
} from "../interfaces/webhook.interfaces";
import { validateWebhookUrl } from "../validators/webhook.validators";
import { MerchantAuthService } from "./merchant.service";
import { CryptoGeneratorService } from "./cryptoGenerator.service";
import { WebhookService } from "./webhook.service";
import { Repository } from "typeorm";
import { MerchantWebhookEventEntity } from "../entities/MerchantWebhookEvent.entity";
import AppDataSource from "../config/db";
import { MerchantWebhookEventEntityStatus } from "../enums/MerchantWebhookEventStatus";
import { WebhookEventType } from "../enums/WebhookEventTypes";

const defaultMerchantAuthService = new MerchantAuthService();
const defaultCryptoGeneratorService = new CryptoGeneratorService();
const defaultWebhookService = new WebhookService();

export class WebhookNotificationService {
  private merchantAuthService: MerchantAuthService;
  private cryptoGeneratorService: CryptoGeneratorService;
  private webhookService: WebhookService;
  private webhookEventRepository: Repository<MerchantWebhookEventEntity>;

  constructor(
    merchantAuthService?: MerchantAuthService,
    cryptoGeneratorService?: CryptoGeneratorService,
    webhookService?: WebhookService,
  ) {
    this.merchantAuthService =
      merchantAuthService ?? defaultMerchantAuthService;
    this.cryptoGeneratorService =
      cryptoGeneratorService ?? defaultCryptoGeneratorService;
    this.webhookService = webhookService ?? defaultWebhookService;
    this.webhookEventRepository = AppDataSource.getRepository(
      MerchantWebhookEventEntity
    );
  }

  /**
   * Sends a webhook notification to the specified URL with proper signatures
   * @param webhook The webhook configuration
   * @param payload The payload to send
   * @returns Promise resolving to boolean indicating success
   */
  async sendWebhookNotification(
    webhook: MerchantWebhook,
    payload: WebhookPayload,
  ): Promise<boolean> {
    const webhookEvent = new MerchantWebhookEventEntity();
    try {
      if (!webhook.isActive) {
        console.warn(`Webhook ${webhook.id} is inactive - notification not sent`);
        return false;
      }

      // Generate timestamp if not provided
      const enrichedPayload = {
        ...payload,
        timestamp: payload.timestamp ?? new Date().toISOString(),
      };

      // Generate a unique request ID
      const requestId = this.generateRequestId();
      
      // Create webhook event record for tracking
      webhookEvent.jobId = requestId;
      webhookEvent.merchantId = webhook.merchantId;
      webhookEvent.webhookId = webhook.id;
      webhookEvent.webhookUrl = webhook.url;
      webhookEvent.payload = enrichedPayload;
      webhookEvent.status = MerchantWebhookEventEntityStatus.PENDING;
      webhookEvent.attemptsMade = 0;
      webhookEvent.maxAttempts = webhook.maxRetries || 5;
      
      await this.webhookEventRepository.save(webhookEvent);

      // Generate the signature for the webhook payload
      if (!webhook.secretKey) {
        throw new Error("Webhook secretKey is missing – cannot sign payload securely");
      }
      const signature = await this.generateSignature(enrichedPayload, webhook.secretKey);
      
      // Add standard webhook headers
      const headers = {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-ID": webhookEvent.id,
        "X-Webhook-Timestamp": enrichedPayload.timestamp,
        "User-Agent": "PayStell-Webhook/1.0",
      };

      // Save headers for verification
      webhookEvent.headers = headers;
      webhookEvent.signature = signature;
      await this.webhookEventRepository.save(webhookEvent);

      // Send the webhook
      const response = await axios.post(webhook.url, enrichedPayload, {
        headers,
        timeout: 15000, // 15 seconds timeout
      });

      // Update the webhook event with the response
      webhookEvent.status = MerchantWebhookEventEntityStatus.COMPLETED;
      webhookEvent.completedAt = new Date();
      webhookEvent.attemptsMade += 1;
      webhookEvent.responseStatusCode = response.status;
      webhookEvent.responseBody = JSON.stringify(response.data);
      await this.webhookEventRepository.save(webhookEvent);

      console.log(`Webhook ${webhookEvent.id} delivered successfully to ${webhook.url}`);
      return true;
    } catch (error) {
      console.error("Failed to send webhook notification", error);
      
      // Update the webhookEvent with error information
      try {
        // Only update if we've saved it to the database already
        if (webhookEvent.id) {
          webhookEvent.status = MerchantWebhookEventEntityStatus.FAILED;
          webhookEvent.error = error instanceof Error ? error.message : "Unknown error";
          webhookEvent.attemptsMade += 1;
          await this.webhookEventRepository.save(webhookEvent);
        }
      } catch (dbError) {
        console.error("Failed to update webhook event record", dbError);
      }
      
      return false;
    }
  }

  /**
   * Notifies a merchant about a payment update via webhook
   * @param merchantId The merchant ID
   * @param eventType The type of event (payment.succeeded, etc)
   * @param paymentDetails The payment details
   * @returns Promise resolving to boolean indicating success
   */
  async notifyEvent(
    merchantId: string,
    eventType: string,
    paymentDetails: Omit<WebhookPayload, "timestamp" | "eventType">,
  ): Promise<boolean> {
    try {
      // Get the webhook configuration for this merchant
      const merchantWebhook = await this.webhookService.getMerchantWebhook(merchantId);

      if (!merchantWebhook) {
        console.debug(`No webhook found for merchant ${merchantId}`);
        return false;
      }

      if (!merchantWebhook.isActive) {
        console.debug(`Webhook for merchant ${merchantId} is inactive`);
        return false;
      }

      // Check if the webhook is subscribed to this event type
      if (merchantWebhook.eventTypes && 
          merchantWebhook.eventTypes.length > 0 &&
          !merchantWebhook.eventTypes.includes(eventType) &&
          !merchantWebhook.eventTypes.includes("*")) {
        console.debug(`Merchant ${merchantId} not subscribed to event ${eventType}`);
        return false;
      }

      if (!validateWebhookUrl(merchantWebhook.url)) {
        console.error(`Invalid webhook URL for merchant ${merchantId}: ${merchantWebhook.url}`);
        return false;
      }

      const webhookPayload: WebhookPayload = {
        ...paymentDetails,
        eventType,
        timestamp: new Date().toISOString(),
      };

      return this.sendWebhookNotification(merchantWebhook, webhookPayload);
    } catch (error) {
      console.error(`Failed to notify merchant ${merchantId} of event ${eventType}:`, error);
      return false;
    }
  }

  /**
   * Notifies a merchant about a payment update via webhook
   * @param webhook The merchant webhook configuration
   * @param webhookPayload The webhook payload to send
   * @returns Promise resolving to boolean indicating success
   */
  async notifyPaymentUpdate(
    webhook: MerchantWebhook,
    webhookPayload: WebhookPayload
  ): Promise<boolean> {
    try {
      if (!webhook || !webhook.isActive) {
        console.debug(`Webhook is inactive or undefined`);
        return false;
      }

      if (!validateWebhookUrl(webhook.url)) {
        console.error(`Invalid webhook URL: ${webhook.url}`);
        return false;
      }

      // Check if the webhook is subscribed to this event type
      if (
        webhook.eventTypes && 
        webhook.eventTypes.length > 0 &&
        !webhook.eventTypes.includes(webhookPayload.eventType) &&
        !webhook.eventTypes.includes("*")
      ) {
        console.debug(`Webhook not subscribed to event ${webhookPayload.eventType}`);
        return false;
      }

      return this.sendWebhookNotification(webhook, webhookPayload);
    } catch (error) {
      console.error(`Failed to notify payment update:`, error);
      return false;
    }
  }

  /**
   * Generates a signature for the webhook payload
   * @param payload The webhook payload
   * @param secret The webhook secret
   * @returns A hexadecimal signature
   */
  private async generateSignature(payload: WebhookPayload, secret: string): Promise<string> {
    return this.cryptoGeneratorService.generateSignatureForWebhookPayload(
      payload,
      secret,
    );
  }

  /**
   * Generates a unique request ID
   * @returns A UUID string
   */
  private generateRequestId(): string {
    return `whk_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}
