export interface IWebhookService {
  getMerchantWebhook(merchantId: string): Promise<any>;
}
