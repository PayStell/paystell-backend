import { Router } from 'express';
import WalletVerificationController from '../controllers/wallet-verification.controller';

const router = Router();

router.post('/initiate', async (req, res) => {
    await WalletVerificationController.initiateVerification(req, res);
});

router.post('/verify', async (req, res) => {
    await WalletVerificationController.verifyWallet(req, res);
});

export default router;