import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AuditLogActionsEnum } from "../enums/AuditLogAction";

@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  entityType: string; // 'User', 'PaymentLink', 'BusinessProfile', etc.

  @Column()
  entityId: string;

  @Column({
    type: "enum",
    enum: AuditLogActionsEnum,
    default: AuditLogActionsEnum.CREATE,
  })
  action: AuditLogActionsEnum;

  @Column("json", { nullable: true })
  oldValues?: Record<string, any>; // used when there is an update,  so we can see
  //  what value was there previously

  @Column("json", { nullable: true })
  newValues?: Record<string, any>;

  @Column()
  userId: string;

  @Column()
  userEmail: string;

  @Column()
  ipAddress: string;

  @Column()
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}
