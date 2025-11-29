import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { errorTracker } from '../utils/errorTracking';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Suppress noisy logs for expected errors
  const isExpectedError = 
    statusCode === 401 && req.method === 'OPTIONS' || // CORS preflight
    statusCode === 401 && message === 'Authentication required'; // Expected auth failures

  if (!isExpectedError) {
    logger.error('Request error', err, {
      statusCode,
      method: req.method,
      path: req.path,
    });
    
    // Send to error tracking service
    if (err instanceof Error) {
      errorTracker.captureException(err, {
        path: req.path,
        method: req.method,
        statusCode: statusCode,
        userId: (req as any).user?.id,
      });
    } else {
      errorTracker.captureMessage(String(err), 'error', {
        path: req.path,
        method: req.method,
        statusCode: statusCode,
      });
    }
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

