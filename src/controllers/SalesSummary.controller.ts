import { Request, Response } from "express";
import { SalesSummaryService } from "../services/SalesSummary.service";
import { Merchant } from "../interfaces/webhook.interfaces";

// Define custom request type with merchant property
interface MerchantRequest extends Request {
  merchant?: Merchant;
}

export class SalesSummaryController {
  private salesSummaryService: SalesSummaryService;

  constructor() {
    this.salesSummaryService = new SalesSummaryService();
  }

  async getTotalSales(req: Request, res: Response): Promise<Response> {
    const merchantReq = req as MerchantRequest;
    const merchantId = merchantReq.merchant?.id;

    if (!merchantId) {
      return res.status(401).json({ error: "Merchant not authenticated" });
    }

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    if (startDate && isNaN(startDate.getTime())) {
      return res.status(400).json({ error: "Invalid startDate format" });
    }

    if (endDate && isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid endDate format" });
    }

    try {
      const totalSales = await this.salesSummaryService.getTotalSales(
        merchantId,
        startDate,
        endDate,
      );

      return res.status(200).json({
        success: true,
        data: { totalSales },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  async getSalesByTimePeriod(req: Request, res: Response): Promise<Response> {
    const merchantReq = req as MerchantRequest;
    const merchantId = merchantReq.merchant?.id;

    if (!merchantId) {
      return res.status(401).json({ error: "Merchant not authenticated" });
    }

    const timePeriod = req.params.timePeriod as "daily" | "weekly" | "monthly";
    if (!["daily", "weekly", "monthly"].includes(timePeriod)) {
      return res.status(400).json({
        error: "Invalid timePeriod. Must be one of: daily, weekly, monthly",
      });
    }

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    if (startDate && isNaN(startDate.getTime())) {
      return res.status(400).json({ error: "Invalid startDate format" });
    }

    if (endDate && isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid endDate format" });
    }

    try {
      const salesByPeriod = await this.salesSummaryService.getSalesByTimePeriod(
        merchantId,
        timePeriod,
        startDate,
        endDate,
      );

      return res.status(200).json({
        success: true,
        data: {
          timePeriod,
          sales: salesByPeriod,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  async getTopSellingProducts(req: Request, res: Response): Promise<Response> {
    const merchantReq = req as MerchantRequest;
    const merchantId = merchantReq.merchant?.id;

    if (!merchantId) {
      return res.status(401).json({ error: "Merchant not authenticated" });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res
        .status(400)
        .json({ error: "Invalid limit. Must be a number between 1 and 100" });
    }

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    if (startDate && isNaN(startDate.getTime())) {
      return res.status(400).json({ error: "Invalid startDate format" });
    }

    if (endDate && isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid endDate format" });
    }

    try {
      const topProducts = await this.salesSummaryService.getTopSellingProducts(
        merchantId,
        limit,
        startDate,
        endDate,
      );

      return res.status(200).json({
        success: true,
        data: { topProducts },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  async getSalesSummary(req: Request, res: Response): Promise<Response> {
    const merchantReq = req as MerchantRequest;
    const merchantId = merchantReq.merchant?.id;

    if (!merchantId) {
      return res.status(401).json({ error: "Merchant not authenticated" });
    }

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    if (startDate && isNaN(startDate.getTime())) {
      return res.status(400).json({ error: "Invalid startDate format" });
    }

    if (endDate && isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid endDate format" });
    }

    try {
      const summary = await this.salesSummaryService.getSalesSummary(
        merchantId,
        startDate,
        endDate,
      );

      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }
}
