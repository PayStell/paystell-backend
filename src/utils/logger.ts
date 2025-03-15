import winston from 'winston';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define log colors
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Create format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
);

// Create format for file output (JSON)
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.json(),
);

// Determine log level based on environment
const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Create the logger instance
const logger = winston.createLogger({
    level,
    levels,
    format: fileFormat,
    defaultMeta: { service: 'paystell-backend' },
    transports: [
        // Write logs with level 'error' and below to error.log
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        // Write all logs to combined.log
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' }),
    ],
    rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' }),
    ],
});

// Add console transport in development environment
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: consoleFormat,
        }),
    );
}

// Define log metadata types
interface RequestMetadata {
    requestId: string;
    userId: string | number;
    method: string;
    url: string;
    ip: string | undefined;
    userAgent: string | undefined;
}

interface LogMetadata {
    [key: string]: string | number | boolean | null | undefined | Date | LogMetadata | Array<LogMetadata | string | number | boolean | null | undefined | Date>;
}

// Extract request metadata for logging
export const extractRequestMetadata = (req: Request): RequestMetadata => {
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    const userId = (req as { user?: { id: string | number } }).user?.id || 'anonymous';

    return {
        requestId,
        userId,
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
    };
};

// Helper function to log errors with request context
export const logError = (error: Error, req?: Request, additionalInfo?: LogMetadata) => {
    const metadata = req ? extractRequestMetadata(req) : {};

    logger.error({
        message: error.message,
        stack: error.stack,
        ...metadata,
        ...additionalInfo,
    });
};

// Helper function to log warnings with request context
export const logWarn = (message: string, req?: Request, additionalInfo?: LogMetadata) => {
    const metadata = req ? extractRequestMetadata(req) : {};

    logger.warn({
        message,
        ...metadata,
        ...additionalInfo,
    });
};

// Helper function to log info with request context
export const logInfo = (message: string, req?: Request, additionalInfo?: LogMetadata) => {
    const metadata = req ? extractRequestMetadata(req) : {};

    logger.info({
        message,
        ...metadata,
        ...additionalInfo,
    });
};

// Helper function to log debug with request context
export const logDebug = (message: string, req?: Request, additionalInfo?: LogMetadata) => {
    const metadata = req ? extractRequestMetadata(req) : {};

    logger.debug({
        message,
        ...metadata,
        ...additionalInfo,
    });
};

// Helper function to log HTTP requests
export const logHttp = (req: Request, responseTime?: number, statusCode?: number) => {
    const metadata = extractRequestMetadata(req);

    logger.http({
        message: `${req.method} ${req.originalUrl || req.url}`,
        responseTime,
        statusCode,
        ...metadata,
    });
};

export default logger; 