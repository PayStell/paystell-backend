import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import { RedisStore } from "rate-limit-redis";
import { createRedisClient } from "../config/redisConfig";
import {
  RedisClientType,
  RedisModules,
  RedisFunctions,
  RedisScripts,
} from "redis";

// Define extended request type for validated IP
interface RequestWithValidatedIP extends Request {
  validatedIp?: string;
}

// Define request type for auth endpoints
interface AuthRequest extends RequestWithValidatedIP {
  body: {
    email?: string;
    [key: string]: unknown;
  };
}

// Use Redis based on environment
const useRedis = process.env.NODE_ENV === "production" && process.env.REDIS_URL;

// Create Redis client if in production
let redisClient: RedisClientType<RedisModules, RedisFunctions, RedisScripts>;
let redisStore;

if (useRedis) {
  try {
    redisClient = createRedisClient();
    redisClient.connect().catch(console.error);

    redisStore = new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: "ratelimit:",
    });
  } catch (error) {
    console.error("Failed to initialize Redis store for rate limiting:", error);
    console.warn("Falling back to memory store for rate limiting");
  }
}

// Base configuration for auth rate limiters
const authRateLimiterConfig = {
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    message: "Too many authentication attempts, please try again later.",
  },
  handler: (req: Request, res: Response) => {
    const retryAfter = res.getHeader("Retry-After");
    res.status(429).json({
      status: "error",
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts, please try again later.",
      retryAfter,
    });
  },
  store: useRedis && redisStore ? redisStore : undefined,
};

// Login rate limiter: 5 attempts per 15 minutes per IP
export const loginRateLimiter = rateLimit({
  ...authRateLimiterConfig,
  windowMs: Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 5, // limit each IP to 5 requests per windowMs
  keyGenerator: (req: RequestWithValidatedIP) =>
    req.validatedIp || req.ip || "default", // Use IP as the key
  skipSuccessfulRequests: true, // Only count failed attempts
  standardHeaders: true,
  headers: true,
});

// Register rate limiter: 3 attempts per hour per IP
export const registerRateLimiter = rateLimit({
  ...authRateLimiterConfig,
  windowMs: Number(process.env.RATE_LIMIT_REGISTER_WINDOW_MS) || 60 * 60 * 1000, // 1 hour
  max: Number(process.env.RATE_LIMIT_REGISTER_MAX) || 3, // limit each IP to 3 requests per windowMs
  keyGenerator: (req: RequestWithValidatedIP) =>
    req.validatedIp || req.ip || "default",
  standardHeaders: true,
  headers: true,
});

// Password reset rate limiter: 3 attempts per hour per email
export const passwordResetRateLimiter = rateLimit({
  ...authRateLimiterConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each email to 3 requests per windowMs
  keyGenerator: (req: AuthRequest) => {
    return req.body.email || req.validatedIp || req.ip || "default"; // Use email as key if provided, otherwise IP
  },
  skipSuccessfulRequests: false,
  standardHeaders: true,
  headers: true,
});

// 2FA verification rate limiter: 3 attempts per 15 minutes per user
export const twoFactorRateLimiter = rateLimit({
  ...authRateLimiterConfig,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each user to 3 requests per windowMs
  keyGenerator: (req: AuthRequest) => {
    return req.body.email || req.validatedIp || req.ip || "default"; // Use email as key if provided, otherwise IP
  },
  skipSuccessfulRequests: true, // Only count failed attempts
  standardHeaders: true,
  headers: true,
});

// Log rate limit events
export const rateLimitLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const originalSend = res.send;

  res.send = function (body) {
    if (res.statusCode === 429) {
      console.warn(
        `Rate limit exceeded - IP: ${req.ip}, Path: ${req.path}, User-Agent: ${req.headers["user-agent"]}`,
      );
    }
    return originalSend.call(this, body);
  };

  next();
};
