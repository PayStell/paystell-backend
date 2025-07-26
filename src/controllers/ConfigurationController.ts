import { Request, Response, NextFunction } from "express";
import { configurationService } from "../services/ConfigurationService";
import { Configuration, ConfigurationCategory, ConfigurationType } from "../entities/Configuration";
import { FeatureFlag, FeatureFlagScope } from "../entities/FeatureFlag";
import { AppError } from "../utils/AppError";
import logger from "../utils/logger";
import { validationResult } from "express-validator";

export class ConfigurationController {
  /**
   * Get all configurations for current environment
   */
  async getAllConfigurations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const configs = await configurationService.getAllConfigs();
      
      // Filter out encrypted values for security
      const sanitizedConfigs = configs.map(config => ({
        ...config,
        value: config.isEncrypted ? "[ENCRYPTED]" : config.value,
      }));

      res.json({
        success: true,
        data: sanitizedConfigs,
        count: sanitizedConfigs.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get configuration by key
   */
  async getConfiguration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key } = req.params;
      const config = await configurationService.getConfigDetails(key);

      if (!config) {
        throw new AppError("Configuration not found", 404);
      }

      res.json({
        success: true,
        data: {
          key: config.configKey,
          value: config.isEncrypted ? "[ENCRYPTED]" : config.value,
          type: config.type,
          category: config.category,
          isEncrypted: config.isEncrypted,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create or update configuration
   */
  async setConfiguration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const {
        key,
        value,
        type = ConfigurationType.STRING,
        category = ConfigurationCategory.GENERAL,
        description,
        isEncrypted = false,
        isRequired = false,
        validationRules,
        defaultValue,
        allowedValues,
        expiresAt,
        metadata,
      } = req.body;

      const config = await configurationService.setConfig(key, value, {
        type,
        category,
        description,
        isEncrypted,
        isRequired,
        validationRules,
        defaultValue,
        allowedValues,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        metadata,
        updatedBy: req.user?.id?.toString(),
      });

      res.status(201).json({
        success: true,
        message: "Configuration updated successfully",
        data: {
          ...config,
          value: isEncrypted ? "[ENCRYPTED]" : config.value,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete configuration
   */
  async deleteConfiguration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key } = req.params;
      
      await configurationService.deleteConfig(key, req.user?.id?.toString());

      res.json({
        success: true,
        message: "Configuration deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get configurations by category
   */
  async getConfigurationsByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category } = req.params;
      
      if (!Object.values(ConfigurationCategory).includes(category as ConfigurationCategory)) {
        throw new AppError("Invalid category", 400);
      }

      const configs = await configurationService.getConfigsByCategory(category as ConfigurationCategory);
      
      // Filter out encrypted values for security
      const sanitizedConfigs = configs.map(config => ({
        ...config,
        value: config.isEncrypted ? "[ENCRYPTED]" : config.value,
      }));

      res.json({
        success: true,
        data: sanitizedConfigs,
        count: sanitizedConfigs.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reload configurations from database
   */
  async reloadConfigurations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await configurationService.reloadConfigurations();

      res.json({
        success: true,
        message: "Configurations reloaded successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate configurations
   */
  async validateConfigurations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get all configurations and validate required ones
      const allConfigs = await configurationService.getAllConfigs();
      const requiredConfigs = allConfigs.filter(config => config.isRequired);
      const missingRequired = requiredConfigs.filter(config => !config.value || config.value.trim() === "");
      
      const validationResult = {
        isValid: missingRequired.length === 0,
        errors: missingRequired.map(config => `Required configuration missing or empty: ${config.configKey}`),
        warnings: [],
      };

      res.json({
        success: true,
        data: validationResult,
      });
    } catch (error) {
      next(error);
    }
  }

  // Feature Flag Methods

  /**
   * Get all feature flags
   */
  async getAllFeatureFlags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const flags = await configurationService.getAllFeatureFlags();

      res.json({
        success: true,
        data: flags,
        count: flags.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create or update feature flag
   */
  async setFeatureFlag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const {
        name,
        description,
        isEnabled,
        scope = FeatureFlagScope.GLOBAL,
        targetingRules,
        scheduledStartDate,
        scheduledEndDate,
        metadata,
        owner,
        tags,
      } = req.body;

      const flag = await configurationService.setFeatureFlag(name, description, isEnabled, {
        scope,
        targetingRules,
        scheduledStartDate: scheduledStartDate ? new Date(scheduledStartDate) : undefined,
        scheduledEndDate: scheduledEndDate ? new Date(scheduledEndDate) : undefined,
        metadata,
        owner,
        tags,
        updatedBy: req.user?.id?.toString(),
      });

      res.status(201).json({
        success: true,
        message: "Feature flag updated successfully",
        data: flag,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Evaluate feature flag
   */
  async evaluateFeatureFlag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { flagName } = req.params;
      const { userId, merchantId, userRole } = req.query;

      const evaluation = await configurationService.evaluateFeatureFlag(flagName, {
        userId: userId as string,
        merchantId: merchantId as string,
        userRole: userRole as string,
      });

      res.json({
        success: true,
        data: evaluation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get configuration statistics
   */
  async getConfigurationStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const configs = await configurationService.getAllConfigs();
      const flags = await configurationService.getAllFeatureFlags();

      const stats = {
        totalConfigurations: configs.length,
        encryptedConfigurations: configs.filter(c => c.isEncrypted).length,
        requiredConfigurations: configs.filter(c => c.isRequired).length,
        configurationsByCategory: Object.values(ConfigurationCategory).reduce((acc, category) => {
          acc[category] = configs.filter(c => c.category === category).length;
          return acc;
        }, {} as Record<string, number>),
        totalFeatureFlags: flags.length,
        activeFeatureFlags: flags.filter(f => f.isEnabled).length,
        featureFlagsByScope: Object.values(FeatureFlagScope).reduce((acc, scope) => {
          acc[scope] = flags.filter(f => f.scope === scope).length;
          return acc;
        }, {} as Record<string, number>),
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export configurations
   */
  async exportConfigurations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { environment } = req.query;
      const configs = await configurationService.getAllConfigs();

      const exportData = {
        environment: environment || process.env.NODE_ENV,
        exportedAt: new Date().toISOString(),
        configurations: configs.map(config => ({
          key: config.configKey,
          value: config.isEncrypted ? "[ENCRYPTED]" : config.value,
          type: config.type,
          category: config.category,
          description: config.description,
          isEncrypted: config.isEncrypted,
          isRequired: config.isRequired,
          validationRules: config.validationRules,
          defaultValue: config.defaultValue,
          allowedValues: config.allowedValues,
          expiresAt: config.expiresAt,
          metadata: config.metadata,
        })),
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="configurations-${environment || 'current'}.json"`);
      res.json(exportData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Import configurations
   */
  async importConfigurations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { configurations, overwrite = false } = req.body;

      if (!Array.isArray(configurations)) {
        throw new AppError("Invalid configurations format", 400);
      }

      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (const config of configurations) {
        try {
          const existing = await configurationService.getConfig(config.key);
          
          if (existing !== null && !overwrite) {
            skipped++;
            continue;
          }

          await configurationService.setConfig(config.key, config.value, {
            type: config.type,
            category: config.category,
            description: config.description,
            isEncrypted: config.isEncrypted,
            isRequired: config.isRequired,
            validationRules: config.validationRules,
            defaultValue: config.defaultValue,
            allowedValues: config.allowedValues,
            expiresAt: config.expiresAt ? new Date(config.expiresAt) : undefined,
            metadata: config.metadata,
            updatedBy: req.user?.id?.toString(),
          });

          imported++;
        } catch (error) {
          logger.error(`Failed to import configuration ${config.key}:`, error);
          errors++;
        }
      }

      res.json({
        success: true,
        message: "Configuration import completed",
        data: {
          imported,
          skipped,
          errors,
        },
      });
    } catch (error) {
      next(error);
    }
  }
} 