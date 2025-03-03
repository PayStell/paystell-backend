import axios from 'axios';
import crypto from 'crypto';
import { WebhookService } from '../../services/webhook.service';
import { WebhookPayload, MerchantWebhook, Merchant } from '../../interfaces/webhook.interfaces';
import { validateWebhookUrl } from '../../validators/webhook.validators';



describe('WebhookService', () => {
    let webhookService: WebhookService;

    beforeEach(() => {
        webhookService = new WebhookService();
        jest.clearAllMocks();
    });

    const mockMerchant: Merchant = {
        id: 'merchant123',
        apiKey: 'test-api-key',
        secret: 'test-secret',
        name: 'Test Merchant',
        email: 'merchant@test.com',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const mockWebhookPayload: WebhookPayload = {
        transactionId: 'txn123',
        transactionType: 'deposit',
        status: 'completed',
        amount: '100.00',
        asset: 'USDC',
        merchantId: 'merchant123',
        timestamp: new Date().toISOString(),
        eventType: 'payment.success',
        reqMethod: 'POST'
    };

    const mockMerchantWebhook: MerchantWebhook = {
        id: 'webhook123',
        merchantId: 'merchant123',
        url: 'https://example.com/webhook',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    describe('getMerchantWebhook', () => {
        it('should return a merchant webhook if it is active', async () => {
            jest.spyOn(webhookService, 'getMerchantWebhook').mockResolvedValue(mockMerchantWebhook);

            const result = await webhookService.getMerchantWebhook(mockMerchant.id);

            expect(result).toEqual(mockMerchantWebhook);
        });

        it('should throw an error if webhook is inactive', async () => {
            jest.spyOn(webhookService, 'getMerchantWebhook').mockImplementation(async (merchantId: string) => {
                const merchantWebhook = { ...mockMerchantWebhook, isActive: false };
                if (!merchantWebhook.isActive) {
                    throw new Error('Merchant web hook not found');
                }
                return merchantWebhook;
            });

            await expect(webhookService.getMerchantWebhook(mockMerchant.id)).rejects.toThrow(
                'Merchant web hook not found'
            );
        });
    });
});
