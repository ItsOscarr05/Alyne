import { Router, type Express } from 'express';
import { providerController } from '../controllers/provider.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { z } from 'zod';

const router: Express['Router'] = Router();

// Validation schemas
const discoverSchema = z.object({
  query: z.object({
    lat: z.string().optional(),
    lng: z.string().optional(),
    radius: z.string().optional(), // in miles
    serviceType: z.string().optional(),
    minPrice: z.string().optional(),
    maxPrice: z.string().optional(),
    minRating: z.string().optional(),
    availableNow: z.string().optional(), // 'true' or 'false'
    search: z.string().optional(),
  }),
});

const getProviderSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

// Routes
router.get(
  '/discover',
  validateRequest(discoverSchema),
  providerController.discover
);

router.get(
  '/:id',
  validateRequest(getProviderSchema),
  providerController.getById
);

router.get(
  '/:id/services',
  validateRequest(getProviderSchema),
  providerController.getServices
);

router.get(
  '/:id/reviews',
  validateRequest(getProviderSchema),
  providerController.getReviews
);

// Protected routes (require authentication)
router.use(authenticate);

router.post(
  '/profile',
  providerController.createOrUpdateProfile
);

router.get(
  '/profile/me',
  providerController.getMyProfile
);

// Service management
router.post('/services', providerController.createService);
router.put('/services/:id', providerController.updateService);
router.delete('/services/:id', providerController.deleteService);

// Credential management
router.post('/credentials', providerController.createCredential);
router.put('/credentials/:id', providerController.updateCredential);
router.delete('/credentials/:id', providerController.deleteCredential);

// Availability management
router.post('/availability', providerController.createAvailability);
router.put('/availability/:id', providerController.updateAvailability);
router.delete('/availability/:id', providerController.deleteAvailability);

export { router as providerRoutes };

