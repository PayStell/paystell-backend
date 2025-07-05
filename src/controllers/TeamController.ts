import { Request, Response } from "express";
import { RBACService } from "../services/RBACService";
import { AuditContext } from "../services/AuditService";
// Request interface extensions are now handled in src/types/express.d.ts

export class TeamController {
  private rbacService: RBACService;

  constructor() {
    this.rbacService = new RBACService();
  }

  // Role Management
  private getAuditContext(req: Request): AuditContext {
    return {
      userId: req.user?.id?.toString(),
      ipAddress: req.ip || req.connection.remoteAddress || "",
      userAgent: req.get("User-Agent") || "",
    };
  }

  async createRole(req: Request, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;
      const merchantId = req.merchant?.id;

      if (!merchantId) {
        res.status(400).json({ error: "Merchant ID required" });
        return;
      }

      const role = await this.rbacService.createRole(
        merchantId,
        name,
        description,
        false,
        this.getAuditContext(req),
      );

      res.status(201).json({ message: "Role created successfully", role });
    } catch (error) {
      console.error("Create role error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: errorMessage });
    }
  }

  async getRoles(req: Request, res: Response): Promise<void> {
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

  async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const { roleId } = req.params;
      const updates = req.body;
      const merchantId = req.merchant?.id;

      if (!merchantId) {
        res.status(400).json({ error: "Merchant ID required" });
        return;
      }

      // Verify role belongs to merchant
      const existingRole = await this.rbacService.getRoleById(roleId);
      if (existingRole.merchantId !== merchantId) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const role = await this.rbacService.updateRole(
        roleId,
        updates,
        this.getAuditContext(req),
      );

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

  async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      const { roleId } = req.params;
      const merchantId = req.merchant?.id || req.params.merchantId;

      if (!merchantId) {
        res.status(400).json({ error: "Merchant ID required" });
        return;
      }

      // Verify role belongs to merchant before deleting
      const existingRole = await this.rbacService.getRoleById(roleId);
      if (existingRole.merchantId !== merchantId) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      await this.rbacService.deleteRole(roleId, this.getAuditContext(req));

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
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { roleId, permissionId } = req.body;
      const merchantId = req.merchant?.id;

      if (!merchantId) {
        res.status(400).json({ error: "Merchant ID required" });
        return;
      }

      // Verify role belongs to merchant
      const existingRole = await this.rbacService.getRoleById(roleId);
      if (existingRole.merchantId !== merchantId) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      await this.rbacService.assignPermissionToRole(
        roleId,
        permissionId,
        this.getAuditContext(req),
      );

      res.status(200).json({ message: "Permission assigned successfully" });
    } catch (error) {
      console.error("Assign permission error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: errorMessage });
    }
  }

  async removePermission(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { roleId, permissionId } = req.body;
      const merchantId = req.merchant?.id;

      if (!merchantId) {
        res.status(400).json({ error: "Merchant ID required" });
        return;
      }

      // Verify role belongs to merchant
      const existingRole = await this.rbacService.getRoleById(roleId);
      if (existingRole.merchantId !== merchantId) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      await this.rbacService.removePermissionFromRole(
        roleId,
        permissionId,
        this.getAuditContext(req),
      );

      res.status(200).json({ message: "Permission removed successfully" });
    } catch (error) {
      console.error("Remove permission error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: errorMessage });
    }
  }

  // User Role Management
  async assignUserRole(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { userId, roleId } = req.body;
      const merchantId = req.merchant?.id;

      if (!merchantId) {
        res.status(400).json({ error: "Merchant ID required" });
        return;
      }

      // Verify role belongs to merchant
      const existingRole = await this.rbacService.getRoleById(roleId);
      if (existingRole.merchantId !== merchantId) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      await this.rbacService.assignRoleToUser(
        userId,
        roleId,
        merchantId,
        this.getAuditContext(req),
      );

      res.status(200).json({ message: "Role assigned to user successfully" });
    } catch (error) {
      console.error("Assign user role error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: errorMessage });
    }
  }

  async removeUserRole(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { userId, roleId } = req.body;
      const merchantId = req.merchant?.id;

      if (!merchantId) {
        res.status(400).json({ error: "Merchant ID required" });
        return;
      }

      // Verify role belongs to merchant
      const existingRole = await this.rbacService.getRoleById(roleId);
      if (existingRole.merchantId !== merchantId) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      await this.rbacService.removeUserRole(
        userId,
        roleId,
        merchantId,
        this.getAuditContext(req),
      );

      res.status(200).json({ message: "Role removed from user successfully" });
    } catch (error) {
      console.error("Remove user role error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: errorMessage });
    }
  }

  async getUserPermissions(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const merchantId = req.merchant?.id || req.params.merchantId;

      if (!merchantId) {
        res.status(400).json({ error: "Merchant ID required" });
        return;
      }

      const parsedUserId = parseInt(userId);
      if (isNaN(parsedUserId)) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
      }

      const permissions = await this.rbacService.getUserPermissions(
        parsedUserId,
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
