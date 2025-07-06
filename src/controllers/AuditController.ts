import { Request, Response } from "express";
import { auditService } from "../services/AuditService";
import { UserRole } from "../enums/UserRole";

export class AuditController {
  private parseDate(dateStr: string): Date | undefined {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  }

  private parsePositiveInt(str: string, defaultValue: number): number {
    const parsed = parseInt(str, 10);
    return isNaN(parsed) || parsed < 1 ? defaultValue : parsed;
  }

  async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      // Only allow admin users to access audit logs
      if (req.user?.role !== UserRole.ADMIN) {
        res.status(403).json({
          status: "error",
          message: "Access denied. Admin role required.",
        });
        return;
      }

      const {
        entityType,
        entityId,
        userId,
        action,
        startDate,
        endDate,
        page = 1,
        limit = 50,
      } = req.query;

      const filters = {
        entityType: entityType as string,
        entityId: entityId as string,
        userId: userId as string,
        // Allow all audit actions, including RBAC ones
        action: action as string,
        startDate: startDate ? this.parseDate(startDate as string) : undefined,
        endDate: endDate ? this.parseDate(endDate as string) : undefined,
        page: this.parsePositiveInt(page as string, 1),
        limit: this.parsePositiveInt(limit as string, 50),
      };

      const result = await auditService.getAuditLogs(filters);

      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  }

  async getEntityAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      // Only allow admin users to access audit logs
      if (req.user?.role !== UserRole.ADMIN) {
        res.status(403).json({
          status: "error",
          message: "Access denied. Admin role required.",
        });
        return;
      }

      const { entityType, entityId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const result = await auditService.getAuditLogs({
        entityType,
        entityId,
        page: this.parsePositiveInt(page as string, 1),
        limit: this.parsePositiveInt(limit as string, 50),
      });

      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (error) {
      console.error("Error fetching entity audit logs:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  }
}

export const auditController = new AuditController();
