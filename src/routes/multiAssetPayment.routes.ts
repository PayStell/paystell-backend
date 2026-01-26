import express from "express";
import { MultiAssetPaymentController } from "src/controllers/MultiAssetPaymentController";
import {
  authenticateMerchant,
  asyncHandler,
} from "../middlewares/merchantAuth";
import { handleValidationErrors } from "../middlewares/validationErrorHandler";
import { body, param } from "express-validator";

const router = express.Router();
const controller = new MultiAssetPaymentController();

const validateAsset = [
  body("code").isString().notEmpty().withMessage("Asset code is required"),
  body("issuer")
    .optional()
    .isString()
    .withMessage("Asset issuer must be a string"),
];

const validateCreateAssetConfig = [
  body("merchantId").isUUID().withMessage("Valid merchant ID is required"),
  body("asset").isObject().withMessage("Asset is required"),
  body("asset.code")
    .isString()
    .notEmpty()
    .withMessage("Asset code is required"),
  body("asset.issuer").optional().isString(),
  body("isEnabled").optional().isBoolean(),
  body("minAmount").optional().isString(),
  body("maxAmount").optional().isString(),
  body("priority").optional().isInt({ min: 0, max: 100 }),
  body("autoConvert").optional().isBoolean(),
  body("settlementAsset").optional().isObject(),
  handleValidationErrors,
];

const validateUpdateAssetConfig = [
  param("id").isUUID().withMessage("Valid configuration ID is required"),
  body("merchantId").isUUID().withMessage("Valid merchant ID is required"),
  body("isEnabled").optional().isBoolean(),
  body("minAmount").optional().isString(),
  body("maxAmount").optional().isString(),
  body("priority").optional().isInt({ min: 0, max: 100 }),
  body("autoConvert").optional().isBoolean(),
  body("settlementAsset").optional().isObject(),
  handleValidationErrors,
];

const validateExchangeRate = [
  body("sourceAsset").isObject().withMessage("Source asset is required"),
  body("sourceAsset.code").isString().notEmpty(),
  body("sourceAsset.issuer").optional().isString(),
  body("destinationAsset")
    .isObject()
    .withMessage("Destination asset is required"),
  body("destinationAsset.code").isString().notEmpty(),
  body("destinationAsset.issuer").optional().isString(),
  body("amount").isString().notEmpty().withMessage("Amount is required"),
  handleValidationErrors,
];

const validatePathPayment = [
  body("merchantId").isUUID().withMessage("Valid merchant ID is required"),
  body("sourceAddress")
    .isString()
    .notEmpty()
    .withMessage("Source address is required"),
  body("destinationAddress")
    .isString()
    .notEmpty()
    .withMessage("Destination address is required"),
  body("sourceAsset").isObject().withMessage("Source asset is required"),
  body("sourceAsset.code").isString().notEmpty(),
  body("sourceAsset.issuer").optional().isString(),
  body("destinationAsset").optional().isObject(),
  body("amount").isString().notEmpty().withMessage("Amount is required"),
  body("sourceSecret")
    .isString()
    .notEmpty()
    .withMessage("Source secret is required"),
  body("memo").optional().isString(),
  handleValidationErrors,
];

const validateEstimate = [
  body("merchantId").isUUID().withMessage("Valid merchant ID is required"),
  body("sourceAsset").isObject().withMessage("Source asset is required"),
  body("sourceAsset.code").isString().notEmpty(),
  body("sourceAsset.issuer").optional().isString(),
  body("destinationAsset")
    .isObject()
    .withMessage("Destination asset is required"),
  body("destinationAsset.code").isString().notEmpty(),
  body("destinationAsset.issuer").optional().isString(),
  body("amount").isString().notEmpty().withMessage("Amount is required"),
  handleValidationErrors,
];

/**
 * @route POST /api/multi-asset/config
 * @desc Create asset configuration for merchant
 * @access Private (Merchant)
 */
router.post(
  "/config",
  authenticateMerchant,
  validateCreateAssetConfig,
  asyncHandler(controller.createAssetConfig),
);

/**
 * @route PUT /api/multi-asset/config/:id
 * @desc Update asset configuration
 * @access Private (Merchant)
 */
router.put(
  "/config/:id",
  authenticateMerchant,
  validateUpdateAssetConfig,
  asyncHandler(controller.updateAssetConfig),
);

/**
 * @route DELETE /api/multi-asset/config/:id
 * @desc Delete asset configuration
 * @access Private (Merchant)
 */
router.delete(
  "/config/:id",
  authenticateMerchant,
  [
    param("id").isUUID().withMessage("Valid configuration ID is required"),
    body("merchantId").isUUID().withMessage("Valid merchant ID is required"),
    handleValidationErrors,
  ],
  asyncHandler(controller.deleteAssetConfig),
);

/**
 * @route GET /api/multi-asset/config/merchant/:merchantId
 * @desc Get all asset configurations for merchant
 * @access Public
 */
router.get(
  "/config/merchant/:merchantId",
  [
    param("merchantId").isUUID().withMessage("Valid merchant ID is required"),
    handleValidationErrors,
  ],
  asyncHandler(controller.getMerchantAssetConfigs),
);

/**
 * @route POST /api/multi-asset/exchange-rate
 * @desc Get exchange rate between two assets
 * @access Public
 */
router.post(
  "/exchange-rate",
  validateExchangeRate,
  asyncHandler(controller.getExchangeRate),
);

/**
 * @route POST /api/multi-asset/payment
 * @desc Execute multi-asset path payment
 * @access Private (Merchant)
 */
router.post(
  "/payment",
  authenticateMerchant,
  validatePathPayment,
  asyncHandler(controller.executePathPayment),
);

/**
 * @route POST /api/multi-asset/estimate
 * @desc Estimate payment amount and fees
 * @access Public
 */
router.post(
  "/estimate",
  validateEstimate,
  asyncHandler(controller.estimatePayment),
);

/**
 * @route GET /api/multi-asset/pairs/:merchantId
 * @desc Get supported asset pairs for merchant
 * @access Public
 */
router.get(
  "/pairs/:merchantId",
  [
    param("merchantId").isUUID().withMessage("Valid merchant ID is required"),
    handleValidationErrors,
  ],
  asyncHandler(controller.getSupportedAssetPairs),
);

/**
 * @route POST /api/multi-asset/orderbook
 * @desc Get DEX orderbook for asset pair
 * @access Public
 */
router.post(
  "/orderbook",
  validateExchangeRate,
  asyncHandler(controller.getOrderbook),
);

export default router;
