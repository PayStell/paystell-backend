import { Router, Request, Response } from "express";
import { FraudController } from "../controllers/FraudController";
import { authMiddleware } from "../middlewares/authMiddleware";
import {
  fraudAlertsRateLimit,
  fraudConfigRateLimit,
  fraudStatsRateLimit,
  fraudReviewRateLimit
} from "../middlewares/fraudRateLimiter.middleware";

const router = Router();
const fraudController = new FraudController();

router.use(authMiddleware);

// Get fraud alerts
router.get("/alerts", 
  fraudAlertsRateLimit,
  async (req: Request, res: Response) => {
    await fraudController.getFraudAlerts(req, res);
  }
);

// Review fraud alert
router.patch("/alerts/:alertId/review", 
  fraudReviewRateLimit,
  async (req: Request, res: Response) => {
    await fraudController.reviewFraudAlert(req, res);
  }
);

// Get merchant fraud configuration
router.get("/config/:merchantId", 
  fraudAlertsRateLimit,
  async (req: Request, res: Response) => {
    await fraudController.getMerchantConfig(req, res);
  }
);

// Update merchant fraud configuration
router.put("/config/:merchantId", 
  fraudConfigRateLimit,
  async (req: Request, res: Response) => {
    await fraudController.updateMerchantConfig(req, res);
  }
);

// Get fraud statistics
router.get("/stats", 
  fraudStatsRateLimit,
  async (req: Request, res: Response) => {
    await fraudController.getFraudStats(req, res);
  }
);

export default router;