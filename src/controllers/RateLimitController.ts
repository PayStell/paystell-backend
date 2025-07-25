import { Request, Response } from "express";
import RateLimitMonitoringService from "../services/rateLimitMonitoring.service";
import rateLimitConfigService from "../services/rateLimitConfigService";
import whitelistBlacklistService from "../services/whitelistBlacklistService";
import { WhitelistType } from "src/entities/RateLimitWhiteList";
import { BlacklistType, BlacklistReason } from "../entities/RateLimitBlacklist";
import logger from "../utils/logger";

class RateLimitController {
  // Metrics endpoints
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe = "hour" } = req.query;
      
      const metrics = await RateLimitMonitoringService.getRateLimitMetrics(
        timeframe as "minute" | "hour" | "day"
      );
      
      res.status(200).json({
        status: "success",
        data: metrics,
      });
    } catch (error) {
      logger.error(`Error getting metrics: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve rate limit metrics",
        error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
      });
    }
  }

  async getMerchantMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { merchantId } = req.params;
      const { timeframe = "hour" } = req.query;
      
      if (!merchantId) {
        res.status(400).json({
          status: "error",
          message: "Merchant ID is required",
        });
        return;
      }
      
      const metrics = await RateLimitMonitoringService.getRateLimitMetrics(
        timeframe as "minute" | "hour" | "day",
        merchantId
      );
      
      res.status(200).json({
        status: "success",
        data: metrics,
      });
    } catch (error) {
      logger.error(`Error getting merchant metrics: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve merchant rate limit metrics",
        error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
      });
    }
  }

  async getUserHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = "100" } = req.query;
      
      if (!userId) {
        res.status(400).json({
          status: "error",
          message: "User ID is required",
        });
        return;
      }

      const parsedLimit = parseInt(limit as string, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
        res.status(400).json({
          status: "error",
          message: "Limit must be a number between 1 and 1000",
        });
        return;
      }
      
      const history = await RateLimitMonitoringService.getUserRateLimitHistory(
        userId,
        parsedLimit
      );
      
      res.status(200).json({
        status: "success",
        data: {
          userId,
          limit: parsedLimit,
          count: history.length,
          history,
        },
      });
    } catch (error) {
      logger.error(`Error getting user history: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve user rate limit history",
        error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
      });
    }
  }

  async getRealTimeStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await RateLimitMonitoringService.getRealTimeStatus();
      
      res.status(200).json({
        status: "success",
        data: status,
      });
    } catch (error) {
      logger.error(`Error getting real-time status: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve real-time status",
        error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
      });
    }
  }

  // Configuration endpoints
  async getMerchantConfigs(req: Request, res: Response): Promise<void> {
    try {
      const { merchantId } = req.params;
      
      if (!merchantId) {
        res.status(400).json({
          status: "error",
          message: "Merchant ID is required",
        });
        return;
      }
      
      const configs = await rateLimitConfigService.getAllConfigsForMerchant(merchantId);
      
      res.status(200).json({
        status: "success",
        data: {
          merchantId,
          count: configs.length,
          configs,
        },
      });
    } catch (error) {
      logger.error(`Error getting merchant configs: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve merchant rate limit configurations",
        error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
      });
    }
  }

  async createConfig(req: Request, res: Response): Promise<void> {
    try {
      const configData = req.body;
      
      // Basic validation
      if (!configData.merchantId) {
        res.status(400).json({
          status: "error",
          message: "Merchant ID is required",
        });
        return;
      }

      if (!configData.requestsPerSecond || !configData.requestsPerMinute || 
          !configData.requestsPerHour || !configData.requestsPerDay) {
        res.status(400).json({
          status: "error",
          message: "All rate limit values (requestsPerSecond, requestsPerMinute, requestsPerHour, requestsPerDay) are required",
        });
        return;
      }
      
      const config = await rateLimitConfigService.createConfig(configData);
      
      res.status(201).json({
        status: "success",
        message: "Rate limit configuration created successfully",
        data: config,
      });
    } catch (error) {
      logger.error(`Error creating config: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to create rate limit configuration",
        error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
      });
    }
  }

  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { configId } = req.params;
      const updates = req.body;
      
      if (!configId) {
        res.status(400).json({
          status: "error",
          message: "Configuration ID is required",
        });
        return;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({
          status: "error",
          message: "No updates provided",
        });
        return;
      }
      
      const config = await rateLimitConfigService.updateConfig(configId, updates);
      
      res.status(200).json({
        status: "success",
        message: "Rate limit configuration updated successfully",
        data: config,
      });
    } catch (error) {
      logger.error(`Error updating config: ${error}`);
      
      if ((error as Error).message === "Rate limit configuration not found") {
        res.status(404).json({
          status: "error",
          message: "Rate limit configuration not found",
        });
      } else {
        res.status(500).json({
          status: "error",
          message: "Failed to update rate limit configuration",
          error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
      }
    }
  }

  async deleteConfig(req: Request, res: Response): Promise<void> {
    try {
      const { configId } = req.params;
      
      if (!configId) {
        res.status(400).json({
          status: "error",
          message: "Configuration ID is required",
        });
        return;
      }
      
      await rateLimitConfigService.deleteConfig(configId);
      
      res.status(200).json({
        status: "success",
        message: "Rate limit configuration deleted successfully",
      });
    } catch (error) {
      logger.error(`Error deleting config: ${error}`);
      
      if ((error as Error).message === "Rate limit configuration not found") {
        res.status(404).json({
          status: "error",
          message: "Rate limit configuration not found",
        });
      } else {
        res.status(500).json({
          status: "error",
          message: "Failed to delete rate limit configuration",
          error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
      }
    }
  }

  // Whitelist endpoints
  async getWhitelist(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.query;
      
      const whitelist = await whitelistBlacklistService.getWhitelistedEntries(
        type as WhitelistType
      );
      
      res.status(200).json({
        status: "success",
        data: {
          type: type || "all",
          count: whitelist.length,
          entries: whitelist,
        },
      });
    } catch (error) {
      logger.error(`Error getting whitelist: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve whitelist",
        error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
      });
    }
  }

  async addToWhitelist(req: Request, res: Response): Promise<void> {
    try {
      const { type, value, reason, expiresAt } = req.body;
      
      if (!type || !value) {
        res.status(400).json({
          status: "error",
          message: "Type and value are required",
        });
        return;
      }

      if (!Object.values(WhitelistType).includes(type)) {
        res.status(400).json({
          status: "error",
          message: `Invalid type. Must be one of: ${Object.values(WhitelistType).join(", ")}`,
        });
        return;
      }
      
      const whitelist = await whitelistBlacklistService.addToWhitelist(
        type,
        value,
        reason,
        req.user?.id?.toString(),
        expiresAt ? new Date(expiresAt) : undefined
      );
      
      res.status(201).json({
        status: "success",
        message: "Entry added to whitelist successfully",
        data: whitelist,
      });
    } catch (error) {
      logger.error(`Error adding to whitelist: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to add to whitelist",
        error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
      });
    }
  }

  async removeFromWhitelist(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          status: "error",
          message: "Whitelist entry ID is required",
        });
        return;
      }
      
      await whitelistBlacklistService.removeFromWhitelist(id);
      
      res.status(200).json({
        status: "success",
        message: "Removed from whitelist successfully",
      });
    } catch (error) {
      logger.error(`Error removing from whitelist: ${error}`);
      
      if ((error as Error).message === "Whitelist entry not found") {
        res.status(404).json({
          status: "error",
          message: "Whitelist entry not found",
        });
      } else {
        res.status(500).json({
          status: "error",
          message: "Failed to remove from whitelist",
          error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
      }
    }
  }

  // Blacklist endpoints
  async getBlacklist(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.query;
      
      const blacklist = await whitelistBlacklistService.getBlacklistedEntries(
        type as BlacklistType
      );
      
      res.status(200).json({
        status: "success",
        data: {
          type: type || "all",
          count: blacklist.length,
          entries: blacklist,
        },
      });
    } catch (error) {
      logger.error(`Error getting blacklist: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve blacklist",
        error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
      });
    }
  }

  async addToBlacklist(req: Request, res: Response): Promise<void> {
    try {
      const { type, value, reason, details, expiresAt } = req.body;
      
      if (!type || !value) {
        res.status(400).json({
          status: "error",
          message: "Type and value are required",
        });
        return;
      }

      if (!Object.values(BlacklistType).includes(type)) {
        res.status(400).json({
          status: "error",
          message: `Invalid type. Must be one of: ${Object.values(BlacklistType).join(", ")}`,
        });
        return;
      }
      
      const blacklist = await whitelistBlacklistService.addToBlacklist(
        type,
        value,
        reason || BlacklistReason.MANUAL,
        details,
        req.user?.id?.toString(),
        expiresAt ? new Date(expiresAt) : undefined
      );
      
      res.status(201).json({
        status: "success",
        message: "Entry added to blacklist successfully",
        data: blacklist,
      });
    } catch (error) {
      logger.error(`Error adding to blacklist: ${error}`);
      res.status(500).json({
        status: "error",
        message: "Failed to add to blacklist",
        error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
      });
    }
  }

  async removeFromBlacklist(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          status: "error",
          message: "Blacklist entry ID is required",
        });
        return;
      }
      
      await whitelistBlacklistService.removeFromBlacklist(id);
      
      res.status(200).json({
        status: "success",
        message: "Removed from blacklist successfully",
      });
    } catch (error) {
      logger.error(`Error removing from blacklist: ${error}`);
      
      if ((error as Error).message === "Blacklist entry not found") {
        res.status(404).json({
          status: "error",
          message: "Blacklist entry not found",
        });
      } else {
        res.status(500).json({
          status: "error",
          message: "Failed to remove from blacklist",
          error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
      }
    }
  }
}

export default new RateLimitController();