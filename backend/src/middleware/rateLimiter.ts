import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { securityMonitor } from '../utils/securityMonitoring';

const createRateLimiter = (max: number, windowMs: number, message: string, endpoint?: string) => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      // Log security event when rate limit is hit
      securityMonitor.logRateLimit(req, endpoint || req.path);
      res.status(429).json({
        success: false,
        error: {
          message,
        },
      });
    },
  });
};

export const rateLimiter = createRateLimiter(
  100, // max
  15 * 60 * 1000, // 15 minutes
  'Too many requests from this IP, please try again later.'
);

export const authRateLimiter = createRateLimiter(
  5, // max
  15 * 60 * 1000, // 15 minutes
  'Too many authentication attempts, please try again later.',
  'auth'
);

// Stricter rate limiter for payment endpoints
export const paymentRateLimiter = createRateLimiter(
  20, // max
  15 * 60 * 1000, // 15 minutes
  'Too many payment requests, please try again later.',
  'payment'
);

// Rate limiter for Plaid endpoints (sensitive financial operations)
export const plaidRateLimiter = createRateLimiter(
  10, // max
  15 * 60 * 1000, // 15 minutes
  'Too many bank account requests, please try again later.',
  'plaid'
);

