import { Request, Response } from "express";

import { AuditLogActionsEnum } from "../enums/AuditLogAction";
import { AuditService } from "../services/Audit.service";

export class AuditLogController {
  fetchAllAuditLogs = async (req: Request, res: Response) => {
    const auditService = new AuditService(req.dataSource);
    try {
      const filters = {
        entityType: req.query.entityType as string,
        entityId: req.query.entityId as string,
        userId: req.query.userId as string,
        action: req.query.action as AuditLogActionsEnum,
        startDate: req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate
          ? new Date(req.query.endDate as string)
          : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
      };

      const result = await auditService.findAuditLogs(filters);

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  };
}
