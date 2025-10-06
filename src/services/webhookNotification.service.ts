import axios from "axios";
import {
  WebhookPayload,
  MerchantWebhook,
} from "../interfaces/webhook.interfaces";
import { validateWebhookUrl } from "../validators/webhook.validators";
import { MerchantAuthService } from "./merchant.service";
import { CryptoGeneratorService } from "./cryptoGenerator.service";

export class WebhookNotificationService {
  private merchantAuthService: MerchantAuthService;
  private cryptoGeneratorService: CryptoGeneratorService;

  constructor(
    merchantAuthService: MerchantAuthService,
    cryptoGeneratorService: CryptoGeneratorService,
  ) {
    this.merchantAuthService = merchantAuthService;
    this.cryptoGeneratorService = cryptoGeneratorService;
  }

  async sendWebhookNotification(
    webhookUrl: string,
    payload: WebhookPayload,
    id: string,
  ): Promise<boolean> {
    try {
      const merchant = await this.merchantAuthService.getMerchantById(id);

      if (!merchant || !merchant.secret) {
        console.error("Invalid merchant or missing secret");
        return false;
      }

      const signature =
        await this.cryptoGeneratorService.generateSignatureForWebhookPayload(
          payload,
          merchant.secret,
        );

      await axios.post(webhookUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
        },
        timeout: 5000,
      });

      return true;
    } catch (err) {
      console.error("Failed to send webhook notification", err);
      return false;
    }
  }

  async notifyPaymentUpdate(
    merchantWebhook: MerchantWebhook,
    paymentDetails: Omit<WebhookPayload, "timestamp">,
  ): Promise<boolean> {
    const merchant = await this.merchantAuthService.getMerchantById(
      merchantWebhook.merchantId,
    );

    if (!merchant) {
      console.error("Merchant not found");
      return false;
    }

    if (!merchantWebhook.isActive || !validateWebhookUrl(merchantWebhook.url)) {
      return false;
    }

    const webhookPayload: WebhookPayload = {
      ...paymentDetails,
      timestamp: new Date().toISOString(),
    };

    return this.sendWebhookNotification(
      merchantWebhook.url,
      webhookPayload,
      merchant.id,
    );
  }
}
