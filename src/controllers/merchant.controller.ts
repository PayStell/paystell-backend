import { Response } from "express";
import { Request } from "express-serve-static-core";
import { validateWebhookUrl } from "../validators/webhook.validators";
import crypto from "crypto";
import { MerchantWebhook } from "../interfaces/webhook.interfaces";
import { MerchantAuthService } from "../services/merchant.service";
import { WebhookService } from "../services/webhook.service";
import { WebhookEventType } from "../enums/WebhookEventTypes";
import { WebhookSubscriptionRequest, Merchant } from "../interfaces/webhook.interfaces";
import { CryptoGeneratorService } from "../services/cryptoGenerator.service";

// Default service initializations
const merchantAuthService = new MerchantAuthService();
const webhookService = new WebhookService();
const cryptoGeneratorService = new CryptoGeneratorService();

export class MerchantController {
  async registerMerchant(req: Request, res: Response): Promise<Response> {
    try {
      const { name, email } = req.body;

      // Generate API key for the merchant
      const apiKey = crypto.randomBytes(32).toString("hex");
      const secret = crypto.randomBytes(32).toString("hex");

      // Create merchant data
      const merchantData: Merchant = {
        id: crypto.randomUUID(),
        name,
        email,
        apiKey,
        secret,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Register merchant in database
      const merchant = await merchantAuthService.register(merchantData);

      // Return their credentials
      return res.status(201).json({
        message: "Registration successful",
        merchantId: merchant.id,
        apiKey: merchant.apiKey,
      });
    } catch (error) {
      console.error("Registration failed:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  async registerWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const { url, eventTypes, maxRetries, initialRetryDelay, maxRetryDelay } = req.body;
      const merchantId = req.merchant?.id;
      const merchant = await merchantAuthService.getMerchantById(
        merchantId ?? "",
      );

      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      // Validate webhook URL
      if (!validateWebhookUrl(url)) {
        return res.status(400).json({
          error: "Invalid webhook URL",
        });
      }

      // Generate a secret if not provided
      const secretKey = req.body.secretKey || cryptoGeneratorService.generateSecret();

      // Create webhook data for registration
      const webhookData: WebhookSubscriptionRequest = {
        url,
        secretKey,
        eventTypes,
        maxRetries: maxRetries !== undefined ? Math.min(Math.max(maxRetries, 0), 10) : undefined,
        initialRetryDelay: initialRetryDelay !== undefined ? Math.max(initialRetryDelay, 1000) : undefined,
        maxRetryDelay: maxRetryDelay !== undefined ? Math.min(Math.max(maxRetryDelay, 1000), 86400000) : undefined,
      };

      // Register webhook in database
      const webhook = await webhookService.register(merchantId ?? "", webhookData);

      return res.status(201).json({
        message: "Webhook registered successfully",
        webhook: {
          id: webhook.id,
          url: webhook.url,
          secretKey: webhook.secretKey, // Only shown once during creation
          eventTypes: webhook.eventTypes,
          createdAt: webhook.createdAt
        }
      });
    } catch (error) {
      console.error("Webhook registration failed:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  async updateWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const { url, eventTypes, secretKey, maxRetries, initialRetryDelay, maxRetryDelay } = req.body;
      const merchantId = req.merchant?.id;

      // Validate webhook URL if provided
      if (url && !validateWebhookUrl(url)) {
        return res.status(400).json({
          error: "Invalid webhook URL",
        });
      }

      // Get the webhook first to verify it exists
      const existingWebhook = await webhookService.getMerchantWebhook(
        merchantId ?? "",
        true
      );

      if (!existingWebhook) {
        return res.status(404).json({
          error: "Webhook not found",
        });
      }

      // Update webhook data - only include fields that were provided
      const webhookData: Partial<WebhookSubscriptionRequest> = {};
      
      if (url) webhookData.url = url;
      if (secretKey) webhookData.secretKey = secretKey;
      if (eventTypes) webhookData.eventTypes = eventTypes;
      if (maxRetries !== undefined) webhookData.maxRetries = Math.min(Math.max(maxRetries, 0), 10);
      if (initialRetryDelay !== undefined) webhookData.initialRetryDelay = Math.max(initialRetryDelay, 1000);
      if (maxRetryDelay !== undefined) webhookData.maxRetryDelay = Math.min(Math.max(maxRetryDelay, 1000), 86400000);

      // Update webhook in database
      const updatedWebhook = await webhookService.update(merchantId ?? "", webhookData);

      return res.status(200).json({
        message: "Webhook updated successfully",
        webhook: {
          id: updatedWebhook.id,
          url: updatedWebhook.url,
          secretKeyLastFour: updatedWebhook.secretKey ? updatedWebhook.secretKey.slice(-4).padStart(updatedWebhook.secretKey.length, '*') : null,
          eventTypes: updatedWebhook.eventTypes,
          maxRetries: updatedWebhook.maxRetries,
          initialRetryDelay: updatedWebhook.initialRetryDelay,
          maxRetryDelay: updatedWebhook.maxRetryDelay,
          createdAt: updatedWebhook.createdAt,
          updatedAt: updatedWebhook.updatedAt
        }
      });
    } catch (error) {
      console.error("Webhook update failed:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  async deleteWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const merchantId = req.merchant?.id;

      // Get the webhook first to verify it exists
      const webhook = await webhookService.getMerchantWebhook(merchantId ?? "", true);

      if (!webhook) {
        return res.status(404).json({
          error: "Webhook not found",
        });
      }

      // Delete the webhook (soft delete)
      const deleted = await webhookService.deleteWebhook(merchantId ?? "");
      
      if (!deleted) {
        return res.status(500).json({
          error: "Failed to delete webhook"
        });
      }

      return res.status(204).send();
    } catch (error) {
      console.error("Webhook deletion failed:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  async getWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const merchantId = req.merchant?.id ?? "";

      // Get webhook from database
      const webhook = await webhookService.getMerchantWebhook(merchantId, true);

      if (!webhook) {
        return res.status(404).json({
          error: "Webhook not found",
        });
      }

      return res.status(200).json({
        id: webhook.id,
        url: webhook.url,
        secretKeyLastFour: webhook.secretKey ? webhook.secretKey.slice(-4).padStart(webhook.secretKey.length, '*') : null,
        eventTypes: webhook.eventTypes,
        maxRetries: webhook.maxRetries,
        initialRetryDelay: webhook.initialRetryDelay,
        maxRetryDelay: webhook.maxRetryDelay,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt
      });
    } catch (error) {
      console.error("Webhook retrieval failed:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  async getAvailableEventTypes(req: Request, res: Response): Promise<Response> {
    try {
      const eventTypes = await webhookService.getAvailableEventTypes();
      
      return res.status(200).json({
        eventTypes
      });
    } catch (error) {
      console.error("Failed to retrieve event types:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  async generateWebhookSecret(req: Request, res: Response): Promise<Response> {
    try {
      const secretKey = cryptoGeneratorService.generateSecret();
      
      return res.status(200).json({
        secretKey
      });
    } catch (error) {
      console.error("Failed to generate webhook secret:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  async getProfile(req: Request, res: Response): Promise<Response> {
    try {
      const merchantId = req.merchant?.id ?? "";
      const merchant: Partial<Merchant> | null =
        await merchantAuthService.getBusinessProfileById(merchantId);

      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      return res.json(merchant);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  async createProfile(req: Request, res: Response): Promise<Response> {
    try {
      const merchantId = req.merchant?.id ?? "";
      const profileData = req.body;

      const createdMerchant = await merchantAuthService.createMerchantProfile(
        merchantId,
        profileData,
      );

      return res.json(createdMerchant);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<Response> {
    try {
      const merchantId = req.merchant?.id ?? "";
      const profileData = req.body;

      const updatedMerchant = await merchantAuthService.updateMerchantProfile(
        merchantId,
        profileData,
      );

      return res.json(updatedMerchant);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  async uploadLogo(req: Request, res: Response): Promise<Response> {
    try {
      const merchantId = req.merchant?.id ?? "";
      const logoUrl = req.body.fileUrl;

      const updatedMerchant = await merchantAuthService.updateLogo(
        merchantId,
        logoUrl,
      );

      return res.json({
        message: "Logo uploaded successfully",
        business_logo_url: updatedMerchant.business_logo_url,
      });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  async deleteLogo(req: Request, res: Response): Promise<Response> {
    try {
      const merchantId = req.merchant?.id ?? "";

      await merchantAuthService.deleteLogo(merchantId);

      return res.json({
        message: "Logo deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  }
}
