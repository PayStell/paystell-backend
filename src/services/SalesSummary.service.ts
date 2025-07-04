import { getRepository } from "typeorm";
import { Payment } from "../entities/Payment";
import { PaymentLink } from "../entities/PaymentLink";
import { User } from "../entities/User";
import { MerchantEntity } from "../entities/Merchant.entity";

export class SalesSummaryService {
  private paymentRepository = getRepository(Payment);
  private paymentLinkRepository = getRepository(PaymentLink);
  private userRepository = getRepository(User);
  private merchantRepository = getRepository(MerchantEntity);

  /**
   * Get merchant's total sales
   */
  async getTotalSales(
    merchantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    // Find the merchant first
    const merchant = await this.merchantRepository.findOne({
      where: { id: merchantId, isActive: true },
    });

    if (!merchant) {
      throw new Error("Merchant not found");
    }

    // Need to find all users associated with this merchant
    // In this implementation we're assuming merchant's email matches user's email
    const user = await this.userRepository.findOne({
      where: { email: merchant.email },
    });

    if (!user) {
      throw new Error("User associated with merchant not found");
    }

    // Query all payment links that belong to the user
    const paymentLinks = await this.paymentLinkRepository.find({
      where: { userId: user.id },
    });

    const paymentLinkIds = paymentLinks.map((link) => link.id);

    // Calculate the sum of all completed payments
    const result = await this.paymentRepository
      .createQueryBuilder("payment")
      .innerJoin("payment.paymentLink", "paymentLink")
      .where("paymentLink.id IN (:...ids)", { ids: paymentLinkIds })
      .andWhere("payment.status = :status", { status: "completed" })
      .andWhere(
        startDate ? "payment.createdAt >= :startDate" : "1=1",
        startDate ? { startDate } : {},
      )
      .andWhere(
        endDate ? "payment.createdAt <= :endDate" : "1=1",
        endDate ? { endDate } : {},
      )
      .select("SUM(payment.amount)", "total")
      .getRawOne();

    return result?.total || 0;
  }

  /**
   * Get merchant's sales by time period (daily, weekly, monthly)
   */
  async getSalesByTimePeriod(
    merchantId: string,
    timePeriod: "daily" | "weekly" | "monthly",
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ date: string; total: number }[]> {
    // Find the merchant first
    const merchant = await this.merchantRepository.findOne({
      where: { id: merchantId, isActive: true },
    });

    if (!merchant) {
      throw new Error("Merchant not found");
    }

    // Get the user associated with this merchant
    const user = await this.userRepository.findOne({
      where: { email: merchant.email },
    });

    if (!user) {
      throw new Error("User associated with merchant not found");
    }

    // Query all payment links that belong to the user
    const paymentLinks = await this.paymentLinkRepository.find({
      where: { userId: user.id },
    });

    const paymentLinkIds = paymentLinks.map((link) => link.id);

    if (paymentLinkIds.length === 0) {
      return []; // Return empty result if no payment links found
    }

    // Set default date range if not provided
    const now = new Date();
    const actualEndDate = endDate || now;
    let actualStartDate = startDate;

    if (!actualStartDate) {
      // Default time periods if start date not provided
      switch (timePeriod) {
        case "daily":
          // Last 7 days
          actualStartDate = new Date(now);
          actualStartDate.setDate(now.getDate() - 7);
          break;
        case "weekly":
          // Last 4 weeks
          actualStartDate = new Date(now);
          actualStartDate.setDate(now.getDate() - 28);
          break;
        case "monthly":
          // Last 12 months
          actualStartDate = new Date(now);
          actualStartDate.setMonth(now.getMonth() - 12);
          break;
      }
    }

    // Build the date truncation SQL based on the time period
    let dateFormat: string;
    switch (timePeriod) {
      case "daily":
        dateFormat = "YYYY-MM-DD";
        break;
      case "weekly":
        // Group by ISO week
        dateFormat = "IYYY-IW";
        break;
      case "monthly":
        dateFormat = "YYYY-MM";
        break;
    }

    // Create query to get sales grouped by time period
    const result = await this.paymentRepository
      .createQueryBuilder("payment")
      .innerJoin("payment.paymentLink", "paymentLink")
      .where("paymentLink.id IN (:...ids)", { ids: paymentLinkIds })
      .andWhere("payment.status = :status", { status: "completed" })
      .andWhere("payment.createdAt >= :startDate", {
        startDate: actualStartDate,
      })
      .andWhere("payment.createdAt <= :endDate", { endDate: actualEndDate })
      .select(`TO_CHAR(payment.createdAt, '${dateFormat}')`, "date")
      .addSelect("SUM(payment.amount)", "total")
      .groupBy(`TO_CHAR(payment.createdAt, '${dateFormat}')`)
      .orderBy(`TO_CHAR(payment.createdAt, '${dateFormat}')`)
      .getRawMany();

    return result.map((item) => ({
      date: item.date,
      total: parseFloat(item.total) || 0,
    }));
  }

  /**
   * Get top selling payment links for a merchant
   */
  async getTopSellingProducts(
    merchantId: string,
    limit: number = 10,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ name: string; sku: string; total: number; count: number }[]> {
    // Find the merchant
    const merchant = await this.merchantRepository.findOne({
      where: { id: merchantId, isActive: true },
    });

    if (!merchant) {
      throw new Error("Merchant not found");
    }

    // Get the user associated with this merchant
    const user = await this.userRepository.findOne({
      where: { email: merchant.email },
    });

    if (!user) {
      throw new Error("User associated with merchant not found");
    }

    // Set default date range if not provided
    const now = new Date();
    const actualEndDate = endDate || now;
    const actualStartDate =
      startDate || new Date(now.setMonth(now.getMonth() - 3)); // Default to last 3 months

    // Query to get top selling products
    const result = await this.paymentRepository
      .createQueryBuilder("payment")
      .innerJoin("payment.paymentLink", "paymentLink")
      .where("paymentLink.userId = :userId", { userId: user.id })
      .andWhere("payment.status = :status", { status: "completed" })
      .andWhere("payment.createdAt >= :startDate", {
        startDate: actualStartDate,
      })
      .andWhere("payment.createdAt <= :endDate", { endDate: actualEndDate })
      .select("paymentLink.name", "name")
      .addSelect("paymentLink.sku", "sku")
      .addSelect("SUM(payment.amount)", "total")
      .addSelect("COUNT(payment.id)", "count")
      .groupBy("paymentLink.name")
      .addGroupBy("paymentLink.sku")
      .orderBy("total", "DESC")
      .limit(limit)
      .getRawMany();

    return result.map((item) => ({
      name: item.name,
      sku: item.sku,
      total: parseFloat(item.total) || 0,
      count: parseInt(item.count) || 0,
    }));
  }

  /**
   * Get sales summary with all metrics
   */
  async getSalesSummary(
    merchantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalSales: number;
    dailySales: { date: string; total: number }[];
    monthlySales: { date: string; total: number }[];
    topProducts: { name: string; sku: string; total: number; count: number }[];
  }> {
    // Execute all queries in parallel for better performance
    const [totalSales, dailySales, monthlySales, topProducts] =
      await Promise.all([
        this.getTotalSales(merchantId, startDate, endDate),
        this.getSalesByTimePeriod(merchantId, "daily", startDate, endDate),
        this.getSalesByTimePeriod(merchantId, "monthly", startDate, endDate),
        this.getTopSellingProducts(merchantId, 5, startDate, endDate),
      ]);

    return {
      totalSales,
      dailySales,
      monthlySales,
      topProducts,
    };
  }
}
