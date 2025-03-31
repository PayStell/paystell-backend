import request from "supertest";
import express from "express";
import walletVerificationRoutes from "../../routes/wallet-verification.routes";
// import WalletVerificationService from '../../services/wallet-verification.service';
import WalletVerificationService from "../../services/wallet-verification.service";

jest.mock("../../services/wallet-verification.service");

const app = express();
app.use(express.json());
app.use("/wallet-verification", walletVerificationRoutes);

describe("WalletVerificationController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /wallet-verification/initiate", () => {
    it("should initiate wallet verification", async () => {
      (
        WalletVerificationService.prototype.initiateVerification as jest.Mock
      ).mockResolvedValue({
        verificationCode: "123456",
      });

      const response = await request(app)
        .post("/wallet-verification/initiate")
        .send({ userId: 1, walletAddress: "GCFD..." });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("verificationCode");
    });

    it("should return 400 for invalid wallet address", async () => {
      (
        WalletVerificationService.prototype.initiateVerification as jest.Mock
      ).mockRejectedValue(new Error("Invalid Stellar wallet address."));

      const response = await request(app)
        .post("/wallet-verification/initiate")
        .send({ userId: 1, walletAddress: "INVALID" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "message",
        "Invalid Stellar wallet address.",
      );
    });
  });

  describe("POST /wallet-verification/verify", () => {
    it("should verify wallet", async () => {
      (
        WalletVerificationService.prototype.verifyWallet as jest.Mock
      ).mockResolvedValue(true);

      const response = await request(app)
        .post("/wallet-verification/verify")
        .send({ token: "test-token", code: "123456" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });
});
