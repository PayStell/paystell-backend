import { getRepository } from "typeorm"
import { Payment } from "../entities/Payment"
import { generatePaymentId } from "../utils/generatePaymentId"

export class PaymentService {
  private paymentRepository = getRepository(Payment)

  async createPayment(paymentData: Partial<Payment>): Promise<Payment> {
    if (!paymentData.paymentLink) {
      throw new Error("Payment link is required")
    }

    const payment = new Payment()
    Object.assign(payment, paymentData)
    payment.amount = paymentData.paymentLink.amount

    let isUnique = false
    while (!isUnique) {
      payment.paymentId = generatePaymentId()
      const existingPayment = await this.paymentRepository.findOne({ where: { paymentId: payment.paymentId } })
      if (!existingPayment) {
        isUnique = true
      }
    }

    return this.paymentRepository.save(payment)
  }

  getPaymentUrl(paymentId: string): string {
    return `https://buy.paystell.com/${paymentId}`
  }

  async getPaymentById(paymentId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({ 
      where: { paymentId },
      relations: ['paymentLink']
    });
  }

  async updatePaymentStatus(
    paymentId: string, 
    status: "pending" | "completed" | "failed"
  ): Promise<Payment> {
    const payment = await this.getPaymentById(paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }
    payment.status = status;
    return this.paymentRepository.save(payment);
  }
}

