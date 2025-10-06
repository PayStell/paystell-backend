import { Request, Response, NextFunction } from "express";
import { configurationService } from "../services/ConfigurationService";
import logger from "../utils/logger";

// Configuration middleware interfaces are now in src/types/express.d.ts

// Explicit function type for Request.config.get to ensure correct inference
type ConfigGet = (
  key: string,
  defaultValue?: string,
) => Promise<string | number | boolean | Record<string, unknown> | null>;

/**
 * Middleware to inject configuration service into request object
 */
export const configurationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Inject configuration service into request
    req.config = {
      // Bind directly to avoid losing `this` and ensure exact return type
      get: configurationService.getConfig.bind(
        configurationService
      ) as ConfigGet,
      isFeatureEnabled: async (
        flagName: string,
        context?: {
          userId?: string;
          merchantId?: string;
          userRole?: string;
        }
      ) => {
        const evaluation = await configurationService.evaluateFeatureFlag(
          flagName,
          context
        );
        return evaluation.isEnabled;
      },
    };

    next();
  } catch (error) {
    logger.error("Configuration middleware error:", error);
    next(error);
  }
};

/**
 * Middleware to validate required configurations before processing request
 */
export const validateRequiredConfigMiddleware = (requiredConfigs: string[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const missingConfigs: string[] = [];

      for (const configKey of requiredConfigs) {
        const value = await configurationService.getConfig(configKey);
        if (value === null || value === undefined) {
          missingConfigs.push(configKey);
        }
      }

      if (missingConfigs.length > 0) {
        res.status(500).json({
          success: false,
          message: "Required configurations are missing",
          missingConfigs,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error("Required config validation error:", error);
      res.status(500).json({
        success: false,
        message: "Configuration validation failed",
      });
    }
  };
};

/**
 * Middleware to check feature flag before processing request
 */
export const featureFlagMiddleware = (flagName: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const context = {
        userId: req.user?.id,
        merchantId: req.merchant?.id,
        userRole: req.user?.role,
      };

      const evaluation = await configurationService.evaluateFeatureFlag(
        flagName,
        {
          userId: context.userId?.toString(),
          merchantId: context.merchantId,
          userRole: context.userRole?.toString(),
        }
      );

      if (!evaluation.isEnabled) {
        res.status(403).json({
          success: false,
          message: "Feature is not enabled",
          reason: evaluation.reason,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error(`Feature flag middleware error for ${flagName}:`, error);
      res.status(500).json({
        success: false,
        message: "Feature flag evaluation failed",
      });
    }
  };
};

/**
 * Middleware to inject environment-specific configurations
 */
export const environmentConfigMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Inject environment-specific configurations
    const environment = process.env.NODE_ENV || "development";

    // Add environment info to request
    req.environment = environment;

    // Load common configurations
    const commonConfigs = await Promise.all([
      configurationService.getConfig("APP_NAME", "PayStell"),
      configurationService.getConfig("APP_VERSION", "1.0.0"),
      configurationService.getConfig("ENVIRONMENT", environment),
    ]);

    req.appConfig = {
      name: commonConfigs[0] as string,
      version: commonConfigs[1] as string,
      environment: commonConfigs[2] as string,
    };

    next();
  } catch (error) {
    logger.error("Environment config middleware error:", error);
    next(error);
  }
};

/**
 * Middleware to cache configuration values for the duration of the request
 */
export const configCacheMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Create a request-specific cache
    const requestCache = new Map<
      string,
      string | number | boolean | Record<string, unknown> | null
    >();

    // Extend the config object with caching
    if (req.config) {
      const originalGet: ConfigGet = req.config.get as ConfigGet;
      const cachedGet: ConfigGet = async (
        key: string,
        defaultValue?: string
      ): Promise<string | number | boolean | Record<string, unknown> | null> => {
        // Check request cache first
        const cached = requestCache.get(key);
        if (cached !== undefined) {
          return cached;
        }

        // Get from service and cache
        const value = await originalGet(key, defaultValue);
        requestCache.set(key, value);
        return value;
      };
      req.config.get = cachedGet;
    }

    next();
  } catch (error) {
    logger.error("Config cache middleware error:", error);
    next(error);
  }
};
