import express, { RequestHandler } from "express";
import { PaymentController } from "../controllers/PaymentController";
import { handleValidationErrors } from "../middlewares/validationErrorHandler";
import {
  paymentProcessingRateLimit,
  paymentCreationRateLimit,
  tokenOperationsRateLimit,
} from "../middlewares/paymentRateLimit";
import {
  validatePayment,
  validatePaymentId,
  validatePaymentStatus,
  validateTransactionVerification,
} from "../validators/paymentValidators";
import { fraudDetectionMiddleware } from "../middlewares/fraudDetection.middleware";

const router = express.Router();
const paymentController = new PaymentController();

/**
 * @route POST /api/payments
 * @desc Create a new payment
 * @access Public
 */
router.post(
  "/",
  paymentCreationRateLimit,
  paymentController.createPayment.bind(paymentController) as RequestHandler,
);

/**
 * @route POST /api/payments/process
 * @desc Process a payment with signature verification
 * @access Public
 */
router.post(
  "/process",
  paymentProcessingRateLimit,
  validatePayment,
  handleValidationErrors,
  fraudDetectionMiddleware as RequestHandler,
  paymentController.processPayment.bind(paymentController) as RequestHandler,
);

/**
 * @route GET /api/payments/:paymentId
 * @desc Get payment by ID
 * @access Public
 */
router.get(
  "/:paymentId",
  validatePaymentId,
  handleValidationErrors,
  paymentController.getPaymentById.bind(paymentController) as RequestHandler,
);

/**
 * @route PUT /api/payments/:paymentId/status
 * @desc Update payment status
 * @access Private
 */
router.put(
  "/:paymentId/status",
  validatePaymentId,
  validatePaymentStatus,
  handleValidationErrors,
  paymentController.updatePaymentStatus.bind(
    paymentController,
  ) as RequestHandler,
);

/**
 * @route POST /api/payments/verify-transaction
 * @desc Verify a transaction on the Stellar network
 * @access Public
 */
router.post(
  "/verify-transaction",
  paymentProcessingRateLimit,
  validateTransactionVerification,
  handleValidationErrors,
  paymentController.verifyTransaction.bind(paymentController) as RequestHandler,
);

/**
 * @route GET /api/payments/generate-nonce
 * @desc Generate a secure nonce for payment requests
 * @access Public
 */
router.get(
  "/generate-nonce",
  tokenOperationsRateLimit,
  paymentController.generateNonce.bind(paymentController) as RequestHandler,
);

export { router as paymentRouter };
