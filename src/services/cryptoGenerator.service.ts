import crypto from "crypto";
import { WebhookPayload } from "../interfaces/webhook.interfaces";

export class CryptoGeneratorService {
  async generateSignatureForWebhookPayload(
    payload: WebhookPayload,
    secret: string,
  ): Promise<string> {
    const nonce = await this.generateNonce();
    const { timestamp } = payload;
    const timestampMs = Date.parse(timestamp);
    const now = Date.now();

    if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
      throw new Error(
        "Timestamp validation failed. Request too old or future dated",
      );
    }

    const hmac = crypto.createHmac("sha256", secret);
    payload.nonce = nonce;

    const dataToSign = {
      ...payload,
      nonce,
      timestamp,
    };

    hmac.update(JSON.stringify(dataToSign));
    const signature = hmac.digest("hex");

    if (payload.reqMethod === "GET" || payload.reqMethod.startsWith("GET_")) {
      const urlString = payload.metadata?.url;
      if (typeof urlString !== "string") {
        throw new Error("URL is required for GET requests");
      }
      const url = new URL(urlString);
      url.searchParams.append("signature", signature);
      return url.toString();
    }

    return signature;
  }

  private async generateNonce(): Promise<string> {
    return crypto.randomBytes(16).toString("hex");
  }
  
  /**
   * Generates a cryptographically secure random string to use as webhook secret
   * @returns A 32-character hex string
   */
  generateSecret(): string {
    return crypto.randomBytes(32).toString("hex");
  }
  
  /**
   * Verifies the webhook signature against the payload using HMAC-SHA256
   * @param payload The webhook payload
   * @param signature The signature to verify
   * @param secret The secret key
   * @returns Boolean indicating if signature is valid
   */
  verifySignature(payload: any, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(JSON.stringify(payload));
    const calculatedSignature = hmac.digest("hex");
    
    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature, "hex"),
      Buffer.from(signature, "hex")
    );
  }
}
