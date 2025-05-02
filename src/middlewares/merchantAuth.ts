// middleware/auth.ts
import { Request, Response, NextFunction } from "express-serve-static-core";
import { RequestHandler } from "express";
import { MerchantAuthService } from "../services/merchant.service";
import { AppError } from "../utils/AppError";
import logger from "../utils/logger";
import { UserRole } from "../enums/UserRole";
import { Merchant } from "../interfaces/webhook.interfaces";

// Extend the Express Request interface through module augmentation
// This approach aligns with TypeScript best practices
declare module "express-serve-static-core" {
  interface Request {
    merchant?: Merchant;
    user?: {
      id: number;
      email: string;
      tokenExp?: number;
      role?: UserRole;
      jti?: string;
    };
  }
}

const merchantAuthService = new MerchantAuthService();

type AsyncRequestHandler<T = unknown> = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<T>;

// Utility to wrap async route handlers
export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Extending Express types
import "express";
declare module "express" {
  interface Request {
    merchant?: Merchant; // Making merchant optional
    requestId?: string;
  }
}

export const authenticateMerchant = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
      throw new AppError("API key is required", 401);
    }

    const merchant = await merchantAuthService.validateApiKey(apiKey);

    if (!merchant) {
      throw new AppError("Invalid API key", 401);
    }

    req.merchant = merchant;
    next();
  },
);

export const authenticateStellarWebhook = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.query.token as string;

    if (!token) {
      throw new AppError("No token provided", 401);
    }

    if (token !== process.env.STELLAR_WEBHOOK_TOKEN) {
      throw new AppError("Invalid token", 401);
    }

    // Get the originating IP from the x-forwarded-for header
    const forwardedFor = req.headers["x-forwarded-for"] as string;
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : null;

    if (ip !== process.env.STELLAR_WEBHOOK_IP) {
      logger.warn(
        `Webhook IP validation failed: received ${ip}, expected ${process.env.STELLAR_WEBHOOK_IP}`,
      );
      throw new AppError("Invalid IP address", 401);
    }

    // Attach merchant to request object
    next();
  },
);
