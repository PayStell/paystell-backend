// middleware/auth.ts
import { Request, Response, NextFunction, RequestHandler } from "express";
import { MerchantAuthService } from "../services/merchant.service";
import { Merchant } from "../interfaces/webhook.interfaces";
import { UserRole } from "../enums/UserRole";

// Extender el tipo Request mediante una extensión de módulo
export interface CustomRequest extends Request {
  user?: {
    id: number;
    email: string;
    tokenExp?: number;
    role?: UserRole;
  };
  merchant: Merchant;
}

const merchantAuthService = new MerchantAuthService();

export const asyncHandler =
  (
    fn: (
      req: CustomRequest,
      res: Response,
      next: NextFunction,
    ) => Promise<void | Response>,
  ): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req as CustomRequest, res, next)).catch(next);
  };

// Extender los tipos de Express usando la sintaxis moderna
// en lugar de namespace
import "express";
declare module "express" {
  interface Request {
    merchant?: Merchant; // Haciendo merchant opcional
    requestId?: string;
  }
}

export const authenticateMerchant = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;

      if (!apiKey) {
        return res.status(401).json({
          error: "No API key provided",
        });
      }

      // Use your MerchantAuthService to find the merchant
      const merchant = await merchantAuthService.validateApiKey(apiKey);

      if (!merchant) {
        return res.status(401).json({
          error: "Invalid API key",
        });
      }

      // Attach merchant to request object
      req.merchant = merchant;
      next();
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  },
);

export const authenticateStellarWebhook = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      const token = req.query.token as string;
      // Use your MerchantAuthService to find the merchant
      if (!token) {
        return res.status(401).json({
          error: "No token provided",
        });
      }

      if (token !== process.env.STELLAR_WEBHOOK_TOKEN) {
        return res.status(401).json({
          error: "Invalid token",
        });
      }

      const ip = req.headers["x-forwarded-for"] as string;

      if (ip !== process.env.STELLAR_WEBHOOK_IP) {
        return res.status(401).json({
          error: "Invalid IP address",
        });
      }
      // Attach merchant to request object
      return next();
    } catch (error) {
      console.error("Auth error:", error);
      return res.status(500).json({ error: "Authentication failed" });
    }
  },
);
