import express from "express";
import {
  authenticateMerchant,
  authenticateStellarWebhook,
  asyncHandler,
} from "../middlewares/merchantAuth";
import { WebhookController } from "../controllers/webhook.controller";
import { MerchantWebhookQueueService } from "../services/merchantWebhookQueue.service";
import { CryptoGeneratorService } from "../services/cryptoGenerator.service";

const router = express.Router();
const webhookController = new WebhookController();
const cryptoGeneratorService = new CryptoGeneratorService();

// router.use(webhookRateLimiter)

// Webhook registration and management routes
router
  .post(
    "/webhooks/register",
    authenticateMerchant,
    asyncHandler((req, res) => webhookController.registerWebhook(req, res)),
  )
  .put(
    "/webhooks/register",
    authenticateMerchant,
    asyncHandler((req, res) => webhookController.updateWebhook(req, res)),
  )
  .get(
    "/webhooks/register",
    authenticateMerchant,
    asyncHandler((req, res) => webhookController.getWebhook(req, res)),
  )
  .delete(
    "/webhooks/register",
    authenticateMerchant,
    asyncHandler((req, res) => webhookController.deleteWebhook(req, res)),
  );

// Webhook event types and utilities
router.get(
  "/webhooks/event-types",
  authenticateMerchant,
  asyncHandler((req, res) => webhookController.getEventTypes(req, res)),
);

router.post(
  "/webhooks/generate-secret",
  authenticateMerchant,
  asyncHandler(async (req, res) => {
    const secret = await cryptoGeneratorService.generateSecret();
    return res.status(200).json({
      status: "success",
      data: {
        secret,
      },
    });
  }),
);

// Test webhook endpoint
router.post(
  "/webhooks/test",
  authenticateMerchant,
  asyncHandler((req, res) => webhookController.testWebhook(req, res)),
);

// Webhook receiver endpoint
router.post(
  "/webhooks/stellar",
  authenticateStellarWebhook,
  asyncHandler((req, res) => webhookController.handleWebhook(req, res)),
);

// New API endpoints aligned with frontend requirements

// Get webhook events for a specific webhook
router.get(
  "/api/webhooks/:id/events",
  authenticateMerchant,
  asyncHandler((req, res) => webhookController.getWebhookEvents(req, res)),
);

// Webhook metrics endpoints
router.get(
  "/api/webhooks/metrics",
  authenticateMerchant,
  asyncHandler((req, res) => webhookController.getWebhookMetrics(req, res)),
);

// Test webhook with specific ID
router.post(
  "/api/webhooks/:id/test",
  authenticateMerchant,
  asyncHandler((req, res) => webhookController.testWebhook(req, res)),
);

// Manual retry of a failed webhook event
router.post(
  "/api/webhooks/events/:eventId/retry",
  authenticateMerchant,
  asyncHandler(async (req, res) => {
    const eventId = req.params.eventId;
    if (!eventId) {
      return res.status(400).json({
        status: "error",
        message: "Event ID is required",
      });
    }
    
    try {
      const queueService = new MerchantWebhookQueueService();
      const job = await queueService.retryWebhook(eventId);
      
      return res.status(200).json({
        status: "success",
        message: "Webhook queued for retry",
        data: {
          jobId: job.id,
          status: "pending",
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to retry webhook",
      });
    }
  }),
);

export default router;
