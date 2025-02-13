import { Request, Response } from 'express';
import { WebhookController } from '../../controllers/webhook.controller';
import { WebhookService } from '../../services/webhook.service';
import { MerchantAuthService } from '../../services/merchant.service';
import { Merchant, MerchantWebhook, StellarWebhookPayload, WebhookPayload, TransactionStatus } from '../../interfaces/webhook.interfaces';
import axios from 'axios';

// Mock external dependencies
jest.mock('../../services/merchant.service');
jest.mock('../../services/webhook.service');
jest.mock('axios');

describe('WebhookController', () => {
    let webhookController: WebhookController;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let responseJson: jest.Mock;
    let responseStatus: jest.Mock;
    let merchantAuthService: MerchantAuthService;
    let webhookService: WebhookService;

    const mockStellarPayload: StellarWebhookPayload = {
        id: 'webhook-123',
        type: 'transaction_created',
        timestamp: '2024-10-29T17:23:12.164Z',
        payload: {
            transaction: {
                id: 'txn-123',
                sep: '24',
                kind: 'deposit',
                status: 'completed',
                type: 'payment',
                amount_in: {
                    amount: '100',
                    asset: 'USDC'
                },
                amount_expected: {
                    amount: '100',
                    asset: 'USDC'
                },
                started_at: new Date(),
                destination_account: 'GDEST123',
                memo: 'test-memo'
            },
            customer: {
                id: 'merchant-123'
            }
        }
    };

    const mockMerchant: Merchant = {
        id: 'merchant-123',
        apiKey: 'test-api-key',
        secret: 'test-secret',
        name: 'Test Merchant',
        email: 'test@merchant.com',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const mockMerchantWebhook: MerchantWebhook = {
        id: 'webhook-123',
        merchantId: 'merchant-123',
        url: 'https://test.com/webhook',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    beforeEach(() => {
        jest.clearAllMocks();

        responseJson = jest.fn().mockReturnValue({});
        responseStatus = jest.fn().mockReturnThis();

        mockRequest = {
            body: mockStellarPayload
        };

        mockResponse = {
            status: responseStatus,
            json: responseJson
        };

        webhookController = new WebhookController();
        merchantAuthService = new MerchantAuthService();
        webhookService = new WebhookService();

        (merchantAuthService.getMerchantById as jest.Mock).mockResolvedValue(mockMerchant);
        (webhookService.getMerchantWebhook as jest.Mock).mockResolvedValue(mockMerchantWebhook);
    });

    describe('handleWebhook', () => {
        it('should successfully process a valid webhook request', async () => {
            await webhookController.handleWebhook(
                mockRequest as Request,
                mockResponse as Response
            );

            const expectedWebhookPayload: WebhookPayload = {
                transactionId: mockStellarPayload.payload.transaction.id,
                transactionType: mockStellarPayload.payload.transaction.type,
                status: mockStellarPayload.payload.transaction.status,
                amount: mockStellarPayload.payload.transaction.amount_in?.amount,
                asset: mockStellarPayload.payload.transaction.amount_in?.asset,
                merchantId: mockStellarPayload.payload.customer.id,
                timestamp: expect.any(String),
                eventType: `${mockStellarPayload.payload.transaction.type}.${mockStellarPayload.payload.transaction.status}`
            };

            expect(responseStatus).toHaveBeenCalledWith(200);
            expect(responseJson).toHaveBeenCalledWith({
                message: 'Webhook processed successfully'
            });
        });

        it('should handle different transaction statuses', async () => {
            const statuses: TransactionStatus[] = ['pending_stellar', 'pending_external', 'completed', 'error'];

            for (const status of statuses) {
                mockRequest.body = {
                    ...mockStellarPayload,
                    payload: {
                        ...mockStellarPayload.payload,
                        transaction: {
                            ...mockStellarPayload.payload.transaction,
                            status
                        }
                    }
                };

                await webhookController.handleWebhook(
                    mockRequest as Request,
                    mockResponse as Response
                );

                expect(responseStatus).toHaveBeenCalledWith(200);
            }
        });

        it('should return 404 when merchant is not found', async () => {
            (merchantAuthService.getMerchantById as jest.Mock).mockResolvedValue(null);

            await webhookController.handleWebhook(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(responseStatus).toHaveBeenCalledWith(404);
            expect(responseJson).toHaveBeenCalledWith({
                error: 'Merchant not found'
            });
        });

        it('should return 404 when webhook is not found', async () => {
            (webhookService.getMerchantWebhook as jest.Mock).mockResolvedValue(null);

            await webhookController.handleWebhook(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(responseStatus).toHaveBeenCalledWith(404);
            expect(responseJson).toHaveBeenCalledWith({
                error: 'Webhook not found'
            });
        });

        it('should handle inactive merchants', async () => {
            (merchantAuthService.getMerchantById as jest.Mock).mockResolvedValue({
                ...mockMerchant,
                isActive: false
            });

            await webhookController.handleWebhook(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(responseStatus).toHaveBeenCalledWith(404);
        });
    });
});