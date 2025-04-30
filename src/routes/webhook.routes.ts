import express from "express";
import { MerchantController } from "../controllers/merchant.controller";
import {
  authenticateMerchant,
  authenticateStellarWebhook,
  asyncHandler,
} from "../middlewares/merchantAuth";
import { WebhookController } from "../controllers/webhook.controller";
import rateLimit from 'express-rate-limit';



// Allow max 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

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
  limiter,
  asyncHandler(webhookController.getWebhookLogs),);

export default router;
