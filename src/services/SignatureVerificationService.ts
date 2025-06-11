import * as StellarSdk from "@stellar/stellar-sdk";
import * as nacl from "tweetnacl";
import { AppError } from "../utils/AppError";
import logger from "../utils/logger";
import config from "../config/stellarConfig";

export interface PaymentSignatureData {
  payerAddress: string;
  merchantAddress: string;
  amount: string;
  tokenAddress: string;
  orderId: string;
  expiration: number;
  nonce: string;
}

export class SignatureVerificationService {
  /**
   * Verify a payment signature using Stellar SDK
   */
  async verifyPaymentSignature(
    signatureData: PaymentSignatureData,
    signature: string,
    publicKey: string,
  ): Promise<boolean> {
    try {
      // Validate inputs
      if (!signature || !publicKey) {
        throw new AppError("Missing signature or public key", 400);
      }

      if (!this.validateStellarAddress(publicKey)) {
        throw new AppError("Invalid public key format", 400);
      }

      // Create the message to verify
      const message = this.createPaymentMessage(signatureData);

      // Convert signature from base64 to Uint8Array
      const signatureBytes = Buffer.from(signature, "base64");

      // Convert public key from Stellar format to raw bytes
      const publicKeyBytes =
        StellarSdk.StrKey.decodeEd25519PublicKey(publicKey);

      // Verify the signature
      const isValid = nacl.sign.detached.verify(
        Buffer.from(message, "utf8"),
        signatureBytes,
        publicKeyBytes,
      );

      logger.info("Signature verification result:", {
        orderId: signatureData.orderId,
        isValid,
        publicKey,
      });

      return isValid;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error("Error verifying signature:", error);
      throw new AppError("Failed to verify signature", 500);
    }
  }

  /**
   * Create a standardized message for payment signing
   */
  private createPaymentMessage(data: PaymentSignatureData): string {
    // Use JSON serialization with sorted keys for deterministic output
    const messageObj = {
      amount: data.amount,
      expiration: data.expiration,
      merchantAddress: data.merchantAddress,
      nonce: data.nonce,
      orderId: data.orderId,
      payerAddress: data.payerAddress,
      tokenAddress: data.tokenAddress,
    };
    return JSON.stringify(messageObj);
  }

  /**
   * Verify that a Stellar address is valid
   */
  validateStellarAddress(address: string): boolean {
    try {
      return StellarSdk.StrKey.isValidEd25519PublicKey(address);
    } catch {
      return false;
    }
  }

  /**
   * Verify transaction hash on Stellar network
   */
  async verifyTransactionOnNetwork(
    transactionHash: string,
    expectedAmount: string,
    expectedDestination: string,
    expectedAsset: string,
  ): Promise<boolean> {
    try {
      // Initialize Stellar server from configuration
      const server = new StellarSdk.Horizon.Server(config.STELLAR_HORIZON_URL);

      // Get transaction details
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transaction: any = await server
        .transactions()
        .transaction(transactionHash)
        .call();

      // Verify transaction was successful
      if (!transaction.successful) {
        logger.warn("Transaction was not successful:", { transactionHash });
        return false;
      }

      // Get operations for this transaction
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const operations: any = await server
        .operations()
        .forTransaction(transactionHash)
        .call();

      // Look for payment operation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paymentOp: any = operations.records.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (op: any) =>
          op.type === "payment" || op.type === "path_payment_strict_receive",
      );

      if (!paymentOp) {
        logger.warn("No payment operation found in transaction:", {
          transactionHash,
        });
        return false;
      }

      // Verify payment details
      const isAmountValid = paymentOp.amount === expectedAmount;
      const isDestinationValid = paymentOp.to === expectedDestination;
      const assetCode =
        paymentOp.asset_type === "native"
          ? "XLM"
          : paymentOp.asset_code || "XLM";
      const isAssetValid = this.compareAssets(assetCode, expectedAsset);

      logger.info("Transaction verification details:", {
        transactionHash,
        isAmountValid,
        isDestinationValid,
        isAssetValid,
        operationType: paymentOp.type,
        actualAmount: paymentOp.amount,
        expectedAmount,
        actualDestination: paymentOp.to,
        expectedDestination,
        actualAsset: assetCode,
        expectedAsset,
      });

      return isAmountValid && isDestinationValid && isAssetValid;
    } catch (error) {
      logger.error("Error verifying transaction on network:", error);
      return false;
    }
  }

  /**
   * Compare asset codes (handle native XLM)
   */
  private compareAssets(actual: string, expected: string): boolean {
    // Handle native Stellar Lumens
    if (
      (actual === "XLM" || actual === "native") &&
      (expected === "XLM" || expected === "native")
    ) {
      return true;
    }

    return actual === expected;
  }

  /**
   * Generate a secure nonce for payment requests
   */
  generateNonce(): string {
    const randomBytes = nacl.randomBytes(32);
    return Buffer.from(randomBytes).toString("base64");
  }

  /**
   * Validate payment expiration
   */
  validateExpiration(expiration: number, bufferSeconds: number = 300): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    const expirationWithBuffer = expiration + bufferSeconds;

    return currentTime <= expirationWithBuffer;
  }
}
