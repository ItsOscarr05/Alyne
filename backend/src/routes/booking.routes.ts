import { Router, type Express } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { z } from 'zod';

const router: Express['Router'] = Router();

// All booking routes require authentication
router.use(authenticate);

// Validation schemas
const createBookingSchema = z.object({
  body: z.object({
    providerId: z.string(),
    serviceId: z.string(),
    scheduledDate: z.string(), // ISO date string or YYYY-MM-DD
    scheduledTime: z.string(), // "14:00" format
    location: z.object({
      address: z.string().optional(),
      coordinates: z.object({
        lat: z.number(),
        lng: z.number(),
      }).optional(),
    }).optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
});

const updateBookingSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DECLINED']).optional(),
    scheduledDate: z.string().optional(),
    scheduledTime: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const getBookingSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

// Routes
router.post(
  '/',
  validateRequest(createBookingSchema),
  bookingController.create
);

router.get(
  '/',
  bookingController.getMyBookings
);

router.get(
  '/:id',
  validateRequest(getBookingSchema),
  bookingController.getById
);

router.patch(
  '/:id',
  validateRequest(updateBookingSchema),
  bookingController.update
);

router.post(
  '/:id/accept',
  validateRequest(getBookingSchema),
  bookingController.accept
);

router.post(
  '/:id/decline',
  validateRequest(getBookingSchema),
  bookingController.decline
);

router.post(
  '/:id/cancel',
  validateRequest(getBookingSchema),
  bookingController.cancel
);

router.post(
  '/:id/complete',
  validateRequest(getBookingSchema),
  bookingController.complete
);

export { router as bookingRoutes };

