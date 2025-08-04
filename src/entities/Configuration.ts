import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { IsNotEmpty, IsEnum, IsOptional } from "class-validator";

export enum Environment {
  DEVELOPMENT = "development",
  STAGING = "staging",
  PRODUCTION = "production",
  TEST = "test",
}

export enum ConfigurationType {
  STRING = "string",
  NUMBER = "number",
  BOOLEAN = "boolean",
  JSON = "json",
  ENCRYPTED = "encrypted",
}

export enum ConfigurationCategory {
  DATABASE = "database",
  AUTHENTICATION = "authentication",
  PAYMENT = "payment",
  STELLAR = "stellar",
  EMAIL = "email",
  REDIS = "redis",
  FEATURE_FLAG = "feature_flag",
  SECURITY = "security",
  MONITORING = "monitoring",
  GENERAL = "general",
}

@Entity("configurations")
@Index(["configKey", "environment"], { unique: true })
@Index(["category", "environment"])
export class Configuration {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255 })
  @IsNotEmpty()
  configKey: string;

  @Column({ type: "text" })
  @IsNotEmpty()
  value: string;

  @Column({
    type: "enum",
    enum: Environment,
    default: Environment.DEVELOPMENT,
  })
  @IsEnum(Environment)
  environment: Environment;

  @Column({
    type: "enum",
    enum: ConfigurationType,
    default: ConfigurationType.STRING,
  })
  @IsEnum(ConfigurationType)
  type: ConfigurationType;

  @Column({
    type: "enum",
    enum: ConfigurationCategory,
    default: ConfigurationCategory.GENERAL,
  })
  @IsEnum(ConfigurationCategory)
  category: ConfigurationCategory;

  @Column({ type: "text", nullable: true })
  @IsOptional()
  description?: string;

  @Column({ default: false })
  isEncrypted: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isRequired: boolean;

  @Column({ type: "text", nullable: true })
  @IsOptional()
  validationRules?: string; // JSON string for validation rules

  @Column({ type: "text", nullable: true })
  @IsOptional()
  defaultValue?: string;

  @Column({ type: "text", nullable: true })
  @IsOptional()
  allowedValues?: string; // JSON string for enum values

  @Column({ type: "timestamp", nullable: true })
  @IsOptional()
  expiresAt?: Date;

  @Column({ type: "text", nullable: true })
  @IsOptional()
  metadata?: string; // JSON string for additional metadata

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  updatedBy?: string; // User ID who last updated this configuration
}
