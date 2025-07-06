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
 * @swagger
 * /payment:
 *   post:
 *     summary: Create a new payment
 *     description: Creates a new payment record in the system
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Payment amount
 *               currency:
 *                 type: string
 *                 description: Payment currency (e.g., USD, EUR)
 *               description:
 *                 type: string
 *                 description: Payment description
 *               metadata:
 *                 type: object
 *                 description: Additional payment metadata
 *             required:
 *               - amount
 *               - currency
 *     responses:
 *       201:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       429:
 *         description: Too many requests - rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/",
  paymentCreationRateLimit,
  paymentController.createPayment.bind(paymentController) as RequestHandler,
);

/**
 * @swagger
 * /payment/process:
 *   post:
 *     summary: Process a payment with signature verification
 *     description: Processes a payment with cryptographic signature verification for security
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentId:
 *                 type: string
 *                 description: Unique payment identifier
 *               signature:
 *                 type: string
 *                 description: Cryptographic signature for verification
 *               publicKey:
 *                 type: string
 *                 description: Public key used for signature verification
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Payment amount
 *               currency:
 *                 type: string
 *                 description: Payment currency
 *             required:
 *               - paymentId
 *               - signature
 *               - publicKey
 *               - amount
 *               - currency
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Payment processed successfully"
 *                 transactionHash:
 *                   type: string
 *                   description: Blockchain transaction hash
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Bad request - validation error or invalid signature
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized - signature verification failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests - rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /payment/{paymentId}:
 *   get:
 *     summary: Get payment by ID
 *     description: Retrieves payment details by its unique identifier
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment found successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Bad request - invalid payment ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:paymentId",
  validatePaymentId,
  handleValidationErrors,
  paymentController.getPaymentById.bind(paymentController) as RequestHandler,
);

/**
 * @swagger
 * /payment/{paymentId}/status:
 *   put:
 *     summary: Update payment status
 *     description: Updates the status of an existing payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, completed, failed]
 *                 description: New payment status
 *               reason:
 *                 type: string
 *                 description: Reason for status change (optional)
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /payment/verify-transaction:
 *   post:
 *     summary: Verify a transaction on the Stellar network
 *     description: Verifies a transaction on the Stellar blockchain network
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transactionHash:
 *                 type: string
 *                 description: Stellar transaction hash
 *               paymentId:
 *                 type: string
 *                 description: Associated payment ID
 *             required:
 *               - transactionHash
 *               - paymentId
 *     responses:
 *       200:
 *         description: Transaction verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 verified:
 *                   type: boolean
 *                   description: Whether the transaction is verified
 *                 message:
 *                   type: string
 *                   description: Verification result message
 *                 transactionDetails:
 *                   type: object
 *                   description: Transaction details from Stellar network
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Transaction not found on Stellar network
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests - rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/verify-transaction",
  paymentProcessingRateLimit,
  validateTransactionVerification,
  handleValidationErrors,
  paymentController.verifyTransaction.bind(paymentController) as RequestHandler,
);

/**
 * @swagger
 * /payment/generate-nonce:
 *   get:
 *     summary: Generate a secure nonce for payment requests
 *     description: Generates a cryptographically secure nonce for payment request signing
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Nonce generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nonce:
 *                   type: string
 *                   description: Generated nonce value
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   description: Nonce expiration timestamp
 *       429:
 *         description: Too many requests - rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/generate-nonce",
  tokenOperationsRateLimit,
  paymentController.generateNonce.bind(paymentController) as RequestHandler,
);

export { router as paymentRouter };
