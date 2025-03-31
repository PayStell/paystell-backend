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
    Promise.resolve(fn(req as CustomRequest, res, next)).catch(next);
  };
};

router.post(
  "/",
  paymentLinkLimiter,
  asyncHandler(
    paymentLinkController.createPaymentLink.bind(paymentLinkController),
  ),
);
router.get(
  "/:id",
  asyncHandler(
    paymentLinkController.getPaymentLinkById.bind(paymentLinkController),
  ),
);
router.get(
  "/user/:userId",
  asyncHandler(
    paymentLinkController.getPaymentLinksByUserId.bind(paymentLinkController),
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

export default router;
