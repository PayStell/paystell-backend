import express from "express";
import morgan from "morgan";
import cors from "cors";
import sessionRouter from "./routes/session.routes";
import emailVerification from "./routes/emailVerification.routes";
import PaymentRoute from './routes/ParymentLink.routes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import healthRouter from "./routes/health.routes";
import walletVerificationRoutes from './routes/wallet-verification.routes';

import { globalRateLimiter } from "./middlewares/globalRateLimiter.middleware";
import { validateIpAddress } from "./middlewares/ipValidation.middleware";

import RateLimitMonitoringService from "./services/rateLimitMonitoring.service";
import { startExpiredSessionCleanupCronJobs } from "./utils/schedular";

// Initialize express app
import { errorHandler } from "./middlewares/errorHandler";
import { requestLogger } from "./middlewares/requestLogger.middleware";
import logger from "./utils/logger";

// Initialize express app
const app = express();

// Apply middleware
// Apply global middlewares
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(validateIpAddress);
// app.use(RateLimitMonitoringService.createRateLimitMonitoringMiddleware());
app.use(globalRateLimiter);
app.use(requestLogger);

// Start scheduled jobs
startExpiredSessionCleanupCronJobs();

// Log application startup
logger.info('Application started successfully');

// Define routes
app.use("/session", sessionRouter);
app.use("/email-verification", emailVerification);
app.use("/paymentlink", PaymentRoute);
app.use('/auth', authRoutes);
app.use('/wallet-verification', walletVerificationRoutes);
app.use("/users", userRoutes);
app.use('/health', healthRouter);

// Error handling middleware
app.use(errorHandler);

// Handle 404 errors
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`
    });
});

// Export app
export default app;