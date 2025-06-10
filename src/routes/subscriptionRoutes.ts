import express, { RequestHandler } from "express";
import { SubscriptionController } from "../controllers/SubscriptionController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { handleValidationErrors } from "../middlewares/validationErrorHandler";
import { body, param } from "express-validator";

const router = express.Router();
const subscriptionController = new SubscriptionController();

// Validation rules
const createSubscriptionValidation = [
  body("customerId").isString().notEmpty().withMessage("Customer ID is required"),
  body("customerEmail").isEmail().withMessage("Valid customer email is required"),
  body("merchantId").isString().notEmpty().withMessage("Merchant ID is required"),
  body("amount").isNumeric().isFloat({ min: 0.01 }).withMessage("Amount must be greater than 0"),
  body("currency").isString().notEmpty().withMessage("Currency is required"),
  body("tokenAddress").isString().notEmpty().withMessage("Token address is required"),
  body("billingInterval")
    .isIn(["monthly", "yearly", "weekly", "custom"])
    .withMessage("Invalid billing interval"),
  body("intervalCount").optional().isInt({ min: 1 }).withMessage("Interval count must be positive"),
  body("startDate").optional().isISO8601().withMessage("Invalid start date format"),
];

const subscriptionIdValidation = [
  param("subscriptionId").isString().notEmpty().withMessage("Subscription ID is required"),
];

/**
 * @route POST /api/subscriptions
 * @desc Create a new subscription
 * @access Private
 */
router.post(
  "/",
  authMiddleware as RequestHandler,
  createSubscriptionValidation,
  handleValidationErrors,
  subscriptionController.createSubscription.bind(subscriptionController) as RequestHandler
);

/**
 * @route GET /api/subscriptions/merchant?merchantId=xxx
 * @desc Get all subscriptions for a merchant
 * @access Private
 */
router.get(
  "/merchant",
  authMiddleware as RequestHandler,
  subscriptionController.getMerchantSubscriptions.bind(subscriptionController) as RequestHandler
);

/**
 * @route GET /api/subscriptions/:subscriptionId
 * @desc Get subscription by ID
 * @access Private
 */
router.get(
  "/:subscriptionId",
  authMiddleware as RequestHandler,
  subscriptionIdValidation,
  handleValidationErrors,
  subscriptionController.getSubscription.bind(subscriptionController) as RequestHandler
);

/**
 * @route PATCH /api/subscriptions/:subscriptionId/pause
 * @desc Pause a subscription
 * @access Private
 */
router.patch(
  "/:subscriptionId/pause",
  authMiddleware as RequestHandler,
  subscriptionIdValidation,
  handleValidationErrors,
  subscriptionController.pauseSubscription.bind(subscriptionController) as RequestHandler
);

/**
 * @route PATCH /api/subscriptions/:subscriptionId/resume
 * @desc Resume a paused subscription
 * @access Private
 */
router.patch(
  "/:subscriptionId/resume",
  authMiddleware as RequestHandler,
  subscriptionIdValidation,
  handleValidationErrors,
  subscriptionController.resumeSubscription.bind(subscriptionController) as RequestHandler
);

/**
 * @route PATCH /api/subscriptions/:subscriptionId/cancel
 * @desc Cancel a subscription
 * @access Private
 */
router.patch(
  "/:subscriptionId/cancel",
  authMiddleware as RequestHandler,
  subscriptionIdValidation,
  handleValidationErrors,
  subscriptionController.cancelSubscription.bind(subscriptionController) as RequestHandler
);

export { router as subscriptionRouter };