import { Request, Response, NextFunction } from "express";
import { getRBACService } from "../services/RBACService";
import { PermissionResource, PermissionAction } from "../entities/Permission";
import { UserRole } from "../enums/UserRole";
import { MerchantEntity } from "../entities/Merchant.entity";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    tokenExp?: number;
    jti?: string;
    role?: UserRole;
  };
  merchant?: MerchantEntity;
}

export const requirePermission = (
  resource: PermissionResource,
  action: PermissionAction,
) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const merchantId =
        req.merchant?.id || req.params.merchantId || req.body.merchantId;

      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      if (!merchantId) {
        res.status(400).json({ error: "Merchant context required" });
        return;
      }

      const rbacService = getRBACService();
      const hasPermission = await rbacService.hasPermission(
        userId,
        merchantId,
        resource,
        action,
      );

      if (!hasPermission) {
        res.status(403).json({
          error: "Insufficient permissions",
          required: { resource, action },
        });
        return;
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

export const requireAnyPermission = (
  permissions: Array<{
    resource: PermissionResource;
    action: PermissionAction;
  }>,
) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user?.id;
      const merchantId =
        req.merchant?.id || req.params.merchantId || req.body.merchantId;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      if (!merchantId) {
        return res.status(400).json({ error: "Merchant context required" });
      }

      const rbacService = getRBACService();

      for (const permission of permissions) {
        const hasPermission = await rbacService.hasPermission(
          userId,
          merchantId,
          permission.resource,
          permission.action,
        );

        if (hasPermission) {
          return next();
        }
      }

      return res.status(403).json({
        error: "Insufficient permissions",
        required: permissions.map((p) => `${p.resource}:${p.action}`),
      });
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};
