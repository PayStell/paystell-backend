import { PaymentService } from "../services/PaymentService";
import AppDataSource from "./../config/db";
import type { Payment } from "../entities/Payment";
import { PaymentLink } from "../entities/PaymentLink";

jest.mock("../config/db", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock("typeorm", () => ({
  Entity: jest.fn(),
  PrimaryGeneratedColumn: jest.fn(),
  Column: jest.fn(),
  CreateDateColumn: jest.fn(),
  UpdateDateColumn: jest.fn(),
  ManyToOne: jest.fn(),
  JoinColumn: jest.fn(),
}));

jest.mock("nanoid", () => ({
  customAlphabet: () => () => "123456789012",
}));

describe('Payment Service Tests', () => {
  test('should create a payment successfully', async () => {
    // Implement test
  });
});

describe("PaymentService", () => {
  let paymentService: PaymentService;

  // Definir los tipos más específicos para los mocks
  type MockRepository = {
    findOne: jest.Mock;
    save: jest.Mock;
  };

  // PaymentLink se importa y se utiliza aquí para tipar correctamente los mocks
  let mockRepository: MockRepository;
  let mockPaymentLink: Partial<PaymentLink>;

  beforeEach(() => {
    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
    paymentService = new PaymentService();

    mockPaymentLink = {
      id: "mock-uuid",
      name: "Test Payment",
      sku: "TEST123",
      amount: 100,
      currency: "USD",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  it("should create a payment with a unique ID", async () => {
    mockRepository.findOne.mockResolvedValue(null);
    mockRepository.save.mockImplementation((payment: Payment) =>
      Promise.resolve({
        ...payment,
        paymentLink: mockPaymentLink,
      }),
    );

    const payment = await paymentService.createPayment({
      paymentLink: mockPaymentLink as PaymentLink,
    });

    expect(payment.paymentId).toBeDefined();
    expect(typeof payment.paymentId).toBe("string");
    expect(payment.paymentLink).toBeDefined();
    expect(payment.amount).toBe(100);
    expect(payment.paymentLink.currency).toBe("USD");
  });

  it("should throw error when payment link is not provided", async () => {
    await expect(paymentService.createPayment({})).rejects.toThrow(
      "Payment link is required",
    );
  });

  it("should generate a valid payment URL", () => {
    const paymentId = "abc123";
    const url = paymentService.getPaymentUrl(paymentId);
    expect(url).toBe(`https://buy.paystell.com/${paymentId}`);
  });
  it("should change the status of a payment", async () => {
    const mockPayment = {
      id: "mock-uuid",
      status: "pending",
      paymentLink: mockPaymentLink as PaymentLink,
    };

    mockRepository.findOne.mockResolvedValue(mockPayment);
    mockRepository.save.mockResolvedValue({
      ...mockPayment,
      status: "completed",
    });

    const payment = await paymentService.updatePaymentStatus(
      "mock-uuid",
      "completed",
    );

    expect(mockRepository.findOne).toHaveBeenCalledWith({
      relations: ["paymentLink"],
      where: { paymentId: "mock-uuid" },
    });
    expect(payment.status).toBe("completed");
  });
});
