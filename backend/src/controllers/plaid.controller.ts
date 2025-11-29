import { Request, Response, NextFunction } from 'express';
import { plaidService } from '../services/plaid.service';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const plaidController = {
  /**
   * Create a Plaid Link token for frontend initialization
   * GET /api/plaid/link-token
   */
  async createLinkToken(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      if (req.user?.userType !== 'PROVIDER') {
        return next(createError('Only providers can link bank accounts', 403));
      }

      const linkToken = await plaidService.createLinkToken(userId);

      res.json({
        success: true,
        data: {
          linkToken,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Exchange Plaid public token for access token and processor token
   * POST /api/plaid/exchange-token
   */
  async exchangeToken(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      if (req.user?.userType !== 'PROVIDER') {
        return next(createError('Only providers can link bank accounts', 403));
      }

      const { publicToken } = req.body;

      if (!publicToken) {
        return next(createError('Public token is required', 400));
      }

      const result = await plaidService.exchangePublicToken(publicToken, userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get bank account information for the authenticated provider
   * GET /api/plaid/bank-account
   */
  async getBankAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      if (req.user?.userType !== 'PROVIDER') {
        return next(createError('Only providers can view bank account information', 403));
      }

      const bankAccount = await plaidService.getBankAccountInfo(userId);

      res.json({
        success: true,
        data: bankAccount,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a link token for client payment initiation
   * GET /api/plaid/payment-link-token?bookingId=xxx
   */
  async createPaymentLinkToken(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { bookingId } = req.query;
      if (!bookingId || typeof bookingId !== 'string') {
        return next(createError('Booking ID is required', 400));
      }

      const linkToken = await plaidService.createPaymentInitiationLinkToken(userId, bookingId);

      res.json({
        success: true,
        data: {
          linkToken,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

