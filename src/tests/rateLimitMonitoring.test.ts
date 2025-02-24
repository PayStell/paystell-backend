import RateLimitMonitoringService, { RateLimitEvent } from '../services/rateLimitMonitoring.service';
import { Request, Response, NextFunction } from 'express';

describe('Rate Limit Monitoring Service', () => {
    let consoleWarnSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    
    beforeEach(() => {
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });
    
    afterEach(() => {
        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });
    
    it('should log rate limit events', async () => {
        const event: RateLimitEvent = {
            ip: '192.168.1.1',
            endpoint: '/auth/login',
            userAgent: 'Mozilla/5.0',
            timestamp: new Date(),
            email: 'test@example.com'
        };
        
        await RateLimitMonitoringService.logRateLimitEvent(event);
        
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            'Rate limit exceeded:',
            expect.any(String)
        );
    });
    
    it('should handle errors when logging events', async () => {
        // Force an error by passing an invalid event
        const invalidEvent = {
            ip: null, // This will cause an error in logRateLimitEvent
            endpoint: '/auth/login',
            timestamp: new Date()
        } as unknown as RateLimitEvent;
        
        await RateLimitMonitoringService.logRateLimitEvent(invalidEvent);
        
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Failed to log rate limit event:',
            expect.any(Error)
        );
    });
    
    it('should check for suspicious activity', async () => {
        // Mock the private method to test it
        const checkSpy = jest.spyOn(RateLimitMonitoringService as any, 'checkForSuspiciousActivity');
        
        const event: RateLimitEvent = {
            ip: '192.168.1.1',
            endpoint: '/auth/login',
            userAgent: 'Mozilla/5.0',
            timestamp: new Date(),
            email: 'test@example.com'
        };
        
        await RateLimitMonitoringService.logRateLimitEvent(event);
        
        expect(checkSpy).toHaveBeenCalledWith(event);
        
        checkSpy.mockRestore();
    });
    
    it('should create middleware that logs rate limit events', () => {
        // Create middleware
        const middleware = RateLimitMonitoringService.createRateLimitMonitoringMiddleware();
        
        // Mock request and response
        const req = {
            ip: '192.168.1.1',
            path: '/auth/login',
            headers: {
                'user-agent': 'Mozilla/5.0'
            },
            body: {
                email: 'test@example.com'
            },
            user: {
                id: 1
            }
        } as unknown as Request;
        
        const res = {
            statusCode: 429,
            send: jest.fn().mockReturnThis(),
            getHeader: jest.fn(),
            setHeader: jest.fn()
        } as unknown as Response;
        
        const next = jest.fn() as NextFunction;
        
        // Mock the logRateLimitEvent method
        const logSpy = jest.spyOn(RateLimitMonitoringService, 'logRateLimitEvent').mockResolvedValue();
        
        // Call the middleware
        middleware(req, res, next);
        
        // Simulate sending a response
        (res.send as jest.Mock)('Rate limit exceeded');
        
        expect(next).toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({
            ip: '192.168.1.1',
            endpoint: '/auth/login',
            email: 'test@example.com',
            userId: 1
        }));
        
        logSpy.mockRestore();
    });
    
    it('should not log events for non-rate-limited responses', () => {
        const middleware = RateLimitMonitoringService.createRateLimitMonitoringMiddleware();
        
        // Mock request and response
        const req = {
            ip: '192.168.1.1',
            path: '/auth/login',
        } as unknown as Request;
        
        const res = {
            statusCode: 200, // Not a rate limit error
            send: jest.fn().mockReturnThis(),
        } as unknown as Response;
        
        const next = jest.fn() as NextFunction;
        
        // Mock the logRateLimitEvent method
        const logSpy = jest.spyOn(RateLimitMonitoringService, 'logRateLimitEvent').mockResolvedValue();
        
        // Call the middleware
        middleware(req, res, next);
        
        // Simulate sending a response
        (res.send as jest.Mock)('Success');
        
        expect(next).toHaveBeenCalled();
        expect(logSpy).not.toHaveBeenCalled();
        
        logSpy.mockRestore();
    });
});