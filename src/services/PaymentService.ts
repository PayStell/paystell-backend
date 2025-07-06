import {
  BASE_FEE,
  Contract,
  xdr,
  TransactionBuilder,
  Horizon,
} from "@stellar/stellar-sdk";
import dotenv from "dotenv";
import { Repository } from "typeorm";
import { Payment } from "../entities/Payment";
import { generatePaymentId } from "../utils/generatePaymentId";
import { generateSignature } from "../utils/signatureUtils";
import config from "../config/stellarConfig";
import AppDataSource from "../config/db";
import { AppError } from "../utils/AppError";

dotenv.config();

export class PaymentService {
  private paymentRepository: Repository<Payment>;

  constructor() {
    this.paymentRepository = AppDataSource.getRepository(Payment);
  }

  async createPayment(paymentData: Partial<Payment>): Promise<Payment> {
    if (!paymentData.paymentLink) {
      throw new AppError("Payment link is required", 400);
    }

    const payment = new Payment();
    Object.assign(payment, paymentData);
    payment.amount = paymentData.paymentLink.amount;

    let isUnique = false;
    while (!isUnique) {
      payment.paymentId = await generatePaymentId();
      const existingPayment = await this.paymentRepository.findOne({
        where: { paymentId: payment.paymentId },
      });
      if (!existingPayment) {
        isUnique = true;
      }
    }

    return this.paymentRepository.save(payment);
  }

  getPaymentUrl(paymentId: string): string {
    return `https://buy.paystell.com/${paymentId}`;
  }

  async getPaymentById(paymentId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { paymentId },
      relations: ["paymentLink"],
    });
  }

  async updatePaymentStatus(
    paymentId: string,
    status: "pending" | "completed" | "failed",
  ): Promise<Payment> {
    const payment = await this.getPaymentById(paymentId);
    if (!payment) {
      throw new AppError("Payment not found", 404);
    }
    payment.status = status;
    return this.paymentRepository.save(payment);
  }

  async processPayment(
    payerAddress: string,
    merchantAddress: string,
    amount: number,
    tokenAddress: string,
    orderId: string,
    expiration: number,
    nonce: string,
  ) {
    const server = new Horizon.Server(config.STELLAR_HORIZON_URL);
    const contract = new Contract(config.SOROBAN_CONTRACT_ID);

    // Generate Ed25519 signature
    const signature = generateSignature(
      payerAddress,
      merchantAddress,
      amount,
      tokenAddress,
      orderId,
      expiration,
      nonce,
    );

    const operation = contract.call(
      "process_payment_with_signature",
      xdr.ScVal.scvVec([
        xdr.ScVal.scvString(payerAddress),
        xdr.ScVal.scvString(merchantAddress),
        xdr.ScVal.scvI64(xdr.Int64.fromString(amount.toString())),
        xdr.ScVal.scvString(tokenAddress),
        xdr.ScVal.scvString(orderId),
        xdr.ScVal.scvI64(xdr.Int64.fromString(expiration.toString())),
        xdr.ScVal.scvString(nonce),
        xdr.ScVal.scvBytes(Buffer.from(signature, "hex")),
      ]),
    );

    const account = await server.loadAccount(payerAddress);
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: config.STELLAR_NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(180)
      .build();

    return server.submitTransaction(transaction);
  }

  async getPayments(query: {
    page?: number;
    limit?: number;
    status?: "pending" | "completed" | "failed";
    merchantId?: string;
    userMerchantId?: string; // From authenticated user context
  }): Promise<Payment[]> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        merchantId,
        userMerchantId,
      } = query;

      // Ensure user can only access their merchant's payments
      if (merchantId && userMerchantId && merchantId !== userMerchantId) {
        throw new AppError("Access denied to merchant data", 403);
      }

      const skip = (page - 1) * limit;

      const whereConditions: {
        status?: "pending" | "completed" | "failed";
        merchantId?: string;
      } = {};
      if (status) whereConditions.status = status;
      if (merchantId) whereConditions.merchantId = merchantId;
      // If no merchantId specified but userMerchantId exists, use it
      else if (userMerchantId) whereConditions.merchantId = userMerchantId;

      const payments = await this.paymentRepository.find({
        where: whereConditions,
        skip,
        take: limit,
        order: { createdAt: "DESC" },
        relations: ["paymentLink"],
      });

      return payments;
    } catch (error) {
      throw new AppError(`Failed to get payments: ${error}`, 500);
    }
  }
}
