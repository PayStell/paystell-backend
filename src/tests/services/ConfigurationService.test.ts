import { ConfigurationService } from "../../services/ConfigurationService";
import { Configuration, ConfigurationType, ConfigurationCategory, Environment } from "../../entities/Configuration";
import { FeatureFlag, FeatureFlagScope, FeatureFlagStatus } from "../../entities/FeatureFlag";
import AppDataSource from "../../config/db";
import { AuditService } from "../../services/AuditService";

// Mock the AuditService
jest.mock("../../services/AuditService");
const mockAuditService = {
  createAuditLog: jest.fn().mockResolvedValue({}),
};

(AuditService as jest.MockedClass<typeof AuditService>).mockImplementation(() => mockAuditService as any);

describe("ConfigurationService", () => {
  let configurationService: ConfigurationService;
  let mockConfigRepository: any;
  let mockFeatureFlagRepository: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock repositories
    mockConfigRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    mockFeatureFlagRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    // Mock AppDataSource
    jest.spyOn(AppDataSource, "getRepository").mockImplementation((entity) => {
      if (entity === Configuration) {
        return mockConfigRepository;
      }
      if (entity === FeatureFlag) {
        return mockFeatureFlagRepository;
      }
      return {} as any;
    });

    configurationService = new ConfigurationService();
  });

  describe("getConfig", () => {
    it("should return cached configuration value", async () => {
      const mockConfig = {
        key: "TEST_CONFIG",
        value: "test_value",
        type: ConfigurationType.STRING,
        category: ConfigurationCategory.GENERAL,
        isEncrypted: false,
        isRequired: false,
      };

      mockConfigRepository.findOne.mockResolvedValue(mockConfig);

      // First call should hit database
      const result1 = await configurationService.getConfig("TEST_CONFIG");
      expect(result1).toBe("test_value");

      // Second call should use cache
      const result2 = await configurationService.getConfig("TEST_CONFIG");
      expect(result2).toBe("test_value");

      // Should only call database once
      expect(mockConfigRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it("should return default value when configuration not found", async () => {
      mockConfigRepository.findOne.mockResolvedValue(null);

      const result = await configurationService.getConfig("NON_EXISTENT", "default_value");
      expect(result).toBe("default_value");
    });

    it("should decrypt encrypted values", async () => {
      const mockConfig = {
        key: "ENCRYPTED_CONFIG",
        value: "encrypted_value",
        type: ConfigurationType.STRING,
        category: ConfigurationCategory.SECURITY,
        isEncrypted: true,
        isRequired: false,
      };

      mockConfigRepository.findOne.mockResolvedValue(mockConfig);
      
      // Mock the decryption method
      jest.spyOn(configurationService as any, 'decryptValue').mockReturnValue('decrypted_value');

      const result = await configurationService.getConfig("ENCRYPTED_CONFIG");
      expect(result).toBe("decrypted_value");
    });

    it("should parse different data types correctly", async () => {
      const testCases = [
        { type: ConfigurationType.NUMBER, value: "123", expected: 123 },
        { type: ConfigurationType.BOOLEAN, value: "true", expected: true },
        { type: ConfigurationType.JSON, value: '{"key":"value"}', expected: { key: "value" } },
        { type: ConfigurationType.STRING, value: "test", expected: "test" },
      ];

      for (const testCase of testCases) {
        const mockConfig = {
          key: `TEST_${testCase.type}`,
          value: testCase.value,
          type: testCase.type,
          category: ConfigurationCategory.GENERAL,
          isEncrypted: false,
          isRequired: false,
        };

        mockConfigRepository.findOne.mockResolvedValue(mockConfig);

        const result = await configurationService.getConfig(`TEST_${testCase.type}`);
        expect(result).toEqual(testCase.expected);
      }
    });
  });

  describe("setConfig", () => {
    it("should create new configuration", async () => {
      const mockCreatedConfig = {
        id: "config-id",
        key: "NEW_CONFIG",
        value: "new_value",
        type: ConfigurationType.STRING,
        category: ConfigurationCategory.GENERAL,
        isEncrypted: false,
        isRequired: false,
      };

      mockConfigRepository.findOne.mockResolvedValue(null);
      mockConfigRepository.create.mockReturnValue(mockCreatedConfig);
      mockConfigRepository.save.mockResolvedValue(mockCreatedConfig);

      const result = await configurationService.setConfig("NEW_CONFIG", "new_value", {
        type: ConfigurationType.STRING,
        category: ConfigurationCategory.GENERAL,
        description: "Test configuration",
        updatedBy: "test-user",
      });

      expect(result).toEqual(mockCreatedConfig);
      expect(mockConfigRepository.create).toHaveBeenCalledWith({
        key: "NEW_CONFIG",
        value: "new_value",
        environment: Environment.DEVELOPMENT,
        type: ConfigurationType.STRING,
        category: ConfigurationCategory.GENERAL,
        description: "Test configuration",
        isEncrypted: false,
        isRequired: false,
        updatedBy: "test-user",
      });
    });

    it("should update existing configuration", async () => {
      const existingConfig = {
        id: "config-id",
        key: "EXISTING_CONFIG",
        value: "old_value",
        type: ConfigurationType.STRING,
        category: ConfigurationCategory.GENERAL,
        isEncrypted: false,
        isRequired: false,
      };

      const updatedConfig = { ...existingConfig, value: "new_value" };

      mockConfigRepository.findOne.mockResolvedValue(existingConfig);
      mockConfigRepository.save.mockResolvedValue(updatedConfig);

      const result = await configurationService.setConfig("EXISTING_CONFIG", "new_value", {
        updatedBy: "test-user",
      });

      expect(result).toEqual(updatedConfig);
      expect(mockConfigRepository.save).toHaveBeenCalledWith({
        ...existingConfig,
        value: "new_value",
        updatedBy: "test-user",
      });
    });

    it("should encrypt sensitive values", async () => {
      const mockCreatedConfig = {
        id: "config-id",
        key: "SENSITIVE_CONFIG",
        value: "encrypted_value",
        type: ConfigurationType.STRING,
        category: ConfigurationCategory.SECURITY,
        isEncrypted: true,
        isRequired: false,
      };

      mockConfigRepository.findOne.mockResolvedValue(null);
      mockConfigRepository.create.mockReturnValue(mockCreatedConfig);
      mockConfigRepository.save.mockResolvedValue(mockCreatedConfig);

      await configurationService.setConfig("SENSITIVE_CONFIG", "secret_value", {
        isEncrypted: true,
        updatedBy: "test-user",
      });

      expect(mockConfigRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "SENSITIVE_CONFIG",
          value: expect.stringContaining(":"), // Encrypted format
          isEncrypted: true,
        })
      );
    });

    it("should clear cache when configuration is updated", async () => {
      const mockConfig = {
        id: "config-id",
        key: "CACHE_TEST",
        value: "old_value",
        type: ConfigurationType.STRING,
        category: ConfigurationCategory.GENERAL,
        isEncrypted: false,
        isRequired: false,
      };

      mockConfigRepository.findOne.mockResolvedValue(mockConfig);
      mockConfigRepository.save.mockResolvedValue(mockConfig);

      // First, get the config to populate cache
      await configurationService.getConfig("CACHE_TEST");

      // Then update it
      await configurationService.setConfig("CACHE_TEST", "new_value", {
        updatedBy: "test-user",
      });

      // Cache should be cleared, so next get should hit database
      await configurationService.getConfig("CACHE_TEST");
      expect(mockConfigRepository.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe("deleteConfig", () => {
    it("should delete configuration and clear cache", async () => {
      const mockConfig = {
        id: "config-id",
        key: "TO_DELETE",
        value: "value",
        type: ConfigurationType.STRING,
        category: ConfigurationCategory.GENERAL,
        isEncrypted: false,
        isRequired: false,
      };

      mockConfigRepository.findOne.mockResolvedValue(mockConfig);
      mockConfigRepository.remove.mockResolvedValue(undefined);

      await configurationService.deleteConfig("TO_DELETE", "test-user");

      expect(mockConfigRepository.remove).toHaveBeenCalledWith(mockConfig);
      expect(mockAuditService.createAuditLog).toHaveBeenCalledWith({
        entityType: "Configuration",
        entityId: "config-id",
        action: "DELETE",
        oldValues: mockConfig,
        context: {
          ipAddress: "system",
          userAgent: "ConfigurationService",
          userId: "test-user",
        },
      });
    });

    it("should throw error when configuration not found", async () => {
      mockConfigRepository.findOne.mockResolvedValue(null);

      await expect(configurationService.deleteConfig("NON_EXISTENT")).rejects.toThrow(
        "Configuration not found: NON_EXISTENT"
      );
    });
  });

  describe("evaluateFeatureFlag", () => {
    it("should return false when feature flag not found", async () => {
      mockFeatureFlagRepository.findOne.mockResolvedValue(null);

      const result = await configurationService.evaluateFeatureFlag("NON_EXISTENT");

      expect(result).toEqual({
        isEnabled: false,
        reason: "Feature flag not found or inactive",
      });
    });

    it("should return false when feature flag is disabled", async () => {
      const mockFlag = {
        id: "flag-id",
        name: "test_flag",
        description: "Test flag",
        isEnabled: false,
        environment: Environment.DEVELOPMENT,
        scope: FeatureFlagScope.GLOBAL,
        status: FeatureFlagStatus.ACTIVE,
      };

      mockFeatureFlagRepository.findOne.mockResolvedValue(mockFlag);

      const result = await configurationService.evaluateFeatureFlag("test_flag");

      expect(result).toEqual({
        isEnabled: false,
        reason: "Feature flag is disabled",
        targetingMatch: true,
      });
    });

    it("should return true when feature flag is enabled", async () => {
      const mockFlag = {
        id: "flag-id",
        name: "test_flag",
        description: "Test flag",
        isEnabled: true,
        environment: Environment.DEVELOPMENT,
        scope: FeatureFlagScope.GLOBAL,
        status: FeatureFlagStatus.ACTIVE,
      };

      mockFeatureFlagRepository.findOne.mockResolvedValue(mockFlag);

      const result = await configurationService.evaluateFeatureFlag("test_flag");

      expect(result).toEqual({
        isEnabled: true,
        reason: "Feature flag is enabled",
        targetingMatch: true,
      });
    });

    it("should check targeting rules", async () => {
      const mockFlag = {
        id: "flag-id",
        name: "targeted_flag",
        description: "Test flag",
        isEnabled: true,
        environment: Environment.DEVELOPMENT,
        scope: FeatureFlagScope.USER,
        status: FeatureFlagStatus.ACTIVE,
        targetingRules: {
          userIds: ["user1", "user2"],
        },
      };

      mockFeatureFlagRepository.findOne.mockResolvedValue(mockFlag);

      // Test with matching user
      const result1 = await configurationService.evaluateFeatureFlag("targeted_flag", {
        userId: "user1",
      });
      expect(result1.isEnabled).toBe(true);

      // Test with non-matching user
      const result2 = await configurationService.evaluateFeatureFlag("targeted_flag", {
        userId: "user3",
      });
      expect(result2.isEnabled).toBe(false);
      expect(result2.reason).toBe("User does not match targeting rules");
    });

    it("should handle percentage rollouts", async () => {
      const mockFlag = {
        id: "flag-id",
        name: "percentage_flag",
        description: "Test flag",
        isEnabled: true,
        environment: Environment.DEVELOPMENT,
        scope: FeatureFlagScope.USER,
        status: FeatureFlagStatus.ACTIVE,
        targetingRules: {
          percentage: 50,
        },
      };

      mockFeatureFlagRepository.findOne.mockResolvedValue(mockFlag);

      const result = await configurationService.evaluateFeatureFlag("percentage_flag", {
        userId: "test-user",
      });

      // Result depends on hash, but should have percentageRollout info
      expect(result).toHaveProperty("percentageRollout");
    });
  });

  describe("setFeatureFlag", () => {
    it("should create new feature flag", async () => {
      const mockCreatedFlag = {
        id: "flag-id",
        name: "new_flag",
        description: "New feature flag",
        isEnabled: true,
        environment: Environment.DEVELOPMENT,
        scope: FeatureFlagScope.GLOBAL,
        status: FeatureFlagStatus.ACTIVE,
      };

      mockFeatureFlagRepository.findOne.mockResolvedValue(null);
      mockFeatureFlagRepository.create.mockReturnValue(mockCreatedFlag);
      mockFeatureFlagRepository.save.mockResolvedValue(mockCreatedFlag);

      const result = await configurationService.setFeatureFlag(
        "new_flag",
        "New feature flag",
        true,
        {
          scope: FeatureFlagScope.GLOBAL,
          updatedBy: "test-user",
        }
      );

      expect(result).toEqual(mockCreatedFlag);
      expect(mockFeatureFlagRepository.create).toHaveBeenCalledWith({
        name: "new_flag",
        description: "New feature flag",
        isEnabled: true,
        environment: Environment.DEVELOPMENT,
        scope: FeatureFlagScope.GLOBAL,
        updatedBy: "test-user",
      });
    });

    it("should update existing feature flag", async () => {
      const existingFlag = {
        id: "flag-id",
        name: "existing_flag",
        description: "Old description",
        isEnabled: false,
        environment: Environment.DEVELOPMENT,
        scope: FeatureFlagScope.GLOBAL,
        status: FeatureFlagStatus.ACTIVE,
      };

      const updatedFlag = { ...existingFlag, isEnabled: true, description: "New description" };

      mockFeatureFlagRepository.findOne.mockResolvedValue(existingFlag);
      mockFeatureFlagRepository.save.mockResolvedValue(updatedFlag);

      const result = await configurationService.setFeatureFlag(
        "existing_flag",
        "New description",
        true,
        {
          updatedBy: "test-user",
        }
      );

      expect(result).toEqual(updatedFlag);
    });
  });

  describe("validation", () => {
    it("should validate required configurations", async () => {
      const requiredConfigs = [
        {
          key: "REQUIRED_CONFIG_1",
          value: "value1",
          isRequired: true,
          isActive: true,
        },
        {
          key: "REQUIRED_CONFIG_2",
          value: "",
          isRequired: true,
          isActive: true,
        },
      ];

      mockConfigRepository.find.mockResolvedValue(requiredConfigs);

      // Test the initialize method which calls validateRequiredConfigurations internally
      await expect(configurationService.initialize()).rejects.toThrow();
    });

    it("should check for expired configurations", async () => {
      const expiredConfig = {
        key: "EXPIRED_CONFIG",
        value: "value",
        isRequired: false,
        isActive: true,
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      mockConfigRepository.find.mockResolvedValue([expiredConfig]);

      // Test the initialize method which calls validateRequiredConfigurations internally
      await expect(configurationService.initialize()).rejects.toThrow();
    });
  });

  describe("cache management", () => {
    it("should clear cache", () => {
      configurationService.clearCache();
      // No assertions needed, just ensure no errors
    });

    it("should reload configurations", async () => {
      const mockConfigs = [
        {
          key: "RELOAD_TEST",
          value: "test_value",
          type: ConfigurationType.STRING,
          category: ConfigurationCategory.GENERAL,
          isEncrypted: false,
          isRequired: false,
        },
      ];

      mockConfigRepository.find.mockResolvedValue(mockConfigs);

      await configurationService.reloadConfigurations();

      expect(mockConfigRepository.find).toHaveBeenCalledWith({
        where: {
          environment: Environment.DEVELOPMENT,
          isActive: true,
        },
      });
    });
  });
}); 