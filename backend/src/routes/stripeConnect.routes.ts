import { Router, type Express } from 'express';
import { stripeConnectController } from '../controllers/stripeConnect.controller';
import { authenticate } from '../middleware/auth';
import { stripeRateLimiter } from '../middleware/rateLimiter';

const router: Express['Router'] = Router();

// Connect onboarding requires authentication
router.use(authenticate);

router.post('/onboarding-link', stripeRateLimiter, stripeConnectController.createOnboardingLink);
router.get('/status', stripeRateLimiter, stripeConnectController.getStatus);

export { router as stripeConnectRoutes };

