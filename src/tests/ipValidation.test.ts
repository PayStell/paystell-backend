import { Request, Response, NextFunction } from 'express';
import { validateIpAddress } from '../middlewares/ipValidation.middleware';

describe('IP Validation Middleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: jest.Mock<NextFunction>;

    beforeEach(() => {
        req = {
            ip: '192.168.1.100',
            headers: {}
        };
        res = {};
        next = jest.fn();
    });

    it('should use req.ip if no headers are present', () => {
        validateIpAddress(req as Request, res as Response, next);
        
        expect(next).toHaveBeenCalled();
        expect((req as any).validatedIp).toBe(req.ip);
    });

    it('should use x-forwarded-for header if present', () => {
        req.headers = {
            'x-forwarded-for': '10.0.0.1, 10.0.0.2'
        };
        
        validateIpAddress(req as Request, res as Response, next);
        
        expect((req as any).validatedIp).toBe('10.0.0.1');
        expect(next).toHaveBeenCalled();
    });

    it('should use x-real-ip header if x-forwarded-for is not present', () => {
        req.headers = {
            'x-real-ip': '10.0.0.3'
        };
        
        validateIpAddress(req as Request, res as Response, next);
        
        expect((req as any).validatedIp).toBe('10.0.0.3');
        expect(next).toHaveBeenCalled();
    });

    it('should validate IPv4 addresses correctly', () => {
        req.headers = {
            'x-forwarded-for': '192.168.1.1'
        };
        
        validateIpAddress(req as Request, res as Response, next);
        
        expect((req as any).validatedIp).toBe('192.168.1.1');
        expect(next).toHaveBeenCalled();
    });

    it('should reject invalid IPv4 addresses', () => {
        req.headers = {
            'x-forwarded-for': '192.168.1.300'
        };
        
        validateIpAddress(req as Request, res as Response, next);
        
        // Should fall back to req.ip
        expect((req as any).validatedIp).toBe(req.ip);
        expect(next).toHaveBeenCalled();
    });

    it('should log warnings for mismatched IP headers', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        req.headers = {
            'x-forwarded-for': '10.0.0.1',
            'x-real-ip': '10.0.0.2'
        };
        
        validateIpAddress(req as Request, res as Response, next);
        
        expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Suspicious request'));
        expect((req as any).validatedIp).toBe('10.0.0.1');
        expect(next).toHaveBeenCalled();
        
        consoleWarnSpy.mockRestore();
    });
});