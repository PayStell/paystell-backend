import { Request } from 'express';
import logger, {
    logError,
    logWarn,
    logInfo,
    logDebug,
    extractRequestMetadata
} from '../utils/logger';

// Mock winston
jest.mock('winston', () => {
    const mockLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        http: jest.fn(),
        add: jest.fn(),
    };
    return {
        format: {
            timestamp: jest.fn().mockReturnValue({}),
            colorize: jest.fn().mockReturnValue({}),
            printf: jest.fn().mockReturnValue({}),
            json: jest.fn().mockReturnValue({}),
            combine: jest.fn().mockReturnValue({}),
        },
        createLogger: jest.fn().mockReturnValue(mockLogger),
        transports: {
            Console: jest.fn(),
            File: jest.fn(),
        },
        addColors: jest.fn(),
    };
});

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('test-uuid'),
}));

describe('Logger', () => {
    // Create a mock request object
    const mockRequest = {
        headers: {
            'user-agent': 'test-agent',
        },
        method: 'GET',
        originalUrl: '/test',
        url: '/test',
        ip: '127.0.0.1',
        socket: {
            remoteAddress: '127.0.0.1',
        },
        user: {
            id: 'test-user-id',
        },
    } as unknown as Request;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('extractRequestMetadata', () => {
        it('should extract metadata from request', () => {
            const metadata = extractRequestMetadata(mockRequest);

            expect(metadata).toEqual({
                requestId: 'test-uuid',
                userId: 'test-user-id',
                method: 'GET',
                url: '/test',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
            });
        });

        it('should use existing request ID if present', () => {
            const requestWithId = {
                ...mockRequest,
                headers: {
                    ...mockRequest.headers,
                    'x-request-id': 'existing-id',
                },
            } as unknown as Request;

            const metadata = extractRequestMetadata(requestWithId);

            expect(metadata).toEqual({
                requestId: 'existing-id',
                userId: 'test-user-id',
                method: 'GET',
                url: '/test',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
            });
        });

        it('should handle missing user', () => {
            const requestWithoutUser = {
                ...mockRequest,
                user: undefined,
            } as unknown as Request;

            const metadata = extractRequestMetadata(requestWithoutUser);

            expect(metadata).toEqual({
                requestId: 'test-uuid',
                userId: 'anonymous',
                method: 'GET',
                url: '/test',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
            });
        });
    });

    describe('logError', () => {
        it('should log error with request context', () => {
            const error = new Error('Test error');
            logError(error, mockRequest, { additionalKey: 'value' });

            expect(logger.error).toHaveBeenCalledWith({
                message: 'Test error',
                stack: error.stack,
                requestId: 'test-uuid',
                userId: 'test-user-id',
                method: 'GET',
                url: '/test',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
                additionalKey: 'value',
            });
        });

        it('should log error without request context', () => {
            const error = new Error('Test error');
            logError(error, undefined, { additionalKey: 'value' });

            expect(logger.error).toHaveBeenCalledWith({
                message: 'Test error',
                stack: error.stack,
                additionalKey: 'value',
            });
        });
    });

    describe('logWarn', () => {
        it('should log warning with request context', () => {
            logWarn('Test warning', mockRequest, { additionalKey: 'value' });

            expect(logger.warn).toHaveBeenCalledWith({
                message: 'Test warning',
                requestId: 'test-uuid',
                userId: 'test-user-id',
                method: 'GET',
                url: '/test',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
                additionalKey: 'value',
            });
        });
    });

    describe('logInfo', () => {
        it('should log info with request context', () => {
            logInfo('Test info', mockRequest, { additionalKey: 'value' });

            expect(logger.info).toHaveBeenCalledWith({
                message: 'Test info',
                requestId: 'test-uuid',
                userId: 'test-user-id',
                method: 'GET',
                url: '/test',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
                additionalKey: 'value',
            });
        });
    });

    describe('logDebug', () => {
        it('should log debug with request context', () => {
            logDebug('Test debug', mockRequest, { additionalKey: 'value' });

            expect(logger.debug).toHaveBeenCalledWith({
                message: 'Test debug',
                requestId: 'test-uuid',
                userId: 'test-user-id',
                method: 'GET',
                url: '/test',
                ip: '127.0.0.1',
                userAgent: 'test-agent',
                additionalKey: 'value',
            });
        });
    });
}); 