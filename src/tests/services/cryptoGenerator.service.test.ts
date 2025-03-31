import crypto from "crypto";
import { WebhookPayload } from "../../interfaces/webhook.interfaces";
import { CryptoGeneratorService } from "../../services/cryptoGenerator.service";

jest.mock("crypto");
jest.spyOn(crypto, "randomBytes").mockImplementation((size: number) => {
  return Buffer.from(
    Array.from({ length: size }, () => Math.floor(Math.random() * 256)),
  );
});

describe("CryptoGeneratorService", () => {
  let cryptoGeneratorService: CryptoGeneratorService;

  beforeEach(() => {
    cryptoGeneratorService = new CryptoGeneratorService();
    jest.clearAllMocks();
  });

  const mockWebhookPayload: WebhookPayload = {
    transactionId: "txn123",
    transactionType: "deposit",
    status: "completed",
    amount: "100.00",
    asset: "USDC",
    merchantId: "merchant123",
    timestamp: new Date().toISOString(),
    eventType: "payment.success",
    reqMethod: "POST",
  };

  const secret = "test-secret";

  describe("generateSignature", () => {
    it("should generate a valid HMAC signature", async () => {
      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue("mock-signature"),
      };

      (crypto.createHmac as jest.Mock).mockReturnValue(mockHmac);

      const signature =
        await cryptoGeneratorService.generateSignatureForWebhookPayload(
          mockWebhookPayload,
          secret,
        );

      expect(crypto.createHmac).toHaveBeenCalledWith("sha256", secret);
      expect(mockHmac.update).toHaveBeenCalledWith(
        JSON.stringify(mockWebhookPayload),
      );
      expect(mockHmac.digest).toHaveBeenCalledWith("hex");
      expect(signature).toBe("mock-signature");
    });
  });
});
