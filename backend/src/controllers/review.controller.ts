import { Request, Response, NextFunction } from 'express';
import { reviewService } from '../services/review.service';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { io } from '../index';
import { prisma } from '../utils/db';

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

      // Calculate updated provider rating stats
      const reviews = await prisma.review.findMany({
        where: {
          providerId,
          isVisible: true,
          isFlagged: false,
        },
      });

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
      const reviewCount = reviews.length;

      // Emit real-time update to all users viewing this provider
      io.emit('provider-rating-updated', {
        providerId,
        rating: avgRating,
        reviewCount,
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

      // Calculate updated provider rating stats
      const reviews = await prisma.review.findMany({
        where: {
          providerId: review.providerId,
          isVisible: true,
          isFlagged: false,
        },
      });

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
      const reviewCount = reviews.length;

      // Emit real-time update to all users viewing this provider
      io.emit('provider-rating-updated', {
        providerId: review.providerId,
        rating: avgRating,
        reviewCount,
      });

      res.json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  },

  async flagReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { id } = req.params;
      const { reason } = req.body;

      const review = await reviewService.flagReview(id, userId, reason);

      res.json({
        success: true,
        data: review,
        message: 'Review has been flagged and will be reviewed',
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { id } = req.params;

      // Get review before deletion to get providerId for rating update
      const review = await prisma.review.findUnique({
        where: { id },
      });

      if (!review) {
        return next(createError('Review not found', 404));
      }

      const providerId = review.providerId;
      const bookingId = review.bookingId;

      // Delete the review
      await reviewService.deleteReview(id, userId);

      // Calculate updated provider rating stats after deletion
      const reviews = await prisma.review.findMany({
        where: {
          providerId,
          isVisible: true,
          isFlagged: false,
        },
      });

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
      const reviewCount = reviews.length;

      // Emit real-time update to all users viewing this provider
      io.emit('provider-rating-updated', {
        providerId,
        rating: avgRating,
        reviewCount,
      });

      // Emit review deleted event to notify clients that a review was deleted (so they can refresh their booking cards)
      if (bookingId) {
        io.to(`user:${userId}`).emit('review-deleted', {
          bookingId,
          reviewId: id,
        });
      }

      res.json({
        success: true,
        message: 'Review deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};

