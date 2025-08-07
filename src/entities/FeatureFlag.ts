import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { IsNotEmpty, IsEnum, IsOptional, IsBoolean } from "class-validator";
import { Environment } from "./Configuration";

export enum FeatureFlagScope {
  GLOBAL = "global",
  USER = "user",
  MERCHANT = "merchant",
  ENVIRONMENT = "environment",
}

export enum FeatureFlagStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SCHEDULED = "scheduled",
  DEPRECATED = "deprecated",
}

@Entity("feature_flags")
@Index(["name", "environment"], { unique: true })
@Index(["status", "environment"])
export class FeatureFlag {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255 })
  @IsNotEmpty()
  name: string;

  @Column({ type: "text" })
  @IsNotEmpty()
  description: string;

  @Column({ default: false })
  @IsBoolean()
  isEnabled: boolean;

  @Column({
    type: "enum",
    enum: Environment,
    default: Environment.DEVELOPMENT,
  })
  @IsEnum(Environment)
  environment: Environment;

  @Column({
    type: "enum",
    enum: FeatureFlagScope,
    default: FeatureFlagScope.GLOBAL,
  })
  @IsEnum(FeatureFlagScope)
  scope: FeatureFlagScope;

  @Column({
    type: "enum",
    enum: FeatureFlagStatus,
    default: FeatureFlagStatus.ACTIVE,
  })
  @IsEnum(FeatureFlagStatus)
  status: FeatureFlagStatus;

  @Column({ type: "jsonb", nullable: true })
  @IsOptional()
  targetingRules?: {
    userIds?: string[];
    merchantIds?: string[];
    userRoles?: string[];
    percentage?: number; // For percentage-based rollouts (0-100)
    conditions?: Record<string, unknown>;
  };

  @Column({ type: "timestamp", nullable: true })
  @IsOptional()
  scheduledStartDate?: Date;

  @Column({ type: "timestamp", nullable: true })
  @IsOptional()
  scheduledEndDate?: Date;

  @Column({ type: "jsonb", nullable: true })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @Column({ type: "text", nullable: true })
  @IsOptional()
  owner?: string; // User ID who owns this feature flag

  @Column({ type: "text", nullable: true })
  @IsOptional()
  tags?: string; // Comma-separated tags

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  updatedBy?: string; // User ID who last updated this feature flag
}
