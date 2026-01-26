import { AssetConfigurationService } from "../../services/AssetConfigurationService";
import AppDataSource from "../../config/db";

jest.mock("../../config/db");
jest.mock("../../utils/logger");

describe("AssetConfigurationService", () => {
  let service: AssetConfigurationService;
  let mockRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);
    service = new AssetConfigurationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createAssetConfig", () => {
    it("should create asset configuration successfully", async () => {
      const mockConfig = {
        id: "config-123",
        merchantId: "merchant-123",
        assetCode: "USDC",
        assetIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        isEnabled: true,
        minAmount: "1",
        maxAmount: "10000",
        priority: 1,
        autoConvert: false,
      };

      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(mockConfig);
      mockRepo.save.mockResolvedValue(mockConfig);

      const result = await service.createAssetConfig({
        merchantId: "merchant-123",
        assetCode: "USDC",
        assetIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        minAmount: "1",
        maxAmount: "10000",
        priority: 1,
      });

      expect(result).toEqual(mockConfig);
      expect(mockRepo.findOne).toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it("should throw error if asset config already exists", async () => {
      mockRepo.findOne.mockResolvedValue({ id: "existing-123" });

      await expect(
        service.createAssetConfig({
          merchantId: "merchant-123",
          assetCode: "USDC",
          assetIssuer:
            "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        }),
      ).rejects.toThrow("Asset configuration already exists for this merchant");
    });

    it("should create config with default values", async () => {
      const mockConfig = {
        id: "config-123",
        merchantId: "merchant-123",
        assetCode: "XLM",
        assetIssuer: null,
        isEnabled: true,
        minAmount: "0",
        maxAmount: null,
        priority: 0,
        autoConvert: false,
      };

      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(mockConfig);
      mockRepo.save.mockResolvedValue(mockConfig);

      const result = await service.createAssetConfig({
        merchantId: "merchant-123",
        assetCode: "XLM",
        assetIssuer: null,
      });

      expect(result.isEnabled).toBe(true);
      expect(result.minAmount).toBe("0");
      expect(result.priority).toBe(0);
    });

    it("should handle native XLM asset", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue({ assetCode: "XLM", assetIssuer: null });
      mockRepo.save.mockResolvedValue({ assetCode: "XLM", assetIssuer: null });

      const result = await service.createAssetConfig({
        merchantId: "merchant-123",
        assetCode: "XLM",
        assetIssuer: null,
      });

      expect(result.assetCode).toBe("XLM");
      expect(result.assetIssuer).toBeNull();
    });
  });

  describe("updateAssetConfig", () => {
    it("should update asset configuration successfully", async () => {
      const existing = {
        id: "config-123",
        merchantId: "merchant-123",
        isEnabled: true,
        minAmount: "1",
      };

      const updated = { ...existing, isEnabled: false, minAmount: "5" };

      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(updated);

      const result = await service.updateAssetConfig(
        "config-123",
        "merchant-123",
        {
          isEnabled: false,
          minAmount: "5",
        },
      );

      expect(result.isEnabled).toBe(false);
      expect(result.minAmount).toBe("5");
    });

    it("should throw error if config not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateAssetConfig("config-123", "merchant-123", {
          isEnabled: false,
        }),
      ).rejects.toThrow("Asset configuration not found");
    });

    it("should update only provided fields", async () => {
      const existing = {
        id: "config-123",
        merchantId: "merchant-123",
        isEnabled: true,
        minAmount: "1",
        priority: 0,
      };

      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue({ ...existing, priority: 5 });

      const result = await service.updateAssetConfig(
        "config-123",
        "merchant-123",
        {
          priority: 5,
        },
      );

      expect(result.priority).toBe(5);
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe("deleteAssetConfig", () => {
    it("should delete asset configuration successfully", async () => {
      mockRepo.delete.mockResolvedValue({ affected: 1 });

      await service.deleteAssetConfig("config-123", "merchant-123");

      expect(mockRepo.delete).toHaveBeenCalledWith({
        id: "config-123",
        merchantId: "merchant-123",
      });
    });

    it("should throw error if config not found", async () => {
      mockRepo.delete.mockResolvedValue({ affected: 0 });

      await expect(
        service.deleteAssetConfig("config-123", "merchant-123"),
      ).rejects.toThrow("Asset configuration not found");
    });
  });

  describe("getMerchantAssetConfigs", () => {
    it("should return all configs for merchant", async () => {
      const configs = [
        { id: "config-1", assetCode: "USDC", priority: 2 },
        { id: "config-2", assetCode: "XLM", priority: 1 },
      ];

      mockRepo.find.mockResolvedValue(configs);

      const result = await service.getMerchantAssetConfigs("merchant-123");

      expect(result).toEqual(configs);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { merchantId: "merchant-123" },
        order: { priority: "DESC", createdAt: "ASC" },
      });
    });

    it("should return empty array if no configs", async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.getMerchantAssetConfigs("merchant-123");

      expect(result).toEqual([]);
    });
  });

  describe("getEnabledAssetConfigs", () => {
    it("should return only enabled configs", async () => {
      const configs = [
        { id: "config-1", assetCode: "USDC", isEnabled: true },
        { id: "config-2", assetCode: "XLM", isEnabled: true },
      ];

      mockRepo.find.mockResolvedValue(configs);

      const result = await service.getEnabledAssetConfigs("merchant-123");

      expect(result).toEqual(configs);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { merchantId: "merchant-123", isEnabled: true },
        order: { priority: "DESC", createdAt: "ASC" },
      });
    });
  });

  describe("isAssetSupported", () => {
    it("should return true if asset is supported and enabled", async () => {
      mockRepo.findOne.mockResolvedValue({ id: "config-123", isEnabled: true });

      const result = await service.isAssetSupported(
        "merchant-123",
        "USDC",
        "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      );

      expect(result).toBe(true);
    });

    it("should return false if asset not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.isAssetSupported(
        "merchant-123",
        "USDC",
        "issuer-123",
      );

      expect(result).toBe(false);
    });

    it("should handle native XLM", async () => {
      mockRepo.findOne.mockResolvedValue({
        id: "config-123",
        assetCode: "XLM",
      });

      const result = await service.isAssetSupported(
        "merchant-123",
        "XLM",
        null,
      );

      expect(result).toBe(true);
    });
  });

  describe("validatePaymentAmount", () => {
    it("should return true for valid amount", async () => {
      mockRepo.findOne.mockResolvedValue({
        minAmount: "1",
        maxAmount: "1000",
        isEnabled: true,
      });

      const result = await service.validatePaymentAmount(
        "merchant-123",
        "USDC",
        "issuer-123",
        "500",
      );

      expect(result).toBe(true);
    });

    it("should return false if amount below minimum", async () => {
      mockRepo.findOne.mockResolvedValue({
        minAmount: "10",
        maxAmount: "1000",
        isEnabled: true,
      });

      const result = await service.validatePaymentAmount(
        "merchant-123",
        "USDC",
        "issuer-123",
        "5",
      );

      expect(result).toBe(false);
    });

    it("should return false if amount above maximum", async () => {
      mockRepo.findOne.mockResolvedValue({
        minAmount: "1",
        maxAmount: "1000",
        isEnabled: true,
      });

      const result = await service.validatePaymentAmount(
        "merchant-123",
        "USDC",
        "issuer-123",
        "2000",
      );

      expect(result).toBe(false);
    });

    it("should return true if no maximum set", async () => {
      mockRepo.findOne.mockResolvedValue({
        minAmount: "1",
        maxAmount: null,
        isEnabled: true,
      });

      const result = await service.validatePaymentAmount(
        "merchant-123",
        "USDC",
        "issuer-123",
        "999999",
      );

      expect(result).toBe(true);
    });

    it("should return false if asset not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.validatePaymentAmount(
        "merchant-123",
        "USDC",
        "issuer-123",
        "100",
      );

      expect(result).toBe(false);
    });
  });
});
