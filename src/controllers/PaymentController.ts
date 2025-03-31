import type { Request, Response, NextFunction } from "express";
import { PaymentService } from "../services/PaymentService";

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  async createPayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const payment = await this.paymentService.createPayment(req.body);
      const paymentUrl = this.paymentService.getPaymentUrl(payment.paymentId);

      res.status(201).json({
        payment,
        paymentUrl,
      });
    } catch (error) {
      next(error);
    }
  }
}
