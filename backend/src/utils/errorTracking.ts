/**
 * Error tracking integration
 * Supports Sentry and other error tracking services
 */

import { logger } from './logger';

// Error tracking service interface
interface ErrorTrackingService {
  captureException(error: Error, context?: Record<string, any>): void;
  captureMessage(message: string, level?: 'info' | 'warning' | 'error', context?: Record<string, any>): void;
  setUser(userId: string, email?: string): void;
  setContext(key: string, context: Record<string, any>): void;
}

// Placeholder implementation (replace with actual Sentry when ready)
class ErrorTracker implements ErrorTrackingService {
  private isEnabled: boolean;
  private sentryClient: any = null;

  constructor() {
    this.isEnabled = !!process.env.SENTRY_DSN;
    
    if (this.isEnabled) {
      this.initializeSentry();
    } else {
      logger.info('Error tracking disabled (SENTRY_DSN not set)');
    }
  }

  private initializeSentry() {
    try {
      // Dynamic import to avoid requiring Sentry in development
      // Uncomment when Sentry is installed:
      /*
      const Sentry = require('@sentry/node');
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: require('../index').app }),
        ],
      });
      this.sentryClient = Sentry;
      logger.info('Sentry error tracking initialized');
      */
      logger.info('Sentry integration ready (install @sentry/node to enable)');
    } catch (error) {
      logger.error('Failed to initialize Sentry', error);
      this.isEnabled = false;
    }
  }

  captureException(error: Error, context?: Record<string, any>): void {
    if (!this.isEnabled) {
      // Fallback to logger
      logger.error('Exception captured', error, context);
      return;
    }

    if (this.sentryClient) {
      this.sentryClient.captureException(error, {
        extra: context,
      });
    } else {
      logger.error('Exception captured (Sentry not initialized)', error, context);
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>): void {
    if (!this.isEnabled) {
      logger[level](message, context);
      return;
    }

    if (this.sentryClient) {
      this.sentryClient.captureMessage(message, {
        level: level === 'info' ? 'info' : level === 'warning' ? 'warning' : 'error',
        extra: context,
      });
    } else {
      logger[level](message, context);
    }
  }

  setUser(userId: string, email?: string): void {
    if (this.sentryClient) {
      this.sentryClient.setUser({
        id: userId,
        email,
      });
    }
  }

  setContext(key: string, context: Record<string, any>): void {
    if (this.sentryClient) {
      this.sentryClient.setContext(key, context);
    }
  }
}

export const errorTracker = new ErrorTracker();

/**
 * Helper to capture errors with context
 */
export const captureError = (error: Error | any, context?: Record<string, any>) => {
  if (error instanceof Error) {
    errorTracker.captureException(error, context);
  } else {
    errorTracker.captureMessage(String(error), 'error', context);
  }
};

