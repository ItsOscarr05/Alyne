import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, userType, phoneNumber } = req.body;

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        userType,
        phoneNumber,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Prisma unique constraint error
        return next(createError('Email or phone number already exists', 409));
      }
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // TODO: Implement token blacklisting if needed
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      await authService.verifyEmail(token);

      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      await authService.resendVerificationEmail(userId);

      res.json({
        success: true,
        message: 'Verification email sent',
      });
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const user = await authService.updateUser(userId, req.body);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      await authService.deleteAccount(userId);

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};

