import { Repository } from "typeorm";
import AppDataSource from "../config/db";
import { RateLimitConfig } from "../entities/RateLimitConfig";
import { 
  DEFAULT_USER_ROLE_LIMITS, 
  DEFAULT_MERCHANT_TYPE_LIMITS,
  RateLimitTier 
} from "../config/rateLimitConfig";
import { UserRole } from "../enums/UserRole";
import { MerchantEntity } from "../entities/Merchant.entity";
import logger from "../utils/logger";

export class RateLimitConfigService {
  private configRepository: Repository<RateLimitConfig>;
  private merchantRepository: Repository<MerchantEntity>;

  constructor() {
    this.configRepository = AppDataSource.getRepository(RateLimitConfig);
    this.merchantRepository = AppDataSource.getRepository(MerchantEntity);
  }

  async getConfigForUser(userId: string, merchantId: string, userRole: string): Promise<RateLimitConfig> {
    try {
      // First try to find a specific config for this user role and merchant
      let config = await this.configRepository.findOne({
        where: {
          merchantId,
          userRole,
          isActive: true,
        },
      });

      if (config) {
        return config;
      }

      // Get merchant info
      const merchant = await this.merchantRepository.findOne({
        where: { id: merchantId },
      });

      // Determine merchant type based on available fields or default to "standard"
      const merchantType = this.determineMerchantType(merchant);
      
      // Try to find config for this merchant type
      config = await this.configRepository.findOne({
        where: {
          merchantId,
          merchantType,
          isActive: true,
        },
      });

      if (config) {
        return config;
      }

      // If still no config, create one based on defaults
      const defaultLimits = this.getDefaultLimits(userRole, merchantType);
      
      config = this.configRepository.create({
        merchantId,
        userRole,
        merchantType,
        requestsPerSecond: defaultLimits.limits.requestsPerSecond,
        requestsPerMinute: defaultLimits.limits.requestsPerMinute,
        requestsPerHour: defaultLimits.limits.requestsPerHour,
        requestsPerDay: defaultLimits.limits.requestsPerDay,
        burstMultiplier: defaultLimits.burstMultiplier,
        burstDurationSeconds: defaultLimits.burstDurationSeconds,
      });

      return await this.configRepository.save(config);
    } catch (error) {
      logger.error(`Error getting rate limit config: ${error}`);
      // Return a safe default if there's an error
      return this.createDefaultConfig(merchantId, userRole);
    }
  }

  private determineMerchantType(merchant: MerchantEntity | null): string {
    if (!merchant) {
      return "standard";
    }

    if (merchant.business_name && merchant.business_name.toLowerCase().includes("enterprise")) {
      return "enterprise";
    }
    
    if (merchant.business_name && merchant.business_name.toLowerCase().includes("premium")) {
      return "premium";
    }

    return "standard";
  }

  private getDefaultLimits(userRole: string, merchantType: string): RateLimitTier {
    // First check user role limits
    if (userRole && DEFAULT_USER_ROLE_LIMITS[userRole]) {
      return DEFAULT_USER_ROLE_LIMITS[userRole];
    }
    
    // Then check merchant type limits
    if (merchantType && DEFAULT_MERCHANT_TYPE_LIMITS[merchantType]) {
      return DEFAULT_MERCHANT_TYPE_LIMITS[merchantType];
    }
    
    // Fallback to basic tier
    return DEFAULT_USER_ROLE_LIMITS[UserRole.USER];
  }

  private createDefaultConfig(merchantId: string, userRole?: string): RateLimitConfig {
    const defaultLimits = this.getDefaultLimits(userRole || UserRole.USER, "standard");
    
    const config = new RateLimitConfig();
    config.merchantId = merchantId;
    config.userRole = userRole;
    config.merchantType = "standard";
    config.requestsPerSecond = defaultLimits.limits.requestsPerSecond;
    config.requestsPerMinute = defaultLimits.limits.requestsPerMinute;
    config.requestsPerHour = defaultLimits.limits.requestsPerHour;
    config.requestsPerDay = defaultLimits.limits.requestsPerDay;
    config.burstMultiplier = defaultLimits.burstMultiplier;
    config.burstDurationSeconds = defaultLimits.burstDurationSeconds;
    config.isActive = true;
    
    return config;
  }

  async updateConfig(configId: string, updates: Partial<RateLimitConfig>): Promise<RateLimitConfig> {
    const config = await this.configRepository.findOne({
      where: { id: configId },
    });

    if (!config) {
      throw new Error("Rate limit configuration not found");
    }

    Object.assign(config, updates);
    return await this.configRepository.save(config);
  }

  async getAllConfigsForMerchant(merchantId: string): Promise<RateLimitConfig[]> {
    return await this.configRepository.find({
      where: { merchantId, isActive: true },
      order: { createdAt: "DESC" },
    });
  }

  async createConfig(configData: Partial<RateLimitConfig>): Promise<RateLimitConfig> {
    // Validate required fields
    if (!configData.merchantId) {
      throw new Error("Merchant ID is required");
    }

    if (!configData.requestsPerSecond || !configData.requestsPerMinute || 
        !configData.requestsPerHour || !configData.requestsPerDay) {
      throw new Error("All rate limit values are required");
    }

    const config = this.configRepository.create({
      ...configData,
      burstMultiplier: configData.burstMultiplier || 2.0,
      burstDurationSeconds: configData.burstDurationSeconds || 30,
      isActive: configData.isActive !== undefined ? configData.isActive : true,
    });

    return await this.configRepository.save(config);
  }

  async deleteConfig(configId: string): Promise<void> {
    const config = await this.configRepository.findOne({
      where: { id: configId },
    });

    if (!config) {
      throw new Error("Rate limit configuration not found");
    }

    config.isActive = false;
    await this.configRepository.save(config);
  }

  async getConfigById(configId: string): Promise<RateLimitConfig | null> {
    return await this.configRepository.findOne({
      where: { id: configId, isActive: true },
    });
  }

  async getConfigsByUserRole(merchantId: string, userRole: string): Promise<RateLimitConfig[]> {
    return await this.configRepository.find({
      where: { 
        merchantId, 
        userRole, 
        isActive: true 
      },
      order: { createdAt: "DESC" },
    });
  }

  async getConfigsByMerchantType(merchantType: string): Promise<RateLimitConfig[]> {
    return await this.configRepository.find({
      where: { 
        merchantType, 
        isActive: true 
      },
      order: { createdAt: "DESC" },
    });
  }

  // Method to initialize default configs for a new merchant
  async initializeDefaultConfigsForMerchant(merchantId: string): Promise<void> {
    try {
      const merchant = await this.merchantRepository.findOne({
        where: { id: merchantId },
      });

      if (!merchant) {
        throw new Error("Merchant not found");
      }

      const merchantType = this.determineMerchantType(merchant);

      // Create configs for each user role
      const userRoles = Object.values(UserRole);
      
      for (const role of userRoles) {
        // Check if config already exists
        const existingConfig = await this.configRepository.findOne({
          where: {
            merchantId,
            userRole: role,
            isActive: true,
          },
        });

        if (!existingConfig) {
          const defaultLimits = this.getDefaultLimits(role, merchantType);
          
          await this.createConfig({
            merchantId,
            userRole: role,
            merchantType,
            requestsPerSecond: defaultLimits.limits.requestsPerSecond,
            requestsPerMinute: defaultLimits.limits.requestsPerMinute,
            requestsPerHour: defaultLimits.limits.requestsPerHour,
            requestsPerDay: defaultLimits.limits.requestsPerDay,
            burstMultiplier: defaultLimits.burstMultiplier,
            burstDurationSeconds: defaultLimits.burstDurationSeconds,
          });

          logger.info(`Created default rate limit config for merchant ${merchantId}, role ${role}`);
        }
      }
    } catch (error) {
      logger.error(`Error initializing default configs for merchant ${merchantId}: ${error}`);
      throw error;
    }
  }

  // Method to bulk update configs
  async bulkUpdateConfigs(
    merchantId: string, 
    updates: Array<{ configId: string; updates: Partial<RateLimitConfig> }>
  ): Promise<RateLimitConfig[]> {
    const updatedConfigs: RateLimitConfig[] = [];

    for (const update of updates) {
      try {
        const config = await this.updateConfig(update.configId, update.updates);
        updatedConfigs.push(config);
      } catch (error) {
        logger.error(`Error updating config ${update.configId}: ${error}`);
        // Continue with other updates even if one fails
      }
    }

    return updatedConfigs;
  }

  // Method to get effective limits for a user (considering inheritance)
  async getEffectiveLimits(userId: string, merchantId: string, userRole: string): Promise<{
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    burstMultiplier: number;
    burstDurationSeconds: number;
    source: string; // "user-specific" | "role-default" | "merchant-default" | "system-default"
  }> {
    try {
      // Try user-specific config first
      let config = await this.configRepository.findOne({
        where: {
          merchantId,
          userRole,
          isActive: true,
        },
      });

      if (config) {
        return {
          requestsPerSecond: config.requestsPerSecond,
          requestsPerMinute: config.requestsPerMinute,
          requestsPerHour: config.requestsPerHour,
          requestsPerDay: config.requestsPerDay,
          burstMultiplier: config.burstMultiplier,
          burstDurationSeconds: config.burstDurationSeconds,
          source: "user-specific",
        };
      }

      // Try merchant-type default
      const merchant = await this.merchantRepository.findOne({
        where: { id: merchantId },
      });

      const merchantType = this.determineMerchantType(merchant);
      
      config = await this.configRepository.findOne({
        where: {
          merchantId,
          merchantType,
          isActive: true,
        },
      });

      if (config) {
        return {
          requestsPerSecond: config.requestsPerSecond,
          requestsPerMinute: config.requestsPerMinute,
          requestsPerHour: config.requestsPerHour,
          requestsPerDay: config.requestsPerDay,
          burstMultiplier: config.burstMultiplier,
          burstDurationSeconds: config.burstDurationSeconds,
          source: "merchant-default",
        };
      }

      // Fall back to system defaults
      const defaultLimits = this.getDefaultLimits(userRole, merchantType);
      
      return {
        requestsPerSecond: defaultLimits.limits.requestsPerSecond,
        requestsPerMinute: defaultLimits.limits.requestsPerMinute,
        requestsPerHour: defaultLimits.limits.requestsPerHour,
        requestsPerDay: defaultLimits.limits.requestsPerDay,
        burstMultiplier: defaultLimits.burstMultiplier,
        burstDurationSeconds: defaultLimits.burstDurationSeconds,
        source: "system-default",
      };
    } catch (error) {
      logger.error(`Error getting effective limits: ${error}`);
      
      // Return safe defaults
      const safeLimits = this.getDefaultLimits(UserRole.USER, "standard");
      return {
        requestsPerSecond: safeLimits.limits.requestsPerSecond,
        requestsPerMinute: safeLimits.limits.requestsPerMinute,
        requestsPerHour: safeLimits.limits.requestsPerHour,
        requestsPerDay: safeLimits.limits.requestsPerDay,
        burstMultiplier: safeLimits.burstMultiplier,
        burstDurationSeconds: safeLimits.burstDurationSeconds,
        source: "system-default",
      };
    }
  }
}

export default new RateLimitConfigService();