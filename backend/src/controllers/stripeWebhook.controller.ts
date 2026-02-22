import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { logger } from '../utils/logger';
import { prisma } from '../utils/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export const stripeWebhookController = {
  /**
   * POST /api/stripe/webhook
   * Stripe webhook handler for Connect account updates.
   *
   * NOTE: We rely on `req.rawBody` being captured in `express.json({ verify })`.
   * 
   * Handles:
   * - account.updated: Logs account status changes (charges_enabled, payouts_enabled, etc.)
   *   Note: We fetch account status on-demand, so we don't need to cache it in the database.
   */
  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const sig = req.headers['stripe-signature'];
      const secret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!secret) {
        logger.warn('STRIPE_WEBHOOK_SECRET not configured; ignoring webhook');
        return res.status(200).send('ok');
      }

      if (!sig || typeof sig !== 'string') {
        return res.status(400).send('Missing stripe-signature header');
      }

      const rawBody = (req as any).rawBody as Buffer | undefined;
      if (!rawBody) {
        return res.status(400).send('Missing raw body for webhook verification');
      }

      const event = stripe.webhooks.constructEvent(rawBody, sig, secret);

      switch (event.type) {
        case 'account.updated': {
          const acct = event.data.object as Stripe.Account;
          
          // Log account status changes for monitoring
          logger.info('Stripe Connect account updated', {
            accountId: acct.id,
            chargesEnabled: acct.charges_enabled,
            payoutsEnabled: acct.payouts_enabled,
            detailsSubmitted: acct.details_submitted,
            type: acct.type,
          });

          // Update provider profile status fields when account is updated
          try {
            const providerProfile = await prisma.providerProfile.findFirst({
              where: { stripeAccountId: acct.id },
              select: { userId: true },
            });

            if (providerProfile) {
              // Update status fields based on Stripe account state
              await prisma.providerProfile.update({
                where: { stripeAccountId: acct.id },
                data: {
                  stripeOnboardingComplete: acct.details_submitted || false,
                  stripeChargesEnabled: acct.charges_enabled || false,
                  stripePayoutsEnabled: acct.payouts_enabled || false,
                },
              });

              logger.info('Updated provider profile status from Stripe webhook', {
                providerUserId: providerProfile.userId,
                accountId: acct.id,
                chargesEnabled: acct.charges_enabled,
                payoutsEnabled: acct.payouts_enabled,
                detailsSubmitted: acct.details_submitted,
              });
            }
          } catch (dbError: any) {
            // Don't fail webhook if DB lookup/update fails
            logger.error('Failed to update provider profile from account update', {
              accountId: acct.id,
              error: dbError.message,
            });
          }

          break;
        }
        case 'payout.paid':
        case 'payout.failed': {
          // Log payout events for monitoring
          const payout = event.data.object as Stripe.Payout;
          logger.info(`Stripe payout ${event.type}`, {
            payoutId: payout.id,
            amount: payout.amount,
            currency: payout.currency,
            status: payout.status,
            accountId: payout.destination,
          });
          break;
        }
        default:
          // Log unhandled events at debug level for future expansion
          logger.debug('Unhandled Stripe webhook event', { type: event.type });
          break;
      }

      res.status(200).send('ok');
    } catch (err: any) {
      // Signature verification errors should return 400 (Stripe retries otherwise)
      if (err.type === 'StripeSignatureVerificationError') {
        logger.warn('Stripe webhook signature verification failed', {
          error: err.message,
        });
        return res.status(400).send('Invalid signature');
      }
      
      logger.error('Stripe webhook error', err);
      res.status(400).send('Webhook Error');
    }
  },
};

