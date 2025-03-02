import { Router } from 'express';
import { WalletVerificationController } from '../controllers/walletVerification.controller';

const router = Router();
const walletVerificationController = new WalletVerificationController();

router.post('/initiate', walletVerificationController.initiateVerification);
router.post('/verify', walletVerificationController.verifyWallet);

export default router;
