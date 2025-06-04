import { Request, Response, NextFunction } from "express";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import { FraudDetectionService } from "../services/FraudDetectionService";
import { Transaction } from "../entities/Transaction";
import { TransactionContextDTO, FraudCheckResultDTO } from "../dtos/FraudDetection.dto";

interface FraudRequest extends Request {
  fraudCheck?: FraudCheckResultDTO;
}

export const fraudDetectionMiddleware = async (
  req: FraudRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Only check if this is a payment/transaction request
    if (!req.body.amount || !req.body.merchantId) {
      return next();
    }

    const fraudService = new FraudDetectionService();
    
    //transaction context for fraud checking
    const transaction = new Transaction();
    transaction.merchantId = req.body.merchantId;
    transaction.payerId = req.body.payerId || req.user?.id;
    transaction.amount = parseFloat(req.body.amount);
    transaction.paymentMethod = req.body.paymentMethod;
    transaction.metadata = req.body.metadata || {};

    const contextData = {
      transaction,
      userAgent: req.get("User-Agent"),
      ipAddress: req.ip || req.socket.remoteAddress,
      deviceFingerprint: req.get("X-Device-Fingerprint"),
    };

    const context = plainToClass(TransactionContextDTO, contextData);
    const errors = await validate(context);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid transaction context",
        details: errors.map(error => ({
          property: error.property,
          constraints: error.constraints
        }))
      });
    }

    const fraudResult = await fraudService.checkTransaction(context);

    req.fraudCheck = fraudResult;

    if (fraudResult.shouldBlock) {    
      return res.status(403).json({
        success: false,
        error: "Transaction blocked due to fraud detection",
        riskScore: fraudResult.riskScore,
        riskLevel: fraudResult.riskLevel,
        rulesTriggered: fraudResult.rulesTriggered,
      });
    }

    next();
  } catch (error) {
    console.error("Fraud detection middleware error:", error);
    next();
  }
};