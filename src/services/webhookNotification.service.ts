import axios from 'axios'
import { WebhookPayload, MerchantWebhook, Merchant } from '../interfaces/webhook.interfaces'
import { validateWebhookUrl } from '../validators/webhook.validators'
import { MerchantAuthService } from './merchant.service';
import { CryptoGeneratorService } from './cryptoGenerator.service';

const defaultMerchantAuthService = new MerchantAuthService()
const defaultCryptoGeneratorService = new CryptoGeneratorService()
export class WebhookNotificationService {
    private merchantAuthService: MerchantAuthService
    private cryptoGeneratorService: CryptoGeneratorService

    constructor(merchantAuthService?: MerchantAuthService, criptoGeneratorService?: CryptoGeneratorService) {
        this.merchantAuthService = merchantAuthService ?? defaultMerchantAuthService
        this.cryptoGeneratorService = criptoGeneratorService ?? defaultCryptoGeneratorService
    }

    async sendWebhookNotification(
        webhookUrl: string,
        payload: WebhookPayload,
        id: string,
    ): Promise<boolean> {
        try {
            const merchant: Merchant | null = await this.merchantAuthService.getMerchantById(id)
            // if (!merchant) return
            const signature = await this.cryptoGeneratorService.generateSignatureForWebhookPayload(payload, merchant?.secret!);
            await axios.post(webhookUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature
                },
                timeout: 5000
            });

            return true;
        } catch (err) {
            console.error('Failed to send webhook notification', err)
            return false;
        }
    }

    async notifyPaymentUpdate(
        merchantWebhook: MerchantWebhook,
        paymentDetails: Omit<WebhookPayload, 'timestamp'>
    ): Promise<boolean> {
        const merchant = await this.merchantAuthService.getMerchantById(merchantWebhook.merchantId)
        if (!merchantWebhook.isActive || !validateWebhookUrl(merchantWebhook.url)) {
            return false;
        }

        const webhookPayload: WebhookPayload = {
            ...paymentDetails,
            timestamp: new Date().toISOString()
        }

        return this.sendWebhookNotification(merchantWebhook.url, webhookPayload, merchant?.secret!)
    }

    async notifyWithRetry(merchantWebhook: MerchantWebhook, webhookPayload: WebhookPayload, maxRetries = 3, delay = 3000) {
        let attempts = 0;

        while (attempts < maxRetries) {
            try {
                await this.notifyPaymentUpdate(merchantWebhook, webhookPayload);
                return; // Exit if successful
            } catch (err) {
                attempts++;
                console.error(`Attempt ${attempts} failed:`, err);

                if (attempts < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delay)); // Wait before retrying
                }
            }
        }
        console.error("Failed to notify after maximum retries.");
    }
}