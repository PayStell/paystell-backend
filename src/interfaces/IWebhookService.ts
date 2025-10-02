import { MerchantWebhook } from "./webhook.interfaces";

export interface IWebhookService {
  getMerchantWebhook(merchantId: string): Promise<MerchantWebhook | null>;
}
