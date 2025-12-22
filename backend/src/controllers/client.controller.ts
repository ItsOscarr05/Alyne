import { Request, Response, NextFunction } from 'express';
import { clientService } from '../services/client.service';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const clientController = {
  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      if (req.user?.userType !== 'CLIENT') {
        return next(createError('Only clients can update client profile', 403));
      }

      const { preferences } = req.body;

      const profile = await clientService.updateProfile(userId, preferences);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  },

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      if (req.user?.userType !== 'CLIENT') {
        return next(createError('Only clients can access client profile', 403));
      }

      const profile = await clientService.getProfile(userId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  },
};
