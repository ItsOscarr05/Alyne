import { Router } from 'express';
import { clientController } from '../controllers/client.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { z } from 'zod';

const router: ReturnType<typeof Router> = Router();

// Validation schema
const updateProfileSchema = z.object({
  body: z.object({
    preferences: z.any().optional(), // JSON object for preferences
  }),
});

/**
 * @swagger
 * /api/clients/profile:
 *   put:
 *     summary: Update client profile preferences
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a client)
 */
router.put(
  '/profile',
  authenticate,
  validateRequest(updateProfileSchema),
  clientController.updateProfile
);

/**
 * @swagger
 * /api/clients/profile:
 *   get:
 *     summary: Get client profile
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a client)
 */
router.get('/profile', authenticate, clientController.getProfile);

export { router as clientRoutes };
