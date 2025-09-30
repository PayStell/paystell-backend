import { Request, Response } from "express";
import { WebhookController } from "../../controllers/webhook.controller";
import { IWebhookService } from "../../interfaces/IWebhookService";
import { IMerchantAuthService } from "../../interfaces/IMerchantAuthService";
import {
  Merchant,
  MerchantWebhook,
  StellarWebhookPayload,
  WebhookPayload,
  TransactionStatus,
} from "../../interfaces/webhook.interfaces";
import { IWebhookNotificationService } from "../../interfaces/IWebhookNotificationService";

// No need to jest.mock service classes, use plain object mocks

describe("WebhookController", () => {
  let webhookController: WebhookController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;
  let merchantAuthService: jest.Mocked<IMerchantAuthService>;
  let webhookService: jest.Mocked<IWebhookService>;
  let webhookNotificationService: jest.Mocked<IWebhookNotificationService>;

  const mockStellarPayload: StellarWebhookPayload = {
    id: "webhook-123",
    type: "transaction_created",
    timestamp: "2024-10-29T17:23:12.164Z",
    payload: {
      transaction: {
        id: "txn-123",
        sep: "24",
        kind: "deposit",
        status: "completed",
        type: "payment",
        amount_in: {
          amount: "100",
          asset: "USDC",
        },
        amount_expected: {
          amount: "100",
          asset: "USDC",
        },
        started_at: new Date(),
        destination_account: "GDEST123",
        memo: "test-memo",
      },
      customer: {
        id: "merchant-123",
      },
    },
  };

  const mockMerchant: Merchant = {
    id: "merchant-123",
    apiKey: "test-api-key",
    secret: "test-secret",
    name: "Test Merchant",
    email: "test@merchant.com",
    isActive: true,
    business_name: null,
    business_description: null,
    business_address: null,
    business_phone: null,
    business_email: null,
    business_logo_url: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    webhooks: [],
  };

  const mockMerchantWebhook: MerchantWebhook = {
    id: "webhook-123",
    merchantId: "merchant-123",
    url: "https://test.com/webhook",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    responseJson = jest.fn().mockReturnValue({});
    responseStatus = jest.fn().mockReturnThis();

    mockRequest = {
      body: mockStellarPayload,
      params: { merchantId: "merchant-123" },
    };

    mockResponse = {
      status: responseStatus,
      json: responseJson,
    };

    merchantAuthService = {
      getMerchantById: jest.fn().mockResolvedValue(mockMerchant),
    };
    webhookService = {
      getMerchantWebhook: jest.fn().mockResolvedValue(mockMerchantWebhook),
    };
    webhookNotificationService = {
      sendWebhookNotification: jest.fn().mockResolvedValue(true),
    };
    webhookController = new WebhookController(
      webhookService,
      merchantAuthService,
      webhookNotificationService,
    );
  });

  describe("handleWebhook", () => {
    it("should successfully process a valid webhook request", async () => {
      await webhookController.handleWebhook(
        mockRequest as Request,
        mockResponse as Response,
      );

      const _expectedWebhookPayload: WebhookPayload = {
        transactionId: mockStellarPayload.payload.transaction.id,
        transactionType: mockStellarPayload.payload.transaction.type,
        status: mockStellarPayload.payload.transaction.status,
        amount: mockStellarPayload.payload.transaction.amount_in?.amount,
        asset: mockStellarPayload.payload.transaction.amount_in?.asset,
        merchantId: mockStellarPayload.payload.customer.id,
        timestamp: expect.any(String),
        eventType: `${mockStellarPayload.payload.transaction.type}.${mockStellarPayload.payload.transaction.status}`,
        reqMethod: "POST",
      };

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({
        message: "Webhook processed successfully",
        status: "success",
      });
    });

    it("should handle different transaction statuses", async () => {
      const statuses: TransactionStatus[] = [
        "pending_stellar",
        "pending_external",
        "completed",
        "error",
      ];

      for (const status of statuses) {
        mockRequest.body = {
          ...mockStellarPayload,
          payload: {
            ...mockStellarPayload.payload,
            transaction: {
              ...mockStellarPayload.payload.transaction,
              status,
            },
          },
        };

        await webhookController.handleWebhook(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(responseStatus).toHaveBeenCalledWith(200);
      }
    });

    it("should return 404 when merchant is not found", async () => {
      (merchantAuthService.getMerchantById as jest.Mock).mockResolvedValue(
        null,
      );

      await webhookController.handleWebhook(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({
        code: "MERCHANT_NOT_FOUND",
        message: "Merchant not found",
        status: "error",
      });
    });

    it("should return 404 when webhook is not found", async () => {
      (webhookService.getMerchantWebhook as jest.Mock).mockResolvedValue(null);

      await webhookController.handleWebhook(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({
        code: "WEBHOOK_NOT_FOUND",
        message: "Webhook not found",
        status: "error",
      });
    });

    it("should handle inactive merchants", async () => {
      (merchantAuthService.getMerchantById as jest.Mock).mockResolvedValue({
        ...mockMerchant,
        isActive: false,
      });

      await webhookController.handleWebhook(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
    });
  });
});
