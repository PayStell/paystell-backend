export interface IWebhookNotificationService {
  sendWebhookNotification(
    url: string,
    payload: any,
    merchantId: string
  ): Promise<boolean>;
}
