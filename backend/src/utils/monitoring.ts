/**
 * Monitoring and analytics utilities
 * Provides application performance monitoring and metrics
 */

import { logger } from './logger';

// Application metrics
interface AppMetrics {
  startTime: number;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  responseTimeHistory: number[];
}

class MonitoringService {
  private metrics: AppMetrics = {
    startTime: Date.now(),
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    responseTimeHistory: [],
  };

  private readonly MAX_HISTORY = 100; // Keep last 100 response times

  /**
   * Record a request
   */
  recordRequest(responseTime: number) {
    this.metrics.requestCount++;
    this.metrics.responseTimeHistory.push(responseTime);
    
    // Keep only last N response times
    if (this.metrics.responseTimeHistory.length > this.MAX_HISTORY) {
      this.metrics.responseTimeHistory.shift();
    }

    // Calculate average response time
    const sum = this.metrics.responseTimeHistory.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = sum / this.metrics.responseTimeHistory.length;
  }

  /**
   * Record an error
   */
  recordError() {
    this.metrics.errorCount++;
  }

  /**
   * Get current metrics
   */
  getMetrics(): AppMetrics & {
    uptime: number;
    uptimeFormatted: string;
    errorRate: number;
  } {
    const uptime = Date.now() - this.metrics.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptimeFormatted = `${hours}h ${minutes}m ${seconds}s`;

    const errorRate =
      this.metrics.requestCount > 0
        ? (this.metrics.errorCount / this.metrics.requestCount) * 100
        : 0;

    return {
      ...this.metrics,
      uptime,
      uptimeFormatted,
      errorRate: parseFloat(errorRate.toFixed(2)),
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset() {
    this.metrics = {
      startTime: Date.now(),
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      responseTimeHistory: [],
    };
  }
}

export const monitoring = new MonitoringService();

/**
 * Middleware to track request metrics
 */
import { Request, Response, NextFunction } from 'express';

export const monitoringMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Track response time
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    monitoring.recordRequest(responseTime);

    // Log slow requests
    if (responseTime > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        responseTime,
        statusCode: res.statusCode,
      });
    }
  });

  // Track errors
  res.on('close', () => {
    if (res.statusCode >= 400) {
      monitoring.recordError();
    }
  });

  next();
};

