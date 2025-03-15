import express, { Request, Response, NextFunction } from "express";
import { MerchantWebhookQueueController } from "../controllers/merchantWebhookQueue.controller";
import { UserRole } from "../enums/UserRole";
import {
  authMiddleware,
  isUserAuthorized,
} from "../middlewares/authMiddleware";

const router = express.Router();
const merchantWebhookQueueController = new MerchantWebhookQueueController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.get(
  "/failed",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  asyncHandler(merchantWebhookQueueController.getFailedWebhooks.bind(merchantWebhookQueueController))
);

router.get(
  "/pending",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  asyncHandler(merchantWebhookQueueController.getPendingWebhooks.bind(merchantWebhookQueueController))
);

router.post(
  "/retry/:jobId",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  asyncHandler(merchantWebhookQueueController.retryWebhook.bind(merchantWebhookQueueController))
);

router.get(
  "/metrics",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  asyncHandler(merchantWebhookQueueController.getQueueMetrics.bind(merchantWebhookQueueController))
);

export default router;
