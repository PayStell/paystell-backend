import { Router } from "express";
import userRoutes from "./userRoutes";
import salesSummaryRoutes from "./salesSummary.routes";
import referralRoutes from "./referralRoutes";
import referralProgramRoutes from "./referralProgramRoutes";
import auditRoutes from "./audit.routes";
import { subscriptionRouter } from "./subscriptionRoutes";
import teamRoutes from "./teamRoutes";

const router = Router();

router.use("/", userRoutes);
router.use("/api/sales-summary", salesSummaryRoutes);
router.use("/api", referralRoutes);
router.use("/api", referralProgramRoutes);
router.use("/api/team", teamRoutes);
router.use("/subscriptions", subscriptionRouter);
router.use("/audit", auditRoutes);

export default router;
