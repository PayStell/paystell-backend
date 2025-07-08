import { Router, Request, Response } from "express";
import WalletVerificationController from "../controllers/wallet-verification.controller";

const router = Router();

/**
 * @swagger
 * /wallet-verification/initiate:
 *   post:
 *     summary: Initiate wallet verification
 *     description: Initiates the wallet verification process by sending a verification email
 *     tags: [Wallet Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               walletAddress:
 *                 type: string
 *                 description: Stellar wallet address to verify
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to send verification to
 *             required:
 *               - walletAddress
 *               - email
 *     responses:
 *       200:
 *         description: Verification initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Verification email sent successfully"
 *                 verificationId:
 *                   type: string
 *                   description: Unique verification identifier
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Conflict - verification already in progress
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/initiate", async (req, res) => {
  await WalletVerificationController.initiateVerification(
    req as Request,
    res as Response,
  );
});

/**
 * @swagger
 * /wallet-verification/verify:
 *   post:
 *     summary: Verify wallet
 *     description: Completes the wallet verification process using the verification token
 *     tags: [Wallet Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               verificationId:
 *                 type: string
 *                 description: Verification identifier from initiation
 *               token:
 *                 type: string
 *                 description: Verification token from email
 *               signature:
 *                 type: string
 *                 description: Cryptographic signature proving wallet ownership
 *             required:
 *               - verificationId
 *               - token
 *               - signature
 *     responses:
 *       200:
 *         description: Wallet verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Wallet verified successfully"
 *                 walletAddress:
 *                   type: string
 *                   description: Verified wallet address
 *       400:
 *         description: Bad request - validation error or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized - invalid verification token or signature
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Verification not found or expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/verify", async (req, res) => {
  await WalletVerificationController.verifyWallet(
    req as Request,
    res as Response,
  );
});

export default router;
