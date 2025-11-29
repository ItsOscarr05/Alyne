/**
 * Input sanitization middleware
 * Prevents XSS attacks by sanitizing user input
 */
import { Request, Response, NextFunction } from 'express';

/**
 * Sanitize string input by removing potentially dangerous characters
 */
const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') return str;
  
  // Remove script tags and event handlers
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers like onclick="..."
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:text\/html/gi, '') // Remove data URIs with HTML
    .trim();
};

/**
 * Recursively sanitize object properties
 */
const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
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
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query) as any;
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params) as any;
  }
  
  next();
};

