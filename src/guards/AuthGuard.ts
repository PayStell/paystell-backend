import { Request, Response, NextFunction } from "express";

export function AuthGuard(req: Request, res: Response, next: NextFunction) {
  // Get the merchant ID from the request headers
  const merchantId = req.headers["x-merchant-id"] as string;

  if (!merchantId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - Merchant ID not found in headers",
    });
  }

  // Add merchantId to response locals for use in controllers
  res.locals.merchantId = merchantId;

  next();
}
