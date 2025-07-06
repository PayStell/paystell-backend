import {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
  ErrorRequestHandler,
} from "express";
import { AuthController } from "../controllers/AuthController";
import {
  disableTwoFactorAuthentication,
  enableTwoFactorAuthentication,
  verifyTwoFactorAuthentication,
} from "../controllers/twoFactorAuthController";
import { validateRequest } from "../middlewares/validateRequest";
import {
  authMiddleware,
  refreshTokenMiddleware,
} from "../middlewares/authMiddleware";
import { UserRole } from "../enums/UserRole";
import { auth } from "express-openid-connect";
import { oauthConfig } from "../config/auth0Config";

// Define CustomRequest interface for proper typing of req.user
interface CustomRequest extends Request {
  user?: {
    id: number;
    email: string;
    tokenExp?: number;
    jti?: string;
    role?: UserRole;
  };
}

const router = Router();
const authController = new AuthController();

// Auth0 authentication routes
router.use(auth(oauthConfig));

// Validation schemas
const registerSchema = {
  name: { type: "string", required: true, minLength: 2 },
  email: {
    type: "string",
    required: true,
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  },
  password: { type: "string", required: true, minLength: 6 },
};

const loginSchema = {
  email: {
    type: "string",
    required: true,
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  },
  password: { type: "string", required: true },
};

const login2FASchema = {
  email: { type: "string", required: true },
  password: { type: "string", required: true },
  token: { type: "string", required: true, minLength: 6 },
};

const verifyTokenSchema = {
  token: { type: "string", required: true, minLength: 6, maxLength: 6 },
};

// Helper function to wrap async route handlers
const asyncHandler = (
  fn: (req: CustomRequest, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req as CustomRequest, res, next)).catch(next);
  };
};

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with email and password authentication
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 description: User's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: User's password
 *             required:
 *               - name
 *               - email
 *               - password
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Conflict - user with this email already exists
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
  "/register",
  validateRequest(registerSchema) as RequestHandler,
  asyncHandler(async (req, res) => {
    await authController.register(req, res);
  }),
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticates a user with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized - invalid credentials
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
  "/login",
  validateRequest(loginSchema) as RequestHandler,
  asyncHandler(async (req, res) => {
    await authController.login(req, res);
  }),
);

/**
 * @swagger
 * /auth/login-2fa:
 *   post:
 *     summary: Login with 2FA
 *     description: Authenticates a user with email, password, and 2FA token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Login2FARequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized - invalid credentials or 2FA token
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
  "/login-2fa",
  validateRequest(login2FASchema) as RequestHandler,
  asyncHandler(async (req, res) => {
    await authController.loginWith2FA(req, res);
  }),
);

/**
 * @swagger
 * /auth/callback:
 *   get:
 *     summary: Auth0 callback
 *     description: Handles Auth0 OAuth callback after successful authentication
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - authentication failed
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
  "/callback",
  asyncHandler(async (req, res) => {
    await authController.auth0Callback(req, res);
  }),
);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Refreshes the access token using a valid refresh token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: New JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: New JWT refresh token
 *       401:
 *         description: Unauthorized - invalid or expired refresh token
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
  "/refresh-token",
  refreshTokenMiddleware as RequestHandler,
  asyncHandler(async (req, res) => {
    await authController.refreshToken(req, res);
  }),
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Logs out the current user and invalidates their session
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    await authController.logout(req, res);
  }),
);

/**
 * @swagger
 * /auth/enable-2fa:
 *   post:
 *     summary: Enable two-factor authentication
 *     description: Enables 2FA for the authenticated user
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
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
 *                   example: "2FA enabled successfully"
 *                 secret:
 *                   type: string
 *                   description: Secret key for QR code generation
 *                 qrCode:
 *                   type: string
 *                   description: QR code URL for authenticator app
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
router.post(
  "/enable-2fa",
  authMiddleware as RequestHandler,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (userId === undefined) {
      res.status(401).json({ message: "User ID not found" });
      return;
    }
    const result = await enableTwoFactorAuthentication(userId);
    res.json(result);
  }),
);

/**
 * @swagger
 * /auth/disable-2fa:
 *   post:
 *     summary: Disable two-factor authentication
 *     description: Disables 2FA for the authenticated user
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA disabled successfully
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
 *                   example: "2FA disabled successfully"
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
router.post(
  "/disable-2fa",
  authMiddleware as RequestHandler,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (userId === undefined) {
      res.status(401).json({ message: "User ID not found" });
      return;
    }
    const result = await disableTwoFactorAuthentication(userId);
    res.json(result);
  }),
);

/**
 * @swagger
 * /auth/verify-2fa:
 *   post:
 *     summary: Verify two-factor authentication token
 *     description: Verifies a 2FA token for the authenticated user
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 description: 6-digit 2FA token
 *             required:
 *               - token
 *     responses:
 *       200:
 *         description: 2FA token verified successfully
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
 *                   example: "2FA token verified successfully"
 *       400:
 *         description: Bad request - invalid token format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized - authentication required or invalid token
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
  "/verify-2fa",
  authMiddleware as RequestHandler,
  validateRequest(verifyTokenSchema) as RequestHandler,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (userId === undefined) {
      res.status(401).json({ message: "User ID not found" });
      return;
    }
    const { token } = req.body;
    const result = await verifyTwoFactorAuthentication(userId, token);
    res.json(result);
  }),
);

// Error handling middleware (opcional, si quieres manejar errores aquí)
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  console.error("Auth route error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
};

router.use(errorHandler);

export default router;
