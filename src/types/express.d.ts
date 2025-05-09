import { DataSource } from "typeorm";
import { User } from "../entities/User";

declare module "express-serve-static-core" {
  interface Request {
    user?: Partial<User>;
    validatedIp?: string;
    tokenExp?: number;

    // adding this for  audit
    auditContext?: {
      userId: string;
      userEmail: string;
      ipAddress: string;
      userAgent: string;
    };
    preAuditEntity?: any;
    entityType?: string;

    dataSource: DataSource;
  }
}
