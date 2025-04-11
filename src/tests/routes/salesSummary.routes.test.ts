import request from "supertest";
import express from "express";
import salesSummaryRoutes from "../../routes/salesSummary.routes";
import { SalesSummaryController } from "../../controllers/SalesSummary.controller";
import { authenticateMerchant } from "../../middlewares/merchantAuth";

// Mock the middleware and controller
jest.mock("../../middlewares/merchantAuth", () => ({
  authenticateMerchant: jest.fn((req, res, next) => next()),
}));

// Mock the controller constructor and prototype methods
jest.mock("../../controllers/SalesSummary.controller", () => {
  // Create mock functions for all the controller methods
  const mockGetTotalSales = jest.fn();
  const mockGetSalesByTimePeriod = jest.fn();
  const mockGetTopSellingProducts = jest.fn();
  const mockGetSalesSummary = jest.fn();

  // Return a mock constructor that sets up the prototype methods
  return {
    SalesSummaryController: jest.fn().mockImplementation(() => {
      return {
        getTotalSales: mockGetTotalSales,
        getSalesByTimePeriod: mockGetSalesByTimePeriod,
        getTopSellingProducts: mockGetTopSellingProducts,
        getSalesSummary: mockGetSalesSummary,
      };
    }),
  };
});

describe("Sales Summary Routes", () => {
  let app: express.Application;
  let mockController: jest.Mocked<SalesSummaryController>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Get the mocked controller instance
    mockController =
      new SalesSummaryController() as jest.Mocked<SalesSummaryController>;

    // Setup express app with routes
    app = express();
    app.use(express.json());
    app.use("/api/sales-summary", salesSummaryRoutes);
  });

  describe("GET /api/sales-summary/total", () => {
    it("should call the controller's getTotalSales method", async () => {
      // Setup the mock response
      mockController.getTotalSales.mockImplementation((req, res) => {
        res.status(200).json({ success: true, data: { totalSales: 1500 } });
        return Promise.resolve(res);
      });

      // Make the request
      const response = await request(app).get("/api/sales-summary/total");

      // Check if middleware was called
      expect(authenticateMerchant).toHaveBeenCalled();

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: { totalSales: 1500 },
      });
    }, 10000); // Increase timeout to 10 seconds
  });

  describe("GET /api/sales-summary/by-period/:timePeriod", () => {
    it("should call the controller's getSalesByTimePeriod method", async () => {
      // Setup the mock response
      mockController.getSalesByTimePeriod.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: {
            timePeriod: "daily",
            sales: [
              { date: "2023-01-01", total: 100 },
              { date: "2023-01-02", total: 200 },
            ],
          },
        });
        return Promise.resolve(res);
      });

      // Make the request
      const response = await request(app).get(
        "/api/sales-summary/by-period/daily",
      );

      // Check if middleware was called
      expect(authenticateMerchant).toHaveBeenCalled();

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.timePeriod).toBe("daily");
      expect(response.body.data.sales.length).toBe(2);
    }, 10000); // Increase timeout to 10 seconds
  });

  describe("GET /api/sales-summary/top-products", () => {
    it("should call the controller's getTopSellingProducts method", async () => {
      // Setup the mock response
      mockController.getTopSellingProducts.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: {
            topProducts: [
              { name: "Product 1", sku: "SKU1", total: 500, count: 5 },
              { name: "Product 2", sku: "SKU2", total: 300, count: 3 },
            ],
          },
        });
        return Promise.resolve(res);
      });

      // Make the request
      const response = await request(app).get(
        "/api/sales-summary/top-products",
      );

      // Check if middleware was called
      expect(authenticateMerchant).toHaveBeenCalled();

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.topProducts.length).toBe(2);
    }, 10000); // Increase timeout to 10 seconds
  });

  describe("GET /api/sales-summary", () => {
    it("should call the controller's getSalesSummary method", async () => {
      // Setup the mock response
      mockController.getSalesSummary.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: {
            totalSales: 1000,
            dailySales: [{ date: "2023-01-01", total: 100 }],
            monthlySales: [{ date: "2023-01", total: 300 }],
            topProducts: [
              { name: "Product 1", sku: "SKU1", total: 500, count: 5 },
            ],
          },
        });
        return Promise.resolve(res);
      });

      // Make the request
      const response = await request(app).get("/api/sales-summary");

      // Check if middleware was called
      expect(authenticateMerchant).toHaveBeenCalled();

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalSales).toBe(1000);
    }, 10000); // Increase timeout to 10 seconds
  });
});
