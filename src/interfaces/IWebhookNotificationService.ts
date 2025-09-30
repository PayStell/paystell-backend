import { WebhookPayload, MerchantWebhook } from "./webhook.interfaces";

export interface IWebhookNotificationService {
  sendWebhookNotification(
    url: string,
    payload: WebhookPayload,
    merchantId: string
  ): Promise<boolean>;

  notifyPaymentUpdate(
    merchantWebhook: MerchantWebhook,
    paymentDetails: Omit<WebhookPayload, "timestamp">
  ): Promise<boolean>;
}
