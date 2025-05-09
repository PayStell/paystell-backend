import { Request, Response, NextFunction } from "express";
import { getConnection } from "typeorm";

/**
 * This middleware captures the user context from the request
 * and makes it available for the audit service
 */
export function auditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Store the original methods that we'll be wrapping
  const originalJson = res.json;
  const originalSend = res.send;

  console.log("Entered here ", { originalJson, originalSend });

  // Extract user context from the request
  const user = req.user || { id: "system", email: "system@example.com" };
  const ipAddress =
    req.ip || (req.headers["x-forwarded-for"] as string) || "0.0.0.0";
  const userAgent = req.headers["user-agent"] || "Unknown";

  const userContext = {
    userId: String(user.id),
    userEmail: user.email,
    ipAddress,
    userAgent,
  };

  // Add user context to request for use in route handlers

  req.auditContext = userContext;

  next();
}
