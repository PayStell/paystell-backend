import express, { Request, Response, RequestHandler } from "express";
import {
  Transaction,
  TransactionStatus,
  PaymentMethod,
} from "../entities/Transaction";
import {
  TransactionReportService,
  TransactionReportFilters,
} from "../services/TransactionReportService";
import { AuthGuard } from "../guards/AuthGuard";
import AppDataSource from "../config/db";

const router = express.Router();

// Initialize the service
const transactionReportService = new TransactionReportService(
  AppDataSource.getRepository(Transaction),
);

/**
 * @swagger
 * /reports/transactions:
 *   get:
 *     summary: Generate transaction report
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *         description: Start date for the report (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *         description: End date for the report (ISO format)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, success, failed]
 *         description: Filter by transaction status
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [card, bank_transfer, wallet]
 *         description: Filter by payment method
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *         description: Response format
 */

// Apply auth middleware - cast to RequestHandler to bypass type checks
router.use(AuthGuard as RequestHandler);

// Generate transaction report
// Use an anonymous function and cast to RequestHandler to bypass type checking
router.get("/", (async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const status = req.query.status as TransactionStatus | undefined;
    const paymentMethod = req.query.paymentMethod as PaymentMethod | undefined;
    const format = (req.query.format as string) || "json";

    const filters: TransactionReportFilters = {
      merchantId: res.locals.merchantId,
    };

    if (startDate) {
      filters.startDate = new Date(startDate);
    }

    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    if (status) {
      filters.status = status;
    }

    if (paymentMethod) {
      filters.paymentMethod = paymentMethod;
    }

    const report = await transactionReportService.generateReport(filters);

    if (format === "csv") {
      const csv = await transactionReportService.exportToCsv(
        report.transactions,
      );
      res.header("Content-Type", "text/csv");
      res.header(
        "Content-Disposition",
        "attachment; filename=transaction-report.csv",
      );
      return res.send(csv);
    }

    return res.json({
      success: true,
      data: report,
    });
  } catch (error: unknown) {
    console.error("Error generating transaction report:", error);

    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "An unknown error occurred",
    });
  }
}) as unknown as RequestHandler);

export default router;
