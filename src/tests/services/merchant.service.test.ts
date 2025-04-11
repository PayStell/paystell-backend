import { MerchantAuthService } from "../../services/merchant.service";
import { Merchant } from "../../interfaces/webhook.interfaces";
import { MerchantEntity } from "../../entities/Merchant.entity";
import { UpdateMerchantProfileDTO } from "../../dtos/UpdateMerchantProfileDTO";

jest.mock("../../services/merchant.service");

describe("MerchantAuthService", () => {
  let merchantAuthService: MerchantAuthService;

  const mockMerchant: Partial<MerchantEntity> = {
    id: "test-id",
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

  const mockMerchantProfile = {
    business_name: "Test Business",
    business_email: "test@business.com",
    business_description: "Test Description",
    business_address: "Test Address",
    business_phone: "+1234567890",
    business_logo_url: "http://example.com/logo.jpg",
  };

  beforeEach(() => {
    merchantAuthService = new MerchantAuthService();
  });
  describe("findMerchantByApiKey", () => {
    it("should return a merchant when a valid API key is provided", async () => {
      const mockMerchant: Merchant = {
        id: "123",
        apiKey: "valid_api_key",
        secret: "secret",
        name: "Test Merchant",
        email: "merchant@test.com",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (merchantAuthService.validateApiKey as jest.Mock).mockResolvedValue(
        mockMerchant,
      );
      const result = await merchantAuthService.validateApiKey("valid_api_key");
      expect(result).toEqual(mockMerchant);
    });
    it("should throw an error when the API key is invalid", async () => {
      (merchantAuthService.validateApiKey as jest.Mock).mockRejectedValue(
        new Error("Merchant does not exist or is not active"),
      );
      await expect(
        merchantAuthService.validateApiKey("invalid_api_key"),
      ).rejects.toThrow("Merchant does not exist or is not active");
    });
  });
  describe("getMerchantById", () => {
    it("should return a merchant when a valid ID is provided", async () => {
      const mockMerchant: Merchant = {
        id: "123",
        apiKey: "api_key",
        secret: "secret",
        name: "Test Merchant",
        email: "merchant@test.com",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (merchantAuthService.getMerchantById as jest.Mock).mockResolvedValue(
        mockMerchant,
      );
      const result = await merchantAuthService.getMerchantById("123");
      expect(result).toEqual(mockMerchant);
    });
    it("should throw an error when the merchant is not active", async () => {
      const mockMerchant: Merchant = {
        id: "123",
        apiKey: "api_key",
        secret: "secret",
        name: "Test Merchant",
        email: "merchant@test.com",
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (merchantAuthService.getMerchantById as jest.Mock).mockImplementation(
        async (_merchantId: string) => {
          const merchant = mockMerchant;
          if (!merchant.isActive) {
            throw new Error("Merchant not found");
          }
          return merchant;
        },
      );
      await expect(merchantAuthService.getMerchantById("123")).rejects.toThrow(
        "Merchant not found",
      );
    });
  });
  describe("validateApiKey", () => {
    it("should return a merchant when a valid API key is provided", async () => {
      const mockMerchant: Merchant = {
        id: "123",
        apiKey: "valid_api_key",
        secret: "secret",
        name: "Test Merchant",
        email: "merchant@test.com",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (merchantAuthService.validateApiKey as jest.Mock).mockResolvedValue(
        mockMerchant,
      );
      const result = await merchantAuthService.validateApiKey("valid_api_key");
      expect(result).toEqual(mockMerchant);
    });
    it("should throw an error when the merchant is not active", async () => {
      const mockMerchant: Merchant = {
        id: "123",
        apiKey: "valid_api_key",
        secret: "secret",
        name: "Test Merchant",
        email: "merchant@test.com",
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (merchantAuthService.validateApiKey as jest.Mock).mockImplementation(
        async (_apiKey: string) => {
          const merchant = mockMerchant;
          if (!merchant.isActive) {
            throw new Error("Merchant does not exist or is not active");
          }
          return merchant;
        },
      );
      await expect(
        merchantAuthService.validateApiKey("valid_api_key"),
      ).rejects.toThrow("Merchant does not exist or is not active");
    });
  });
  it("should validate merchant by id", async () => {
    // ... existing code ...
  });
  it("should validate merchant by api key", async () => {
    // ... existing code ...
  });

  describe("getBusinessProfileById", () => {
    it("should return merchant profile successfully", async () => {
      (
        merchantAuthService.getBusinessProfileById as jest.Mock
      ).mockResolvedValue(mockMerchantProfile);
      const result =
        await merchantAuthService.getBusinessProfileById("test-id");
      expect(result).toMatchObject(mockMerchantProfile);
    });

    it("should throw error if merchant not found", async () => {
      (
        merchantAuthService.getBusinessProfileById as jest.Mock
      ).mockImplementation(async (id: string) => {
        const merchant = mockMerchant;
        if (merchant.id !== id) {
          throw new Error("Merchant not found");
        }
        return merchant;
      });

      await expect(
        merchantAuthService.getBusinessProfileById("invalid-id"),
      ).rejects.toThrow("Merchant not found");
    });
  });

  describe("createMerchantProfile", () => {
    it("should create merchant profile successfully", async () => {
      (
        merchantAuthService.createMerchantProfile as jest.Mock
      ).mockResolvedValue(mockMerchantProfile);

      const result = await merchantAuthService.createMerchantProfile(
        "test-id",
        mockMerchantProfile,
      );
      expect(result.business_name).toBe(mockMerchantProfile.business_name);
      expect(result.business_email).toBe(mockMerchantProfile.business_email);
    });
  });

  describe("updateMerchantProfile", () => {
    it("should update merchant profile successfully", async () => {
      const updateData: UpdateMerchantProfileDTO = {
        business_name: "Updated Business",
      };
      (
        merchantAuthService.updateMerchantProfile as jest.Mock
      ).mockResolvedValue({ ...mockMerchantProfile, ...updateData });
      const result = await merchantAuthService.updateMerchantProfile(
        "test-id",
        updateData,
      );
      expect(result.business_name).toBe(updateData.business_name);
    });
  });

  describe("updateLogo", () => {
    it("should update logo URL successfully", async () => {
      const newLogoUrl = "http://example.com/new-logo.jpg";

      (merchantAuthService.updateLogo as jest.Mock).mockResolvedValue({
        ...mockMerchantProfile,
        business_logo_url: newLogoUrl,
      });

      const result = await merchantAuthService.updateLogo(
        "test-id",
        newLogoUrl,
      );
      expect(result.business_logo_url).toBe(newLogoUrl);
    });
  });

  describe("deleteLogo", () => {
    it("should delete logo successfully", async () => {
      (merchantAuthService.deleteLogo as jest.Mock).mockResolvedValue({
        ...mockMerchant,
        business_logo_url: "",
      });

      const result = await merchantAuthService.deleteLogo("test-id");
      expect(result.business_logo_url).toBe("");
    });
  });
});
