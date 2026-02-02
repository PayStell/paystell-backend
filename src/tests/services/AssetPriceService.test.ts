import { AssetPriceService } from "../../services/AssetPriceService";
import { Horizon } from "@stellar/stellar-sdk";

jest.mock("@stellar/stellar-sdk");
jest.mock("../../utils/logger");

describe("AssetPriceService", () => {
  let service: AssetPriceService;
  let mockHorizon: {
    strictSendPaths: jest.Mock;
    loadAccount: jest.Mock;
    orderbook: jest.Mock;
  };

  beforeEach(() => {
    mockHorizon = {
      strictSendPaths: jest.fn(),
      loadAccount: jest.fn(),
      orderbook: jest.fn(),
    };

    (
      Horizon.Server as jest.MockedClass<typeof Horizon.Server>
    ).mockImplementation(() => mockHorizon as unknown as Horizon.Server);
    service = new AssetPriceService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getExchangeRate", () => {
    it("should get exchange rate successfully", async () => {
      const mockPathResponse = {
        records: [
          {
            destination_amount: "95.5",
            path: [],
          },
        ],
      };

      mockHorizon.strictSendPaths.mockReturnValue({
        call: jest.fn().mockResolvedValue(mockPathResponse),
      });

      const result = await service.getExchangeRate(
        "USDC",
        "issuer-123",
        "XLM",
        undefined,
        "100",
      );

      expect(result).toMatchObject({
        sourceAsset: "USDC",
        destinationAsset: "XLM",
        sourceAmount: "100",
        destinationAmount: "95.5",
      });
      expect(parseFloat(result.rate)).toBeCloseTo(0.955, 3);
    });

    it("should throw error if no path found", async () => {
      mockHorizon.strictSendPaths.mockReturnValue({
        call: jest.fn().mockResolvedValue({ records: [] }),
      });

      await expect(
        service.getExchangeRate(
          "USDC",
          "issuer-123",
          "UNKNOWN",
          "issuer-456",
          "100",
        ),
      ).rejects.toThrow("No payment path found between these assets");
    });

    it("should handle native XLM as source", async () => {
      const mockPathResponse = {
        records: [
          {
            destination_amount: "100",
            path: [],
          },
        ],
      };

      mockHorizon.strictSendPaths.mockReturnValue({
        call: jest.fn().mockResolvedValue(mockPathResponse),
      });

      const result = await service.getExchangeRate(
        "XLM",
        undefined,
        "USDC",
        "issuer-123",
        "100",
      );

      expect(result.sourceAsset).toBe("XLM");
      expect(result.destinationAsset).toBe("USDC");
    });

    it("should handle native XLM as destination", async () => {
      const mockPathResponse = {
        records: [
          {
            destination_amount: "100",
            path: [],
          },
        ],
      };

      mockHorizon.strictSendPaths.mockReturnValue({
        call: jest.fn().mockResolvedValue(mockPathResponse),
      });

      const result = await service.getExchangeRate(
        "USDC",
        "issuer-123",
        "XLM",
        undefined,
        "100",
      );

      expect(result.destinationAsset).toBe("XLM");
    });

    it("should include timestamp in response", async () => {
      const mockPathResponse = {
        records: [
          {
            destination_amount: "100",
            path: [],
          },
        ],
      };

      mockHorizon.strictSendPaths.mockReturnValue({
        call: jest.fn().mockResolvedValue(mockPathResponse),
      });

      const result = await service.getExchangeRate(
        "USDC",
        "issuer-123",
        "XLM",
        undefined,
        "100",
      );

      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe("findBestPath", () => {
    it("should find best path successfully", async () => {
      const mockPathResponse = {
        records: [
          {
            destination_amount: "95.5",
            path: [{ asset_code: "EUR", asset_issuer: "issuer-eur" }],
          },
        ],
      };

      mockHorizon.strictSendPaths.mockReturnValue({
        call: jest.fn().mockResolvedValue(mockPathResponse),
      });

      const result = await service.findBestPath(
        "USDC",
        "issuer-123",
        "XLM",
        undefined,
        "100",
      );

      expect(result).toEqual(mockPathResponse.records[0]);
    });

    it("should return null if no path found", async () => {
      mockHorizon.strictSendPaths.mockReturnValue({
        call: jest.fn().mockResolvedValue({ records: [] }),
      });

      const result = await service.findBestPath(
        "USDC",
        "issuer-123",
        "UNKNOWN",
        "issuer-456",
        "100",
      );

      expect(result).toBeNull();
    });

    it("should return null on error", async () => {
      mockHorizon.strictSendPaths.mockReturnValue({
        call: jest.fn().mockRejectedValue(new Error("Network error")),
      });

      const result = await service.findBestPath(
        "USDC",
        "issuer-123",
        "XLM",
        undefined,
        "100",
      );

      expect(result).toBeNull();
    });
  });

  describe("getMultiplePrices", () => {
    it("should get prices for multiple destinations", async () => {
      const mockPathResponse = {
        records: [
          {
            destination_amount: "95.5",
            path: [],
          },
        ],
      };

      mockHorizon.strictSendPaths.mockReturnValue({
        call: jest.fn().mockResolvedValue(mockPathResponse),
      });

      const destinations = [
        { code: "XLM" },
        { code: "EUR", issuer: "issuer-eur" },
      ];

      const results = await service.getMultiplePrices(
        "USDC",
        "issuer-123",
        destinations,
        "100",
      );

      expect(results).toHaveLength(2);
      expect(results[0].destinationAsset).toBe("XLM");
      expect(results[1].destinationAsset).toBe("EUR");
    });

    it("should skip failed price fetches", async () => {
      mockHorizon.strictSendPaths.mockReturnValueOnce({
        call: jest.fn().mockResolvedValue({
          records: [{ destination_amount: "95.5", path: [] }],
        }),
      });

      mockHorizon.strictSendPaths.mockReturnValueOnce({
        call: jest.fn().mockRejectedValue(new Error("Failed")),
      });

      const destinations = [
        { code: "XLM" },
        { code: "UNKNOWN", issuer: "bad-issuer" },
      ];

      const results = await service.getMultiplePrices(
        "USDC",
        "issuer-123",
        destinations,
        "100",
      );

      expect(results).toHaveLength(1);
      expect(results[0].destinationAsset).toBe("XLM");
    });

    it("should return empty array if all fail", async () => {
      mockHorizon.strictSendPaths.mockReturnValue({
        call: jest.fn().mockRejectedValue(new Error("Failed")),
      });

      const destinations = [{ code: "UNKNOWN", issuer: "bad-issuer" }];

      const results = await service.getMultiplePrices(
        "USDC",
        "issuer-123",
        destinations,
        "100",
      );

      expect(results).toEqual([]);
    });
  });

  describe("validateAssetExists", () => {
    it("should return true for XLM", async () => {
      const result = await service.validateAssetExists("XLM");

      expect(result).toBe(true);
      expect(mockHorizon.loadAccount).not.toHaveBeenCalled();
    });

    it("should return true for valid asset", async () => {
      mockHorizon.loadAccount.mockResolvedValue({ id: "issuer-123" });

      const result = await service.validateAssetExists("USDC", "issuer-123");

      expect(result).toBe(true);
      expect(mockHorizon.loadAccount).toHaveBeenCalledWith("issuer-123");
    });

    it("should return false for invalid issuer", async () => {
      mockHorizon.loadAccount.mockRejectedValue(new Error("Not found"));

      const result = await service.validateAssetExists("USDC", "bad-issuer");

      expect(result).toBe(false);
    });

    it("should return false if no issuer provided for non-XLM", async () => {
      const result = await service.validateAssetExists("USDC");

      expect(result).toBe(false);
    });
  });

  describe("getOrderbook", () => {
    it("should get orderbook successfully", async () => {
      const mockOrderbook = {
        bids: [
          { price: "1.05", amount: "100" },
          { price: "1.04", amount: "200" },
          { price: "1.03", amount: "150" },
          { price: "1.02", amount: "300" },
          { price: "1.01", amount: "250" },
          { price: "1.00", amount: "400" },
        ],
        asks: [
          { price: "1.06", amount: "80" },
          { price: "1.07", amount: "120" },
          { price: "1.08", amount: "200" },
          { price: "1.09", amount: "150" },
          { price: "1.10", amount: "300" },
          { price: "1.11", amount: "250" },
        ],
      };

      mockHorizon.orderbook.mockReturnValue({
        call: jest.fn().mockResolvedValue(mockOrderbook),
      });

      const result = await service.getOrderbook(
        "USDC",
        "issuer-123",
        "XLM",
        undefined,
      );

      expect(result.bids).toHaveLength(5);
      expect(result.asks).toHaveLength(5);
      expect(result.source.code).toBe("USDC");
      expect(result.destination.code).toBe("XLM");
    });

    it("should throw error on failure", async () => {
      mockHorizon.orderbook.mockReturnValue({
        call: jest.fn().mockRejectedValue(new Error("Network error")),
      });

      await expect(
        service.getOrderbook("USDC", "issuer-123", "XLM", undefined),
      ).rejects.toThrow("Failed to fetch orderbook");
    });
  });
});
