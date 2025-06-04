import { Router } from "express";
import { auditController } from "../controllers/AuditController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { auditMiddleware } from "../middlewares/auditMiddleware";
import { validateEntityParams } from "../middlewares/validateEntityParams";

const router = Router();

// Apply auth and audit middleware to all routes
router.use(authMiddleware);
router.use(auditMiddleware);

// Get audit logs with filtering
router.get("/logs", auditController.getAuditLogs);

// Get audit history for a specific entity
router.get(
  "/entity/:entityType/:entityId",
  validateEntityParams,
  auditController.getEntityAuditHistory,
);

export default router;
