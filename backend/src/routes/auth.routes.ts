import { Router, type Express } from 'express';
import { authController } from '../controllers/auth.controller';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';

const router: Express['Router'] = Router();

// Validation schemas
const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    userType: z.enum(['PROVIDER', 'CLIENT']),
    phoneNumber: z.string().optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

// Routes
router.post(
  '/register',
  authRateLimiter,
  validateRequest(registerSchema),
  authController.register
);

router.post(
  '/login',
  authRateLimiter,
  validateRequest(loginSchema),
  authController.login
);

router.post('/logout', authController.logout);

router.post('/verify-email', authController.verifyEmail);

router.post('/resend-verification', authController.resendVerification);

// Protected route
router.put('/profile', authenticate, authController.updateProfile);

export { router as authRoutes };

