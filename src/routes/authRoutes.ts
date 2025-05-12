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

// Error handling middleware
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

// Routes for email/password authentication
router.post(
  "/register",
  validateRequest(registerSchema) as RequestHandler,
  asyncHandler(async (req, res) => {
    await authController.register(req, res);
  }),
);

router.post(
  "/login",
  validateRequest(loginSchema) as RequestHandler,
  asyncHandler(async (req, res) => {
    await authController.login(req, res);
  }),
);

router.post(
  "/login-2fa",
  validateRequest(login2FASchema) as RequestHandler,
  asyncHandler(async (req, res) => {
    await authController.loginWith2FA(req, res);
  }),
);

// Route for refresh token
router.post(
  "/refresh-token",
  refreshTokenMiddleware as RequestHandler,
  asyncHandler(async (req, res) => {
    await authController.refreshToken(req, res);
  }),
);

// Route for logout
router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    await authController.logout(req, res);
  }),
);

// 2FA routes
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

export default router;
