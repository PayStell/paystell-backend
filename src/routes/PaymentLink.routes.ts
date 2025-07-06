import {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import { PaymentLinkController } from "../controllers/PaymentLink.controller";
import { UserRole } from "../enums/UserRole";
import { paymentLinkLimiter } from "../middleware/rateLimiter";
import { authMiddleware } from "../middlewares/authMiddleware";

interface CustomRequest extends Request {
  user?: {
    id: number;
    email: string;
    tokenExp?: number;
    role?: UserRole;
  };
}

const router = Router();
const paymentLinkController = new PaymentLinkController();

type AsyncRouteHandler<T = void> = (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => Promise<T>;

const asyncHandler = <T>(fn: AsyncRouteHandler<T>): RequestHandler => {
  return (req, res, next) => {
    console.log(`[PaymentLink] ${req.method} ${req.path}`, {
      body: req.body,
      query: req.query,
      params: req.params,
    });

    Promise.resolve(fn(req as CustomRequest, res, next)).catch((error) => {
      console.error(`[PaymentLink] Error in ${req.method} ${req.path}:`, error);
      next(error);
    });
  };
};

// Middleware to log responses
const logResponse = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  res.json = function (body) {
    console.log(`[PaymentLink] Response for ${req.method} ${req.path}:`, body);
    return originalJson.call(this, body);
  };
  next();
};

// Apply logging middleware to all routes
router.use(logResponse);

// Apply authentication middleware to all routes
router.use(authMiddleware as RequestHandler);

/**
 * @swagger
 * /paymentlink:
 *   post:
 *     summary: Create a new payment link
 *     description: Creates a new payment link for accepting payments
 *     tags: [Payment Links]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Payment link title
 *               description:
 *                 type: string
 *                 description: Payment link description
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Payment amount
 *               currency:
 *                 type: string
 *                 description: Payment currency (e.g., USD, EUR)
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Payment link expiration date
 *             required:
 *               - title
 *               - amount
 *               - currency
 *     responses:
 *       201:
 *         description: Payment link created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentLink'
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
  paymentLinkLimiter,
  asyncHandler(
    paymentLinkController.createPaymentLink.bind(paymentLinkController),
  ),
);

/**
 * @swagger
 * /paymentlink/user:
 *   get:
 *     summary: Get payment links by user ID
 *     description: Retrieves all payment links created by the authenticated user
 *     tags: [Payment Links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, expired]
 *         description: Filter by payment link status
 *     responses:
 *       200:
 *         description: Payment links retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PaymentLink'
 *       401:
 *         description: Unauthorized - authentication required
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
  "/user",
  asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    return paymentLinkController.getPaymentLinksByUserId(req, res);
  }),
);

/**
 * @swagger
 * /paymentlink/{id}:
 *   get:
 *     summary: Get payment link by ID
 *     description: Retrieves a specific payment link by its unique identifier
 *     tags: [Payment Links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment link ID
 *     responses:
 *       200:
 *         description: Payment link found successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentLink'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Payment link not found
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
  "/:id",
  asyncHandler(
    paymentLinkController.getPaymentLinkById.bind(paymentLinkController),
  ),
);

/**
 * @swagger
 * /paymentlink/{id}:
 *   put:
 *     summary: Update payment link
 *     description: Updates an existing payment link's information
 *     tags: [Payment Links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment link ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Payment link title
 *               description:
 *                 type: string
 *                 description: Payment link description
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Payment amount
 *               currency:
 *                 type: string
 *                 description: Payment currency
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Payment link expiration date
 *               isActive:
 *                 type: boolean
 *                 description: Whether the payment link is active
 *     responses:
 *       200:
 *         description: Payment link updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentLink'
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
 *         description: Payment link not found
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
  "/:id",
  asyncHandler(
    paymentLinkController.updatePaymentLink.bind(paymentLinkController),
  ),
);

/**
 * @swagger
 * /paymentlink/{id}:
 *   delete:
 *     summary: Delete payment link
 *     description: Permanently deletes a payment link
 *     tags: [Payment Links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment link ID
 *     responses:
 *       204:
 *         description: Payment link deleted successfully
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Payment link not found
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
router.delete(
  "/:id",
  asyncHandler(
    paymentLinkController.deletePaymentLink.bind(paymentLinkController),
  ),
);

/**
 * @swagger
 * /paymentlink/{id}/soft-delete:
 *   patch:
 *     summary: Soft delete payment link
 *     description: Marks a payment link as deleted without permanently removing it
 *     tags: [Payment Links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment link ID
 *     responses:
 *       200:
 *         description: Payment link soft deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentLink'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Payment link not found
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
router.patch(
  "/:id/soft-delete",
  asyncHandler(
    paymentLinkController.softDeletePaymentLink.bind(paymentLinkController),
  ),
);

export default router;
