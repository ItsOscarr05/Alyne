import { Request, Response, NextFunction } from 'express';
import { reviewService } from '../services/review.service';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const reviewController = {
  async submitReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { bookingId, providerId, rating, comment } = req.body;

      if (!bookingId || !providerId || !rating) {
        return next(createError('Booking ID, provider ID, and rating are required', 400));
      }

      const review = await reviewService.submitReview({
        bookingId,
        clientId: userId,
        providerId,
        rating,
        comment,
      });

      res.status(201).json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  },

  async getReviewByBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { bookingId } = req.params;
      const review = await reviewService.getReviewByBooking(bookingId, userId);

      if (!review) {
        return res.json({
          success: true,
          data: null,
        });
      }

      res.json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { id } = req.params;
      const review = await reviewService.updateReview(id, userId, req.body);

      res.json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  },
};

