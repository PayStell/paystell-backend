import type { Request, Response, NextFunction } from "express"
import { type Repository, MoreThanOrEqual } from "typeorm"
import AppDataSource from "../config/db"
import { RateLimitHistory } from "../entities/RateLimitHistory"
import { redisClient } from "../config/redisConfig"
import whitelistBlacklistService from "./whitelistBlacklistService"
import { BlacklistType, BlacklistReason } from "../entities/RateLimitBlacklist"
import logger from "../utils/logger"
import type { Merchant } from "../interfaces/webhook.interfaces"
import type { UserResponse } from "../interfaces/auth.interfaces"

// Extend Express Request to include custom properties
declare module "express-serve-static-core" {
  interface Request {
    user?: UserResponse // Using the imported UserResponse interface
    merchant?: Merchant // Using the imported Merchant interface
    rateLimit?: {
      limit: number
      current: number
      remaining: number
      resetTime: Date
      total: number
    }
  }
}

export interface RateLimitEvent {
  id?: number
  ip: string
  endpoint: string
  userAgent?: string
  timestamp: Date
  email?: string
  userId?: number
}

interface SuspiciousActivityCriteria {
  threshold: number
  timeWindowMs: number
}

interface AdvancedRateLimitEvent extends RateLimitEvent {
  userRole?: string
  merchantId?: string
  merchantType?: string
  requestCount?: number
  limitUsed?: number
  wasThrottled?: boolean
  wasBurst?: boolean
}

interface EndpointStats {
  total: number
  throttled: number
  burst: number
}

interface RoleStats {
  total: number
  throttled: number
  burst: number
}

interface TopThrottledIP {
  ip: string
  throttledCount: number
}

interface TopThrottledUser {
  userId: string
  throttledCount: number
}

interface RateLimitMetrics {
  timeframe: "minute" | "hour" | "day"
  startTime: Date
  endTime: Date
  totalRequests: number
  throttledRequests: number
  throttleRate: number
  burstRequests: number
  burstRate: number
  endpointStats: Record<string, EndpointStats>
  roleStats: Record<string, RoleStats>
  topThrottledIPs: TopThrottledIP[]
  topThrottledUsers: TopThrottledUser[]
}

interface RealTimeStatus {
  activeRequests: number
  throttledRequests: number
  burstModeActive: number
  activeBurstSessions: number
  timestamp: Date
  recentEvents: number
  error?: string
}

class RateLimitMonitoringService {
  private recentEvents: Map<string, RateLimitEvent[]>
  private readonly suspiciousCriteria: SuspiciousActivityCriteria
  private historyRepository: Repository<RateLimitHistory>

  constructor() {
    this.recentEvents = new Map()
    this.suspiciousCriteria = {
      threshold: 10,
      timeWindowMs: 60000, // 1 minute
    }

    // Initialize repository when AppDataSource is ready
    if (AppDataSource.isInitialized) {
      this.historyRepository = AppDataSource.getRepository(RateLimitHistory)
    } else {
      // Wait for initialization
      AppDataSource.initialize()
        .then(() => {
          this.historyRepository = AppDataSource.getRepository(RateLimitHistory)
        })
        .catch((error) => {
          logger.error("Failed to initialize rate limit history repository:", error)
        })
    }
  }

  public async logRateLimitEvent(event: RateLimitEvent): Promise<void> {
    try {
      if (!event.ip) {
        throw new Error("IP cannot be null or empty")
      }
      console.warn("Rate limit exceeded:", JSON.stringify(event))
      this.checkForSuspiciousActivity(event)
    } catch (error) {
      console.error("Failed to log rate limit event:", error)
    }
  }

  public async logAdvancedRateLimitEvent(event: AdvancedRateLimitEvent): Promise<void> {
    try {
      if (!event.ip) {
        throw new Error("IP cannot be null or empty")
      }
      // Only log to database if repository is available
      if (this.historyRepository) {
        const history = this.historyRepository.create({
          userId: event.userId?.toString(),
          userRole: event.userRole,
          merchantId: event.merchantId,
          merchantType: event.merchantType,
          endpoint: event.endpoint,
          ip: event.ip,
          requestCount: event.requestCount || 1,
          limitUsed: event.limitUsed,
          wasThrottled: event.wasThrottled || false,
          wasBurst: event.wasBurst || false,
          userAgent: event.userAgent,
          timestamp: event.timestamp,
        })
        await this.historyRepository.save(history)
      }
      // Also call the original method for backward compatibility
      await this.logRateLimitEvent(event)
      if (event.wasThrottled) {
        await this.checkForAdvancedSuspiciousActivity(event)
      }
    } catch (error) {
      logger.error("Failed to log advanced rate limit event:", error)
    }
  }

  private checkForSuspiciousActivity(event: RateLimitEvent): void {
    const ipEvents = this.recentEvents.get(event.ip) || []
    const now = Date.now()

    // Remove events outside the time window
    const recentIpEvents = ipEvents.filter((e) => now - e.timestamp.getTime() <= this.suspiciousCriteria.timeWindowMs)

    // Add the new event
    recentIpEvents.push(event)
    this.recentEvents.set(event.ip, recentIpEvents)

    // Check if threshold is exceeded
    if (recentIpEvents.length >= this.suspiciousCriteria.threshold) {
      this.triggerAlert(event.ip, recentIpEvents.length)
    }
  }

  private async checkForAdvancedSuspiciousActivity(event: AdvancedRateLimitEvent): Promise<void> {
    try {
      if (!this.historyRepository) {
        return // Skip if repository not available
      }
      const now = new Date()
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000)

      // Count throttled requests in the last 5 minutes for this IP
      const throttledCount = await this.historyRepository.count({
        where: {
          ip: event.ip,
          wasThrottled: true,
          timestamp: MoreThanOrEqual(fiveMinutesAgo),
        },
      })

      // If more than 10 throttled requests in 5 minutes, add IP to blacklist
      if (throttledCount > 10) {
        await whitelistBlacklistService.addToBlacklist(
          BlacklistType.IP,
          event.ip,
          BlacklistReason.ABUSE,
          `Exceeded rate limit ${throttledCount} times in 5 minutes`,
          "system",
          new Date(now.getTime() + 24 * 60 * 60000), // 24 hour ban
        )
        logger.warn(`IP ${event.ip} blacklisted for rate limit abuse`)
      }

      // Also check user-based abuse if userId is available
      if (event.userId) {
        const userThrottledCount = await this.historyRepository.count({
          where: {
            userId: event.userId.toString(),
            wasThrottled: true,
            timestamp: MoreThanOrEqual(fiveMinutesAgo),
          },
        })

        if (userThrottledCount > 15) {
          await whitelistBlacklistService.addToBlacklist(
            BlacklistType.USER,
            event.userId.toString(),
            BlacklistReason.ABUSE,
            `User exceeded rate limit ${userThrottledCount} times in 5 minutes`,
            "system",
            new Date(now.getTime() + 24 * 60 * 60000), // 24 hour ban
          )
          logger.warn(`User ${event.userId} blacklisted for rate limit abuse`)
        }
      }
    } catch (error) {
      logger.error(`Error checking for advanced suspicious activity: ${error}`)
    }
  }

  private triggerAlert(ip: string, count: number): void {
    console.error(`ALERT: Suspicious activity detected from IP ${ip} - ${count} rate limit events in the last minute`)
  }

  public createRateLimitMonitoringMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send
      res.send = (body: unknown): Response => {
        if (res.statusCode === 429) {
          const event: AdvancedRateLimitEvent = {
            ip: req.ip || "0.0.0.0",
            endpoint: req.originalUrl,
            userAgent: req.headers["user-agent"],
            timestamp: new Date(),
            userId: req.user?.id,
            email: req.user?.email,
            userRole: req.user?.role,
            merchantId: req.merchant?.id,
            merchantType: this.determineMerchantType(req.merchant),
            wasThrottled: true,
          }
          this.logAdvancedRateLimitEvent(event).catch((err) => {
            console.error("Failed to log advanced rate limit event:", err)
          })
        }
        return originalSend.call(res, body)
      }
      next()
    }
  }

  private determineMerchantType(merchant: Merchant | undefined): string {
    if (!merchant) return "standard"
    if (merchant.business_name && merchant.business_name.toLowerCase().includes("enterprise")) {
      return "enterprise"
    }
    if (merchant.business_name && merchant.business_name.toLowerCase().includes("premium")) {
      return "premium"
    }
    return "standard"
  }

  // New methods for metrics and monitoring
  public async getRateLimitMetrics(
    timeframe: "minute" | "hour" | "day" = "hour",
    merchantId?: string,
    userId?: string,
  ): Promise<RateLimitMetrics> {
    try {
      if (!this.historyRepository) {
        throw new Error("History repository not initialized")
      }
      const now = new Date()
      let startTime: Date
      switch (timeframe) {
        case "minute":
          startTime = new Date(now.getTime() - 60000)
          break
        case "day":
          startTime = new Date(now.getTime() - 24 * 60 * 60000)
          break
        case "hour":
        default:
          startTime = new Date(now.getTime() - 60 * 60000)
          break
      }

      const queryBuilder = this.historyRepository
        .createQueryBuilder("history")
        .where("history.timestamp >= :startTime", { startTime })

      if (merchantId) {
        queryBuilder.andWhere("history.merchantId = :merchantId", { merchantId })
      }
      if (userId) {
        queryBuilder.andWhere("history.userId = :userId", { userId })
      }

      const results = await queryBuilder.getMany()

      // Calculate metrics
      const totalRequests = results.length
      const throttledRequests = results.filter((r) => r.wasThrottled).length
      const burstRequests = results.filter((r) => r.wasBurst).length

      // Group by endpoint
      const endpointStats: Record<string, EndpointStats> = {}
      results.forEach((r) => {
        if (!endpointStats[r.endpoint]) {
          endpointStats[r.endpoint] = {
            total: 0,
            throttled: 0,
            burst: 0,
          }
        }
        endpointStats[r.endpoint].total++
        if (r.wasThrottled) endpointStats[r.endpoint].throttled++
        if (r.wasBurst) endpointStats[r.endpoint].burst++
      })

      // Group by user role
      const roleStats: Record<string, RoleStats> = {}
      results.forEach((r) => {
        if (r.userRole) {
          if (!roleStats[r.userRole]) {
            roleStats[r.userRole] = {
              total: 0,
              throttled: 0,
              burst: 0,
            }
          }
          roleStats[r.userRole].total++
          if (r.wasThrottled) roleStats[r.userRole].throttled++
          if (r.wasBurst) roleStats[r.userRole].burst++
        }
      })

      return {
        timeframe,
        startTime,
        endTime: now,
        totalRequests,
        throttledRequests,
        throttleRate: totalRequests > 0 ? (throttledRequests / totalRequests) * 100 : 0,
        burstRequests,
        burstRate: totalRequests > 0 ? (burstRequests / totalRequests) * 100 : 0,
        endpointStats,
        roleStats,
        topThrottledIPs: await this.getTopThrottledIPs(startTime, 10),
        topThrottledUsers: await this.getTopThrottledUsers(startTime, 10),
      }
    } catch (error) {
      logger.error(`Error getting rate limit metrics: ${error}`)
      throw error
    }
  }

  public async getUserRateLimitHistory(userId: string, limit = 100): Promise<RateLimitHistory[]> {
    try {
      if (!this.historyRepository) {
        throw new Error("History repository not initialized")
      }
      return await this.historyRepository.find({
        where: { userId },
        order: { timestamp: "DESC" },
        take: limit,
      })
    } catch (error) {
      logger.error(`Error getting user rate limit history: ${error}`)
      throw error
    }
  }

  private async getTopThrottledIPs(startTime: Date, limit: number): Promise<TopThrottledIP[]> {
    try {
      if (!this.historyRepository) {
        return []
      }
      const results = await this.historyRepository
        .createQueryBuilder("history")
        .select("history.ip", "ip")
        .addSelect("COUNT(*)", "count")
        .where("history.timestamp >= :startTime", { startTime })
        .andWhere("history.wasThrottled = :wasThrottled", { wasThrottled: true })
        .groupBy("history.ip")
        .orderBy("count", "DESC")
        .limit(limit)
        .getRawMany()

      return results.map((r) => ({
        ip: r.ip,
        throttledCount: Number.parseInt(r.count, 10),
      }))
    } catch (error) {
      logger.error(`Error getting top throttled IPs: ${error}`)
      return []
    }
  }

  private async getTopThrottledUsers(startTime: Date, limit: number): Promise<TopThrottledUser[]> {
    try {
      if (!this.historyRepository) {
        return []
      }
      const results = await this.historyRepository
        .createQueryBuilder("history")
        .select("history.userId", "userId")
        .addSelect("COUNT(*)", "count")
        .where("history.timestamp >= :startTime", { startTime })
        .andWhere("history.wasThrottled = :wasThrottled", { wasThrottled: true })
        .andWhere("history.userId IS NOT NULL")
        .groupBy("history.userId")
        .orderBy("count", "DESC")
        .limit(limit)
        .getRawMany()

      return results.map((r) => ({
        userId: r.userId,
        throttledCount: Number.parseInt(r.count, 10),
      }))
    } catch (error) {
      logger.error(`Error getting top throttled users: ${error}`)
      return []
    }
  }

  // Method to get real-time rate limit status
  public async getRealTimeStatus(): Promise<RealTimeStatus> {
    try {
      const now = new Date()
      const oneMinuteAgo = new Date(now.getTime() - 60000)
      if (!this.historyRepository) {
        return {
          activeRequests: 0,
          throttledRequests: 0,
          burstModeActive: 0,
          activeBurstSessions: 0,
          timestamp: now,
          recentEvents: 0,
        }
      }

      const recentActivity = await this.historyRepository.find({
        where: {
          timestamp: MoreThanOrEqual(oneMinuteAgo),
        },
      })

      const activeRequests = recentActivity.length
      const throttledRequests = recentActivity.filter((r) => r.wasThrottled).length
      const burstModeActive = recentActivity.filter((r) => r.wasBurst).length

      // Get active burst sessions from Redis
      const burstKeys = await redisClient.keys("burst:*")
      const activeBurstSessions = burstKeys.length

      return {
        activeRequests,
        throttledRequests,
        burstModeActive,
        activeBurstSessions,
        timestamp: now,
        recentEvents: this.recentEvents.size,
      }
    } catch (error) {
      logger.error(`Error getting real-time status: ${error}`)
      return {
        activeRequests: 0,
        throttledRequests: 0,
        burstModeActive: 0,
        activeBurstSessions: 0,
        timestamp: new Date(),
        recentEvents: 0,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
}

// Create a singleton instance
const service = new RateLimitMonitoringService()
export default service
