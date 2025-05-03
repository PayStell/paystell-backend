import { Keypair } from "@stellar/stellar-sdk";
import { PaymentOrderDTO } from "../dtos/StellarContractDTO";

/**
 * Validates a signature for a payment order
 * @param paymentOrder The payment order data
 * @param signature The signature to verify
 * @param merchantPublicKey The merchant's public key
 * @returns boolean indicating if the signature is valid
 */
export function validateSignature(
  paymentOrder: PaymentOrderDTO,
  signature: string,
  merchantPublicKey: string,
): boolean {
  try {
    // Create message to verify
    const message = Buffer.from(
      JSON.stringify({
        merchantAddress: paymentOrder.merchantAddress,
        amount: paymentOrder.amount,
        tokenAddress: paymentOrder.tokenAddress,
        orderId: paymentOrder.orderId,
        nonce: paymentOrder.nonce,
        expiration: paymentOrder.expiration,
      }),
    );

    // Convert signature from hex to Buffer
    const signatureBuffer = Buffer.from(signature, "hex");

    // Create Keypair from merchant's public key
    const merchantKeypair = Keypair.fromPublicKey(merchantPublicKey);

    // Verify signature
    return merchantKeypair.verify(message, signatureBuffer);
  } catch (error) {
    console.error("Signature validation failed:", error);
    return false;
  }
}
