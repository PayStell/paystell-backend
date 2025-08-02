import { Repository } from "typeorm";
import { validate, ValidationError } from "class-validator";
import { plainToClass } from "class-transformer";
import crypto from "crypto";
import AppDataSource from "../config/db";
import { Configuration, Environment, ConfigurationType, ConfigurationCategory } from "../entities/Configuration";
import { FeatureFlag, FeatureFlagScope, FeatureFlagStatus } from "../entities/FeatureFlag";
import { AuditService } from "./AuditService";
import logger from "../utils/logger";

export interface ConfigurationValue {
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  type: ConfigurationType;
  category: ConfigurationCategory;
  isEncrypted: boolean;
  isRequired: boolean;
  description?: string;
  validationRules?: Record<string, unknown>;
  defaultValue?: string;
  allowedValues?: string[];
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ConfigurationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FeatureFlagEvaluation {
  isEnabled: boolean;
  reason: string;
  targetingMatch?: boolean;
  percentageRollout?: number;
}

export class ConfigurationService {
  private configRepository: Repository<Configuration>;
  private featureFlagRepository: Repository<FeatureFlag>;
  private auditService: AuditService;
  private cache: Map<string, ConfigurationValue> = new Map();
  private encryptionKey: string;
  private currentEnvironment: Environment;

  constructor() {
    this.configRepository = AppDataSource.getRepository(Configuration);
    this.featureFlagRepository = AppDataSource.getRepository(FeatureFlag);
    this.auditService = new AuditService();
    this.encryptionKey = process.env.CONFIG_ENCRYPTION_KEY || "default-encryption-key";
    this.currentEnvironment = (process.env.NODE_ENV as Environment) || Environment.DEVELOPMENT;
  }

  /**
   * Initialize configuration service and load all configurations
   */
  async initialize(): Promise<void> {
    try {
      logger.info("Initializing ConfigurationService...");
      
      // Load all configurations for current environment
      await this.loadConfigurations();
      
      // Validate required configurations
      const validationResult = await this.validateRequiredConfigurations();
      if (!validationResult.isValid) {
        throw new Error(`Configuration validation failed: ${validationResult.errors.join(", ")}`);
      }

      logger.info("ConfigurationService initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize ConfigurationService:", error);
      throw error;
    }
  }

  /**
   * Get configuration value by key
   */
  async getConfig(key: string, defaultValue?: string): Promise<string | number | boolean | Record<string, unknown> | null> {
    const cached = this.cache.get(key);
    if (cached) {
      return this.parseValue(cached.value as string, cached.type);
    }

    const config = await this.configRepository.findOne({
      where: {
        configKey: key,
        environment: this.currentEnvironment,
        isActive: true,
      },
    });

    if (!config) {
      return defaultValue !== undefined ? defaultValue : null;
    }

    let value = config.value;
    if (config.isEncrypted) {
      value = this.decryptValue(value);
    }

    const configValue: ConfigurationValue = {
      key: config.configKey,
      value,
      type: config.type,
      category: config.category,
      isEncrypted: config.isEncrypted,
      isRequired: config.isRequired,
      description: config.description,
      validationRules: config.validationRules ? this.safeJsonParse(config.validationRules) : undefined,
      defaultValue: config.defaultValue,
      allowedValues: config.allowedValues ? this.safeJsonParse(config.allowedValues, []) : [],
      expiresAt: config.expiresAt,
      metadata: config.metadata ? this.safeJsonParse(config.metadata) : undefined,
    };

    this.cache.set(key, configValue);
    return this.parseValue(value, config.type);
  }

  /**
   * Get configuration details including metadata
   */
  async getConfigDetails(key: string): Promise<Configuration | null> {
    return this.configRepository.findOne({
      where: {
        configKey: key,
        environment: this.currentEnvironment,
        isActive: true,
      },
    });
  }

  /**
   * Set configuration value
   */
  async setConfig(
    key: string,
    value: string | number | boolean | Record<string, unknown>,
    options: {
      type?: ConfigurationType;
      category?: ConfigurationCategory;
      description?: string;
      isEncrypted?: boolean;
      isRequired?: boolean;
      validationRules?: Record<string, unknown>;
      defaultValue?: string;
      allowedValues?: string[];
      expiresAt?: Date;
      metadata?: Record<string, unknown>;
      updatedBy?: string;
    } = {}
  ): Promise<Configuration> {
    const stringValue = this.stringifyValue(value);
    let finalValue = stringValue;

    if (options.isEncrypted) {
      finalValue = this.encryptValue(stringValue);
    }

    let config = await this.configRepository.findOne({
      where: {
        configKey: key,
        environment: this.currentEnvironment,
      },
    });

    const oldValues = config ? { ...config } : undefined;

    if (!config) {
      config = this.configRepository.create({
        configKey: key,
        value: finalValue,
        environment: this.currentEnvironment,
        type: options.type || ConfigurationType.STRING,
        category: options.category || ConfigurationCategory.GENERAL,
        description: options.description,
        isEncrypted: options.isEncrypted || false,
        isRequired: options.isRequired || false,
        validationRules: options.validationRules ? JSON.stringify(options.validationRules) : undefined,
        defaultValue: options.defaultValue,
        allowedValues: options.allowedValues ? JSON.stringify(options.allowedValues) : undefined,
        expiresAt: options.expiresAt,
        metadata: options.metadata ? JSON.stringify(options.metadata) : undefined,
        updatedBy: options.updatedBy,
      });
    } else {
      Object.assign(config, {
        value: finalValue,
        type: options.type || config.type,
        category: options.category || config.category,
        description: options.description || config.description,
        isEncrypted: options.isEncrypted !== undefined ? options.isEncrypted : config.isEncrypted,
        isRequired: options.isRequired !== undefined ? options.isRequired : config.isRequired,
        validationRules: options.validationRules ? JSON.stringify(options.validationRules) : config.validationRules,
        defaultValue: options.defaultValue || config.defaultValue,
        allowedValues: options.allowedValues ? JSON.stringify(options.allowedValues) : config.allowedValues,
        expiresAt: options.expiresAt || config.expiresAt,
        metadata: options.metadata ? JSON.stringify(options.metadata) : config.metadata,
        updatedBy: options.updatedBy,
      });
    }

    const savedConfig = await this.configRepository.save(config);

    // Clear cache
    this.cache.delete(key);

    // Audit log
    await this.auditService.createAuditLog({
      entityType: "Configuration",
      entityId: savedConfig.id,
      action: oldValues ? "UPDATE" : "CREATE",
      oldValues: oldValues as unknown as Record<string, unknown>,
      newValues: savedConfig as unknown as Record<string, unknown>,
      context: {
        ipAddress: "system",
        userAgent: "ConfigurationService",
        userId: options.updatedBy,
      },
    });

    logger.info(`Configuration updated: ${key} = ${options.isEncrypted ? "[ENCRYPTED]" : value}`);

    return savedConfig;
  }

  /**
   * Delete configuration
   */
  async deleteConfig(key: string, updatedBy?: string): Promise<void> {
    const config = await this.configRepository.findOne({
      where: {
        configKey: key,
        environment: this.currentEnvironment,
      },
    });

    if (!config) {
      throw new Error(`Configuration not found: ${key}`);
    }

    await this.configRepository.remove(config);

    // Clear cache
    this.cache.delete(key);

    // Audit log
    await this.auditService.createAuditLog({
      entityType: "Configuration",
      entityId: config.id,
      action: "DELETE",
      oldValues: config as unknown as Record<string, unknown>,
      context: {
        ipAddress: "system",
        userAgent: "ConfigurationService",
        userId: updatedBy,
      },
    });

    logger.info(`Configuration deleted: ${key}`);
  }

  /**
   * Get all configurations for current environment
   */
  async getAllConfigs(): Promise<Configuration[]> {
    return this.configRepository.find({
      where: {
        environment: this.currentEnvironment,
        isActive: true,
      },
      order: {
        category: "ASC",
        configKey: "ASC",
      },
    });
  }

  /**
   * Get configurations by category
   */
  async getConfigsByCategory(category: ConfigurationCategory): Promise<Configuration[]> {
    return this.configRepository.find({
      where: {
        category,
        environment: this.currentEnvironment,
        isActive: true,
      },
      order: {
        configKey: "ASC",
      },
    });
  }

  /**
   * Evaluate feature flag
   */
  async evaluateFeatureFlag(
    flagName: string,
    context?: {
      userId?: string;
      merchantId?: string;
      userRole?: string;
    }
  ): Promise<FeatureFlagEvaluation> {
    const flag = await this.featureFlagRepository.findOne({
      where: {
        name: flagName,
        environment: this.currentEnvironment,
        status: FeatureFlagStatus.ACTIVE,
      },
    });

    if (!flag) {
      return {
        isEnabled: false,
        reason: "Feature flag not found or inactive",
      };
    }

    // Check if flag is scheduled
    const now = new Date();
    if (flag.scheduledStartDate && now < flag.scheduledStartDate) {
      return {
        isEnabled: false,
        reason: "Feature flag not yet scheduled to start",
      };
    }

    if (flag.scheduledEndDate && now > flag.scheduledEndDate) {
      return {
        isEnabled: false,
        reason: "Feature flag has expired",
      };
    }

    // Check targeting rules
    if (flag.targetingRules) {
      const targetingMatch = this.evaluateTargetingRules(flag.targetingRules, context);
      if (!targetingMatch) {
        return {
          isEnabled: false,
          reason: "User does not match targeting rules",
          targetingMatch: false,
        };
      }
    }

    // Check percentage rollout
    if (flag.targetingRules?.percentage) {
      const percentage = flag.targetingRules.percentage;
      const userId = context?.userId || "anonymous";
      const hash = crypto.createHash("md5").update(`${flagName}:${userId}`).digest("hex");
      const hashValue = parseInt(hash.substring(0, 8), 16);
      const userPercentage = hashValue % 100;

      if (userPercentage >= percentage) {
        return {
          isEnabled: false,
          reason: "User not included in percentage rollout",
          percentageRollout: percentage,
        };
      }
    }

    return {
      isEnabled: flag.isEnabled,
      reason: flag.isEnabled ? "Feature flag is enabled" : "Feature flag is disabled",
      targetingMatch: true,
    };
  }

  /**
   * Create or update feature flag
   */
  async setFeatureFlag(
    name: string,
    description: string,
    isEnabled: boolean,
    options: {
      scope?: FeatureFlagScope;
      targetingRules?: Record<string, unknown>;
      scheduledStartDate?: Date;
      scheduledEndDate?: Date;
      metadata?: Record<string, unknown>;
      owner?: string;
      tags?: string;
      updatedBy?: string;
    } = {}
  ): Promise<FeatureFlag> {
    let flag = await this.featureFlagRepository.findOne({
      where: {
        name,
        environment: this.currentEnvironment,
      },
    });

    const oldValues = flag ? { ...flag } : undefined;

    if (!flag) {
      flag = this.featureFlagRepository.create({
        name,
        description,
        isEnabled,
        environment: this.currentEnvironment,
        scope: options.scope || FeatureFlagScope.GLOBAL,
        targetingRules: options.targetingRules,
        scheduledStartDate: options.scheduledStartDate,
        scheduledEndDate: options.scheduledEndDate,
        metadata: options.metadata,
        owner: options.owner,
        tags: options.tags,
        updatedBy: options.updatedBy,
      });
    } else {
      Object.assign(flag, {
        description,
        isEnabled,
        scope: options.scope || flag.scope,
        targetingRules: options.targetingRules || flag.targetingRules,
        scheduledStartDate: options.scheduledStartDate || flag.scheduledStartDate,
        scheduledEndDate: options.scheduledEndDate || flag.scheduledEndDate,
        metadata: options.metadata || flag.metadata,
        owner: options.owner || flag.owner,
        tags: options.tags || flag.tags,
        updatedBy: options.updatedBy,
      });
    }

    const savedFlag = await this.featureFlagRepository.save(flag);

    // Audit log
    await this.auditService.createAuditLog({
      entityType: "FeatureFlag",
      entityId: savedFlag.id,
      action: oldValues ? "UPDATE" : "CREATE",
      oldValues: oldValues as unknown as Record<string, unknown>,
      newValues: savedFlag as unknown as Record<string, unknown>,
      context: {
        ipAddress: "system",
        userAgent: "ConfigurationService",
        userId: options.updatedBy,
      },
    });

    logger.info(`Feature flag updated: ${name} = ${isEnabled}`);

    return savedFlag;
  }

  /**
   * Get all feature flags for current environment
   */
  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    return this.featureFlagRepository.find({
      where: {
        environment: this.currentEnvironment,
      },
      order: {
        name: "ASC",
      },
    });
  }

  /**
   * Clear configuration cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info("Configuration cache cleared");
  }

  /**
   * Reload configurations from database
   */
  async reloadConfigurations(): Promise<void> {
    this.clearCache();
    await this.loadConfigurations();
    logger.info("Configurations reloaded from database");
  }

  // Private helper methods

  private async loadConfigurations(): Promise<void> {
    const configs = await this.configRepository.find({
      where: {
        environment: this.currentEnvironment,
        isActive: true,
      },
    });

    this.cache.clear();
    for (const config of configs) {
      let value = config.value;
      if (config.isEncrypted) {
        value = this.decryptValue(value);
      }

      this.cache.set(config.configKey, {
        key: config.configKey,
        value,
        type: config.type,
        category: config.category,
        isEncrypted: config.isEncrypted,
        isRequired: config.isRequired,
        description: config.description,
        validationRules: config.validationRules ? this.safeJsonParse(config.validationRules) : undefined,
        defaultValue: config.defaultValue,
        allowedValues: config.allowedValues ? this.safeJsonParse(config.allowedValues, []) : [],
        expiresAt: config.expiresAt,
        metadata: config.metadata ? this.safeJsonParse(config.metadata) : undefined,
      });
    }
  }

  private async validateRequiredConfigurations(): Promise<ConfigurationValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const requiredConfigs = await this.configRepository.find({
      where: {
        environment: this.currentEnvironment,
        isRequired: true,
        isActive: true,
      },
    });

    for (const config of requiredConfigs) {
      if (!config.value || config.value.trim() === "") {
        errors.push(`Required configuration missing or empty: ${config.configKey}`);
      }

      // Check if configuration has expired
      if (config.expiresAt && new Date() > config.expiresAt) {
        warnings.push(`Configuration has expired: ${config.configKey}`);
      }

      // Validate against allowed values
      if (config.allowedValues) {
        const allowedValues = this.safeJsonParse(config.allowedValues, []);
        if (!allowedValues.includes(config.value)) {
          errors.push(`Configuration value not allowed: ${config.configKey} = ${config.value}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private parseValue(value: string, type: ConfigurationType): string | number | boolean | Record<string, unknown> {
    switch (type) {
      case ConfigurationType.NUMBER:
        return parseFloat(value);
      case ConfigurationType.BOOLEAN:
        return value.toLowerCase() === "true";
      case ConfigurationType.JSON:
        return JSON.parse(value);
      case ConfigurationType.ENCRYPTED:
        return this.decryptValue(value);
      default:
        return value;
    }
  }

  private stringifyValue(value: string | number | boolean | Record<string, unknown>): string {
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private encryptValue(value: string): string {
    const iv = crypto.randomBytes(16);
    // Use a KDF with a deterministic salt based on a fixed application salt
    const salt = crypto.createHash('sha256').update('paystell-config-v1').digest();
    const key = crypto.scryptSync(this.encryptionKey, salt, 32);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(value, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
  }

  private decryptValue(encryptedValue: string): string {
    const [ivHex, encrypted] = encryptedValue.split(":");
    const iv = Buffer.from(ivHex, "hex");
    // Use the same salt for decryption
    const salt = crypto.createHash('sha256').update('paystell-config-v1').digest();
    const key = crypto.scryptSync(this.encryptionKey, salt, 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  private evaluateTargetingRules(
    targetingRules: Record<string, unknown>,
    context?: {
      userId?: string;
      merchantId?: string;
      userRole?: string;
    }
  ): boolean {
    if (!context) return true;

    // Check user IDs
    if (targetingRules.userIds && Array.isArray(targetingRules.userIds)) {
      if (!context.userId || !targetingRules.userIds.includes(context.userId)) {
        return false;
      }
    }

    // Check merchant IDs
    if (targetingRules.merchantIds && Array.isArray(targetingRules.merchantIds)) {
      if (!context.merchantId || !targetingRules.merchantIds.includes(context.merchantId)) {
        return false;
      }
    }

    // Check user roles
    if (targetingRules.userRoles && Array.isArray(targetingRules.userRoles)) {
      if (!context.userRole || !targetingRules.userRoles.includes(context.userRole)) {
        return false;
      }
    }

    // Check percentage rollout
    if (targetingRules.percentage !== undefined) {
      // Validate percentage is between 0 and 100
      if (typeof targetingRules.percentage !== 'number' || targetingRules.percentage < 0 || targetingRules.percentage > 100) {
        logger.warn(`Invalid percentage value: ${targetingRules.percentage}. Must be between 0 and 100.`);
        return false;
      }
      
      const userId = context.userId || "anonymous";
      // Include a stable identifier to ensure consistent hashing
      const hash = crypto.createHash("md5").update(`targeting:${userId}`).digest("hex");
      const hashValue = parseInt(hash.substring(0, 8), 16);
      const userPercentage = hashValue % 100;
      return userPercentage < targetingRules.percentage;
    }

    return true;
  }

  /**
   * Safely parse JSON with error handling
   */
  private safeJsonParse(value: string, defaultValue: any = undefined): any {
    try {
      return JSON.parse(value);
    } catch (error) {
      logger.warn(`Failed to parse JSON: ${(error as Error).message}`);
      return defaultValue;
    }
  }
}

// Singleton instance
export const configurationService = new ConfigurationService(); 