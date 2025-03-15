import { Request, Response } from "express";
import { validateWebhookUrl } from "../validators/webhook.validators";
import crypto from "crypto";
import { Merchant, MerchantWebhook } from "../interfaces/webhook.interfaces";
import { MerchantAuthService } from "../services/merchant.service";
import { WebhookService } from "../services/webhook.service";

const merchantAuthService = new MerchantAuthService();
const webhookService = new WebhookService();

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
      const { url } = req.body;
      const merchantId = req.merchant.id;
      const merchant = await merchantAuthService.getMerchantById(merchantId);

      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      // Validate webhook URL
      if (!validateWebhookUrl(url)) {
        return res.status(400).json({
          error: "Invalid webhook URL",
        });
      }

      // Create webhook in database
      const webhook: MerchantWebhook = {
        id: crypto.randomUUID(),
        merchantId,
        url,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await webhookService.register(webhook);

      return res.status(201).json({
        message: "Webhook registered successfully",
        webhookId: webhook.id,
      });
    } catch (error) {
      console.error("Webhook registration failed:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  async updateWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const { url } = req.body;
      const { webhookId } = req.params;
      const merchantId = req.merchant.id;

      // Validate webhook URL
      if (!validateWebhookUrl(url)) {
        return res.status(400).json({
          error: "Invalid webhook URL",
        });
      }

      // Get the webhook first to verify it exists
      const existingWebhook = await webhookService.getMerchantWebhook(merchantId);

      if (!existingWebhook) {
        return res.status(404).json({
          error: "Webhook not found",
        });
      }

      // Update webhook in database
      const webhook: MerchantWebhook = {
        ...existingWebhook,
        url,
        updatedAt: new Date(),
      };

      const updatedWebhook = await webhookService.update(webhook);

      return res.status(200).json({
        message: "Webhook updated successfully",
        webhook: updatedWebhook,
      });
    } catch (error) {
      console.error("Webhook update failed:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  async deleteWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const { webhookId } = req.params;
      const merchantId = req.merchant.id;

      // Get the webhook first to verify it exists
      const webhook = await webhookService.getMerchantWebhook(merchantId);

      if (!webhook) {
        return res.status(404).json({
          error: "Webhook not found",
        });
      }

      // Delete webhook from database by updating isActive to false
      const updatedWebhook: MerchantWebhook = {
        ...webhook,
        isActive: false,
        updatedAt: new Date(),
      };

      await webhookService.update(updatedWebhook);

      return res.status(204).send();
    } catch (error) {
      console.error("Webhook deletion failed:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  async getWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const { webhookId } = req.params;
      const merchantId = req.merchant.id;

      // Get webhook from database
      const webhook = await webhookService.getMerchantWebhook(merchantId);

      if (!webhook) {
        return res.status(404).json({
          error: "Webhook not found",
        });
      }

      return res.status(200).json(webhook);
    } catch (error) {
      console.error("Webhook retrieval failed:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  }
}
