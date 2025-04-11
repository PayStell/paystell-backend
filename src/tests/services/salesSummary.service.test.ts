import { SalesSummaryService } from "../../services/SalesSummary.service";
import { MerchantEntity } from "../../entities/Merchant.entity";
import { User } from "../../entities/User";
import { PaymentLink } from "../../entities/PaymentLink";
import { Payment } from "../../entities/Payment";
import { getRepository } from "typeorm";

// Define repository interface types
interface MockRepository {
  findOne?: jest.Mock;
  find?: jest.Mock;
  createQueryBuilder?: jest.Mock;
}

// Mock the typeorm getRepository
jest.mock("typeorm", () => {
  const actual = jest.requireActual("typeorm");
  return {
    ...actual,
    getRepository: jest.fn(),
  };
});

describe("SalesSummaryService", () => {
  let salesSummaryService: SalesSummaryService;
  let mockMerchantRepository: MockRepository;
  let mockUserRepository: MockRepository;
  let mockPaymentLinkRepository: MockRepository;
  let mockPaymentRepository: MockRepository;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock repositories
    mockMerchantRepository = {
      findOne: jest.fn(),
    };

    mockUserRepository = {
      findOne: jest.fn(),
    };

    mockPaymentLinkRepository = {
      find: jest.fn(),
    };

    // Create a mock query builder with appropriate methods
    const mockQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
    };

    mockPaymentRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    // Setup getRepository mock to return our mock repositories
    (getRepository as jest.Mock).mockImplementation((entity: unknown) => {
      if (entity === MerchantEntity) return mockMerchantRepository;
      if (entity === User) return mockUserRepository;
      if (entity === PaymentLink) return mockPaymentLinkRepository;
      if (entity === Payment) return mockPaymentRepository;
      return {};
    });

    // Create service instance
    salesSummaryService = new SalesSummaryService();
  });

  describe("getTotalSales", () => {
    it("should throw an error if merchant not found", async () => {
      mockMerchantRepository.findOne?.mockResolvedValue(null);

      await expect(
        salesSummaryService.getTotalSales("merchant-id"),
      ).rejects.toThrow("Merchant not found");
    });

    it("should throw an error if user not found", async () => {
      mockMerchantRepository.findOne?.mockResolvedValue({
        id: "merchant-id",
        email: "merchant@example.com",
      });
      mockUserRepository.findOne?.mockResolvedValue(null);

      await expect(
        salesSummaryService.getTotalSales("merchant-id"),
      ).rejects.toThrow("User associated with merchant not found");
    });

    it("should return 0 if no payment links found", async () => {
      mockMerchantRepository.findOne?.mockResolvedValue({
        id: "merchant-id",
        email: "merchant@example.com",
      });
      mockUserRepository.findOne?.mockResolvedValue({
        id: 1,
        email: "merchant@example.com",
      });
      mockPaymentLinkRepository.find?.mockResolvedValue([]);

      const queryBuilder = mockPaymentRepository.createQueryBuilder?.();
      queryBuilder.getRawOne.mockResolvedValue({ total: null });

      const result = await salesSummaryService.getTotalSales("merchant-id");
      expect(result).toBe(0);
    });

    it("should return the total sales amount", async () => {
      mockMerchantRepository.findOne?.mockResolvedValue({
        id: "merchant-id",
        email: "merchant@example.com",
      });
      mockUserRepository.findOne?.mockResolvedValue({
        id: 1,
        email: "merchant@example.com",
      });
      mockPaymentLinkRepository.find?.mockResolvedValue([
        { id: "link-1" },
        { id: "link-2" },
      ]);

      const queryBuilder = mockPaymentRepository.createQueryBuilder?.();
      queryBuilder.getRawOne.mockResolvedValue({ total: "1500.50" });

      const result = await salesSummaryService.getTotalSales("merchant-id");
      expect(result).toBe("1500.50");
      expect(mockPaymentRepository.createQueryBuilder).toHaveBeenCalledWith(
        "payment",
      );
    });
  });

  describe("getSalesByTimePeriod", () => {
    it("should return an empty array if no payment links found", async () => {
      mockMerchantRepository.findOne?.mockResolvedValue({
        id: "merchant-id",
        email: "merchant@example.com",
      });
      mockUserRepository.findOne?.mockResolvedValue({
        id: 1,
        email: "merchant@example.com",
      });
      mockPaymentLinkRepository.find?.mockResolvedValue([]);

      const result = await salesSummaryService.getSalesByTimePeriod(
        "merchant-id",
        "daily",
      );
      expect(result).toEqual([]);
    });

    it("should return daily sales data", async () => {
      mockMerchantRepository.findOne?.mockResolvedValue({
        id: "merchant-id",
        email: "merchant@example.com",
      });
      mockUserRepository.findOne?.mockResolvedValue({
        id: 1,
        email: "merchant@example.com",
      });
      mockPaymentLinkRepository.find?.mockResolvedValue([{ id: "link-1" }]);

      const queryBuilder = mockPaymentRepository.createQueryBuilder?.();
      queryBuilder.getRawMany.mockResolvedValue([
        { date: "2023-01-01", total: "100.00" },
        { date: "2023-01-02", total: "200.00" },
      ]);

      const result = await salesSummaryService.getSalesByTimePeriod(
        "merchant-id",
        "daily",
      );
      expect(result).toEqual([
        { date: "2023-01-01", total: 100 },
        { date: "2023-01-02", total: 200 },
      ]);
    });
  });

  describe("getTopSellingProducts", () => {
    it("should return top selling products", async () => {
      mockMerchantRepository.findOne?.mockResolvedValue({
        id: "merchant-id",
        email: "merchant@example.com",
      });
      mockUserRepository.findOne?.mockResolvedValue({
        id: 1,
        email: "merchant@example.com",
      });

      const queryBuilder = mockPaymentRepository.createQueryBuilder?.();
      queryBuilder.getRawMany.mockResolvedValue([
        { name: "Product 1", sku: "SKU1", total: "500.00", count: "5" },
        { name: "Product 2", sku: "SKU2", total: "300.00", count: "3" },
      ]);

      const result = await salesSummaryService.getTopSellingProducts(
        "merchant-id",
        5,
      );
      expect(result).toEqual([
        { name: "Product 1", sku: "SKU1", total: 500, count: 5 },
        { name: "Product 2", sku: "SKU2", total: 300, count: 3 },
      ]);
    });
  });

  describe("getSalesSummary", () => {
    it("should return a complete sales summary", async () => {
      // Mock getTotalSales
      jest.spyOn(salesSummaryService, "getTotalSales").mockResolvedValue(1000);

      // Mock getSalesByTimePeriod for daily
      jest
        .spyOn(salesSummaryService, "getSalesByTimePeriod")
        .mockImplementation(async (merchantId, period) => {
          if (period === "daily") {
            return [
              { date: "2023-01-01", total: 100 },
              { date: "2023-01-02", total: 200 },
            ];
          } else {
            return [
              { date: "2023-01", total: 300 },
              { date: "2023-02", total: 700 },
            ];
          }
        });

      // Mock getTopSellingProducts
      jest
        .spyOn(salesSummaryService, "getTopSellingProducts")
        .mockResolvedValue([
          { name: "Product 1", sku: "SKU1", total: 500, count: 5 },
          { name: "Product 2", sku: "SKU2", total: 300, count: 3 },
        ]);

      const result = await salesSummaryService.getSalesSummary("merchant-id");

      expect(result).toEqual({
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
      });
    });
  });
});
