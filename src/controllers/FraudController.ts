import { Request, Response } from "express";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import { FraudDetectionService } from "../services/FraudDetectionService";
import { 
  ReviewFraudAlertDTO, 
  GetFraudAlertsQueryDTO, 
  GetFraudStatsQueryDTO 
} from "../dtos/FraudDetection.dto";

export class FraudController {
  private fraudService: FraudDetectionService;

  constructor() {
    this.fraudService = new FraudDetectionService();
  }

  // Get fraud alerts for a merchant or all
  getFraudAlerts = async (req: Request, res: Response) => {
    try {
      const queryDto = plainToClass(GetFraudAlertsQueryDTO, req.query);
      const errors = await validate(queryDto);

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.map(error => ({
            property: error.property,
            constraints: error.constraints
          }))
        });
      }

      const { merchantId, status, limit = 50 } = queryDto;
      
      const alerts = await this.fraudService.getFraudAlerts(
        merchantId,
        status,
        limit
      );

      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  };

  // Review a fraud alert
  reviewFraudAlert = async (req: Request, res: Response) => {
    try {
      const reviewDto = plainToClass(ReviewFraudAlertDTO, req.body);
      const errors = await validate(reviewDto);

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.map(error => ({
            property: error.property,
            constraints: error.constraints
          }))
        });
      }

      const { alertId } = req.params;
      const { status, reviewNotes } = reviewDto;
      const reviewedBy = req.user?.id ? String(req.user.id) : "system";

      const alert = await this.fraudService.reviewFraudAlert(
        alertId,
        status,
        reviewNotes,
        reviewedBy
      );

      res.json({
        success: true,
        data: alert,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  };

  // Get merchant fraud configuration
  getMerchantConfig = async (req: Request, res: Response) => {
    try {
      const { merchantId } = req.params;
      const config = await this.fraudService.getMerchantConfig(merchantId);

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  };

  // Update merchant fraud configuration
  updateMerchantConfig = async (req: Request, res: Response) => {
    try {
      const { merchantId } = req.params;
      const updates = req.body;

      const config = await this.fraudService.updateMerchantConfig(merchantId, updates);

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  };

  // Get fraud statistics
  getFraudStats = async (req: Request, res: Response) => {
    try {
      const statsDto = plainToClass(GetFraudStatsQueryDTO, req.query);
      const errors = await validate(statsDto);

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.map(error => ({
            property: error.property,
            constraints: error.constraints
          }))
        });
      }

      const { merchantId, days = 30 } = statsDto;
      
      const stats = await this.fraudService.getFraudStats(merchantId, days);

      res.json({
        success: true,
        data: stats,
        period: `${days} days`,
        ...(merchantId && { merchantId }),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  };
}