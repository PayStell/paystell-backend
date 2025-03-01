import { PaymentService } from "../services/PaymentService"
import { getRepository } from "typeorm"
import type { Payment } from "../entities/Payment"

jest.mock("typeorm", () => ({
  getRepository: jest.fn(),
  Entity: jest.fn(),
  PrimaryGeneratedColumn: jest.fn(),
  Column: jest.fn(),
  CreateDateColumn: jest.fn(),
  UpdateDateColumn: jest.fn(),
  ManyToOne: jest.fn(),
  JoinColumn: jest.fn(),
}))

jest.mock('nanoid', () => ({
  customAlphabet: () => () => '123456789012'
}))

describe("PaymentService", () => {
  let paymentService: PaymentService
  let mockRepository: any
  let mockPaymentLink: any

  beforeEach(() => {
    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    }
    ;(getRepository as jest.Mock).mockReturnValue(mockRepository)
    paymentService = new PaymentService()

    mockPaymentLink = {
      id: 'mock-uuid',
      name: 'Test Payment',
      sku: 'TEST123',
      amount: 100,
      currency: 'USD',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  it("should create a payment with a unique ID", async () => {
    mockRepository.findOne.mockResolvedValue(null)
    mockRepository.save.mockImplementation((payment: Payment) => Promise.resolve({
      ...payment,
      paymentLink: mockPaymentLink
    }))

    const payment = await paymentService.createPayment({ paymentLink: mockPaymentLink })

    expect(payment.paymentId).toBeDefined()
    expect(typeof payment.paymentId).toBe('string')
    expect(payment.paymentLink).toBeDefined()
    expect(payment.amount).toBe(100)
    expect(payment.paymentLink.currency).toBe('USD')
  })

  it("should throw error when payment link is not provided", async () => {
    await expect(paymentService.createPayment({}))
      .rejects
      .toThrow("Payment link is required")
  })

  it("should generate a valid payment URL", () => {
    const paymentId = "abc123"
    const url = paymentService.getPaymentUrl(paymentId)
    expect(url).toBe(`https://buy.paystell.com/${paymentId}`)
  })
})

