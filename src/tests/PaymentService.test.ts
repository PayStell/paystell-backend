import { PaymentService } from "../services/PaymentService"
import { getRepository } from "typeorm"
import type { Payment } from "../entities/Payment"

jest.mock("typeorm", () => ({
  getRepository: jest.fn(),
  Entity: jest.fn(),
  PrimaryGeneratedColumn: jest.fn(),
  Column: jest.fn(),
}))

describe('Payment Service Tests', () => {
  test('should create a payment successfully', async () => {
    // Implement test
  });
});

describe("PaymentService", () => {
  let paymentService: PaymentService
  let mockRepository: any

  beforeEach(() => {
    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    }
    ;(getRepository as jest.Mock).mockReturnValue(mockRepository)
    paymentService = new PaymentService()
  })

  it("should create a payment with a unique ID", async () => {
    mockRepository.findOne.mockResolvedValue(null)
    mockRepository.save.mockImplementation((payment: Payment) => Promise.resolve(payment))

    const payment = await paymentService.createPayment({ amount: 100, currency: "USD" })

    expect(payment.paymentId).toBeDefined()
    expect(payment.paymentId.length).toBe(12)
    expect(payment.amount).toBe(100)
    expect(payment.currency).toBe("USD")
  })

  it("should generate a valid payment URL", () => {
    const paymentId = "abc123"
    const url = paymentService.getPaymentUrl(paymentId)
    expect(url).toBe(`https://buy.paystell.com/${paymentId}`)
  })
})

