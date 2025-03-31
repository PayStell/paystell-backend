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

  async processPayment(req: Request, res: Response) {
    try {
      const { payerAddress, merchantAddress, amount, tokenAddress, orderId, expiration, nonce } = req.body;
      
      const result = await this.paymentService.processPayment(
        payerAddress,
        merchantAddress,
        amount,
        tokenAddress,
        orderId,
        expiration,
        nonce
      );
      
      res.json({ success: true, message: "Payment processed", result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ success: false, message: errorMessage });
    }
  }
}