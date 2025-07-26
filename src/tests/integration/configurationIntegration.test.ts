import request from "supertest";
import app from "../../app";
import AppDataSource from "../../config/db";
import { configurationService } from "../../services/ConfigurationService";
import { Configuration, ConfigurationType, ConfigurationCategory } from "../../entities/Configuration";
import { FeatureFlag, FeatureFlagScope } from "../../entities/FeatureFlag";

describe("Configuration System Integration Tests", () => {
  let authToken: string;

  beforeAll(async () => {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Initialize configuration service
    await configurationService.initialize();

    // Create a test user and generate a proper auth token
    // In a real implementation, this would use the actual auth system
    authToken = "test-auth-token"; // TODO: Replace with proper JWT token generation
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    // Clear test data
    const configRepo = AppDataSource.getRepository(Configuration);
    const flagRepo = AppDataSource.getRepository(FeatureFlag);
    
    await configRepo.delete({});
    await flagRepo.delete({});
  });

  describe("Configuration API Endpoints", () => {
    it("should create and retrieve a configuration", async () => {
      // Create configuration
      const createResponse = await request(app)
        .post("/api/config")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          key: "TEST_CONFIG",
          value: "test_value",
          type: "string",
          category: "general",
          description: "Test configuration",
          isRequired: false,
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);

      // Retrieve configuration
      const getResponse = await request(app)
        .get("/api/config/TEST_CONFIG")
        .set("Authorization", `Bearer ${authToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.value).toBe("test_value");
    });

    it("should handle encrypted configurations", async () => {
      // Create encrypted configuration
      const createResponse = await request(app)
        .post("/api/config")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          key: "ENCRYPTED_CONFIG",
          value: "secret_value",
          type: "string",
          category: "security",
          description: "Encrypted configuration",
          isEncrypted: true,
          isRequired: false,
        });

      expect(createResponse.status).toBe(201);

      // Retrieve configuration (should show as encrypted)
      const getResponse = await request(app)
        .get("/api/config")
        .set("Authorization", `Bearer ${authToken}`);

      expect(getResponse.status).toBe(200);
      const encryptedConfig = getResponse.body.data.find(
        (config: any) => config.key === "ENCRYPTED_CONFIG"
      );
      expect(encryptedConfig.value).toBe("[ENCRYPTED]");
    });

    it("should get configurations by category", async () => {
      // Create configurations in different categories
      await request(app)
        .post("/api/config")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          key: "PAYMENT_CONFIG",
          value: "100",
          type: "number",
          category: "payment",
          description: "Payment configuration",
        });

      await request(app)
        .post("/api/config")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          key: "SECURITY_CONFIG",
          value: "true",
          type: "boolean",
          category: "security",
          description: "Security configuration",
        });

      // Get configurations by category
      const response = await request(app)
        .get("/api/config/category/payment")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].key).toBe("PAYMENT_CONFIG");
    });

    it("should delete configuration", async () => {
      // Create configuration
      await request(app)
        .post("/api/config")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          key: "TO_DELETE",
          value: "delete_me",
          type: "string",
          category: "general",
        });

      // Delete configuration
      const deleteResponse = await request(app)
        .delete("/api/config/TO_DELETE")
        .set("Authorization", `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify it's deleted
      const getResponse = await request(app)
        .get("/api/config/TO_DELETE")
        .set("Authorization", `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe("Feature Flag API Endpoints", () => {
    it("should create and evaluate feature flag", async () => {
      // Create feature flag
      const createResponse = await request(app)
        .post("/api/config/feature-flags")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "test_feature",
          description: "Test feature flag",
          isEnabled: true,
          scope: "global",
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);

      // Evaluate feature flag
      const evaluateResponse = await request(app)
        .get("/api/config/feature-flags/test_feature/evaluate")
        .set("Authorization", `Bearer ${authToken}`);

      expect(evaluateResponse.status).toBe(200);
      expect(evaluateResponse.body.data.isEnabled).toBe(true);
    });

    it("should handle targeted feature flags", async () => {
      // Create targeted feature flag
      await request(app)
        .post("/api/config/feature-flags")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "targeted_feature",
          description: "Targeted feature flag",
          isEnabled: true,
          scope: "user",
          targetingRules: {
            userIds: ["user1", "user2"],
          },
        });

      // Evaluate with matching user
      const matchResponse = await request(app)
        .get("/api/config/feature-flags/targeted_feature/evaluate?userId=user1")
        .set("Authorization", `Bearer ${authToken}`);

      expect(matchResponse.status).toBe(200);
      expect(matchResponse.body.data.isEnabled).toBe(true);

      // Evaluate with non-matching user
      const noMatchResponse = await request(app)
        .get("/api/config/feature-flags/targeted_feature/evaluate?userId=user3")
        .set("Authorization", `Bearer ${authToken}`);

      expect(noMatchResponse.status).toBe(200);
      expect(noMatchResponse.body.data.isEnabled).toBe(false);
    });
  });

  describe("Configuration Service Integration", () => {
    it("should get configuration value from service", async () => {
      // Create configuration via API
      await request(app)
        .post("/api/config")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          key: "SERVICE_TEST",
          value: "service_value",
          type: "string",
          category: "general",
        });

      // Get value via service
      const value = await configurationService.getConfig("SERVICE_TEST");
      expect(value).toBe("service_value");
    });

    it("should evaluate feature flag via service", async () => {
      // Create feature flag via API
      await request(app)
        .post("/api/config/feature-flags")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "service_test_flag",
          description: "Service test flag",
          isEnabled: true,
          scope: "global",
        });

      // Evaluate via service
      const evaluation = await configurationService.evaluateFeatureFlag("service_test_flag");
      expect(evaluation.isEnabled).toBe(true);
    });

    it("should handle different data types", async () => {
      // Create different types of configurations
      const testCases = [
        { key: "STRING_CONFIG", value: "string_value", type: "string", expected: "string_value" },
        { key: "NUMBER_CONFIG", value: "123", type: "number", expected: 123 },
        { key: "BOOLEAN_CONFIG", value: "true", type: "boolean", expected: true },
        { key: "JSON_CONFIG", value: '{"key":"value"}', type: "json", expected: { key: "value" } },
      ];

      for (const testCase of testCases) {
        await request(app)
          .post("/api/config")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            key: testCase.key,
            value: testCase.value,
            type: testCase.type,
            category: "general",
          });

        const value = await configurationService.getConfig(testCase.key);
        expect(value).toEqual(testCase.expected);
      }
    });
  });

  describe("Configuration Validation", () => {
    it("should validate required configurations", async () => {
      // Create a required configuration with empty value
      await request(app)
        .post("/api/config")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          key: "REQUIRED_CONFIG",
          value: "",
          type: "string",
          category: "general",
          isRequired: true,
        });

      // Validate configurations
      const validateResponse = await request(app)
        .get("/api/config/validate")
        .set("Authorization", `Bearer ${authToken}`);

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.body.data.isValid).toBe(false);
      expect(validateResponse.body.data.errors).toContain(
        "Required configuration missing or empty: REQUIRED_CONFIG"
      );
    });
  });

  describe("Configuration Statistics", () => {
    it("should return configuration statistics", async () => {
      // Create some test configurations
      await request(app)
        .post("/api/config")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          key: "STATS_CONFIG_1",
          value: "value1",
          type: "string",
          category: "general",
        });

      await request(app)
        .post("/api/config")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          key: "STATS_CONFIG_2",
          value: "secret",
          type: "string",
          category: "security",
          isEncrypted: true,
        });

      // Create feature flag
      await request(app)
        .post("/api/config/feature-flags")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "stats_test_flag",
          description: "Stats test flag",
          isEnabled: true,
          scope: "global",
        });

      // Get statistics
      const statsResponse = await request(app)
        .get("/api/config/stats")
        .set("Authorization", `Bearer ${authToken}`);

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.data.totalConfigurations).toBe(2);
      expect(statsResponse.body.data.encryptedConfigurations).toBe(1);
      expect(statsResponse.body.data.totalFeatureFlags).toBe(1);
      expect(statsResponse.body.data.activeFeatureFlags).toBe(1);
    });

    it("should update existing configuration", async () => {
      // Create initial configuration
      await request(app)
        .post("/api/config")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          key: "UPDATE_TEST",
          value: "initial_value",
          type: "string",
          category: "general",
        });

      // Update configuration
      const updateResponse = await request(app)
        .post("/api/config")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          key: "UPDATE_TEST",
          value: "updated_value",
          type: "string",
          category: "general",
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.value).toBe("updated_value");
    });

    it("should return 403 for unauthorized access", async () => {
      const response = await request(app)
        .get("/api/config")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(403);
    });

    it("should validate configuration types", async () => {
      const response = await request(app)
        .post("/api/config")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          key: "TYPE_TEST",
          value: "not-a-number",
          type: "number",
          category: "general",
        });

      expect(response.status).toBe(400);
    });

    it("should handle percentage-based rollouts", async () => {
      await request(app)
        .post("/api/config/feature-flags")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "percentage_feature",
          description: "Percentage rollout feature",
          isEnabled: true,
          scope: "user",
          targetingRules: {
            percentage: 50,
          },
        });

      // Test multiple evaluations to verify percentage distribution
      const results = [];
      for (let i = 0; i < 100; i++) {
        const response = await request(app)
          .get(`/api/config/feature-flags/percentage_feature/evaluate?userId=user${i}`)
          .set("Authorization", `Bearer ${authToken}`);
        results.push(response.body.data.isEnabled);
      }

      const enabledCount = results.filter(r => r).length;
      expect(enabledCount).toBeGreaterThan(30);
      expect(enabledCount).toBeLessThan(70);
    });

    it("should handle role-based targeting", async () => {
      await request(app)
        .post("/api/config/feature-flags")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "role_feature",
          description: "Role-based feature",
          isEnabled: true,
          scope: "user",
          targetingRules: {
            userRoles: ["admin", "super_admin"],
          },
        });

      const adminResponse = await request(app)
        .get("/api/config/feature-flags/role_feature/evaluate?userRole=admin")
        .set("Authorization", `Bearer ${authToken}`);
      expect(adminResponse.body.data.isEnabled).toBe(true);

      const userResponse = await request(app)
        .get("/api/config/feature-flags/role_feature/evaluate?userRole=user")
        .set("Authorization", `Bearer ${authToken}`);
      expect(userResponse.body.data.isEnabled).toBe(false);
    });
  });
}); 