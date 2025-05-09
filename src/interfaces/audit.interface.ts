import { AuditLogActionsEnum } from "../enums/AuditLogAction";

export interface CreateAditLogParams {
  entityType: string;
  entityId: string;
  action: AuditLogActionsEnum;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  userId: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
}

export interface FindAuditLogParams {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: AuditLogActionsEnum;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}
export { AuditLogActionsEnum };
