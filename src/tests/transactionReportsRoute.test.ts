import request from "supertest";
import app from "../app";
import { getRepository } from "typeorm";
import {
  Transaction,
  TransactionStatus,
  PaymentMethod,
} from "../entities/Transaction";

// Mock the getRepository function
jest.mock("typeorm", () => {
  const originalModule = jest.requireActual("typeorm");
  return {
    ...originalModule,
    getRepository: jest.fn(),
  };
});

describe("Transaction Reports Endpoint", () => {
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

  // Mock repository
  const mockRepository = {
    find: jest.fn().mockResolvedValue(mockTransactions),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getRepository as jest.Mock).mockReturnValue(mockRepository);
  });

  it("should return a transaction report in JSON format", async () => {
    const response = await request(app)
      .get("/reports/transactions")
      .set("x-merchant-id", "merchant1")
      .query({
        startDate: "2024-03-01",
        endDate: "2024-03-31",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.transactions).toHaveLength(2);
    expect(response.body.data.summary).toEqual({
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

  it("should return a transaction report in CSV format", async () => {
    const response = await request(app)
      .get("/reports/transactions")
      .set("x-merchant-id", "merchant1")
      .query({
        format: "csv",
      });

    expect(response.status).toBe(200);
    expect(response.header["content-type"]).toBe("text/csv");
    expect(response.header["content-disposition"]).toBe(
      "attachment; filename=transaction-report.csv",
    );

    const csvContent = response.text;
    const lines = csvContent.split("\n");
    expect(lines[0]).toBe(
      "Transaction ID,Amount,Status,Payment Method,Created At,Reference,Description",
    );
    expect(lines[1]).toContain("1,100.5,success,card");
  });

  it("should filter by status", async () => {
    await request(app)
      .get("/reports/transactions")
      .set("x-merchant-id", "merchant1")
      .query({
        status: TransactionStatus.SUCCESS,
      });

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

  it("should filter by payment method", async () => {
    await request(app)
      .get("/reports/transactions")
      .set("x-merchant-id", "merchant1")
      .query({
        paymentMethod: PaymentMethod.CARD,
      });

    expect(mockRepository.find).toHaveBeenCalledWith({
      where: {
        merchantId: "merchant1",
        paymentMethod: PaymentMethod.CARD,
      },
      order: {
        createdAt: "DESC",
      },
    });
  });

  it("should return 401 if no merchant ID is provided", async () => {
    const response = await request(app).get("/reports/transactions");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Unauthorized");
  });
});
