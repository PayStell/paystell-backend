import axios, { AxiosError } from "axios";
import {
  WebhookPayload,
  MerchantWebhook,
  WebhookResponse,
} from "../interfaces/webhook.interfaces";
import { validateWebhookUrl } from "../validators/webhook.validators";
import { MerchantAuthService } from "./merchant.service";
import { CryptoGeneratorService } from "./cryptoGenerator.service";

const defaultMerchantAuthService = new MerchantAuthService();
const defaultCryptoGeneratorService = new CryptoGeneratorService();

export class WebhookNotificationService {
  private merchantAuthService: MerchantAuthService;
  private cryptoGeneratorService: CryptoGeneratorService;

  constructor(
    merchantAuthService?: MerchantAuthService,
    cryptoGeneratorService?: CryptoGeneratorService,
  ) {
    this.merchantAuthService =
      merchantAuthService ?? defaultMerchantAuthService;
    this.cryptoGeneratorService =
      cryptoGeneratorService ?? defaultCryptoGeneratorService;
  }

  async sendWebhookNotification(
    webhookUrl: string,
    payload: WebhookPayload,
    id: string,
  ): Promise<WebhookResponse> {
    try {
      const merchant = await this.merchantAuthService.getMerchantById(id);

      if (!merchant || !merchant.secret) {
        const errorMessage = "Invalid merchant or missing secret";
        console.error(errorMessage);
        return {
          success: false,
          errorMessage,
        };
      }

      const signature =
        await this.cryptoGeneratorService.generateSignatureForWebhookPayload(
          payload,
          merchant.secret,
        );

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
        },
        timeout: 5000,
      });

      return {
        success: true,
        statusCode: response.status,
        response: response.data,
      };
    } catch (err) {
      console.error("Failed to send webhook notification", err);

      if (err instanceof AxiosError) {
        return {
          success: false,
          statusCode: err.response?.status,
          response: err.response?.data,
          errorMessage: err.message,
        };
      }

      return {
        success: false,
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  async notifyPaymentUpdate(
    merchantWebhook: MerchantWebhook,
    paymentDetails: Omit<WebhookPayload, "timestamp">,
  ): Promise<WebhookResponse> {
    const merchant = await this.merchantAuthService.getMerchantById(
      merchantWebhook.merchantId,
    );

    if (!merchant) {
      const errorMessage = "Merchant not found";
      console.error(errorMessage);
      return {
        success: false,
        errorMessage,
      };
    }

    if (!merchantWebhook.isActive || !validateWebhookUrl(merchantWebhook.url)) {
      return {
        success: false,
        errorMessage: "Webhook is inactive or URL is invalid",
      };
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
