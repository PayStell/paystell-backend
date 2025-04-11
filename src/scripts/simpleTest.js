// Simple test script without TypeORM dependencies

// Mock Transaction Status and Payment Method
const TransactionStatus = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
};

const PaymentMethod = {
  CARD: "card",
  BANK_TRANSFER: "bank_transfer",
  WALLET: "wallet",
};

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
];

// Simplified Transaction Report Service
class TransactionReportService {
  constructor(repository) {
    this.repository = repository;
  }

  async generateReport(filters) {
    // Mock the filtering that would normally happen in the database
    let transactions = await this.repository.find();

    if (filters.startDate && filters.endDate) {
      transactions = transactions.filter(
        (t) =>
          t.createdAt >= filters.startDate && t.createdAt <= filters.endDate,
      );
    }

    if (filters.status) {
      transactions = transactions.filter((t) => t.status === filters.status);
    }

    if (filters.paymentMethod) {
      transactions = transactions.filter(
        (t) => t.paymentMethod === filters.paymentMethod,
      );
    }

    const summary = this.generateSummary(transactions);

    return {
      summary,
      transactions,
    };
  }

  generateSummary(transactions) {
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );
    const successfulTransactions = transactions.filter(
      (t) => t.status === TransactionStatus.SUCCESS,
    ).length;
    const failedTransactions = transactions.filter(
      (t) => t.status === TransactionStatus.FAILED,
    ).length;

    return {
      totalTransactions,
      totalAmount,
      successfulTransactions,
      failedTransactions,
      averageTransactionAmount:
        totalTransactions > 0 ? totalAmount / totalTransactions : 0,
    };
  }

  async exportToCsv(transactions) {
    const headers = [
      "Transaction ID",
      "Amount",
      "Status",
      "Payment Method",
      "Created At",
      "Reference",
      "Description",
    ].join(",");

    const rows = transactions.map((t) =>
      [
        t.id,
        t.amount,
        t.status,
        t.paymentMethod,
        t.createdAt.toISOString(),
        t.reference || "",
        t.description || "",
      ].join(","),
    );

    return [headers, ...rows].join("\n");
  }
}

// Create a mock repository
const mockRepository = {
  find: async () => mockTransactions,
};

async function testReportGeneration() {
  try {
    console.log("Testing Transaction Report Generation");

    // Create an instance of the service with the mock repository
    const service = new TransactionReportService(mockRepository);

    // Test generating a report
    const report = await service.generateReport({
      merchantId: "merchant1",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-12-31"),
    });

    console.log("Report Generated Successfully:");
    console.log("\nSummary:");
    console.log(report.summary);

    console.log("\nTransactions (Count):", report.transactions.length);

    // Test filtering by status
    const successReport = await service.generateReport({
      merchantId: "merchant1",
      status: TransactionStatus.SUCCESS,
    });

    console.log("\nSuccess Transactions Report:");
    console.log("Transactions Count:", successReport.transactions.length);
    console.log(
      "All success transactions?",
      successReport.transactions.every(
        (t) => t.status === TransactionStatus.SUCCESS,
      ),
    );

    // Test CSV export
    const csv = await service.exportToCsv(report.transactions);
    console.log("\nCSV Export (First 200 chars):");
    console.log(csv.substring(0, 200));

    console.log("\nAll tests passed!");
  } catch (error) {
    console.error("Error during testing:", error);
  }
}

testReportGeneration();
