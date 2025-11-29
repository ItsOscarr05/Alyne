import { Router, type Express } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';
import { paymentRateLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validateRequest';
import { z } from 'zod';

const router: Express['Router'] = Router();

// All payment routes require authentication
router.use(authenticate);

// Validation schemas
const createPaymentIntentSchema = z.object({
  body: z.object({
    bookingId: z.string().min(1, 'Booking ID is required'),
  }),
});

const confirmPaymentSchema = z.object({
  body: z.object({
    bookingId: z.string().min(1, 'Booking ID is required'),
    paymentIntentId: z.string().min(1, 'Payment Intent ID is required'),
  }),
});

const processProviderPaymentSchema = z.object({
  body: z.object({
    bookingId: z.string().min(1, 'Booking ID is required'),
  }),
});

const getPaymentByBookingSchema = z.object({
  params: z.object({
    bookingId: z.string().min(1, 'Booking ID is required'),
  }),
});

// Routes with rate limiting and validation
router.post(
  '/create-intent',
  paymentRateLimiter,
  validateRequest(createPaymentIntentSchema),
  paymentController.createPaymentIntent
);

router.post(
  '/confirm',
  paymentRateLimiter,
  validateRequest(confirmPaymentSchema),
  paymentController.confirmPayment
);

router.post(
  '/process-provider-payment',
  paymentRateLimiter,
  validateRequest(processProviderPaymentSchema),
  paymentController.processProviderPayment
);

router.get(
  '/booking/:bookingId',
  validateRequest(getPaymentByBookingSchema),
  paymentController.getPaymentByBooking
);

router.get('/history', paymentController.getPaymentHistory);

export { router as paymentRoutes };

