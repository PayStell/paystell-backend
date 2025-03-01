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
}

