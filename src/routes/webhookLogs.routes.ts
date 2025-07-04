import express from "express";
import { WebhookLogController } from "../controllers/WebhookLogController";
import {
  authenticateMerchant,
  asyncHandler,
} from "../middlewares/merchantAuth";

const router = express.Router();
const webhookLogController = new WebhookLogController();

// Apply authentication middleware to all routes
router.use(authenticateMerchant);

/**
 * @route GET /api/webhook-logs
 * @desc Get webhook logs with filtering and pagination
 * @query merchantId - Filter by merchant ID (optional)
 * @query status - Filter by status: success or failed (optional)
 * @query startDate - Filter by start date ISO 8601 (optional)
 * @query endDate - Filter by end date ISO 8601 (optional)
 * @query limit - Number of logs per page (default: 10, max: 100)
 * @query offset - Number of logs to skip for pagination (default: 0)
 */
router.get(
  "/",
  asyncHandler(webhookLogController.getWebhookLogs.bind(webhookLogController)),
);

/**
 * @route GET /api/webhook-logs/stats
 * @desc Get webhook log statistics
 * @query merchantId - Filter by merchant ID (optional)
 */
router.get(
  "/stats",
  asyncHandler(
    webhookLogController.getWebhookLogStats.bind(webhookLogController),
  ),
);

/**
 * @route GET /api/webhook-logs/recent
 * @desc Get recent webhook activity
 * @query merchantId - Filter by merchant ID (optional)
 * @query limit - Number of recent logs (default: 20, max: 50)
 */
router.get(
  "/recent",
  asyncHandler(
    webhookLogController.getRecentActivity.bind(webhookLogController),
  ),
);

/**
 * @route GET /api/webhook-logs/:id
 * @desc Get a specific webhook log by ID
 * @param id - Webhook log UUID
 */
router.get(
  "/:id",
  asyncHandler(
    webhookLogController.getWebhookLogById.bind(webhookLogController),
  ),
);

export default router;
