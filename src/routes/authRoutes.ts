import { Router, Request, Response, NextFunction } from "express";
import { AuthController } from "../controllers/AuthController";
import { disableTwoFactorAuthentication, enableTwoFactorAuthentication } from "../controllers/twoFactorAuthController";
import { validateRequest } from "../middlewares/validateRequest";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();
const authController = new AuthController();

// Validation schemas
const registerSchema = {
    name: { type: 'string', required: true, minLength: 2 },
    email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    password: { type: 'string', required: true, minLength: 6 }
};

const loginSchema = {
    email: { type: 'string', required: true },
    password: { type: 'string', required: true }
};

const login2FASchema = {
    email: { type: 'string', required: true },
    password: { type: 'string', required: true },
    token: { type: 'string', required: true, minLength: 6 }
};

// Helper function to wrap async route handlers
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Routes
router.post(
    "/register",
    validateRequest(registerSchema),
    asyncHandler(async (req, res) => {
        await authController.register(req, res);
    })
);

router.post(
    "/login",
    validateRequest(loginSchema),
    asyncHandler(async (req, res) => {
        await authController.login(req, res);
    })
);


router.post(
    "/login-2fa",
    validateRequest(login2FASchema),
    asyncHandler(async (req, res) => {
        await authController.loginWith2FA(req, res);
    })
);


router.post(
    "/refresh-token",
    asyncHandler(async (req, res) => {
        await authController.refreshToken(req, res);
    })
);

router.get(
    "/profile",
    authMiddleware,
    asyncHandler(async (req, res) => {
        await authController.getProfile(req, res);
    })
);

router.post(
    "/enable-2fa",
    authMiddleware,
    async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (userId === undefined) {
                res.status(401).json({ message: "User ID not found" });
                return;
            }
            const result = await enableTwoFactorAuthentication(userId);
            res.json(result);
        } catch (error) {
            res.status(400).json({ message: error instanceof Error ? error.message : "Error enabling 2FA" });
        }
    }
);

router.post(
    "/disable-2fa",
    authMiddleware,
    async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (userId === undefined) {
                res.status(401).json({ message: "User ID not found" });
                return;
            }
            const result = await disableTwoFactorAuthentication(userId);
            res.json(result);
        } catch (error) {
            res.status(400).json({ message: error instanceof Error ? error.message : "Error disabling 2FA" });
        }
    }
);


export default router;