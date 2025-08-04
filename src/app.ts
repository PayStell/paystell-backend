import cookieParser from "cookie-parser";
import express, {
  Request,
  Response,
  RequestHandler,
  ErrorRequestHandler,
} from "express";
import morgan from "morgan";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { specs } from "./config/swagger";

// Route imports
import sessionRouter from "./routes/session.routes";
import emailVerification from "./routes/emailVerification.routes";
import PaymentRoute from "./routes/PaymentLink.routes";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import healthRouter from "./routes/health.routes";
import walletVerificationRoutes from "./routes/wallet-verification.routes";
import merchantWebhookQueueRoutes from "./routes/merchantWebhookQueue.routes";
import transactionReportsRoutes from "./routes/transactionReports.routes";
import merchantRoutes from "./routes/merchantRoutes";
import stellarContractRoutes from "./routes/stellar-contract.routes";
import tokenRoutes from "./routes/tokenRoutes";
import { paymentRouter } from "./routes/paymentRoutes";
import { subscriptionRouter } from "./routes/subscriptionRoutes";

// Middleware imports
import { globalRateLimiter } from "./middlewares/globalRateLimiter.middleware";
import { validateIpAddress } from "./middlewares/ipValidation.middleware";
import { requestLogger } from "./middlewares/requestLogger.middleware";

// Service imports
import RateLimitMonitoringService from "./services/rateLimitMonitoring.service";
import { startExpiredSessionCleanupCronJobs } from "./utils/schedular";
import { subscriptionScheduler } from "./utils/subscriptionScheduler";
import logger from "./utils/logger";
import { oauthConfig } from "./config/auth0Config";
import { auth } from "express-openid-connect";
import { auditMiddleware } from "./middlewares/auditMiddleware";
import {
  configurationMiddleware,
  environmentConfigMiddleware,
} from "./middlewares/configurationMiddleware";
import routes from "./routes";
import intelligentRateLimiter from "./middleware/rateLimiter";
import rateLimitMonitoringService from "./services/rateLimitMonitoring.service";

// Initialize express app
const app = express();

// Apply middleware
// Apply global middlewares
app.use(cookieParser());
app.use(morgan("dev"));

// CORS configuration
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"], // Add your frontend URLs
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers",
    ],
    exposedHeaders: ["Authorization"],
    maxAge: 86400, // 24 hours
  }),
);

app.use(express.json());
app.use(validateIpAddress as RequestHandler);
app.use(
  RateLimitMonitoringService.createRateLimitMonitoringMiddleware() as RequestHandler,
);
app.use(globalRateLimiter as RequestHandler);
app.use(requestLogger as RequestHandler);
app.use(intelligentRateLimiter);
app.use(rateLimitMonitoringService.createRateLimitMonitoringMiddleware());

// Add timeout configurations
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000); // 30 seconds
  next();
});

// Start scheduled jobs
startExpiredSessionCleanupCronJobs();

// Start subscription scheduler
subscriptionScheduler.start();
try {
  startExpiredSessionCleanupCronJobs();
  subscriptionScheduler.start();
} catch (error) {
  console.error(
    "❌ Error starting cron jobs or subscription scheduler:",
    error,
  );
  process.exit(1);
}

// Log application startup
logger.info("Application started successfully");
console.log("Auth0 Config:", {
  baseURL: oauthConfig.baseURL,
  clientID: oauthConfig.clientID,
  issuerBaseURL: oauthConfig.issuerBaseURL,
});
try {
  app.use(auth(oauthConfig));
} catch (error) {
  console.error("❌ Error initializing Auth0 middleware:", error);
  process.exit(1);
}

// Add audit middleware after auth middleware but before routes
app.use(auditMiddleware);

// Add configuration middleware
app.use(configurationMiddleware);
app.use(environmentConfigMiddleware);

// Swagger UI setup
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "PayStell API Documentation",
    customfavIcon: "/favicon.ico",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      deepLinking: true,
    },
  }),
);

// Define routes
app.use("/health", healthRouter);
app.use("/session", sessionRouter);
app.use("/email-verification", emailVerification);
app.use("/paymentlink", PaymentRoute);
app.use("/auth", authRoutes);
app.use("/wallet-verification", walletVerificationRoutes);
app.use("/users", userRoutes);
app.use("/merchants", merchantRoutes);
app.use("/webhook-queue/merchant", merchantWebhookQueueRoutes);
app.use("/reports/transactions", transactionReportsRoutes);
app.use("/api/v1/stellar", stellarContractRoutes);
app.use("/token", tokenRoutes);
app.use("/payment", paymentRouter);
app.use("/subscriptions", subscriptionRouter);

// Configuration routes
import configurationRoutes from "./routes/configurationRoutes";
app.use("/api/config", configurationRoutes);

app.use("/", routes);

// Error handling middleware
const customErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
};

app.use(customErrorHandler);

// Handle 404 errors
app.use(((req: Request, res: Response) => {
  console.log("404 - Route not found:", req.originalUrl);
  res.status(404).json({
    error: "error",
    message: `Route ${req.originalUrl} not found`,
  });
}) as RequestHandler);

// Export app
export default app;
