import { Router, type Express } from 'express';
import { plaidController } from '../controllers/plaid.controller';
import { authenticate } from '../middleware/auth';
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

// Routes
router.get('/link-token', plaidController.createLinkToken);

router.post(
  '/exchange-token',
  validateRequest(exchangeTokenSchema),
  plaidController.exchangeToken
);

router.get('/bank-account', plaidController.getBankAccount);

router.get('/payment-link-token', plaidController.createPaymentLinkToken);

export { router as plaidRoutes };

