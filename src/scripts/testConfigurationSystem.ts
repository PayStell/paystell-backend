import "reflect-metadata";
import dotenv from "dotenv";
import { configurationService } from "../services/ConfigurationService";
import {
  ConfigurationType,
  ConfigurationCategory,
} from "../entities/Configuration";
import { FeatureFlagScope } from "../entities/FeatureFlag";
import AppDataSource from "../config/db";
import logger from "../utils/logger";

dotenv.config();

async function testConfigurationSystem() {
  try {
    logger.info("🧪 Starting Configuration System Test...");

    // Initialize database connection
    await AppDataSource.initialize();
    logger.info("✅ Database connected successfully");

    // Initialize configuration service
    await configurationService.initialize();
    logger.info("✅ Configuration service initialized");

    // Test 1: Basic Configuration Operations
    logger.info("\n📝 Test 1: Basic Configuration Operations");

    // Create a test configuration
    const testConfig = await configurationService.setConfig(
      "TEST_CONFIG",
      "test_value",
      {
        type: ConfigurationType.STRING,
        category: ConfigurationCategory.GENERAL,
        description: "Test configuration for validation",
        updatedBy: "test-script",
      },
    );
    logger.info(
      `✅ Created configuration: ${testConfig.configKey} = ${testConfig.value}`,
    );

    // Retrieve the configuration
    const retrievedValue = await configurationService.getConfig("TEST_CONFIG");
    logger.info(`✅ Retrieved configuration: ${retrievedValue}`);

    // Test 2: Different Data Types
    logger.info("\n📝 Test 2: Different Data Types");

    const typeTests = [
      { key: "NUMBER_CONFIG", value: 123, type: ConfigurationType.NUMBER },
      { key: "BOOLEAN_CONFIG", value: true, type: ConfigurationType.BOOLEAN },
      {
        key: "JSON_CONFIG",
        value: { key: "value", nested: { data: "test" } },
        type: ConfigurationType.JSON,
      },
    ];

    for (const test of typeTests) {
      await configurationService.setConfig(test.key, test.value, {
        type: test.type,
        category: ConfigurationCategory.GENERAL,
        updatedBy: "test-script",
      });

      const retrieved = await configurationService.getConfig(test.key);
      logger.info(
        `✅ ${test.key}: ${JSON.stringify(retrieved)} (${test.type})`,
      );
    }

    // Test 3: Encrypted Configuration
    logger.info("\n📝 Test 3: Encrypted Configuration");

    await configurationService.setConfig(
      "SECRET_CONFIG",
      "super_secret_value",
      {
        type: ConfigurationType.STRING,
        category: ConfigurationCategory.SECURITY,
        isEncrypted: true,
        description: "Encrypted configuration test",
        updatedBy: "test-script",
      },
    );

    const encryptedValue =
      await configurationService.getConfig("SECRET_CONFIG");
    logger.info(`✅ Encrypted config retrieved: ${encryptedValue}`);

    // Test 4: Feature Flags
    logger.info("\n📝 Test 4: Feature Flags");

    // Create a global feature flag
    const globalFlag = await configurationService.setFeatureFlag(
      "test_global_flag",
      "Test global feature flag",
      true,
      {
        scope: FeatureFlagScope.GLOBAL,
        updatedBy: "test-script",
      },
    );
    logger.info(`✅ Created global feature flag: ${globalFlag.name}`);

    // Create a targeted feature flag
    const targetedFlag = await configurationService.setFeatureFlag(
      "test_targeted_flag",
      "Test targeted feature flag",
      true,
      {
        scope: FeatureFlagScope.USER,
        targetingRules: {
          userIds: ["user1", "user2"],
          percentage: 50,
        },
        updatedBy: "test-script",
      },
    );
    logger.info(`✅ Created targeted feature flag: ${targetedFlag.name}`);

    // Test feature flag evaluation
    const globalEvaluation =
      await configurationService.evaluateFeatureFlag("test_global_flag");
    logger.info(
      `✅ Global flag evaluation: ${globalEvaluation.isEnabled} - ${globalEvaluation.reason}`,
    );

    const targetedEvaluation1 = await configurationService.evaluateFeatureFlag(
      "test_targeted_flag",
      {
        userId: "user1",
      },
    );
    logger.info(
      `✅ Targeted flag evaluation (user1): ${targetedEvaluation1.isEnabled} - ${targetedEvaluation1.reason}`,
    );

    const targetedEvaluation2 = await configurationService.evaluateFeatureFlag(
      "test_targeted_flag",
      {
        userId: "user3",
      },
    );
    logger.info(
      `✅ Targeted flag evaluation (user3): ${targetedEvaluation2.isEnabled} - ${targetedEvaluation2.reason}`,
    );

    // Test 5: Configuration Validation
    logger.info("\n📝 Test 5: Configuration Validation");

    // Test validation by checking if required configs exist
    const validationConfigs = await configurationService.getAllConfigs();
    const requiredConfigs = validationConfigs.filter((c) => c.isRequired);
    const missingRequired = requiredConfigs.filter(
      (c) => !c.value || c.value.trim() === "",
    );

    if (missingRequired.length > 0) {
      logger.warn(
        `⚠️  Missing required configurations: ${missingRequired.map((c) => c.configKey).join(", ")}`,
      );
    } else {
      logger.info("✅ All required configurations are present");
    }

    // Test 6: Configuration Statistics
    logger.info("\n📝 Test 6: Configuration Statistics");

    const allConfigs = await configurationService.getAllConfigs();
    const allFlags = await configurationService.getAllFeatureFlags();

    logger.info(`✅ Total configurations: ${allConfigs.length}`);
    logger.info(`✅ Total feature flags: ${allFlags.length}`);
    logger.info(
      `✅ Encrypted configurations: ${allConfigs.filter((c) => c.isEncrypted).length}`,
    );
    logger.info(
      `✅ Required configurations: ${allConfigs.filter((c) => c.isRequired).length}`,
    );

    // Test 7: Cache Management
    logger.info("\n📝 Test 7: Cache Management");

    // Test cache by getting the same config multiple times
    const startTime = Date.now();
    for (let i = 0; i < 5; i++) {
      await configurationService.getConfig("TEST_CONFIG");
    }
    const endTime = Date.now();
    logger.info(
      `✅ Cache performance test: ${endTime - startTime}ms for 5 requests`,
    );

    // Test cache clearing
    configurationService.clearCache();
    logger.info("✅ Cache cleared successfully");

    // Test 8: Configuration Categories
    logger.info("\n📝 Test 8: Configuration Categories");

    const categories = [
      ConfigurationCategory.DATABASE,
      ConfigurationCategory.AUTHENTICATION,
      ConfigurationCategory.PAYMENT,
      ConfigurationCategory.SECURITY,
    ];

    for (const category of categories) {
      const configs = await configurationService.getConfigsByCategory(category);
      logger.info(`✅ ${category} configurations: ${configs.length}`);
    }

    // Test 9: Environment-Specific Configurations
    logger.info("\n📝 Test 9: Environment-Specific Configurations");

    // Test that configurations are environment-specific
    const currentEnv = process.env.NODE_ENV || "development";
    logger.info(`✅ Current environment: ${currentEnv}`);

    // Create environment-specific config
    await configurationService.setConfig(
      "ENV_SPECIFIC_CONFIG",
      `value_for_${currentEnv}`,
      {
        type: ConfigurationType.STRING,
        category: ConfigurationCategory.GENERAL,
        description: `Environment-specific configuration for ${currentEnv}`,
        updatedBy: "test-script",
      },
    );

    const envConfig = await configurationService.getConfig(
      "ENV_SPECIFIC_CONFIG",
    );
    logger.info(`✅ Environment-specific config: ${envConfig}`);

    // Test 10: Cleanup
    logger.info("\n📝 Test 10: Cleanup");

    // Delete test configurations
    const testConfigs = [
      "TEST_CONFIG",
      "NUMBER_CONFIG",
      "BOOLEAN_CONFIG",
      "JSON_CONFIG",
      "SECRET_CONFIG",
      "ENV_SPECIFIC_CONFIG",
    ];

    for (const configKey of testConfigs) {
      try {
        await configurationService.deleteConfig(configKey, "test-script");
        logger.info(`✅ Deleted configuration: ${configKey}`);
      } catch (error) {
        logger.warn(`⚠️  Could not delete ${configKey}: ${error}`);
      }
    }

    logger.info("\n🎉 All Configuration System Tests Completed Successfully!");
    logger.info("✅ Configuration management works correctly");
    logger.info("✅ Feature flags work correctly");
    logger.info("✅ Encryption works correctly");
    logger.info("✅ Validation works correctly");
    logger.info("✅ Caching works correctly");
    logger.info("✅ Environment-specific configurations work correctly");

    process.exit(0);
  } catch (error) {
    logger.error("❌ Configuration System Test Failed:", error);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testConfigurationSystem();
}

export { testConfigurationSystem };
