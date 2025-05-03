import { Request, Response } from "express";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { StellarContractService } from "../services/StellarContractService";
import {
  MerchantRegistrationDTO,
  TokenSupportDTO,
  PaymentProcessingDTO,
} from "../dtos/StellarContractDTO";
import { AppError } from "../utils/AppError";
import logger from "../utils/logger";
import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { ValidationError } from "class-validator";

// Helper function to format validation errors
const formatValidationErrors = (errors: ValidationError[]) => {
  return errors.reduce(
    (acc, error) => {
      const property = error.property;
      const constraints = error.constraints || {};
      acc[property] = Object.values(constraints);
      return acc;
    },
    {} as Record<string, unknown>,
  );
};

// Helper function to get client IP
const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
};

export class StellarContractController {
  private contractService: StellarContractService;
  public paymentRateLimiter: RateLimitRequestHandler;

  constructor() {
    this.contractService = new StellarContractService();

    // Initialize rate limiter
    this.paymentRateLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each merchant to 100 requests per windowMs
      message: "Too many payment requests, please try again later",
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      keyGenerator: (req) => {
        const ip = getClientIp(req);
        // If request is authenticated with a merchant, use merchantId + IP
        return req.merchant ? `${req.merchant.id}:${ip}` : ip;
      },
    });
  }

  /**
   * Register a new merchant
   */
  public registerMerchant = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      const merchantData = plainToInstance(MerchantRegistrationDTO, req.body, {
        enableImplicitConversion: true,
        excludeExtraneousValues: true,
      });

      // Validate DTO
      const errors = await validate(merchantData);
      if (errors.length > 0) {
        throw new AppError(
          "Validation failed",
          400,
          formatValidationErrors(errors),
        );
      }

      const success = await this.contractService.registerMerchant(merchantData);

      if (success) {
        return res.status(201).json({
          message: "Merchant registered successfully",
          merchantAddress: merchantData.merchantAddress,
        });
      }

      throw new AppError("Failed to register merchant", 500);
    } catch (error) {
      logger.error("Merchant registration failed:", error);
      if (error instanceof AppError) {
        return res
          .status(error.statusCode)
          .json({ error: error.message, details: error.details });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  /**
   * Add supported token for a merchant
   */
  public addSupportedToken = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      const tokenData = plainToInstance(TokenSupportDTO, req.body, {
        enableImplicitConversion: true,
        excludeExtraneousValues: true, // strips unknown props
      });

      // Validate DTO
      const errors = await validate(tokenData);
      if (errors.length > 0) {
        throw new AppError(
          "Validation failed",
          400,
          formatValidationErrors(errors),
        );
      }

      const success = await this.contractService.addSupportedToken(tokenData);

      if (success) {
        return res.status(200).json({
          message: "Token support added successfully",
          merchantAddress: tokenData.merchantAddress,
          tokenAddress: tokenData.tokenAddress,
        });
      }

      throw new AppError("Failed to add token support", 500);
    } catch (error) {
      logger.error("Adding token support failed:", error);
      if (error instanceof AppError) {
        return res
          .status(error.statusCode)
          .json({ error: error.message, details: error.details });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  /**
   * Process a payment with signature verification
   */
  public processPayment = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      const paymentData = plainToInstance(PaymentProcessingDTO, req.body, {
        enableImplicitConversion: true,
        excludeExtraneousValues: true, // strips unknown props
      });

      // Validate DTO
      const errors = await validate(paymentData);
      if (errors.length > 0) {
        throw new AppError(
          "Validation failed",
          400,
          formatValidationErrors(errors),
        );
      }

      // Check payment order expiration with a small buffer (5 seconds) to account for clock differences
      const currentTime = Math.floor(Date.now() / 1000);
      const buffer = 5; // 5 seconds buffer

      if (paymentData.paymentOrder.expiration < currentTime - buffer) {
        throw new AppError("Payment order expired", 400);
      }

      // Log warning for pending expiration
      if (paymentData.paymentOrder.expiration < currentTime + 60) {
        logger.warn(
          `Payment order ${paymentData.paymentOrder.orderId} expires soon`,
        );
      }

      const transactionHash =
        await this.contractService.processPayment(paymentData);

      return res.status(200).json({
        message: "Payment processed successfully",
        transactionHash,
        orderId: paymentData.paymentOrder.orderId,
        timestamp: Math.floor(Date.now() / 1000),
        status: "confirmed",
        amount: paymentData.paymentOrder.amount,
        tokenAddress: paymentData.paymentOrder.tokenAddress,
      });
    } catch (error) {
      logger.error("Payment processing failed:", error);
      if (error instanceof AppError) {
        return res
          .status(error.statusCode)
          .json({ error: error.message, details: error.details });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  /**
   * Get merchant details
   */
  public getMerchantDetails = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      const { merchantAddress } = req.params;

      if (!merchantAddress) {
        throw new AppError("Merchant address is required", 400);
      }

      const merchantDetails =
        await this.contractService.getMerchantDetails(merchantAddress);

      return res.status(200).json(merchantDetails);
    } catch (error) {
      logger.error("Getting merchant details failed:", error);
      if (error instanceof AppError) {
        return res
          .status(error.statusCode)
          .json({ error: error.message, details: error.details });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}
