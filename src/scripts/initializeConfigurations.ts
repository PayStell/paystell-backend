import "reflect-metadata";
import dotenv from "dotenv";
import { configurationService } from "../services/ConfigurationService";
import {
  ConfigurationCategory,
  ConfigurationType,
  Environment,
} from "../entities/Configuration";
import { FeatureFlagScope } from "../entities/FeatureFlag";
import AppDataSource from "../config/db";
import logger from "../utils/logger";

dotenv.config();

const defaultConfigurations = [
  // Database configurations
  {
    key: "POSTGRES_HOST",
    value: "localhost",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.DATABASE,
    description: "PostgreSQL database host",
    isRequired: true,
  },
  {
    key: "POSTGRES_PORT",
    value: "5432",
    type: ConfigurationType.NUMBER,
    category: ConfigurationCategory.DATABASE,
    description: "PostgreSQL database port",
    isRequired: true,
  },
  {
    key: "POSTGRES_USER",
    value: "postgres",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.DATABASE,
    description: "PostgreSQL database user",
    isRequired: true,
  },
  {
    key: "POSTGRES_PASSWORD",
    value: process.env.POSTGRES_PASSWORD || "",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.DATABASE,
    description: "PostgreSQL database password",
    isRequired: true,
    isEncrypted: true,
  },
  {
    key: "POSTGRES_DATABASE",
    value: "paystell",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.DATABASE,
    description: "PostgreSQL database name",
    isRequired: true,
  },

  // Authentication configurations
  {
    key: "JWT_SECRET",
    value:
      process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-in-production",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.AUTHENTICATION,
    description: "JWT secret key for token signing",
    isRequired: true,
    isEncrypted: true,
  },
  {
    key: "JWT_EXPIRES_IN",
    value: "24h",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.AUTHENTICATION,
    description: "JWT token expiration time",
    isRequired: true,
    allowedValues: ["15m", "1h", "24h", "7d"],
  },
  {
    key: "AUTH0_CLIENT_ID",
    value: "",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.AUTHENTICATION,
    description: "Auth0 client ID",
    isRequired: false,
  },
  {
    key: "AUTH0_CLIENT_SECRET",
    value: process.env.AUTH0_CLIENT_SECRET || "",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.AUTHENTICATION,
    description: "Auth0 client secret",
    isRequired: false,
    isEncrypted: true,
  },
  {
    key: "AUTH0_DOMAIN",
    value: "",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.AUTHENTICATION,
    description: "Auth0 domain",
    isRequired: false,
  },

  // Stellar configurations
  {
    key: "STELLAR_HORIZON_URL",
    value: "https://horizon-testnet.stellar.org",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.STELLAR,
    description: "Stellar Horizon server URL",
    isRequired: true,
    allowedValues: [
      "https://horizon-testnet.stellar.org",
      "https://horizon.stellar.org",
      "https://horizon-futurenet.stellar.org",
    ],
  },
  {
    key: "STELLAR_NETWORK_PASSPHRASE",
    value: "Test SDF Network ; September 2015",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.STELLAR,
    description: "Stellar network passphrase",
    isRequired: true,
    allowedValues: [
      "Test SDF Network ; September 2015",
      "Public Global Stellar Network ; September 2015",
      "Test SDF Future Network ; October 2022",
    ],
  },
  {
    key: "STELLAR_SECRET_KEY",
    value: "",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.STELLAR,
    description: "Stellar secret key for operations",
    isRequired: false,
    isEncrypted: true,
  },
  {
    key: "SOROBAN_CONTRACT_ID",
    value: "",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.STELLAR,
    description: "Soroban contract ID for payments",
    isRequired: false,
  },

  // Redis configurations
  {
    key: "REDIS_HOST",
    value: "localhost",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.REDIS,
    description: "Redis server host",
    isRequired: true,
  },
  {
    key: "REDIS_PORT",
    value: "6379",
    type: ConfigurationType.NUMBER,
    category: ConfigurationCategory.REDIS,
    description: "Redis server port",
    isRequired: true,
  },
  {
    key: "REDIS_PASSWORD",
    value: process.env.REDIS_PASSWORD || "",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.REDIS,
    description: "Redis server password",
    isRequired: false,
    isEncrypted: true,
  },

  // Email configurations
  {
    key: "SMTP_HOST",
    value: "smtp.gmail.com",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.EMAIL,
    description: "SMTP server host",
    isRequired: true,
  },
  {
    key: "SMTP_PORT",
    value: "587",
    type: ConfigurationType.NUMBER,
    category: ConfigurationCategory.EMAIL,
    description: "SMTP server port",
    isRequired: true,
  },
  {
    key: "SMTP_USER",
    value: "",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.EMAIL,
    description: "SMTP username",
    isRequired: true,
  },
  {
    key: "SMTP_PASSWORD",
    value: process.env.SMTP_PASSWORD || "",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.EMAIL,
    description: "SMTP password",
    isRequired: true,
    isEncrypted: true,
  },
  {
    key: "FROM_EMAIL",
    value: "noreply@paystell.com",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.EMAIL,
    description: "Default sender email address",
    isRequired: true,
  },

  // Payment configurations
  {
    key: "PAYMENT_MIN_AMOUNT",
    value: "0.01",
    type: ConfigurationType.NUMBER,
    category: ConfigurationCategory.PAYMENT,
    description: "Minimum payment amount",
    isRequired: true,
  },
  {
    key: "PAYMENT_MAX_AMOUNT",
    value: "10000",
    type: ConfigurationType.NUMBER,
    category: ConfigurationCategory.PAYMENT,
    description: "Maximum payment amount",
    isRequired: true,
  },
  {
    key: "PAYMENT_CURRENCIES",
    value: '["XLM", "USD", "EUR"]',
    type: ConfigurationType.JSON,
    category: ConfigurationCategory.PAYMENT,
    description: "Supported payment currencies",
    isRequired: true,
  },
  {
    key: "PAYMENT_TIMEOUT_MINUTES",
    value: "30",
    type: ConfigurationType.NUMBER,
    category: ConfigurationCategory.PAYMENT,
    description: "Payment timeout in minutes",
    isRequired: true,
  },

  // Security configurations
  {
    key: "RATE_LIMIT_WINDOW_MS",
    value: "900000",
    type: ConfigurationType.NUMBER,
    category: ConfigurationCategory.SECURITY,
    description: "Rate limiting window in milliseconds",
    isRequired: true,
  },
  {
    key: "RATE_LIMIT_MAX_REQUESTS",
    value: "100",
    type: ConfigurationType.NUMBER,
    category: ConfigurationCategory.SECURITY,
    description: "Maximum requests per window",
    isRequired: true,
  },
  {
    key: "SESSION_SECRET",
    value:
      process.env.SESSION_SECRET ||
      "a-long-randomly-generated-string-change-in-production",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.SECURITY,
    description: "Session secret for cookie signing",
    isRequired: true,
    isEncrypted: true,
  },
  {
    key: "CONFIG_ENCRYPTION_KEY",
    value:
      process.env.CONFIG_ENCRYPTION_KEY ||
      "your-config-encryption-key-change-in-production",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.SECURITY,
    description: "Encryption key for sensitive configurations",
    isRequired: true,
    isEncrypted: true,
  },

  // Monitoring configurations
  {
    key: "NEW_RELIC_LICENSE_KEY",
    value: "",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.MONITORING,
    description: "New Relic license key",
    isRequired: false,
    isEncrypted: true,
  },
  {
    key: "LOG_LEVEL",
    value: "info",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.MONITORING,
    description: "Application log level",
    isRequired: true,
    allowedValues: ["error", "warn", "info", "debug"],
  },

  // General configurations
  {
    key: "APP_NAME",
    value: "PayStell",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.GENERAL,
    description: "Application name",
    isRequired: true,
  },
  {
    key: "APP_VERSION",
    value: "1.0.0",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.GENERAL,
    description: "Application version",
    isRequired: true,
  },
  {
    key: "BASE_URL",
    value: "http://localhost:4000",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.GENERAL,
    description: "Application base URL",
    isRequired: true,
  },
  {
    key: "NODE_ENV",
    value: "development",
    type: ConfigurationType.STRING,
    category: ConfigurationCategory.GENERAL,
    description: "Node.js environment",
    isRequired: true,
    allowedValues: ["development", "staging", "production", "test"],
  },
];

const defaultFeatureFlags = [
  {
    name: "advanced_fraud_detection",
    description: "Enable advanced fraud detection features",
    isEnabled: false,
    scope: FeatureFlagScope.GLOBAL,
  },
  {
    name: "real_time_notifications",
    description: "Enable real-time payment notifications",
    isEnabled: true,
    scope: FeatureFlagScope.GLOBAL,
  },
  {
    name: "multi_currency_support",
    description: "Enable support for multiple currencies",
    isEnabled: true,
    scope: FeatureFlagScope.GLOBAL,
  },
  {
    name: "advanced_analytics",
    description: "Enable advanced analytics dashboard",
    isEnabled: false,
    scope: FeatureFlagScope.USER,
  },
  {
    name: "beta_features",
    description: "Enable beta features for testing",
    isEnabled: false,
    scope: FeatureFlagScope.USER,
    targetingRules: {
      percentage: 10, // 10% rollout
    },
  },
];

async function initializeConfigurations() {
  try {
    logger.info("Starting configuration initialization...");

    // Initialize database connection
    await AppDataSource.initialize();
    logger.info("Database connected successfully");

    // Initialize configuration service
    await configurationService.initialize();
    logger.info("Configuration service initialized");

    const environments = [
      Environment.DEVELOPMENT,
      Environment.STAGING,
      Environment.PRODUCTION,
    ];

    for (const environment of environments) {
      logger.info(
        `Initializing configurations for environment: ${environment}`,
      );

      // Set environment-specific configurations
      for (const config of defaultConfigurations) {
        let value = config.value;

        // Override values for different environments
        if (environment === Environment.PRODUCTION) {
          if (config.key === "STELLAR_HORIZON_URL") {
            value = "https://horizon.stellar.org";
          }
          if (config.key === "STELLAR_NETWORK_PASSPHRASE") {
            value = "Public Global Stellar Network ; September 2015";
          }
          if (config.key === "NODE_ENV") {
            value = "production";
          }
          if (config.key === "BASE_URL") {
            value = "https://api.paystell.com";
          }
        } else if (environment === Environment.STAGING) {
          if (config.key === "BASE_URL") {
            value = "https://staging-api.paystell.com";
          }
          if (config.key === "NODE_ENV") {
            value = "staging";
          }
        }

        await configurationService.setConfig(config.key, value, {
          type: config.type,
          category: config.category,
          description: config.description,
          isEncrypted: config.isEncrypted || false,
          isRequired: config.isRequired || false,
          allowedValues: config.allowedValues,
          updatedBy: "system",
        });
      }

      // Initialize feature flags
      for (const flag of defaultFeatureFlags) {
        await configurationService.setFeatureFlag(
          flag.name,
          flag.description,
          flag.isEnabled,
          {
            scope: flag.scope,
            targetingRules: flag.targetingRules,
            updatedBy: "system",
          },
        );
      }

      logger.info(
        `Configuration initialization completed for environment: ${environment}`,
      );
    }

    logger.info("Configuration initialization completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Configuration initialization failed:", error);
    process.exit(1);
  }
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  initializeConfigurations();
}

export { initializeConfigurations };
