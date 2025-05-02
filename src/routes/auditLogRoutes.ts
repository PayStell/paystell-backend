import {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
  ErrorRequestHandler,
} from "express";
import { auth } from "express-openid-connect";
import { oauthConfig } from "../config/auth0Config";
import { AuditLogController } from "../controllers/AuditLogController";

const router = Router();

const auditLogController = new AuditLogController();

router.use((req, res, next) => {
  console.log("Auth route middleware - Path:", req.path);
  console.log("Auth route middleware - Method:", req.method);
  console.log("Auth route middleware - Headers:", req.headers);

  // Skip Auth0 in development or for registration
  if (process.env.NODE_ENV === "development") {
    console.log("Skipping Auth0 middleware");
    next();
  } else {
    console.log("Applying Auth0 middleware");
    auth(oauthConfig)(req, res, next);
  }
});

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

// Helper function to wrap async route handlers
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req as Request, res, next)).catch(next);
  };
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    await auditLogController.fetchAllAuditLogs(req, res);
  }),
);

export default router;
