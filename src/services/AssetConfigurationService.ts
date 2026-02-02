import { Repository, IsNull } from "typeorm";
import AppDataSource from "../config/db";
import { AssetConfiguration } from "../entities/AssetConfiguration";
import { AppError } from "../utils/AppError";
import logger from "../utils/logger";

export class AssetConfigurationService {
  private assetConfigRepo: Repository<AssetConfiguration>;

  constructor() {
    this.assetConfigRepo = AppDataSource.getRepository(AssetConfiguration);
  }

  async createAssetConfig(data: {
    merchantId: string;
    assetCode: string;
    assetIssuer: string | null;
    isEnabled?: boolean;
    minAmount?: string;
    maxAmount?: string | null;
    priority?: number;
    autoConvert?: boolean;
    settlementAssetCode?: string | null;
    settlementAssetIssuer?: string | null;
  }): Promise<AssetConfiguration> {
    try {
      const existing = await this.assetConfigRepo.findOne({
        where: {
          merchantId: data.merchantId,
          assetCode: data.assetCode,
          assetIssuer: data.assetIssuer || IsNull(),
        },
      });

      if (existing) {
        throw new AppError(
          "Asset configuration already exists for this merchant",
          409,
        );
      }

      const config = this.assetConfigRepo.create({
        merchantId: data.merchantId,
        assetCode: data.assetCode,
        assetIssuer: data.assetIssuer,
        isEnabled: data.isEnabled ?? true,
        minAmount: data.minAmount || "0",
        maxAmount: data.maxAmount || null,
        priority: data.priority || 0,
        autoConvert: data.autoConvert || false,
        settlementAssetCode: data.settlementAssetCode || null,
        settlementAssetIssuer: data.settlementAssetIssuer || null,
      });

      const saved = await this.assetConfigRepo.save(config);
      logger.info(
        `Asset configuration created for merchant ${data.merchantId}: ${data.assetCode}`,
      );
      return saved;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error creating asset configuration:", error);
      throw new AppError("Failed to create asset configuration", 500);
    }
  }

  async updateAssetConfig(
    id: string,
    merchantId: string,
    data: {
      isEnabled?: boolean;
      minAmount?: string;
      maxAmount?: string | null;
      priority?: number;
      autoConvert?: boolean;
      settlementAssetCode?: string | null;
      settlementAssetIssuer?: string | null;
    },
  ): Promise<AssetConfiguration> {
    try {
      const config = await this.assetConfigRepo.findOne({
        where: { id, merchantId },
      });

      if (!config) {
        throw new AppError("Asset configuration not found", 404);
      }

      Object.assign(config, data);
      const updated = await this.assetConfigRepo.save(config);
      logger.info(`Asset configuration updated: ${id}`);
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error updating asset configuration:", error);
      throw new AppError("Failed to update asset configuration", 500);
    }
  }

  async deleteAssetConfig(id: string, merchantId: string): Promise<void> {
    try {
      const result = await this.assetConfigRepo.delete({ id, merchantId });
      if (!result.affected || result.affected === 0) {
        throw new AppError("Asset configuration not found", 404);
      }
      logger.info(`Asset configuration deleted: ${id}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error deleting asset configuration:", error);
      throw new AppError("Failed to delete asset configuration", 500);
    }
  }

  async getMerchantAssetConfigs(
    merchantId: string,
  ): Promise<AssetConfiguration[]> {
    try {
      return await this.assetConfigRepo.find({
        where: { merchantId },
        order: { priority: "DESC", createdAt: "ASC" },
      });
    } catch (error) {
      logger.error("Error fetching merchant asset configurations:", error);
      throw new AppError("Failed to fetch asset configurations", 500);
    }
  }

  async getEnabledAssetConfigs(
    merchantId: string,
  ): Promise<AssetConfiguration[]> {
    try {
      return await this.assetConfigRepo.find({
        where: { merchantId, isEnabled: true },
        order: { priority: "DESC", createdAt: "ASC" },
      });
    } catch (error) {
      logger.error("Error fetching enabled asset configurations:", error);
      throw new AppError("Failed to fetch enabled asset configurations", 500);
    }
  }

  async getAssetConfig(
    id: string,
    merchantId: string,
  ): Promise<AssetConfiguration> {
    try {
      const config = await this.assetConfigRepo.findOne({
        where: { id, merchantId },
      });

      if (!config) {
        throw new AppError("Asset configuration not found", 404);
      }

      return config;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error fetching asset configuration:", error);
      throw new AppError("Failed to fetch asset configuration", 500);
    }
  }

  async isAssetSupported(
    merchantId: string,
    assetCode: string,
    assetIssuer: string | null,
  ): Promise<boolean> {
    try {
      const config = await this.assetConfigRepo.findOne({
        where: {
          merchantId,
          assetCode,
          assetIssuer: assetIssuer || IsNull(),
          isEnabled: true,
        },
      });

      return !!config;
    } catch (error) {
      logger.error("Error checking asset support:", error);
      return false;
    }
  }

  async validatePaymentAmount(
    merchantId: string,
    assetCode: string,
    assetIssuer: string | null,
    amount: string,
  ): Promise<boolean> {
    try {
      const config = await this.assetConfigRepo.findOne({
        where: {
          merchantId,
          assetCode,
          assetIssuer: assetIssuer || IsNull(),
          isEnabled: true,
        },
      });

      if (!config) {
        return false;
      }

      const amountNum = parseFloat(amount);
      const minAmount = parseFloat(config.minAmount);

      if (amountNum < minAmount) {
        return false;
      }

      if (config.maxAmount) {
        const maxAmount = parseFloat(config.maxAmount);
        if (amountNum > maxAmount) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error("Error validating payment amount:", error);
      return false;
    }
  }
}
