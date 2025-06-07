import { Router } from "express";
import userRoutes from "./userRoutes";
import salesSummaryRoutes from "./salesSummary.routes";
import referralRoutes from "./referralRoutes"
import referralProgramRoutes from "./referralProgramRoutes"

const router = Router();

router.use("/", userRoutes);
router.use("/api/sales-summary", salesSummaryRoutes);
router.use("/api", referralRoutes)
router.use("/api", referralProgramRoutes)

export default router;
