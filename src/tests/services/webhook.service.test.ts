import axios from 'axios';
import crypto from 'crypto';
import { WebhookService } from '../../services/webhook.service';
import { MerchantAuthService } from '../../services/merchant.service';
import { WebhookPayload, MerchantWebhook, Merchant } from '../../interfaces/webhook.interfaces';
import { validateWebhookUrl } from '../../validators/webhook.validators';
import { MerchantWebhookEntity } from 'src/entities/MerchantWebhook.entity';

jest.mock('axios');
jest.mock('crypto');
jest.mock('../../services/merchant.service');
jest.mock('../../validators/webhook.validators');

describe('WebhookService', () => {
    let webhookService: WebhookService;
    let merchantAuthService: MerchantAuthService;

    beforeEach(() => {
        webhookService = new WebhookService();
        merchantAuthService = new MerchantAuthService();
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
        eventType: 'payment.success'
    };

    const mockMerchantWebhook: MerchantWebhook = {
        id: 'webhook123',
        merchantId: 'merchant123',
        url: 'https://example.com/webhook',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    describe('generateSignature', () => {
        it('should generate a valid HMAC signature', async () => {
            const mockHmac = {
                update: jest.fn().mockReturnThis(),
                digest: jest.fn().mockReturnValue('mock-signature')
            };

            (crypto.createHmac as jest.Mock).mockReturnValue(mockHmac);

            const signature = await (webhookService as any).generateSignature(mockWebhookPayload, mockMerchant.secret);

            expect(crypto.createHmac).toHaveBeenCalledWith('sha256', mockMerchant.secret);
            expect(mockHmac.update).toHaveBeenCalledWith(JSON.stringify(mockWebhookPayload));
            expect(mockHmac.digest).toHaveBeenCalledWith('hex');
            expect(signature).toBe('mock-signature');
        });
    });

    describe('sendWebhookNotification', () => {
        it('should send a webhook notification successfully', async () => {
            (merchantAuthService.getMerchantById as jest.Mock).mockResolvedValue(mockMerchant);

            const mockHmac = {
                update: jest.fn().mockReturnThis(),
                digest: jest.fn().mockReturnValue('mock-signature')
            };

            (crypto.createHmac as jest.Mock).mockReturnValue(mockHmac);
            (axios.post as jest.Mock).mockResolvedValue({ status: 200 });

            const result = await (webhookService as any).sendWebhookNotification(
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

            const result = await (webhookService as any).sendWebhookNotification(
                mockMerchantWebhook.url,
                mockWebhookPayload,
                mockMerchant.id
            );

            expect(axios.post).toHaveBeenCalled();
            expect(result).toBe(false);
        });
    });

    describe('getMerchantWebhook', () => {
        it('should return a merchant webhook if it is active', async () => {
            (webhookService.getMerchantWebhook as jest.Mock).mockResolvedValue(mockMerchantWebhook);

            const result = await webhookService.getMerchantWebhook(mockMerchant.id);

            expect(result).toEqual(mockMerchantWebhook);
        });

        it('should throw an error if webhook is inactive', async () => {
            (webhookService.getMerchantWebhook as jest.Mock).mockImplementation(async (merchantId: string) => {
                const merchantWebhook = { ...mockMerchantWebhook, isActive: false };
                if (!merchantWebhook.isActive) {
                    throw new Error('Merchant web hook not found');
                }

                return merchantWebhook;
            })

            await expect(webhookService.getMerchantWebhook(mockMerchant.id)).rejects.toThrow(
                'Merchant web hook not found'
            );
        });
    });

    describe('notifyPaymentUpdate', () => {
        it('should send a webhook notification when merchant and webhook are valid', async () => {
            (merchantAuthService.getMerchantById as jest.Mock).mockResolvedValue(mockMerchant);
            (validateWebhookUrl as jest.Mock).mockReturnValue(true);
            (webhookService as any).sendWebhookNotification = jest.fn().mockResolvedValue(true);

            const result = await (webhookService as any).notifyPaymentUpdate(mockMerchantWebhook, mockWebhookPayload);

            expect(validateWebhookUrl).toHaveBeenCalledWith(mockMerchantWebhook.url);
            expect(result).toBe(true);
        });

        it('should return false if webhook URL is invalid', async () => {
            (validateWebhookUrl as jest.Mock).mockReturnValue(false);

            const result = await (webhookService as any).notifyPaymentUpdate(mockMerchantWebhook, mockWebhookPayload);

            expect(result).toBe(false);
        });
    });

    describe('notifyWithRetry', () => {
        it('should retry sending webhook notification up to maxRetries', async () => {
            jest.spyOn(global, 'setTimeout').mockImplementation((fn, ms) => {
                fn(); // Execute the callback immediately
                return {} as unknown as NodeJS.Timeout; // Return a mocked timeout object
            });

            (webhookService as any).notifyPaymentUpdate = jest
                .fn()
                .mockRejectedValueOnce(new Error('Network Error'))
                .mockResolvedValue(true);

            await webhookService.notifyWithRetry(mockMerchantWebhook, mockWebhookPayload, 3, 1000);

            expect((webhookService as any).notifyPaymentUpdate).toHaveBeenCalledTimes(2);
        });

        it('should fail after max retries', async () => {
            jest.spyOn(global, 'setTimeout').mockImplementation((fn, ms) => {
                fn(); // Execute the callback immediately
                return {} as unknown as NodeJS.Timeout; // Return a mocked timeout object
            });

            (webhookService as any).notifyPaymentUpdate = jest.fn().mockRejectedValue(new Error('Network Error'));

            await webhookService.notifyWithRetry(mockMerchantWebhook, mockWebhookPayload, 3, 1000);

            expect((webhookService as any).notifyPaymentUpdate).toHaveBeenCalledTimes(3);
        });
    });
});
