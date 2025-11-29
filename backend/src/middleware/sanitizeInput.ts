/**
 * Input sanitization middleware
 * Prevents XSS attacks by sanitizing user input
 */
import { Request, Response, NextFunction } from 'express';
import { securityMonitor } from '../utils/securityMonitoring';

/**
 * Sanitize string input by removing potentially dangerous characters
 */
const sanitizeString = (str: string, req?: Request): string => {
  if (typeof str !== 'string') return str;
  
  const original = str;
  let sanitized = str;
  
  // Check for XSS patterns before sanitizing
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /javascript:/gi,
    /data:text\/html/gi,
  ];
  
  let detectedPattern: string | undefined;
  for (const pattern of xssPatterns) {
    if (pattern.test(str)) {
      detectedPattern = pattern.toString();
      break;
    }
  }
  
  // Remove script tags and event handlers
  sanitized = str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers like onclick="..."
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:text\/html/gi, '') // Remove data URIs with HTML
    .trim();
  
  // Log security event if XSS attempt detected
  if (detectedPattern && sanitized !== original && req) {
    securityMonitor.logSuspiciousRequest(req, 'XSS attempt detected', detectedPattern);
  }
  
  return sanitized;
};

/**
 * Recursively sanitize object properties
 */
const sanitizeObject = (obj: any, req?: Request): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj, req);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, req));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key], req);
      }
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Middleware to sanitize request body, query, and params
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeObject(req.body, req);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query, req) as any;
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params, req) as any;
  }
  
  next();
};

