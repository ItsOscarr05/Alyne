import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createError } from './errorHandler';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    userType: string;
  };
}

export const authenticate = async (
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
    
    // Development mode: accept dev-token for testing
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment && token === 'dev-token') {
      // Use the test client ID from the database for testing
      // This matches the client ID from the test booking
      req.user = {
        id: 'cmigdcni10000fvbjkbrgpraa', // Test client ID
        email: 'test@alyne.com',
        userType: 'CLIENT',
      };
      return next();
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return next(createError('JWT_SECRET not configured', 500));
    }

    const decoded = jwt.verify(token, secret) as { userId: string };

    // Fetch user from database to get email and userType
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        userType: true,
      },
    });

    if (!user) {
      return next(createError('User not found', 401));
    }

    req.user = {
      id: user.id,
      email: user.email,
      userType: user.userType,
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

