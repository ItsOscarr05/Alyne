import { Router, type Express } from 'express';
import { plaidController } from '../controllers/plaid.controller';
import { authenticate } from '../middleware/auth';
import { plaidRateLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validateRequest';
import { z } from 'zod';

const router: Express['Router'] = Router();

// All Plaid routes require authentication
router.use(authenticate);

// Validation schemas
const exchangeTokenSchema = z.object({
  body: z.object({
    publicToken: z.string().min(1, 'Public token is required'),
  }),
});

// Routes with rate limiting
router.get(
  '/link-token',
  plaidRateLimiter,
  plaidController.createLinkToken
);

router.post(
  '/exchange-token',
  plaidRateLimiter,
  validateRequest(exchangeTokenSchema),
  plaidController.exchangeToken
);

router.get(
  '/bank-account',
  plaidRateLimiter,
  plaidController.getBankAccount
);

router.get(
  '/payment-link-token',
  plaidRateLimiter,
  plaidController.createPaymentLinkToken
);

export { router as plaidRoutes };

