import express from "express";
import { MerchantController } from "../controllers/merchant.controller";
import {
  authenticateMerchant,
  authenticateStellarWebhook,
  asyncHandler,
} from "../middlewares/merchantAuth";
import { WebhookController } from "../controllers/webhook.controller";

const router = express.Router();
const merchantController = new MerchantController();
const webhookController = new WebhookController();

// router.use(webhookRateLimiter)

router
  .post(
    "/webhooks/register",
    authenticateMerchant,
    asyncHandler(merchantController.registerWebhook),
  )
  .put(
    "/webhooks/register/:id",
    authenticateMerchant,
    asyncHandler(merchantController.updateWebhook),
  );
router.post(
  "/webhooks/stellar",
  authenticateStellarWebhook,
  asyncHandler(webhookController.handleWebhook),
);
router
.get("/webhook/logs",
  authenticateStellarWebhook, 
  asyncHandler(webhookController.getWebhookLogs),);

export default router;
