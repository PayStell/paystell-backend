import { MultiAssetPaymentService } from "../../services/MultiAssetPaymentService";
import { AssetConfigurationService } from "../../services/AssetConfigurationService";
import { AssetPriceService } from "../../services/AssetPriceService";
import { Horizon, Keypair } from "@stellar/stellar-sdk";

jest.mock("@stellar/stellar-sdk");
jest.mock("../../services/AssetConfigurationService");
jest.mock("../../services/AssetPriceService");
jest.mock("../../utils/logger");

describe("MultiAssetPaymentService", () => {
  let service: MultiAssetPaymentService;
  let mockHorizon: {
    loadAccount: jest.Mock;
    submitTransaction: jest.Mock;
  };
  let mockAssetConfigService: jest.Mocked<AssetConfigurationService>;
  let mockAssetPriceService: jest.Mocked<AssetPriceService>;

  beforeEach(() => {
    mockHorizon = {
      loadAccount: jest.fn(),
      submitTransaction: jest.fn(),
    };

    (
      Horizon.Server as jest.MockedClass<typeof Horizon.Server>
    ).mockImplementation(() => mockHorizon as unknown as Horizon.Server);

    mockAssetConfigService =
      new AssetConfigurationService() as jest.Mocked<AssetConfigurationService>;
    mockAssetPriceService =
      new AssetPriceService() as jest.Mocked<AssetPriceService>;

    service = new MultiAssetPaymentService();
    Object.defineProperty(service, "assetConfigService", {
      value: mockAssetConfigService,
      writable: true,
    });
    Object.defineProperty(service, "assetPriceService", {
      value: mockAssetPriceService,
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("executePathPayment", () => {
    const mockPaymentData = {
      merchantId: "merchant-123",
      sourceAddress: "GDSOURCE123",
      destinationAddress: "GDDEST456",
      sourceAssetCode: "USDC",
      sourceAssetIssuer:
        "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      destAssetCode: "XLM",
      amount: "100",
      sourceSecret: "SBSECRET123",
    };

    it("should execute path payment successfully", async () => {
      mockAssetConfigService.isAssetSupported.mockResolvedValue(true);
      mockAssetConfigService.validatePaymentAmount.mockResolvedValue(true);
      mockAssetPriceService.findBestPath.mockResolvedValue({
        destination_amount: "95.5",
        path: [],
      });

      const mockAccount = {
        sequenceNumber: jest.fn().mockReturnValue("1"),
        incrementSequenceNumber: jest.fn(),
      };

      mockHorizon.loadAccount.mockResolvedValue(mockAccount);
      mockHorizon.submitTransaction.mockResolvedValue({
        hash: "tx-hash-123",
      });

      (Keypair.fromSecret as jest.Mock).mockReturnValue({
        publicKey: jest.fn().mockReturnValue("GDSOURCE123"),
      });

      const result = await service.executePathPayment(mockPaymentData);

      expect(result).toMatchObject({
        transactionHash: "tx-hash-123",
        sourceAmount: "100",
        destinationAmount: "95.5",
      });
      expect(mockAssetConfigService.isAssetSupported).toHaveBeenCalled();
      expect(mockAssetConfigService.validatePaymentAmount).toHaveBeenCalled();
    });

    it("should throw error if asset not supported", async () => {
      mockAssetConfigService.isAssetSupported.mockResolvedValue(false);

      await expect(service.executePathPayment(mockPaymentData)).rejects.toThrow(
        "Source asset not supported by merchant",
      );
    });

    it("should throw error if amount invalid", async () => {
      mockAssetConfigService.isAssetSupported.mockResolvedValue(true);
      mockAssetConfigService.validatePaymentAmount.mockResolvedValue(false);

      await expect(service.executePathPayment(mockPaymentData)).rejects.toThrow(
        "Payment amount outside configured limits",
      );
    });

    it("should throw error if no path available", async () => {
      mockAssetConfigService.isAssetSupported.mockResolvedValue(true);
      mockAssetConfigService.validatePaymentAmount.mockResolvedValue(true);
      mockAssetPriceService.findBestPath.mockResolvedValue(null);

      await expect(service.executePathPayment(mockPaymentData)).rejects.toThrow(
        "No payment path available",
      );
    });

    it("should handle path with intermediary assets", async () => {
      mockAssetConfigService.isAssetSupported.mockResolvedValue(true);
      mockAssetConfigService.validatePaymentAmount.mockResolvedValue(true);
      mockAssetPriceService.findBestPath.mockResolvedValue({
        destination_amount: "95.5",
        path: [
          {
            asset_type: "credit_alphanum4",
            asset_code: "EUR",
            asset_issuer: "issuer-eur",
          },
        ],
      });

      const mockAccount = {
        sequenceNumber: jest.fn().mockReturnValue("1"),
        incrementSequenceNumber: jest.fn(),
      };

      mockHorizon.loadAccount.mockResolvedValue(mockAccount);
      mockHorizon.submitTransaction.mockResolvedValue({ hash: "tx-hash-123" });

      (Keypair.fromSecret as jest.Mock).mockReturnValue({
        publicKey: jest.fn().mockReturnValue("GDSOURCE123"),
      });

      const result = await service.executePathPayment(mockPaymentData);

      expect(result.path).toHaveLength(1);
    });

    it("should include memo if provided", async () => {
      mockAssetConfigService.isAssetSupported.mockResolvedValue(true);
      mockAssetConfigService.validatePaymentAmount.mockResolvedValue(true);
      mockAssetPriceService.findBestPath.mockResolvedValue({
        destination_amount: "95.5",
        path: [],
      });

      const mockAccount = {
        sequenceNumber: jest.fn().mockReturnValue("1"),
        incrementSequenceNumber: jest.fn(),
      };

      mockHorizon.loadAccount.mockResolvedValue(mockAccount);
      mockHorizon.submitTransaction.mockResolvedValue({ hash: "tx-hash-123" });

      (Keypair.fromSecret as jest.Mock).mockReturnValue({
        publicKey: jest.fn().mockReturnValue("GDSOURCE123"),
      });

      await service.executePathPayment({
        ...mockPaymentData,
        memo: "Payment for order #123",
      });

      expect(mockHorizon.submitTransaction).toHaveBeenCalled();
    });
  });

  describe("executeWithFallback", () => {
    const mockPaymentData = {
      merchantId: "merchant-123",
      sourceAddress: "GDSOURCE123",
      destinationAddress: "GDDEST456",
      sourceAssetCode: "USDC",
      sourceAssetIssuer:
        "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      destAssetCode: "XLM",
      amount: "100",
      sourceSecret: "SBSECRET123",
    };

    it("should execute primary payment if successful", async () => {
      mockAssetConfigService.isAssetSupported.mockResolvedValue(true);
      mockAssetConfigService.validatePaymentAmount.mockResolvedValue(true);
      mockAssetPriceService.findBestPath.mockResolvedValue({
        destination_amount: "95.5",
        path: [],
      });

      const mockAccount = {
        sequenceNumber: jest.fn().mockReturnValue("1"),
        incrementSequenceNumber: jest.fn(),
      };

      mockHorizon.loadAccount.mockResolvedValue(mockAccount);
      mockHorizon.submitTransaction.mockResolvedValue({ hash: "tx-hash-123" });

      (Keypair.fromSecret as jest.Mock).mockReturnValue({
        publicKey: jest.fn().mockReturnValue("GDSOURCE123"),
      });

      const result = await service.executeWithFallback(mockPaymentData);

      expect(result.transactionHash).toBe("tx-hash-123");
    });

    it("should try fallback assets if primary fails", async () => {
      mockAssetConfigService.isAssetSupported
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      mockAssetConfigService.validatePaymentAmount.mockResolvedValue(true);
      mockAssetPriceService.findBestPath
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          destination_amount: "95.5",
          path: [],
        });

      mockAssetConfigService.getEnabledAssetConfigs.mockResolvedValue([
        {
          assetCode: "XLM",
          assetIssuer: null,
          isEnabled: true,
          id: "config-1",
          merchantId: "merchant-123",
          minAmount: "10",
          maxAmount: null,
          priority: 1,
          autoConvert: false,
          settlementAssetCode: null,
          settlementAssetIssuer: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const mockAccount = {
        sequenceNumber: jest.fn().mockReturnValue("1"),
        incrementSequenceNumber: jest.fn(),
      };

      mockHorizon.loadAccount.mockResolvedValue(mockAccount);
      mockHorizon.submitTransaction.mockResolvedValue({
        hash: "tx-hash-fallback",
      });

      (Keypair.fromSecret as jest.Mock).mockReturnValue({
        publicKey: jest.fn().mockReturnValue("GDSOURCE123"),
      });

      const result = await service.executeWithFallback(mockPaymentData);

      expect(result.transactionHash).toBe("tx-hash-fallback");
    });

    it("should throw error if all paths fail", async () => {
      mockAssetConfigService.isAssetSupported.mockResolvedValue(true);
      mockAssetConfigService.validatePaymentAmount.mockResolvedValue(false);
      mockAssetConfigService.getEnabledAssetConfigs.mockResolvedValue([]);

      await expect(
        service.executeWithFallback(mockPaymentData),
      ).rejects.toThrow("All payment paths failed");
    });
  });

  describe("estimatePayment", () => {
    it("should estimate payment successfully", async () => {
      mockAssetConfigService.isAssetSupported.mockResolvedValue(true);
      mockAssetPriceService.getExchangeRate.mockResolvedValue({
        destinationAmount: "95.5",
        rate: "0.955",
        path: [],
        sourceAsset: "USDC",
        destinationAsset: "XLM",
        sourceAmount: "100",
        timestamp: new Date(),
      });

      const result = await service.estimatePayment({
        merchantId: "merchant-123",
        sourceAssetCode: "USDC",
        sourceAssetIssuer: "issuer-123",
        destAssetCode: "XLM",
        amount: "100",
      });

      expect(result).toMatchObject({
        estimatedDestAmount: "95.5",
        rate: "0.955",
      });
    });

    it("should throw error if asset not supported", async () => {
      mockAssetConfigService.isAssetSupported.mockResolvedValue(false);

      await expect(
        service.estimatePayment({
          merchantId: "merchant-123",
          sourceAssetCode: "UNKNOWN",
          destAssetCode: "XLM",
          amount: "100",
        }),
      ).rejects.toThrow("Source asset not supported");
    });
  });

  describe("getSupportedAssetPairs", () => {
    it("should return all possible asset pairs", async () => {
      mockAssetConfigService.getEnabledAssetConfigs.mockResolvedValue([
        {
          id: "config-1",
          merchantId: "merchant-123",
          assetCode: "USDC",
          assetIssuer: "issuer-123",
          isEnabled: true,
          minAmount: "1",
          maxAmount: "10000",
          priority: 1,
          autoConvert: false,
          settlementAssetCode: null,
          settlementAssetIssuer: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "config-2",
          merchantId: "merchant-123",
          assetCode: "XLM",
          assetIssuer: null,
          isEnabled: true,
          minAmount: "10",
          maxAmount: null,
          priority: 2,
          autoConvert: false,
          settlementAssetCode: null,
          settlementAssetIssuer: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getSupportedAssetPairs("merchant-123");

      expect(result).toHaveLength(2);
      expect(result[0].sourceAsset).toBe("USDC");
      expect(result[0].destinationAsset).toBe("XLM");
      expect(result[1].sourceAsset).toBe("XLM");
      expect(result[1].destinationAsset).toBe("USDC");
    });

    it("should return empty array if no configs", async () => {
      mockAssetConfigService.getEnabledAssetConfigs.mockResolvedValue([]);

      const result = await service.getSupportedAssetPairs("merchant-123");

      expect(result).toEqual([]);
    });

    it("should handle single asset config", async () => {
      mockAssetConfigService.getEnabledAssetConfigs.mockResolvedValue([
        {
          id: "config-1",
          merchantId: "merchant-123",
          assetCode: "USDC",
          assetIssuer: "issuer-123",
          isEnabled: true,
          minAmount: "1",
          maxAmount: "10000",
          priority: 1,
          autoConvert: false,
          settlementAssetCode: null,
          settlementAssetIssuer: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getSupportedAssetPairs("merchant-123");

      expect(result).toEqual([]);
    });
  });
});
