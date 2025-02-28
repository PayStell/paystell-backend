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

class RateLimitMonitoringService {
    // This method logs rate limit events
    public async logRateLimitEvent(event: RateLimitEvent): Promise<void> {
        try {
            // Force the test to fail if 'ip' is null
            if (event.ip === null) {
                throw new Error("IP cannot be null");
            }
            
            console.warn('Rate limit exceeded:', JSON.stringify(event));
            
            // Also consider sending alerts for suspicious activity
            this.checkForSuspiciousActivity(event);
        } catch (error) {
            console.error('Failed to log rate limit event:', error);
        }
    }

    // Check for suspicious activity like multiple rate limit events from same IP
    private checkForSuspiciousActivity(event: RateLimitEvent): void {
        // Placeholder for actual implementation
    }

    // This would trigger an alert via email, SMS, etc.
    private triggerAlert(ip: string, count: number): void {
        console.error(`ALERT: Suspicious activity detected from IP ${ip} - ${count} rate limit events`);
    }

    // Create middleware to log rate limit events
    public createRateLimitMonitoringMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
        const self = this; // Store reference to this for use inside middleware

        return (req: Request, res: Response, next: NextFunction) => {
            const originalSend = res.send;
            
            res.send = function(body) {
                if (res.statusCode === 429) {
                    const event: RateLimitEvent = {
                        ip: req.ip || '0.0.0.0', // Provide default value for IP
                        endpoint: req.path,
                        userAgent: req.headers['user-agent'] as string || 'unknown',
                        timestamp: new Date(),
                        email: req.body?.email,
                        userId: req.user?.id
                    };
                    
                    // Use the stored reference to call logRateLimitEvent
                    self.logRateLimitEvent(event);
                }
                
                return originalSend.call(this, body);
            };
            
            next();
        };
    }
}

// Create a singleton instance
const service = new RateLimitMonitoringService();
export default service;