import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import logger from "../utils/logger";

// Rate limiter for payment processing
export const paymentProcessingRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Maximum 10 payment processing requests per minute per IP
  message: {
    success: false,
    message: "Too many payment processing requests. Please try again later.",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn("Payment processing rate limit exceeded", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      url: req.originalUrl,
    });

    res.status(429).json({
      success: false,
      message: "Too many payment processing requests. Please try again later.",
      retryAfter: 60,
    });
  },
});

// Rate limiter for payment creation
export const paymentCreationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Maximum 20 payment creation requests per minute per IP
  message: {
    success: false,
    message: "Too many payment creation requests. Please try again later.",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn("Payment creation rate limit exceeded", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      url: req.originalUrl,
    });

    res.status(429).json({
      success: false,
      message: "Too many payment creation requests. Please try again later.",
      retryAfter: 60,
    });
  },
});

// Rate limiter for token operations
export const tokenOperationsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Maximum 30 token operations per minute per IP
  message: {
    success: false,
    message: "Too many token operation requests. Please try again later.",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn("Token operations rate limit exceeded", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      url: req.originalUrl,
    });

    res.status(429).json({
      success: false,
      message: "Too many token operation requests. Please try again later.",
      retryAfter: 60,
    });
  },
});
