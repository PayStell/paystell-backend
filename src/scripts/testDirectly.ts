import {
  TransactionStatus,
  PaymentMethod,
  Transaction,
} from "../entities/Transaction";
import { TransactionReportService } from "../services/TransactionReportService";
import { Repository } from "typeorm";

// Mock transactions for testing
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
    metadata: null,
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
    metadata: null,
  },
];

// Create a mock repository
const mockRepository = {
  find: async () => mockTransactions,
};

async function testReportGeneration() {
  try {
    console.log("Testing Transaction Report Generation");

    // Create an instance of the service with the mock repository
    const service = new TransactionReportService(
      mockRepository as unknown as Repository<Transaction>,
    );

    // Test generating a report
    const report = await service.generateReport({
      merchantId: "merchant1",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-12-31"),
    });

    console.log("Report Generated Successfully:");
    console.log("\nSummary:");
    console.log(report.summary);

    console.log("\nTransactions:");
    console.log(report.transactions);

    // Test CSV export
    const csv = await service.exportToCsv(report.transactions);
    console.log("\nCSV Export:");
    console.log(csv);

    console.log("\nAll tests passed!");
  } catch (error) {
    console.error("Error during testing:", error);
  }
}

testReportGeneration();
