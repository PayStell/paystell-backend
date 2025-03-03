import axios from 'axios';
import crypto from 'crypto';
import { MerchantAuthService } from '../../services/merchant.service';
import { WebhookPayload, MerchantWebhook, Merchant } from '../../interfaces/webhook.interfaces';
import { validateWebhookUrl } from '../../validators/webhook.validators';
import { CryptoGeneratorService } from '../../services/cryptoGenerator.service';
import { WebhookNotificationService } from '../../services/webhookNotification.service';

jest.mock('axios');
jest.mock('crypto');
jest.mock('../../services/merchant.service');
jest.mock('../../validators/webhook.validators');
jest.spyOn(crypto, 'randomBytes').mockImplementation((size: number) => {
    return Buffer.from(Array.from({ length: size }, () => Math.floor(Math.random() * 256)));
});

describe('WebhookNotificationService', () => {
    let webhookNotificationService: WebhookNotificationService;
    let merchantAuthService: MerchantAuthService;
    let cryptoGeneratorService: CryptoGeneratorService;

    beforeEach(() => {
        merchantAuthService = new MerchantAuthService();
        cryptoGeneratorService = new CryptoGeneratorService()
        webhookNotificationService = new WebhookNotificationService(merchantAuthService, cryptoGeneratorService);
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

    describe('sendWebhookNotification', () => {
        it('should send a webhook notification successfully', async () => {
            (merchantAuthService.getMerchantById as jest.Mock).mockResolvedValue(mockMerchant);

            const mockHmac = {
                update: jest.fn().mockReturnThis(),
                digest: jest.fn().mockReturnValue('mock-signature')
            };

            (crypto.createHmac as jest.Mock).mockReturnValue(mockHmac);
            (axios.post as jest.Mock).mockResolvedValue({ status: 200 });

            const result = await webhookNotificationService.sendWebhookNotification(
                mockMerchantWebhook.url,
                mockWebhookPayload,
                mockMerchant.id
            );

            expect(axios.post).toHaveBeenCalledWith(mockMerchantWebhook.url, mockWebhookPayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': 'mock-signature'
                },
                timeout: 5000
            });
            expect(result).toBe(true);
        });

        it('should return false if webhook notification fails', async () => {
            (merchantAuthService.getMerchantById as jest.Mock).mockResolvedValue(mockMerchant);

            const mockHmac = {
                update: jest.fn().mockReturnThis(),
                digest: jest.fn().mockReturnValue('mock-signature')
            };

            (crypto.createHmac as jest.Mock).mockReturnValue(mockHmac);
            (axios.post as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await webhookNotificationService.sendWebhookNotification(
                mockMerchantWebhook.url,
                mockWebhookPayload,
                mockMerchant.id
            );

            expect(axios.post).toHaveBeenCalled();
            expect(result).toBe(false);
        });
    });

    describe('notifyPaymentUpdate', () => {
        it('should send a webhook notification when merchant and webhook are valid', async () => {
            (merchantAuthService.getMerchantById as jest.Mock).mockResolvedValue(mockMerchant);
            (validateWebhookUrl as jest.Mock).mockReturnValue(true);
            webhookNotificationService.sendWebhookNotification = jest.fn().mockResolvedValue(true);

            const result = await webhookNotificationService.notifyPaymentUpdate(mockMerchantWebhook, mockWebhookPayload);

            expect(validateWebhookUrl).toHaveBeenCalledWith(mockMerchantWebhook.url);
            expect(result).toBe(true);
        });

        it('should return false if webhook URL is invalid', async () => {
            (validateWebhookUrl as jest.Mock).mockReturnValue(false);

            const result = await webhookNotificationService.notifyPaymentUpdate(mockMerchantWebhook, mockWebhookPayload);

            expect(result).toBe(false);
        });
    });

    describe('notifyWithRetry', () => {
        it('should retry sending webhook notification up to maxRetries', async () => {
            jest.spyOn(global, 'setTimeout').mockImplementation((fn, ms) => {
                fn(); // Execute the callback immediately
                return {} as unknown as NodeJS.Timeout; // Return a mocked timeout object
            });

            webhookNotificationService.notifyPaymentUpdate = jest
                .fn()
                .mockRejectedValueOnce(new Error('Network Error'))
                .mockResolvedValue(true);


            expect(webhookNotificationService.notifyPaymentUpdate).toHaveBeenCalledTimes(2);
        });

        it('should fail after max retries', async () => {
            jest.spyOn(global, 'setTimeout').mockImplementation((fn, ms) => {
                fn(); // Execute the callback immediately
                return {} as unknown as NodeJS.Timeout; // Return a mocked timeout object
            });

            webhookNotificationService.notifyPaymentUpdate = jest.fn().mockRejectedValue(new Error('Network Error'));

            expect(webhookNotificationService.notifyPaymentUpdate).toHaveBeenCalledTimes(3);
        });
    });
});
