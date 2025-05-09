import { Request, Response, NextFunction } from "express";
import { AuditLogActionsEnum } from "../enums/AuditLogAction";
import { AuditService } from "../services/Audit.service";

/**
 * Higher-order function to create entity-specific audit middleware
 * @param entityType The entity type to audit
 * @param entityIdParam The parameter name containing the entity ID
 */
export function createEntityAuditMiddleware(
  entityType: string,
  entityIdParam: string = "id",
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auditContext) {
        // If audit context middleware has not run
        return next();
      }

      const entityId = req.params[entityIdParam];
      if (!entityId) {
        return next();
      }

      // Get the DataSource from request
      const dataSource = req.dataSource;
      if (!dataSource) {
        console.error("DataSource not available in request");
        return next();
      }

      // Create audit service instance
      const auditService = new AuditService(dataSource);

      // Get the entity repository dynamically
      const entityRepository = dataSource.getRepository(entityType);

      // Get the entity before any changes
      const entity = await entityRepository.findOne({
        where: { id: entityId },
      });

      if (!entity) {
        return next();
      }

      // Store the entity in the request for comparison after operation
      req.preAuditEntity = entity;
      req.entityType = entityType;

      // Add event listeners for response completion
      res.on("finish", async () => {
        // This runs after the response has been sent
        // Only audit successful operations (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            // Check request method to determine operation type
            let action: AuditLogActionsEnum;
            let oldValues: Record<string, any> | undefined;
            let newValues: Record<string, any> | undefined;

            switch (req.method) {
              case "POST":
                action = AuditLogActionsEnum.CREATE;
                newValues = req.body;
                break;
              case "PUT":
              case "PATCH":
                action = AuditLogActionsEnum.UPDATE;
                oldValues = { ...req.preAuditEntity };
                newValues = req.body;
                break;
              case "DELETE":
                action = AuditLogActionsEnum.DELETE;
                oldValues = { ...req.preAuditEntity };
                break;
              default:
                // Don't audit GET or other methods
                return;
            }

            // Create audit log
            await auditService.createAuditLogs({
              action: action,
              entityId: entityId,
              entityType: entityType,
              oldValues,
              newValues,
              ipAddress: req.auditContext!.ipAddress,
              userAgent: req.auditContext!.userAgent,
              userEmail: req.auditContext!.userEmail,
              userId: req.auditContext!.userId,
            });
          } catch (error) {
            console.error("Error creating audit log:", error);
          }
        }
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}
