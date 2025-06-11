import express from "express";
import { TokenController } from "../controllers/TokenController";
import {
  authenticateMerchant,
  asyncHandler,
} from "../middlewares/merchantAuth";
import { handleValidationErrors } from "../middlewares/validationErrorHandler";
import { tokenOperationsRateLimit } from "../middlewares/paymentRateLimit";
import {
  validateAddTokenSupport,
  validateMerchantParam,
  validateTokenParam,
  validateTokenSupportParams,
  validateTokenAddressBody,
} from "../validators/tokenValidators";

const router = express.Router();
const tokenController = new TokenController();

/**
 * @route POST /api/tokens/support
 * @desc Add a supported token for a merchant
 * @access Private (Merchant)
 */
router.post(
  "/support",
  tokenOperationsRateLimit,
  authenticateMerchant,
  validateAddTokenSupport,
  handleValidationErrors,
  asyncHandler(tokenController.addSupportedToken),
);

/**
 * @route GET /api/tokens/merchant/:merchantAddress
 * @desc Get supported tokens for a merchant
 * @access Public
 */
router.get(
  "/merchant/:merchantAddress",
  validateMerchantParam,
  handleValidationErrors,
  asyncHandler(tokenController.getMerchantTokens),
);

/**
 * @route GET /api/tokens/support/:merchantAddress/:tokenAddress
 * @desc Check if a token is supported by a merchant
 * @access Public
 */
router.get(
  "/support/:merchantAddress/:tokenAddress",
  validateTokenSupportParams,
  handleValidationErrors,
  asyncHandler(tokenController.checkTokenSupport),
);

/**
 * @route GET /api/tokens/info/:tokenAddress
 * @desc Get token information
 * @access Public
 */
router.get(
  "/info/:tokenAddress",
  validateTokenParam,
  handleValidationErrors,
  asyncHandler(tokenController.getTokenInfo),
);

/**
 * @route POST /api/tokens/validate
 * @desc Validate token address format
 * @access Public
 */
router.post(
  "/validate",
  validateTokenAddressBody,
  handleValidationErrors,
  asyncHandler(tokenController.validateTokenAddress),
);

export default router;
