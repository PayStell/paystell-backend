import express, {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import { MerchantWebhookQueueController } from "../controllers/merchantWebhookQueue.controller";
import { UserRole } from "../enums/UserRole";
import {
  authMiddleware,
  isUserAuthorized,
} from "../middlewares/authMiddleware";

const router = express.Router();
const merchantWebhookQueueController = new MerchantWebhookQueueController();

const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req as Request, res, next)).catch(next);
  };
};

router.get(
  "/failed",
  authMiddleware as RequestHandler,
  isUserAuthorized([UserRole.ADMIN]) as RequestHandler,
  asyncHandler(
    merchantWebhookQueueController.getFailedWebhooks.bind(
      merchantWebhookQueueController,
    ),
  ),
);

router.get(
  "/pending",
  authMiddleware as RequestHandler,
  isUserAuthorized([UserRole.ADMIN]) as RequestHandler,
  asyncHandler(
    merchantWebhookQueueController.getPendingWebhooks.bind(
      merchantWebhookQueueController,
    ),
  ),
);

router.post(
  "/retry/:jobId",
  authMiddleware as RequestHandler,
  isUserAuthorized([UserRole.ADMIN]) as RequestHandler,
  asyncHandler(
    merchantWebhookQueueController.retryWebhook.bind(
      merchantWebhookQueueController,
    ),
  ),
);

router.get(
  "/metrics",
  authMiddleware as RequestHandler,
  isUserAuthorized([UserRole.ADMIN]) as RequestHandler,
  asyncHandler(
    merchantWebhookQueueController.getQueueMetrics.bind(
      merchantWebhookQueueController,
    ),
  ),
);

export default router;
