/**
 * Production-ready logger utility for mobile app
 * Replaces console.log with proper logging levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
const isProduction = !__DEV__ && process.env.NODE_ENV === 'production';

class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (isDevelopment) return true; // Log everything in development
    
    // In production, only log warnings and errors
    if (isProduction) {
      return level === 'warn' || level === 'error';
    }
    
    return true;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, error?: Error | any, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, error, ...args);
      
      // In production, you would send this to error tracking service
      // Example: Sentry.captureException(error);
    }
  }
}

export const logger = new Logger();

