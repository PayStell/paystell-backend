import { BASE_FEE, Contract, xdr, TransactionBuilder } from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/lib/horizon";
import dotenv from "dotenv";
import { getRepository } from "typeorm";
import { Payment } from "../entities/Payment";
import { generatePaymentId } from "../utils/generatePaymentId";
import { generateSignature } from "../utils/signatureUtils";
import config from "src/config/stellarConfig";

dotenv.config();

export class PaymentService {
  private paymentRepository = getRepository(Payment);

  async createPayment(paymentData: Partial<Payment>): Promise<Payment> {
    if (!paymentData.paymentLink) {
      throw new Error("Payment link is required");
    }

    const payment = new Payment();
    Object.assign(payment, paymentData);
    payment.amount = paymentData.paymentLink.amount;

    let isUnique = false;
    while (!isUnique) {
      payment.paymentId = generatePaymentId();
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
      throw new Error("Payment not found");
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
    nonce: string
  ) {
    const server = new Server(config.STELLAR_HORIZON_URL);
    const contract = new Contract(config.SOROBAN_CONTRACT_ID);

    // Generate Ed25519 signature
    const signature = generateSignature(
      payerAddress,
      merchantAddress,
      amount,
      tokenAddress,
      orderId,
      expiration,
      nonce
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
      ])
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
}