import {
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  EventSubscriber,
  DataSource,
} from "typeorm";
import { AuditService } from "../../services/Audit.service";
import { AuditLogActionsEnum } from "../../interfaces/audit.interface";

/**
 * This TypeORM subscriber will handle automatic audit logging for all entities
 * It needs to be registered with the connection when the app starts
 */
@EventSubscriber()
export class EntityAuditSubscriber implements EntitySubscriberInterface {
  private auditService: AuditService;

  constructor(dataSource: DataSource) {
    // Initialize service with the dataSource
    this.auditService = new AuditService(dataSource);
  }

  /**
   * Called after entity insertion
   */
  async afterInsert(event: InsertEvent<any>) {
    // Skip auditing for AuditLog entity to prevent infinite recursion
    if (event.metadata.tableName === "audit_logs") return;

    // Get entity name
    const entityName = event.metadata.targetName;
    const entityId = event.entity.id;

    // In Express context, we don't have direct access to request
    // This is why we use middleware approach alongside subscribers
    // We'll track basic entity changes here without user context
    try {
      // Here we have limited context - we can't know which user performed the action
      await this.auditService.createAuditLogs({
        entityType: entityName,
        entityId,
        action: AuditLogActionsEnum.CREATE,
        newValues: { ...event.entity },
        userId: "system",
        userEmail: "system@example.com",
        ipAddress: "0.0.0.0",
        userAgent: "TypeORM Subscriber",
      });
    } catch (error) {
      console.error("Error creating audit log in subscriber:", error);
    }
  }

  /**
   * Called after entity update
   */
  async afterUpdate(event: UpdateEvent<any>) {
    // Skip auditing for AuditLog entity
    if (event.metadata.tableName === "audit_logs") return;

    // Get entity name
    const entityName = event.metadata.targetName;
    const entityId = event.entity?.id || event.databaseEntity.id;

    // Extract changed columns and their values
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    if (event.updatedColumns.length > 0) {
      for (const column of event.updatedColumns) {
        const columnName = column.propertyName;
        oldValues[columnName] = event.databaseEntity[columnName];
        newValues[columnName] = event.entity?.[columnName];
      }
    }

    // Only create audit log if there are actual changes
    if (Object.keys(newValues).length > 0) {
      try {
        await this.auditService.createAuditLogs({
          entityType: entityName,
          entityId,
          action: AuditLogActionsEnum.UPDATE,
          oldValues,
          newValues,
          userId: "system",
          userEmail: "system@example.com",
          ipAddress: "0.0.0.0",
          userAgent: "TypeORM Subscriber",
        });
      } catch (error) {
        console.error("Error creating audit log in subscriber:", error);
      }
    }
  }

  /**
   * Called after entity removal
   */
  async afterRemove(event: RemoveEvent<any>) {
    // Skip auditing for AuditLog entity
    if (event.metadata.tableName === "audit_logs") return;

    // Get entity name
    const entityName = event.metadata.targetName;
    const entityId = event.databaseEntity.id;

    try {
      await this.auditService.createAuditLogs({
        entityType: entityName,
        entityId,
        action: AuditLogActionsEnum.DELETE,
        oldValues: { ...event.databaseEntity },
        userId: "system",
        userEmail: "system@example.com",
        ipAddress: "0.0.0.0",
        userAgent: "TypeORM Subscriber",
      });
    } catch (error) {
      console.error("Error creating audit log in subscriber:", error);
    }
  }
}
