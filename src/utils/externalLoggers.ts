import logger from './logger';

/**
 * Integration with external logging services
 * This file provides adapters for popular logging services
 */

/**
 * Type for structured logging metadata
 * Allows for nested objects and common primitive types
 */
type LogMetadata = {
    [key: string]: string | number | boolean | null | undefined | Date | LogMetadata | Array<LogMetadata | string | number | boolean | null | undefined | Date>;
};

// Base interface for external logger adapters
interface ExternalLoggerAdapter {
    error(message: string, metadata?: LogMetadata): void;
    warn(message: string, metadata?: LogMetadata): void;
    info(message: string, metadata?: LogMetadata): void;
    debug(message: string, metadata?: LogMetadata): void;
}

/**
 * Sentry adapter for error tracking
 * Requires @sentry/node package to be installed
 * 
 * Usage:
 * ```
 * import { SentryLogger } from './utils/externalLoggers';
 * 
 * // Initialize Sentry
 * SentryLogger.initialize({
 *   dsn: process.env.SENTRY_DSN,
 *   environment: process.env.NODE_ENV
 * });
 * 
 * // Log an error to Sentry
 * SentryLogger.error('Something went wrong', { userId: '123' });
 * ```
 */
export class SentryLogger implements ExternalLoggerAdapter {
    private static instance: SentryLogger;
    private initialized = false;

    private constructor() {
        // Private constructor to enforce singleton pattern
    }

    public static getInstance(): SentryLogger {
        if (!SentryLogger.instance) {
            SentryLogger.instance = new SentryLogger();
        }
        return SentryLogger.instance;
    }

    public initialize(config: { dsn: string; environment?: string }): void {
        try {
            // Dynamic import to avoid requiring the package if not used
            import('@sentry/node').then((Sentry) => {
                Sentry.init({
                    dsn: config.dsn,
                    environment: config.environment || 'development',
                });
                this.initialized = true;
                logger.info('Sentry initialized successfully');
            }).catch((err) => {
                logger.error('Failed to initialize Sentry. Is @sentry/node installed?', { error: err.message });
            });
        } catch (error) {
            logger.error('Failed to initialize Sentry', { error: (error as Error).message });
        }
    }

    public error(message: string, metadata?: LogMetadata): void {
        if (!this.initialized) {
            logger.warn('Sentry not initialized. Falling back to default logger');
            logger.error(message, metadata);
            return;
        }

        try {
            import('@sentry/node').then((Sentry) => {
                Sentry.captureException(new Error(message), {
                    extra: metadata,
                });
            });
        } catch (error) {
            logger.error('Failed to log to Sentry', { error: (error as Error).message });
        }
    }

    public warn(message: string, metadata?: LogMetadata): void {
        if (!this.initialized) {
            logger.warn(message, metadata);
            return;
        }

        try {
            import('@sentry/node').then((Sentry) => {
                Sentry.captureMessage(message, {
                    level: 'warning',
                    extra: metadata,
                });
            });
        } catch (error) {
            logger.warn('Failed to log warning to Sentry', { error: (error as Error).message });
        }
    }

    public info(message: string, metadata?: LogMetadata): void {
        if (!this.initialized) {
            logger.info(message, metadata);
            return;
        }

        try {
            import('@sentry/node').then((Sentry) => {
                Sentry.captureMessage(message, {
                    level: 'info',
                    extra: metadata,
                });
            });
        } catch (error) {
            logger.info('Failed to log info to Sentry', { error: (error as Error).message });
        }
    }

    public debug(message: string, metadata?: LogMetadata): void {
        if (!this.initialized) {
            logger.debug(message, metadata);
            return;
        }

        try {
            import('@sentry/node').then((Sentry) => {
                Sentry.captureMessage(message, {
                    level: 'debug',
                    extra: metadata,
                });
            });
        } catch (error) {
            logger.debug('Failed to log debug to Sentry', { error: (error as Error).message });
        }
    }
}

// Export singleton instance
export const sentryLogger = SentryLogger.getInstance();

/**
 * DataDog adapter for logging and metrics
 * Requires dd-trace package to be installed
 * 
 * Usage:
 * ```
 * import { DatadogLogger } from './utils/externalLoggers';
 * 
 * // Initialize DataDog
 * DatadogLogger.initialize({
 *   apiKey: process.env.DD_API_KEY,
 *   appName: 'paystell-backend',
 *   env: process.env.NODE_ENV
 * });
 * 
 * // Log an error to DataDog
 * DatadogLogger.error('Something went wrong', { userId: '123' });
 * ```
 */
export class DatadogLogger implements ExternalLoggerAdapter {
    private static instance: DatadogLogger;
    private initialized = false;

    private constructor() {
        // Private constructor to enforce singleton pattern
    }

    public static getInstance(): DatadogLogger {
        if (!DatadogLogger.instance) {
            DatadogLogger.instance = new DatadogLogger();
        }
        return DatadogLogger.instance;
    }

    public initialize(config: { apiKey: string; appName: string; env?: string }): void {
        try {
            // Dynamic import to avoid requiring the package if not used
            import('dd-trace').then((tracer) => {
                tracer.init({
                    service: config.appName,
                    env: config.env || 'development',
                });
                this.initialized = true;
                logger.info('DataDog initialized successfully');
            }).catch((err) => {
                logger.error('Failed to initialize DataDog. Is dd-trace installed?', { error: err.message });
            });
        } catch (error) {
            logger.error('Failed to initialize DataDog', { error: (error as Error).message });
        }
    }

    public error(message: string, metadata?: LogMetadata): void {
        if (!this.initialized) {
            logger.warn('DataDog not initialized. Falling back to default logger');
            logger.error(message, metadata);
            return;
        }

        // Log to DataDog (implementation depends on how you want to send logs to DataDog)
        logger.error(message, { ...metadata, datadog: true });
    }

    public warn(message: string, metadata?: LogMetadata): void {
        if (!this.initialized) {
            logger.warn(message, metadata);
            return;
        }

        logger.warn(message, { ...metadata, datadog: true });
    }

    public info(message: string, metadata?: LogMetadata): void {
        if (!this.initialized) {
            logger.info(message, metadata);
            return;
        }

        logger.info(message, { ...metadata, datadog: true });
    }

    public debug(message: string, metadata?: LogMetadata): void {
        if (!this.initialized) {
            logger.debug(message, metadata);
            return;
        }

        logger.debug(message, { ...metadata, datadog: true });
    }
}

// Export singleton instance
export const datadogLogger = DatadogLogger.getInstance(); 