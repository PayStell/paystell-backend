import { Request, Response } from "express";
import { AssetConfigurationService } from "../services/AssetConfigurationService";
import { AssetPriceService } from "../services/AssetPriceService";
import { MultiAssetPaymentService } from "../services/MultiAssetPaymentService";
import { AppError } from "../utils/AppError";
import logger from "../utils/logger";

export class MultiAssetPaymentController {
  private assetConfigService: AssetConfigurationService;
  private assetPriceService: AssetPriceService;
  private multiAssetPaymentService: MultiAssetPaymentService;

  constructor() {
    this.assetConfigService = new AssetConfigurationService();
    this.assetPriceService = new AssetPriceService();
    this.multiAssetPaymentService = new MultiAssetPaymentService();
  }

  createAssetConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        merchantId,
        asset,
        isEnabled,
        minAmount,
        maxAmount,
        priority,
        autoConvert,
        settlementAsset,
      } = req.body;

      const config = await this.assetConfigService.createAssetConfig({
        merchantId,
        assetCode: asset.code,
        assetIssuer: asset.issuer || null,
        isEnabled,
        minAmount,
        maxAmount,
        priority,
        autoConvert,
        settlementAssetCode: settlementAsset?.code || null,
        settlementAssetIssuer: settlementAsset?.issuer || null,
      });

      res.status(201).json({
        success: true,
        message: "Asset configuration created successfully",
        data: config,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error("Error creating asset config:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  };

  updateAssetConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { merchantId } = req.body;
      const {
        isEnabled,
        minAmount,
        maxAmount,
        priority,
        autoConvert,
        settlementAsset,
      } = req.body;

      const config = await this.assetConfigService.updateAssetConfig(
        id,
        merchantId,
        {
          isEnabled,
          minAmount,
          maxAmount,
          priority,
          autoConvert,
          settlementAssetCode: settlementAsset?.code || null,
          settlementAssetIssuer: settlementAsset?.issuer || null,
        },
      );

      res.status(200).json({
        success: true,
        message: "Asset configuration updated successfully",
        data: config,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error("Error updating asset config:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  };

  deleteAssetConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { merchantId } = req.body;

      await this.assetConfigService.deleteAssetConfig(id, merchantId);

      res.status(200).json({
        success: true,
        message: "Asset configuration deleted successfully",
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error("Error deleting asset config:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  };

  getMerchantAssetConfigs = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const { merchantId } = req.params;

      const configs =
        await this.assetConfigService.getMerchantAssetConfigs(merchantId);

      res.status(200).json({
        success: true,
        data: configs,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error("Error fetching merchant configs:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  };

  getExchangeRate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sourceAsset, destinationAsset, amount } = req.body;

      const quote = await this.assetPriceService.getExchangeRate(
        sourceAsset.code,
        sourceAsset.issuer,
        destinationAsset.code,
        destinationAsset.issuer,
        amount,
      );

      res.status(200).json({
        success: true,
        data: quote,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error("Error getting exchange rate:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  };

  executePathPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        merchantId,
        sourceAddress,
        destinationAddress,
        sourceAsset,
        destinationAsset,
        amount,
        sourceSecret,
        memo,
      } = req.body;

      const result = await this.multiAssetPaymentService.executePathPayment({
        merchantId,
        sourceAddress,
        destinationAddress,
        sourceAssetCode: sourceAsset.code,
        sourceAssetIssuer: sourceAsset.issuer,
        destAssetCode: destinationAsset?.code || sourceAsset.code,
        destAssetIssuer: destinationAsset?.issuer || sourceAsset.issuer,
        amount,
        sourceSecret,
        memo,
      });

      res.status(200).json({
        success: true,
        message: "Path payment executed successfully",
        data: result,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error("Error executing path payment:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  };

  estimatePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantId, sourceAsset, destinationAsset, amount } = req.body;

      const estimate = await this.multiAssetPaymentService.estimatePayment({
        merchantId,
        sourceAssetCode: sourceAsset.code,
        sourceAssetIssuer: sourceAsset.issuer,
        destAssetCode: destinationAsset.code,
        destAssetIssuer: destinationAsset.issuer,
        amount,
      });

      res.status(200).json({
        success: true,
        data: estimate,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error("Error estimating payment:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  };

  getSupportedAssetPairs = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const { merchantId } = req.params;

      const pairs =
        await this.multiAssetPaymentService.getSupportedAssetPairs(merchantId);

      res.status(200).json({
        success: true,
        data: pairs,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error("Error getting supported pairs:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  };

  getOrderbook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sourceAsset, destinationAsset } = req.body;

      const orderbook = await this.assetPriceService.getOrderbook(
        sourceAsset.code,
        sourceAsset.issuer,
        destinationAsset.code,
        destinationAsset.issuer,
      );

      res.status(200).json({
        success: true,
        data: orderbook,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        logger.error("Error getting orderbook:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  };
}
