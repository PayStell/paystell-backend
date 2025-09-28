import express from "express";
import { MerchantController } from "../controllers/merchant.controller";
import {
  authenticateMerchant,
  authenticateStellarWebhook,
  asyncHandler,
} from "../middlewares/merchantAuth";
import { WebhookController } from "../controllers/webhook.controller";
import { WebhookService } from "../services/webhook.service";
import { MerchantAuthService } from "../services/merchant.service";
import { WebhookNotificationService } from "../services/webhookNotification.service";
import { CryptoGeneratorService } from "../services/cryptoGenerator.service";

const router = express.Router();
const merchantController = new MerchantController();
const webhookService = new WebhookService();
const merchantAuthService = new MerchantAuthService();
const cryptoGeneratorService = new CryptoGeneratorService();
const webhookNotificationService = new WebhookNotificationService(
  merchantAuthService,
  cryptoGeneratorService
);

const webhookController = new WebhookController(
  webhookService,
  merchantAuthService,
  webhookNotificationService
);

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

export default router;
