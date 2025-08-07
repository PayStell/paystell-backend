import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { RolePermission } from "./RolePermission";

export enum PermissionAction {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  MANAGE = "manage", // Full access
}

export enum PermissionResource {
  PAYMENTS = "payments",
  USERS = "users",
  MERCHANTS = "merchants",
  REPORTS = "reports",
  SETTINGS = "settings",
  WEBHOOKS = "webhooks",
  API_KEYS = "api_keys",
  AUDIT_LOGS = "audit_logs",
  REFERRALS = "referrals",
  SUBSCRIPTIONS = "subscriptions",
  FRAUD_DETECTION = "fraud_detection",
  ROLES = "roles", // New dedicated roles resource
  CONFIGURATION = "configuration",
}

@Entity("permissions")
@Index("UQ_permission_resource_action", ["resource", "action"], {
  unique: true,
})
export class Permission {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "enum",
    enum: PermissionResource,
  })
  resource!: PermissionResource;

  @Column({
    type: "enum",
    enum: PermissionAction,
  })
  action!: PermissionAction;

  @Column({ nullable: true })
  description?: string;

  @OneToMany(
    () => RolePermission,
    (rolePermission) => rolePermission.permission,
  )
  rolePermissions!: RolePermission[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Unique constraint on resource + action combination
  static getPermissionKey(
    resource: PermissionResource,
    action: PermissionAction,
  ): string {
    return `${resource}:${action}`;
  }
}
