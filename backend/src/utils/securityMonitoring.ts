/**
 * Security monitoring utilities
 * Tracks security events and suspicious activities
 */
import { Request } from 'express';
import { logger } from './logger';
import { errorTracker } from './errorTracking';

interface SecurityEvent {
  type: 'rate_limit' | 'auth_failure' | 'suspicious_request' | 'xss_attempt' | 'sql_injection_attempt' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  ip?: string;
  userId?: string;
  endpoint?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private readonly maxEvents = 1000; // Keep last 1000 events in memory

  /**
   * Log a security event
   */
  logEvent(event: Omit<SecurityEvent, 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    };

    // Add to in-memory store (keep last maxEvents)
    this.events.push(securityEvent);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Log based on severity
    const logMessage = `[Security Event] ${event.type.toUpperCase()}: ${event.message} | IP: ${event.ip || 'unknown'} | Endpoint: ${event.endpoint || 'unknown'}`;
    
    switch (event.severity) {
      case 'critical':
      case 'high':
        logger.error(logMessage, { event: securityEvent });
        errorTracker.captureMessage(logMessage, 'error', { event: securityEvent });
        break;
      case 'medium':
        logger.warn(logMessage, { event: securityEvent });
        break;
      case 'low':
        logger.info(logMessage, { event: securityEvent });
        break;
    }

    return securityEvent;
  }

  /**
   * Log rate limit event
   */
  logRateLimit(req: Request, endpoint: string) {
    return this.logEvent({
      type: 'rate_limit',
      severity: 'medium',
      message: 'Rate limit exceeded',
      ip: req.ip || req.socket.remoteAddress,
      endpoint,
      metadata: {
        userAgent: req.get('user-agent'),
        method: req.method,
      },
    });
  }

  /**
   * Log authentication failure
   */
  logAuthFailure(req: Request, reason: string, userId?: string) {
    return this.logEvent({
      type: 'auth_failure',
      severity: 'medium',
      message: `Authentication failed: ${reason}`,
      ip: req.ip || req.socket.remoteAddress,
      userId,
      endpoint: req.path,
      metadata: {
        userAgent: req.get('user-agent'),
        method: req.method,
      },
    });
  }

  /**
   * Log suspicious request (potential XSS, SQL injection, etc.)
   */
  logSuspiciousRequest(req: Request, reason: string, detectedPattern?: string) {
    return this.logEvent({
      type: 'suspicious_request',
      severity: 'high',
      message: `Suspicious request detected: ${reason}`,
      ip: req.ip || req.socket.remoteAddress,
      endpoint: req.path,
      metadata: {
        userAgent: req.get('user-agent'),
        method: req.method,
        detectedPattern,
        body: req.body ? JSON.stringify(req.body).substring(0, 200) : undefined, // Limit body size
      },
    });
  }

  /**
   * Log unauthorized access attempt
   */
  logUnauthorizedAccess(req: Request, resource: string, userId?: string) {
    return this.logEvent({
      type: 'unauthorized_access',
      severity: 'high',
      message: `Unauthorized access attempt to ${resource}`,
      ip: req.ip || req.socket.remoteAddress,
      userId,
      endpoint: req.path,
      metadata: {
        userAgent: req.get('user-agent'),
        method: req.method,
      },
    });
  }

  /**
   * Get recent security events
   */
  getRecentEvents(limit: number = 50, severity?: SecurityEvent['severity']) {
    let events = this.events;
    
    if (severity) {
      events = events.filter(e => e.severity === severity);
    }
    
    return events.slice(-limit).reverse(); // Most recent first
  }

  /**
   * Get events by type
   */
  getEventsByType(type: SecurityEvent['type'], limit: number = 50) {
    return this.events
      .filter(e => e.type === type)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get security statistics
   */
  getStats() {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp >= last24Hours);

    return {
      total: this.events.length,
      last24Hours: recentEvents.length,
      byType: {
        rate_limit: recentEvents.filter(e => e.type === 'rate_limit').length,
        auth_failure: recentEvents.filter(e => e.type === 'auth_failure').length,
        suspicious_request: recentEvents.filter(e => e.type === 'suspicious_request').length,
        unauthorized_access: recentEvents.filter(e => e.type === 'unauthorized_access').length,
      },
      bySeverity: {
        critical: recentEvents.filter(e => e.severity === 'critical').length,
        high: recentEvents.filter(e => e.severity === 'high').length,
        medium: recentEvents.filter(e => e.severity === 'medium').length,
        low: recentEvents.filter(e => e.severity === 'low').length,
      },
    };
  }
}

export const securityMonitor = new SecurityMonitor();

