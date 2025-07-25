import { Router } from "express";
import userRoutes from "./userRoutes";
import salesSummaryRoutes from "./salesSummary.routes";
import referralRoutes from "./referralRoutes";
import referralProgramRoutes from "./referralProgramRoutes";
import auditRoutes from "./audit.routes";
// import walletRoutes from "./wallet";
import { subscriptionRouter } from "./subscriptionRoutes";
import teamRoutes from "./teamRoutes";
import rateLimitRoutes from "./rateLimitRoutes";

const router = Router();



router.use("/", userRoutes);
router.use("/api/sales-summary", salesSummaryRoutes);
router.use("/api", referralRoutes);
router.use("/api", referralProgramRoutes);
router.use("/api/team", teamRoutes);
router.use("/subscriptions", subscriptionRouter);
router.use("/audit", auditRoutes);
// router.use("/wallet", walletRoutes);
router.use("/rate-limit", rateLimitRoutes);

export default router;
