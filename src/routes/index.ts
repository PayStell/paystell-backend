import { Router } from "express";
import userRoutes from "./userRoutes";
import salesSummaryRoutes from "./salesSummary.routes";
import auditRoutes from "./audit.routes";

const router = Router();

router.use("/", userRoutes);
router.use("/api/sales-summary", salesSummaryRoutes);

router.use("/audit", auditRoutes);

export default router;
