import { Request, Response, NextFunction } from "express";
import { auditContext } from "../subscribers/AuditSubscriber";
import { AuditService } from "../services/AuditService";

export const auditMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const context = AuditService.extractContextFromRequest(req);

    auditContext.run(context, () => {
      next();
    });
  } catch (error) {
    console.error("Failed to extract audit context:", error);
    // Continue without audit context rather than blocking the request
    next();
  }
};
