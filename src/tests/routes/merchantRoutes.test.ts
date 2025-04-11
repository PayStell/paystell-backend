import request from "supertest";
import app from "../../app";
import { MerchantAuthService } from "../../services/merchant.service";
import path from "path";
import AppDataSource from "../../config/db";
import { MerchantEntity } from "../../entities/Merchant.entity";

describe("Merchant Routes", () => {
  let xAPIKey: string;
  const mockMerchant: Partial<MerchantEntity> = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    apiKey: "valid_api_key",
    secret: "secret",
    name: "Test Merchant",
    email: "merchant@test.com",
    isActive: true,
    webhooks: [],
    business_name: "Test Business",
    business_email: "test@business.com",
    business_description: "Test Description",
    business_address: "Test Address",
    business_phone: "+1234567890",
    business_logo_url: "http://example.com/logo.jpg",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      // Seed the database with a test merchant
      const merchantService = new MerchantAuthService();
      const newMerchant = await merchantService.register(
        mockMerchant as MerchantEntity,
      );
      xAPIKey = newMerchant.apiKey;
    } catch (error) {
      console.error("Database initialization error:", error);
      throw error;
    }
  });

  afterAll(async () => {
    // Cleanup the test merchant from db using repository
    const merchantRepository = AppDataSource.getRepository(MerchantEntity);
    await merchantRepository.delete({ apiKey: mockMerchant.apiKey });
    await AppDataSource.destroy();
  });

  beforeEach(async () => {});

  describe("GET /profile", () => {
    it("should get merchant profile successfully", async () => {
      const response = await request(app)
        .get("/merchants/profile")
        .set("x-api-key", xAPIKey);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("business_name");
      expect(response.body).toHaveProperty("business_email");
    });
  });

  describe("PUT /profile", () => {
    it("should update merchant profile successfully", async () => {
      const updateData = {
        business_name: "Updated Business Name",
        business_email: "updated@business.com",
      };

      const response = await request(app)
        .put("/merchants/profile")
        .set("x-api-key", xAPIKey)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.business_name).toBe(updateData.business_name);
      expect(response.body.business_email).toBe(updateData.business_email);
    });
  });

  describe("POST /logo", () => {
    it("should upload logo successfully", async () => {
      const response = await request(app)
        .post("/merchants/logo")
        .set("x-api-key", xAPIKey)
        .attach("logo", path.join(__dirname, "../fixtures/valid-logo.png"));

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("business_logo_url");
    });

    it("should reject invalid file type", async () => {
      const response = await request(app)
        .post("/merchants/logo")
        .set("x-api-key", xAPIKey)
        .attach("logo", path.join(__dirname, "../fixtures/invalid.txt"));

      expect(response.status).toBe(500);
      expect(response.body.message).toMatch(/Only image files are allowed!/);
    });

    it("should reject oversized file", async () => {
      const response = await request(app)
        .post("/merchants/logo")
        .set("x-api-key", xAPIKey)
        .attach("logo", path.join(__dirname, "../fixtures/oversized.jpg"));

      expect(response.status).toBe(500);
      expect(response.body.message).toMatch(/File too large/);
    });
  });

  describe("DELETE /logo", () => {
    it("should delete logo successfully", async () => {
      const response = await request(app)
        .delete("/merchants/logo")
        .set("x-api-key", xAPIKey);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Logo deleted successfully");
    });
  });
});
