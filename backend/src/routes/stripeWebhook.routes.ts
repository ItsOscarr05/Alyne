import { Router, type Express } from 'express';
import { stripeWebhookController } from '../controllers/stripeWebhook.controller';

const router: Express['Router'] = Router();

// IMPORTANT: No auth on webhooks
router.post('/webhook', stripeWebhookController.handle);

export { router as stripeWebhookRoutes };

