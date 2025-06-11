import { Request, Response } from "express";
import { TokenService } from "../services/TokenService";
import { AppError } from "../utils/AppError";
import logger from "../utils/logger";

export class TokenController {
  private tokenService: TokenService;

  constructor() {
    this.tokenService = new TokenService();
  }

  /**
   * Add a supported token for a merchant
   * POST /api/tokens/support
   */
  addSupportedToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantAddress, tokenAddress } = req.body;

      const success = await this.tokenService.addSupportedToken(
        merchantAddress,
        tokenAddress,
      );

      if (success) {
        res.status(201).json({
          message: "Token support added successfully",
          merchantAddress,
          tokenAddress,
        });
      } else {
        res.status(500).json({
          error: "Failed to add token support",
        });
      }
    } catch (error) {
      logger.error("Error in addSupportedToken:", error);

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: error.message,
          details: error.details,
        });
      } else {
        res.status(500).json({
          error: "Internal server error",
        });
      }
    }
  };

  /**
   * Get supported tokens for a merchant
   * GET /api/tokens/merchant/:merchantAddress
   */
  getMerchantTokens = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantAddress } = req.params;

      const tokens = await this.tokenService.getMerchantTokens(merchantAddress);

      res.status(200).json({
        merchantAddress,
        supportedTokens: tokens,
        count: tokens.length,
      });
    } catch (error) {
      logger.error("Error in getMerchantTokens:", error);

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: error.message,
        });
      } else {
        res.status(500).json({
          error: "Internal server error",
        });
      }
    }
  };

  /**
   * Check if a token is supported by a merchant
   * GET /api/tokens/support/:merchantAddress/:tokenAddress
   */
  checkTokenSupport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantAddress, tokenAddress } = req.params;

      const isSupported = await this.tokenService.isTokenSupported(
        merchantAddress,
        tokenAddress,
      );

      res.status(200).json({
        merchantAddress,
        tokenAddress,
        isSupported,
      });
    } catch (error) {
      logger.error("Error in checkTokenSupport:", error);

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: error.message,
        });
      } else {
        res.status(500).json({
          error: "Internal server error",
        });
      }
    }
  };

  /**
   * Get token information
   * GET /api/tokens/info/:tokenAddress
   */
  getTokenInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tokenAddress } = req.params;

      const tokenInfo = await this.tokenService.getTokenInfo(tokenAddress);

      res.status(200).json(tokenInfo);
    } catch (error) {
      logger.error("Error in getTokenInfo:", error);

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: error.message,
        });
      } else {
        res.status(500).json({
          error: "Internal server error",
        });
      }
    }
  };

  /**
   * Validate token address
   * POST /api/tokens/validate
   */
  validateTokenAddress = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tokenAddress } = req.body;

      const isValid = this.tokenService.validateTokenAddress(tokenAddress);

      res.status(200).json({
        tokenAddress,
        isValid,
      });
    } catch (error) {
      logger.error("Error in validateTokenAddress:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  };
}
