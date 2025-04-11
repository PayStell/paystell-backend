import { Repository } from "typeorm";
import { TransactionReportService } from "../services/TransactionReportService";
import {
  Transaction,
  TransactionStatus,
  PaymentMethod,
} from "../entities/Transaction";

describe("TransactionReportService", () => {
  let service: TransactionReportService;
  let mockRepository: jest.Mocked<Repository<Transaction>>;

  const mockTransactions = [
    {
      id: "1",
      merchantId: "merchant1",
      payerId: "payer1",
      amount: 100.5,
      status: TransactionStatus.SUCCESS,
      paymentMethod: PaymentMethod.CARD,
      createdAt: new Date("2024-03-01"),
      updatedAt: new Date("2024-03-01"),
      reference: "REF001",
      description: "Test transaction 1",
    },
    {
      id: "2",
      merchantId: "merchant1",
      payerId: "payer2",
      amount: 200.75,
      status: TransactionStatus.FAILED,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      createdAt: new Date("2024-03-02"),
      updatedAt: new Date("2024-03-02"),
      reference: "REF002",
      description: "Test transaction 2",
    },
  ] as Transaction[];

  beforeEach(() => {
    mockRepository = {
      find: jest.fn().mockResolvedValue(mockTransactions),
    } as unknown as jest.Mocked<Repository<Transaction>>;

    service = new TransactionReportService(mockRepository);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateReport", () => {
    it("should generate a report with correct summary", async () => {
      const filters = {
        merchantId: "merchant1",
        startDate: new Date("2024-03-01"),
        endDate: new Date("2024-03-02"),
      };

      const report = await service.generateReport(filters);

      expect(report.transactions).toHaveLength(2);
      expect(report.summary).toEqual({
        totalTransactions: 2,
        totalAmount: 301.25,
        successfulTransactions: 1,
        failedTransactions: 1,
        averageTransactionAmount: 150.625,
      });

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          merchantId: "merchant1",
          createdAt: expect.any(Object),
        },
        order: {
          createdAt: "DESC",
        },
      });
    });

    it("should apply status filter correctly", async () => {
      const filters = {
        merchantId: "merchant1",
        status: TransactionStatus.SUCCESS,
      };

      await service.generateReport(filters);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          merchantId: "merchant1",
          status: TransactionStatus.SUCCESS,
        },
        order: {
          createdAt: "DESC",
        },
      });
    });
  });

  describe("exportToCsv", () => {
    it("should generate correct CSV format", async () => {
      const csv = await service.exportToCsv(mockTransactions);
      const lines = csv.split("\n");

      expect(lines[0]).toBe(
        "Transaction ID,Amount,Status,Payment Method,Created At,Reference,Description",
      );
      expect(lines[1]).toContain("1,100.5,success,card");
      expect(lines[2]).toContain("2,200.75,failed,bank_transfer");
    });
  });
});
