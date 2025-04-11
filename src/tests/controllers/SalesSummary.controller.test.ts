import { Request, Response } from "express";
import { SalesSummaryController } from "../../controllers/SalesSummary.controller";
import { SalesSummaryService } from "../../services/SalesSummary.service";

interface MerchantRequest extends Request {
  merchant?: {
    id: string;
    apiKey: string;
    secret: string;
    name: string;
    email: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

// Mock the SalesSummaryService
jest.mock("../../services/SalesSummary.service");

describe("SalesSummaryController", () => {
  let salesSummaryController: SalesSummaryController;
  let mockRequest: Partial<MerchantRequest>;

  let mockResponse: Partial<Response>;
  let mockSalesSummaryService: jest.Mocked<SalesSummaryService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock service
    mockSalesSummaryService =
      new SalesSummaryService() as jest.Mocked<SalesSummaryService>;

    // Initialize controller with mock service
    salesSummaryController = new SalesSummaryController();
    // Override the service with our mock
    (
      salesSummaryController as unknown as {
        salesSummaryService: SalesSummaryService;
      }
    ).salesSummaryService = mockSalesSummaryService;

    // Setup mock request and response
    mockRequest = {
      merchant: {
        id: "merchant-id",
        apiKey: "",
        secret: "",
        name: "",
        email: "",
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("getTotalSales", () => {
    it("should return 401 if merchant is not authenticated", async () => {
      mockRequest.merchant = undefined;

      await salesSummaryController.getTotalSales(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Merchant not authenticated",
      });
    });

    it("should return 400 if startDate is invalid", async () => {
      mockRequest.query = { startDate: "invalid-date" };

      await salesSummaryController.getTotalSales(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid startDate format",
      });
    });

    it("should return total sales", async () => {
      mockSalesSummaryService.getTotalSales.mockResolvedValue(1500);

      await salesSummaryController.getTotalSales(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSalesSummaryService.getTotalSales).toHaveBeenCalledWith(
        "merchant-id",
        undefined,
        undefined,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          totalSales: 1500,
        },
      });
    });

    it("should handle service errors", async () => {
      mockSalesSummaryService.getTotalSales.mockRejectedValue(
        new Error("Service error"),
      );

      await salesSummaryController.getTotalSales(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: "Service error",
      });
    });
  });

  describe("getSalesByTimePeriod", () => {
    it("should return 400 if timePeriod is invalid", async () => {
      mockRequest.params = { timePeriod: "invalid" };

      await salesSummaryController.getSalesByTimePeriod(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid timePeriod. Must be one of: daily, weekly, monthly",
      });
    });

    it("should return sales by time period", async () => {
      mockRequest.params = { timePeriod: "daily" };

      const salesData = [
        { date: "2023-01-01", total: 100 },
        { date: "2023-01-02", total: 200 },
      ];

      mockSalesSummaryService.getSalesByTimePeriod.mockResolvedValue(salesData);

      await salesSummaryController.getSalesByTimePeriod(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSalesSummaryService.getSalesByTimePeriod).toHaveBeenCalledWith(
        "merchant-id",
        "daily",
        undefined,
        undefined,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          timePeriod: "daily",
          sales: salesData,
        },
      });
    });
  });

  describe("getTopSellingProducts", () => {
    it("should return 400 if limit is invalid", async () => {
      mockRequest.query = { limit: "invalid" };

      await salesSummaryController.getTopSellingProducts(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid limit. Must be a number between 1 and 100",
      });
    });

    it("should return top selling products", async () => {
      mockRequest.query = { limit: "5" };

      const topProducts = [
        { name: "Product 1", sku: "SKU1", total: 500, count: 5 },
        { name: "Product 2", sku: "SKU2", total: 300, count: 3 },
      ];

      mockSalesSummaryService.getTopSellingProducts.mockResolvedValue(
        topProducts,
      );

      await salesSummaryController.getTopSellingProducts(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(
        mockSalesSummaryService.getTopSellingProducts,
      ).toHaveBeenCalledWith("merchant-id", 5, undefined, undefined);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          topProducts,
        },
      });
    });
  });

  describe("getSalesSummary", () => {
    it("should return sales summary", async () => {
      const summary = {
        totalSales: 1000,
        dailySales: [
          { date: "2023-01-01", total: 100 },
          { date: "2023-01-02", total: 200 },
        ],
        monthlySales: [
          { date: "2023-01", total: 300 },
          { date: "2023-02", total: 700 },
        ],
        topProducts: [
          { name: "Product 1", sku: "SKU1", total: 500, count: 5 },
          { name: "Product 2", sku: "SKU2", total: 300, count: 3 },
        ],
      };

      mockSalesSummaryService.getSalesSummary.mockResolvedValue(summary);

      await salesSummaryController.getSalesSummary(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockSalesSummaryService.getSalesSummary).toHaveBeenCalledWith(
        "merchant-id",
        undefined,
        undefined,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: summary,
      });
    });
  });
});
