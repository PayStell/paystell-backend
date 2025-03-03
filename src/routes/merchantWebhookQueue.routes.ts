import express from "express";
import { MerchantWebhookQueueController } from "../controllers/merchantWebhookQueue.controller";
import { UserRole } from "../enums/UserRole";
import {
  authMiddleware,
  isUserAuthorized,
} from "../middlewares/authMiddleware";

const router = express.Router();
const merchantWebhookQueueController = new MerchantWebhookQueueController();

router.get(
  "/failed",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  merchantWebhookQueueController.getFailedWebhooks
);

router.get(
  "/pending",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  merchantWebhookQueueController.getPendingWebhooks
);

router.post(
  "/retry/:jobId",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  merchantWebhookQueueController.retryWebhook
);

router.get(
  "/metrics",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  merchantWebhookQueueController.getQueueMetrics
);

export default router;
