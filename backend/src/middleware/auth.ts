import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    userType: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createError('Authentication required', 401));
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return next(createError('JWT_SECRET not configured', 500));
    }

    const decoded = jwt.verify(token, secret) as { userId: string };

    req.user = {
      id: decoded.userId,
      email: '', // Will be populated if needed
      userType: '', // Will be populated if needed
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(createError('Invalid token', 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(createError('Token expired', 401));
    }
    next(error);
  }
};

