import { Router } from "express";
import { ReferralController } from "../controllers/ReferralController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { body, param } from "express-validator";

const router = Router();
const referralController = new ReferralController();

// Validation middleware
const createReferralValidation = [
  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage("Invalid expiration date"),
];

const processReferralValidation = [
  body("referralCode").notEmpty().withMessage("Referral code is required"),
];

const validateCodeValidation = [
  param("code").notEmpty().withMessage("Referral code is required"),
];

const processRewardValidation = [
  param("id").isInt().withMessage("Invalid reward ID"),
  body("transactionHash").optional().isString(),
];

// Routes
router.post(
  "/referrals",
  authMiddleware,
  createReferralValidation,
  referralController.createReferral,
);
router.post(
  "/referrals/signup",
  authMiddleware,
  processReferralValidation,
  referralController.processReferralSignup,
);
router.get("/referrals", authMiddleware, referralController.getUserReferrals);
router.get(
  "/referrals/stats",
  authMiddleware,
  referralController.getUserReferralStats,
);
router.get(
  "/referrals/rewards",
  authMiddleware,
  referralController.getUserRewards,
);
router.get(
  "/referrals/validate/:code",
  validateCodeValidation,
  referralController.validateReferralCode,
);
router.put(
  "/referrals/rewards/:id/pay",
  authMiddleware,
  processRewardValidation,
  referralController.processRewardPayment,
);

export default router;
