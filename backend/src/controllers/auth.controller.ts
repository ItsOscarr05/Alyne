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

  async requestPasswordReset(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await authService.requestPasswordReset(email);

      // Always return success message (security best practice - don't reveal if user exists)
      res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;
      await authService.resetPassword(token, password);

      res.json({
        success: true,
        message: 'Password has been reset successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};

