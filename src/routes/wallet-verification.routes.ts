import { Router, Request, Response } from "express";
import WalletVerificationController from "../controllers/wallet-verification.controller";

const router = Router();

router.post("/initiate", async (req, res) => {
  await WalletVerificationController.initiateVerification(
    req as Request,
    res as Response,
  );
});

router.post("/verify", async (req, res) => {
  await WalletVerificationController.verifyWallet(
    req as Request,
    res as Response,
  );
});

export default router;
