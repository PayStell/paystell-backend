import request from 'supertest';
import express from 'express';
import { MerchantController } from '../../controllers/merchant.controller';
import { validateWebhookUrl } from '../../validators/webhook.validators';
import { MerchantAuthService } from '../../services/merchant.service';
import { WebhookService } from '../../services/webhook.service';
import crypto from 'crypto';
import { asyncHandler } from '../../middlewares/middleware/auth';

jest.mock('../../services/merchant.service');
jest.mock('../../services/webhook.service');
jest.mock('../../validators/webhook.validators');
jest.mock('../../middleware/auth', () => ({
    asyncHandler: (fn: any) => fn,
    authenticateMerchant: (req: any, res: any, next: any) => next(),
    authenticateStellarWebhook: (req: any, res: any, next: any) => next()
}));

describe('MerchantController', () => {
    let app: express.Application;
    let merchantController: MerchantController;
    let merchantAuthService: MerchantAuthService;
    let webhookService: WebhookService;

    beforeEach(() => {
        app = express();
        app.use(express.json());

        app.use((req, res, next) => {
            req.merchant = { id: 'merchant-123' } as any;
            next();
        });

        merchantController = new MerchantController();
        merchantAuthService = new MerchantAuthService();
        webhookService = new WebhookService();
        app.post('/register-merchant', asyncHandler((req, res) => merchantController.registerMerchant(req, res)));
        app.post('/register-webhook', asyncHandler((req, res) => merchantController.registerWebhook(req, res)));
        app.put('/update-webhook', asyncHandler((req, res) => merchantController.updateWebhook(req, res)));
    });

    describe('registerMerchant', () => {
        it('should register a new merchant and return API key', async () => {
            const response = await request(app)
                .post('/register-merchant')
                .send({ name: 'Test Merchant', email: 'test@example.com' });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('message', 'Registration successful');
            expect(response.body).toHaveProperty('merchantId');
            expect(response.body).toHaveProperty('apiKey');
        });
    });

    describe('registerWebhook', () => {
        it('should register a webhook successfully', async () => {
            (merchantAuthService.getMerchantById as jest.Mock).mockResolvedValue({ id: 'merchant-123' });
            (validateWebhookUrl as jest.Mock).mockReturnValue(true);

            const response = await request(app)
                .post('/register-webhook')
                .send({ url: 'https://valid-url.com' });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('message', 'Webhook registered successfully');
            expect(response.body.webhook).toHaveProperty('id');
            expect(response.body.webhook).toHaveProperty('url');
        });

        it('should return 400 if webhook URL is invalid', async () => {
            (validateWebhookUrl as jest.Mock).mockReturnValue(false);

            const response = await request(app)
                .post('/register-webhook')
                .send({ url: 'invalid-url' });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid webhook url. Must be a valid HTTPS url');
        });
    });

    describe('updateWebhook', () => {
        it('should update a webhook successfully', async () => {
            (webhookService.getMerchantWebhook as jest.Mock).mockResolvedValue({
                id: 'webhook-123',
                merchantId: 'merchant-123',
                url: 'https://old-url.com',
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
            });
            (validateWebhookUrl as jest.Mock).mockReturnValue(true);

            const response = await request(app)
                .put('/update-webhook')
                .send({ newUrl: 'https://new-url.com', merchantWebhookId: 'webhook-123' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Webhook registered successfully');
            expect(response.body.webhook).toHaveProperty('id');
            expect(response.body.webhook.url).toBe('https://new-url.com');
        });

        it('should return 400 if new webhook URL is invalid', async () => {
            (validateWebhookUrl as jest.Mock).mockReturnValue(false);

            const response = await request(app)
                .put('/update-webhook')
                .send({ newUrl: 'invalid-url', merchantWebhookId: 'webhook-123' });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid webhook url. Must be a valid HTTPS url');
        });

        it('should return error if webhook does not exist', async () => {
            (webhookService.getMerchantWebhook as jest.Mock).mockResolvedValue(null);

            const response = await request(app)
                .put('/update-webhook')
                .send({ newUrl: 'https://new-url.com', merchantWebhookId: 'webhook-123' });

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'No such webhook exists')
        });
    });
});
