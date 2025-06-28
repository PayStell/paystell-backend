import { Request, Response } from "express";
import { RBACService } from "../services/RBACService";
import { MerchantEntity } from "../entities/Merchant.entity";
import { UserRole } from "../enums/UserRole";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    tokenExp?: number;
    jti?: string;
    role?: UserRole;
  };
  merchant?: MerchantEntity;
}

export class TeamController {
  private rbacService: RBACService;

  constructor() {
    this.rbacService = new RBACService();
  }

  // Role Management
  async createRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;
      const merchantId = req.merchant?.id || req.params.merchantId;

      if (!merchantId) {
        res.status(400).json({ error: "Merchant ID required" });
        return;
      }

      const role = await this.rbacService.createRole(
        merchantId,
        name,
        description,
      );

      res.status(201).json({
        message: "Role created successfully",
        role,
      });
    } catch (error) {
      console.error("Create role error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: errorMessage });
    }
  }

  async getRoles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant?.id || req.params.merchantId;

      if (!merchantId) {
        res.status(400).json({ error: "Merchant ID required" });
        return;
      }

      const roles = await this.rbacService.getRolesByMerchant(merchantId);

      res.json({ roles });
    } catch (error) {
      console.error("Get roles error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: errorMessage });
    }
  }

  async updateRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { roleId } = req.params;
      const updates = req.body;

      const role = await this.rbacService.updateRole(roleId, updates);

      res.json({
        message: "Role updated successfully",
        role,
      });
    } catch (error) {
      console.error("Update role error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: errorMessage });
    }
  }

  async deleteRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { roleId } = req.params;

      await this.rbacService.deleteRole(roleId);

      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      console.error("Delete role error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: errorMessage });
    }
  }

  // Permission Management
  async assignPermission(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { roleId, permissionId } = req.body;

      const rolePermission = await this.rbacService.assignPermissionToRole(
        roleId,
        permissionId,
      );

      res.status(201).json({
        message: "Permission assigned successfully",
        rolePermission,
      });
    } catch (error) {
      console.error("Assign permission error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: errorMessage });
    }
  }

  async removePermission(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { roleId, permissionId } = req.body;

      await this.rbacService.removePermissionFromRole(roleId, permissionId);

      res.json({ message: "Permission removed successfully" });
    } catch (error) {
      console.error("Remove permission error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: errorMessage });
    }
  }

  // User Role Management
  async assignUserRole(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { userId, roleId } = req.body;
      const merchantId = req.merchant?.id || req.params.merchantId;

      if (!merchantId) {
        res.status(400).json({ error: "Merchant ID required" });
        return;
      }

      const userRole = await this.rbacService.assignRoleToUser(
        userId,
        roleId,
        merchantId,
      );

      res.status(201).json({
        message: "Role assigned to user successfully",
        userRole,
      });
    } catch (error) {
      console.error("Assign user role error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: errorMessage });
    }
  }

  async removeUserRole(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { userId, roleId } = req.body;
      const merchantId = req.merchant?.id || req.params.merchantId;

      if (!merchantId) {
        res.status(400).json({ error: "Merchant ID required" });
        return;
      }

      await this.rbacService.removeRoleFromUser(userId, roleId, merchantId);

      res.json({ message: "Role removed from user successfully" });
    } catch (error) {
      console.error("Remove user role error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: errorMessage });
    }
  }

  async getUserPermissions(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const merchantId = req.merchant?.id || req.params.merchantId;

      if (!merchantId) {
        res.status(400).json({ error: "Merchant ID required" });
        return;
      }

      const permissions = await this.rbacService.getUserPermissions(
        parseInt(userId),
        merchantId,
      );

      res.json({ permissions });
    } catch (error) {
      console.error("Get user permissions error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: errorMessage });
    }
  }
}
