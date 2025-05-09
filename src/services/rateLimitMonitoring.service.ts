import { Request, Response, NextFunction } from "express";

// Interface for rate limit events
export interface RateLimitEvent {
  id?: number;
  ip: string;
  endpoint: string;
  userAgent?: string;
  timestamp: Date;
  email?: string;
  userId?: number;
}

interface SuspiciousActivityCriteria {
  threshold: number;
  timeWindowMs: number;
}

class RateLimitMonitoringService {
  private recentEvents: Map<string, RateLimitEvent[]>;
  private readonly suspiciousCriteria: SuspiciousActivityCriteria;

  constructor() {
    this.recentEvents = new Map();
    this.suspiciousCriteria = {
      threshold: 10,
      timeWindowMs: 60000, // 1 minute
    };
  }

  // This method logs rate limit events
  public async logRateLimitEvent(event: RateLimitEvent): Promise<void> {
    try {
      if (!event.ip) {
        throw new Error("IP cannot be null or empty");
      }

      console.warn("Rate limit exceeded:", JSON.stringify(event));

      this.checkForSuspiciousActivity(event);
    } catch (error) {
      console.error("Failed to log rate limit event:", error);
    }
  }

  // Check for suspicious activity like multiple rate limit events from same IP
  private checkForSuspiciousActivity(event: RateLimitEvent): void {
    const ipEvents = this.recentEvents.get(event.ip) || [];
    const now = Date.now();

    // Remove events outside the time window
    const recentIpEvents = ipEvents.filter(
      (e) =>
        now - e.timestamp.getTime() <= this.suspiciousCriteria.timeWindowMs,
    );

    // Add the new event
    recentIpEvents.push(event);
    this.recentEvents.set(event.ip, recentIpEvents);

    // Check if threshold is exceeded
    if (recentIpEvents.length >= this.suspiciousCriteria.threshold) {
      this.triggerAlert(event.ip, recentIpEvents.length);
    }
  }

  // This would trigger an alert via email, SMS, etc.
  private triggerAlert(ip: string, count: number): void {
    console.error(
      `ALERT: Suspicious activity detected from IP ${ip} - ${count} rate limit events in the last minute`,
    );
  }

  // Create middleware to log rate limit events
  public createRateLimitMonitoringMiddleware(): (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send;

      res.send = (body): Response => {
        if (res.statusCode === 429) {
          const event: RateLimitEvent = {
            ip: req.ip || "0.0.0.0",
            endpoint: req.originalUrl,
            userAgent: req.headers["user-agent"],
            timestamp: new Date(),
            userId: req.user!.id,
            email: req.user!.email,
          };

          this.logRateLimitEvent(event).catch((err) => {
            console.error("Failed to log rate limit event:", err);
          });
        }
        return originalSend.call(res, body);
      };

      next();
    };
  }
}

// Create a singleton instance
const service = new RateLimitMonitoringService();
export default service;
