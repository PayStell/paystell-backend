import { Router, RequestHandler } from "express";
import {
  sendVerificationEmail,
  verifyEmail,
  resendVerificationEmail,
} from "../controllers/emailVerification";

const router = Router();

router.post("/send", sendVerificationEmail as RequestHandler);

router.get("/verify", verifyEmail as RequestHandler);

router.post("/resend", resendVerificationEmail as RequestHandler);

export default router;
