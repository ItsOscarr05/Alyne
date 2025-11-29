import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const paymentController = {
  async createPaymentIntent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { bookingId } = req.body;

      if (!bookingId) {
        return next(createError('Booking ID is required', 400));
      }

      const result = await paymentService.createPaymentIntent(bookingId, userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async confirmPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { bookingId, paymentIntentId } = req.body;

      if (!bookingId || !paymentIntentId) {
        return next(createError('Booking ID and Payment Intent ID are required', 400));
      }

      const payment = await paymentService.confirmPayment(bookingId, paymentIntentId, userId);

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  },

  async getPaymentByBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { bookingId } = req.params;

      const payment = await paymentService.getPaymentByBooking(bookingId, userId);

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  },

  async getPaymentHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      if (!userId || !userType) {
        return next(createError('Authentication required', 401));
      }

      const payments = await paymentService.getPaymentHistory(userId, userType);

      res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Automatically process Plaid transfer to provider
   * POST /api/payments/process-provider-payment
   */
  async processProviderPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { bookingId } = req.body;

      if (!bookingId) {
        return next(createError('Booking ID is required', 400));
      }

      const result = await paymentService.processProviderPayment(bookingId, userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};

