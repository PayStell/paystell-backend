import { Request, Response } from "express";
import WalletVerificationService from "../services/wallet-verification.service";

class WalletVerificationController {
  private walletVerificationService: WalletVerificationService;

  constructor() {
    this.walletVerificationService = new WalletVerificationService();
  }

  async initiateVerification(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, walletAddress } = req.body;
      const verification =
        await this.walletVerificationService.initiateVerification(
          userId,
          walletAddress,
        );
      return res.status(200).json(verification);
    } catch (error) {
      console.error(error);
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  async verifyWallet(req: Request, res: Response): Promise<Response> {
    try {
      const { token, code } = req.body;
      const result = await this.walletVerificationService.verifyWallet(
        token,
        code,
      );
      return res.status(200).json({ success: result });
    } catch (error) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }
}

export default new WalletVerificationController();
