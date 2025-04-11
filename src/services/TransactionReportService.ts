import { Repository, Between, FindOptionsWhere } from "typeorm";
import {
  Transaction,
  TransactionStatus,
  PaymentMethod,
} from "../entities/Transaction";

export interface TransactionReportFilters {
  startDate?: Date;
  endDate?: Date;
  status?: TransactionStatus;
  paymentMethod?: PaymentMethod;
  merchantId: string;
}

export interface TransactionReportSummary {
  totalTransactions: number;
  totalAmount: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageTransactionAmount: number;
}

export class TransactionReportService {
  constructor(private transactionRepository: Repository<Transaction>) {}

  async generateReport(filters: TransactionReportFilters) {
    const where: FindOptionsWhere<Transaction> = {
      merchantId: filters.merchantId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters.startDate && filters.endDate) {
      where.createdAt = Between(filters.startDate, filters.endDate);
    }

    const transactions = await this.transactionRepository.find({
      where,
      order: {
        createdAt: "DESC",
      },
    });

    const summary = this.generateSummary(transactions);

    return {
      summary,
      transactions,
    };
  }

  private generateSummary(
    transactions: Transaction[],
  ): TransactionReportSummary {
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

  async exportToCsv(transactions: Transaction[]): Promise<string> {
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
