import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import rateLimitConfigService from "../services/rateLimitConfigService";
import whitelistBlacklistService from "../services/whitelistBlacklistService";
import { WhitelistType } from "src/entities/RateLimitWhiteList";
import { BlacklistType } from "../entities/RateLimitBlacklist";
import RateLimitMonitoringService from "../services/rateLimitMonitoring.service";
import { redisClient } from "../config/redisConfig";
import logger from "../utils/logger";

export const paymentLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    status: "error",
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const intelligentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  
  // Dynamic limit based on user context
  max: async (req: Request) => {
    try {
      // Get IP address
      const ip = req.ip || req.socket.remoteAddress || "0.0.0.0";
      
      // Check blacklist first - completely block blacklisted entities
      if (await whitelistBlacklistService.isBlacklisted(BlacklistType.IP, ip)) {
        return 0; // Block completely
      }

      if (req.user?.id && await whitelistBlacklistService.isBlacklisted(BlacklistType.USER, req.user.id.toString())) {
        return 0; 
      }

      if (req.merchant?.id && await whitelistBlacklistService.isBlacklisted(BlacklistType.MERCHANT, req.merchant.id)) {
        return 0; 
      }

      if (await whitelistBlacklistService.isWhitelisted(WhitelistType.IP, ip)) {
        return 0; 
      }

      if (req.user?.id && await whitelistBlacklistService.isWhitelisted(WhitelistType.USER, req.user.id.toString())) {
        return 0;
      }

      if (req.merchant?.id && await whitelistBlacklistService.isWhitelisted(WhitelistType.MERCHANT, req.merchant.id)) {
        return 0; 
      }

      // Get dynamic limit based on user context
      if (req.user?.id && req.merchant?.id && req.user?.role) {
        try {
          const config = await rateLimitConfigService.getConfigForUser(
            req.user.id.toString(),
            req.merchant.id,
            req.user.role
          );

          // Check if user is in burst mode
          const burstKey = `burst:${req.user.id}:${req.originalUrl}`;
          const burstActive = await redisClient.get(burstKey);

          if (burstActive) {
            const burstLimit = Math.floor(config.requestsPerMinute * config.burstMultiplier);
            logger.info(`Burst mode active for user ${req.user.id}: limit ${burstLimit}`);
            return burstLimit;
          }

          return config.requestsPerMinute;
        } catch (error) {
          logger.error(`Error getting user-specific rate limit: ${error}`);
        }
      }

      // Default limits based on authentication status
      if (req.user?.id) {
        // Authenticated users get higher limits
        return req.user.role === "ADMIN" ? 200 : 100;
      }

      // Unauthenticated requests get lower limits
      return 30;
    } catch (error) {
      logger.error(`Error determining rate limit: ${error}`);
      return 60; 
    }
  },

  // Custom key generator to handle different contexts
  keyGenerator: (req: Request) => {
    if (req.user?.id) {
      return `user:${req.user.id}:${req.originalUrl}`;
    }
    
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    return `ip:${ip}:${req.originalUrl}`;
  },

  // Custom message with more context
  message: (req: Request, res: Response) => {
    const limit = res.getHeader('X-RateLimit-Limit');
    const remaining = res.getHeader('X-RateLimit-Remaining');
    const resetTime = res.getHeader('X-RateLimit-Reset');
    
    return {
      status: "error",
      message: "Too many requests, please try again later",
      code: "RATE_LIMIT_EXCEEDED",
      limit: limit,
      remaining: remaining,
      resetTime: resetTime,
      retryAfter: 60,
    };
  },

  // Enhanced headers
  standardHeaders: true,
  legacyHeaders: false,

  // Custom handler for rate limit exceeded
  handler: async (req: Request, res: Response) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "0.0.0.0";
      
      // Log the rate limit event using your existing service
      await RateLimitMonitoringService.logAdvancedRateLimitEvent({
        ip,
        endpoint: req.originalUrl,
        userAgent: req.headers["user-agent"],
        timestamp: new Date(),
        userId: req.user?.id,
        email: req.user?.email,
        userRole: req.user?.role,
        merchantId: req.merchant?.id,
        merchantType: determineMerchantType(req.merchant),
        wasThrottled: true,
        requestCount: 1,
        limitUsed: parseInt(res.getHeader('X-RateLimit-Limit') as string) || 0,
      });

      // Check if user should enter burst mode (only for authenticated users)
      if (req.user?.id) {
        const burstKey = `burst:${req.user.id}:${req.originalUrl}`;
        const burstActive = await redisClient.get(burstKey);
        
        if (!burstActive) {
          // Get user's config to determine burst settings
          try {
            const config = await rateLimitConfigService.getConfigForUser(
              req.user.id.toString(),
              req.merchant?.id || "default",
              req.user.role || "USER"
            );
            
            // Activate burst mode
            await redisClient.set(burstKey, "1", { EX: config.burstDurationSeconds });
            
            // Set burst header
            res.setHeader("X-RateLimit-Burst", "activated");
            res.setHeader("X-RateLimit-Burst-Duration", config.burstDurationSeconds.toString());
            
            logger.info(`Burst mode activated for user ${req.user.id} on ${req.originalUrl} for ${config.burstDurationSeconds}s`);
          } catch (error) {
            logger.error(`Error activating burst mode: ${error}`);
          }
        } else {
          res.setHeader("X-RateLimit-Burst", "active");
        }
      }

      // Set additional headers
      res.setHeader("X-RateLimit-Type", req.user?.id ? "user" : "ip");
      if (req.user?.role) {
        res.setHeader("X-RateLimit-User-Role", req.user.role);
      }
      if (req.merchant?.id) {
        res.setHeader("X-RateLimit-Merchant", req.merchant.id);
      }

      res.status(429).json({
        status: "error",
        message: "Too many requests, please try again later",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: 60,
        burstModeAvailable: !!req.user?.id,
        context: {
          userAuthenticated: !!req.user?.id,
          userRole: req.user?.role,
          merchantId: req.merchant?.id,
        }
      });
    } catch (error) {
      logger.error(`Error in rate limit handler: ${error}`);
      
      // Fallback response
      res.status(429).json({
        status: "error",
        message: "Too many requests, please try again later",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: 60,
      });
    }
  },

  // Skip function for certain paths
  skip: (req: Request) => {
    const skipPaths = ["/health", "/api-docs", "/favicon.ico"];
    return skipPaths.some(path => req.path.startsWith(path));
  },
});

// Helper function to determine merchant type
function determineMerchantType(merchant: any): string {
  if (!merchant) return "standard";
  
  if (merchant.business_name && merchant.business_name.toLowerCase().includes("enterprise")) {
    return "enterprise";
  }
  
  if (merchant.business_name && merchant.business_name.toLowerCase().includes("premium")) {
    return "premium";
  }

  return "standard";
}

// Enhanced fraud-specific rate limiters building on your existing pattern
export const fraudAlertsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: async (req: Request) => {
    // Higher limits for admins
    if (req.user?.role === "ADMIN") {
      return 200;
    }
    return 100;
  },
  message: {
    success: false,
    error: "Too many fraud alert requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.user?.id ? `fraud-alerts:user:${req.user.id}` : `fraud-alerts:ip:${req.ip}`;
  },
});

export const fraudConfigRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: async (req: Request) => {
    // Only admins can update config
    if (req.user?.role === "ADMIN") {
      return 20;
    }
    return 0; // Block non-admins
  },
  message: {
    success: false,
    error: "Too many configuration update requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.user?.id ? `fraud-config:user:${req.user.id}` : `fraud-config:ip:${req.ip}`;
  },
});

export const fraudStatsRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: async (req: Request) => {
    // Higher limits for admins
    if (req.user?.role === "ADMIN") {
      return 60;
    }
    return 30;
  },
  message: {
    success: false,
    error: "Too many statistics requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.user?.id ? `fraud-stats:user:${req.user.id}` : `fraud-stats:ip:${req.ip}`;
  },
});

export const fraudReviewRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: async (req: Request) => {
    // Higher limits for admins
    if (req.user?.role === "ADMIN") {
      return 40;
    }
    return 20;
  },
  message: {
    success: false,
    error: "Too many review requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.user?.id ? `fraud-review:user:${req.user.id}` : `fraud-review:ip:${req.ip}`;
  },
});

// Export the main limiter as default for easy importing
export default intelligentRateLimiter;