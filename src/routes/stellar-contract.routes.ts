import express from "express";
import { StellarContractController } from "../controllers/StellarContractController";
import {
  authenticateMerchant,
  asyncHandler,
} from "../middlewares/merchantAuth";

const router = express.Router();
const contractController = new StellarContractController();

// Merchant registration
router.post(
  "/merchants/register",
  authenticateMerchant,
  asyncHandler(contractController.registerMerchant.bind(contractController)),
);

// Token support management
router.post(
  "/merchants/tokens",
  authenticateMerchant,
  asyncHandler(contractController.addSupportedToken.bind(contractController)),
);

// Payment processing with rate limiting
router.post(
  "/payments/process",
  authenticateMerchant,
  contractController.paymentRateLimiter,
  asyncHandler(contractController.processPayment.bind(contractController)),
);

// Get merchant details
router.get(
  "/merchants/:merchantAddress",
  authenticateMerchant,
  asyncHandler(contractController.getMerchantDetails.bind(contractController)),
);

export default router;
