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

router.post(
  "/",
  paymentLinkLimiter,
  asyncHandler(
    paymentLinkController.createPaymentLink.bind(paymentLinkController),
  ),
);

// Put specific routes before parameterized routes
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

// Parameterized routes come after specific routes
router.get(
  "/:id",
  asyncHandler(
    paymentLinkController.getPaymentLinkById.bind(paymentLinkController),
  ),
);

router.put(
  "/:id",
  asyncHandler(
    paymentLinkController.updatePaymentLink.bind(paymentLinkController),
  ),
);

router.delete(
  "/:id",
  asyncHandler(
    paymentLinkController.deletePaymentLink.bind(paymentLinkController),
  ),
);

router.patch(
  "/:id/soft-delete",
  asyncHandler(
    paymentLinkController.softDeletePaymentLink.bind(paymentLinkController),
  ),
);

export default router;
