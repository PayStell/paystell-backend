import { Request, Response } from 'express';
import WalletVerificationService from '../services/wallet-verification.service';

class WalletVerificationController {
    private walletVerificationService: WalletVerificationService;

    constructor() {
        this.walletVerificationService = new WalletVerificationService();
    }

    async initiateVerification(req: Request, res: Response) {
        try {
            const { userId, walletAddress } = req.body;
            const verification = await this.walletVerificationService.initiateVerification(userId, walletAddress);
            return res.status(200).json(verification);
        } catch (error: any) {
            return res.status(400).json({ message: error.message });
        }
    }

    async verifyWallet(req: Request, res: Response) {
        try {
            const { token, code } = req.body;
            const result = await this.walletVerificationService.verifyWallet(token, code);
            return res.status(200).json({ success: result });
        } catch (error: any) {
            return res.status(400).json({ message: error.message });
        }
    }
}

export default new WalletVerificationController();
