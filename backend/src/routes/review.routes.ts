import { Router, type Express } from 'express';
import { reviewController } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { z } from 'zod';

const router: Express['Router'] = Router();

// All review routes require authentication
router.use(authenticate);

// Validation schemas
const submitReviewSchema = z.object({
  body: z.object({
    bookingId: z.string().min(1, 'Booking ID is required'),
    providerId: z.string().min(1, 'Provider ID is required'),
    rating: z.number().min(1).max(5, 'Rating must be between 1 and 5'),
    comment: z.string().max(2000, 'Comment too long').optional().nullable(),
  }),
});

const getReviewByBookingSchema = z.object({
  params: z.object({
    bookingId: z.string().min(1, 'Booking ID is required'),
  }),
});

const updateReviewSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Review ID is required'),
  }),
  body: z.object({
    rating: z.number().min(1).max(5, 'Rating must be between 1 and 5').optional(),
    comment: z.string().max(2000, 'Comment too long').optional().nullable(),
  }),
});

const flagReviewSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Review ID is required'),
  }),
  body: z.object({
    reason: z.string().min(1, 'Flag reason is required').max(500, 'Reason too long'),
  }),
});

// Routes with validation
router.post(
  '/submit',
  validateRequest(submitReviewSchema),
  reviewController.submitReview
);

router.get(
  '/booking/:bookingId',
  validateRequest(getReviewByBookingSchema),
  reviewController.getReviewByBooking
);

router.put(
  '/:id',
  validateRequest(updateReviewSchema),
  reviewController.updateReview
);

router.post(
  '/:id/flag',
  validateRequest(flagReviewSchema),
  reviewController.flagReview
);

export { router as reviewRoutes };

