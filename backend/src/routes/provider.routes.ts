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

/**
 * @swagger
 * /api/providers/discover:
 *   get:
 *     summary: Discover wellness providers
 *     tags: [Providers]
 *     parameters:
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         description: Latitude for location-based search
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *         description: Longitude for location-based search
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *         description: Search radius in miles
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query (name or specialty)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of providers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 */
router.get(
  '/discover',
  validateRequest(discoverSchema),
  providerController.discover
);

/**
 * @swagger
 * /api/providers/{id}:
 *   get:
 *     summary: Get provider by ID
 *     tags: [Providers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Provider user ID
 *     responses:
 *       200:
 *         description: Provider details
 *       404:
 *         description: Provider not found
 */
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

