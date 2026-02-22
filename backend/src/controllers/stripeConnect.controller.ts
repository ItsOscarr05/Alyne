import { Response, NextFunction } from 'express';
import { stripeConnectService } from '../services/stripeConnect.service';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const stripeConnectController = {
  /**
   * POST /api/stripe/connect/onboarding-link
   * Providers only: returns Stripe Connect Express onboarding link.
   */
  async createOnboardingLink(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      if (!userId || !userType) return next(createError('Authentication required', 401));
      if (userType !== 'PROVIDER') return next(createError('Only providers can onboard payouts', 403));

      const returnPath = typeof req.body?.returnPath === 'string' ? req.body.returnPath : undefined;
      const linkType = req.body?.type === 'update' ? 'update' : undefined;
      const result = await stripeConnectService.createOnboardingLink(userId, { returnPath, type: linkType });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/stripe/connect/status
   * Providers only: returns current account status from Stripe.
   */
  async getStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      if (!userId || !userType) return next(createError('Authentication required', 401));
      if (userType !== 'PROVIDER') return next(createError('Only providers can view payout status', 403));

      const result = await stripeConnectService.getAccountStatus(userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};

