import Stripe from 'stripe';
import { prisma } from '../utils/db';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const CONNECT_COUNTRY = process.env.STRIPE_CONNECT_COUNTRY || 'US';

const getFrontendUrl = () => {
  // FRONTEND_URL may be a comma-separated allowlist; use first as canonical
  const fromEnv = process.env.FRONTEND_URL?.split(',').map((s) => s.trim()).filter(Boolean)?.[0];
  return fromEnv || 'http://localhost:8081';
};

const isSafeReturnPath = (returnPath: string) => {
  // Avoid open redirects. Only allow absolute paths on the frontend origin.
  // Must start with "/" and must not contain a scheme.
  if (!returnPath.startsWith('/')) return false;
  if (returnPath.includes('://')) return false;
  return true;
};

const withQueryParam = (path: string, key: string, value: string) => {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
};

export const stripeConnectService = {
  async getOrCreateExpressAccount(providerUserId: string) {
    const user = await prisma.user.findUnique({
      where: { id: providerUserId },
      include: { providerProfile: true },
    });

    if (!user || user.userType !== 'PROVIDER') {
      throw createError('Provider not found', 404);
    }

    // Ensure provider profile exists (schema requires specialties + serviceArea)
    let providerProfile = user.providerProfile;
    if (!providerProfile) {
      providerProfile = await prisma.providerProfile.create({
        data: {
          userId: providerUserId,
          specialties: [],
          serviceArea: { radius: 0, center: { lat: 0, lng: 0 } },
          isActive: true,
        },
      });
    }

    if (providerProfile.stripeAccountId) {
      // Ensure payouts are manual (delayed payout after session completion)
      try {
        await stripe.accounts.update(providerProfile.stripeAccountId, {
          settings: { payouts: { schedule: { interval: 'manual' } } },
        });
        
        // Refresh account status from Stripe
        const account = await stripe.accounts.retrieve(providerProfile.stripeAccountId);
        
        // Update status fields
        await prisma.providerProfile.update({
          where: { userId: providerUserId },
          data: {
            stripeOnboardingComplete: account.details_submitted || false,
            stripeChargesEnabled: account.charges_enabled || false,
            stripePayoutsEnabled: account.payouts_enabled || false,
          },
        });
      } catch (e: any) {
        logger.warn('Failed to ensure manual payout schedule or update status', {
          stripeAccountId: providerProfile.stripeAccountId,
          error: e.message,
        });
      }
      return { stripeAccountId: providerProfile.stripeAccountId };
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      throw createError('Stripe is not configured on the server', 503);
    }

    const account = await stripe.accounts.create({
      type: 'express',
      country: CONNECT_COUNTRY,
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'manual', // Delay payouts until session completion
          },
        },
      },
      metadata: {
        project: 'alyne',
        providerUserId,
      },
    });

    await prisma.providerProfile.update({
      where: { userId: providerUserId },
      data: { 
        stripeAccountId: account.id,
        stripeOnboardingComplete: account.details_submitted || false,
        stripeChargesEnabled: account.charges_enabled || false,
        stripePayoutsEnabled: account.payouts_enabled || false,
      },
    });

    logger.info(`Created Stripe Connect account for provider ${providerUserId}: ${account.id}`);
    return { stripeAccountId: account.id };
  },

  async createOnboardingLink(providerUserId: string, options?: { returnPath?: string; type?: 'onboarding' | 'update' }) {
    const { stripeAccountId } = await this.getOrCreateExpressAccount(providerUserId);
    const frontend = getFrontendUrl();

    const defaultReturnPath = '/provider/onboarding?step=bank';
    const baseReturnPath =
      options?.returnPath && isSafeReturnPath(options.returnPath)
        ? options.returnPath
        : defaultReturnPath;

    const returnUrl = `${frontend}${withQueryParam(baseReturnPath, 'stripe', 'return')}`;
    const refreshUrl = `${frontend}${withQueryParam(baseReturnPath, 'stripe', 'refresh')}`;

    // Determine link type: use 'account_update' if account already exists and is enabled, otherwise 'account_onboarding'
    let linkType: 'account_onboarding' | 'account_update' = 'account_onboarding';
    if (options?.type === 'update') {
      linkType = 'account_update';
    } else {
      // Auto-detect: if account is already enabled, use update link
      try {
        const account = await stripe.accounts.retrieve(stripeAccountId);
        if (account.details_submitted && (account.charges_enabled || account.payouts_enabled)) {
          linkType = 'account_update';
        }
      } catch (e: any) {
        logger.debug('Could not determine account status for link type, defaulting to onboarding', {
          error: e.message,
        });
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      type: linkType,
      refresh_url: refreshUrl,
      return_url: returnUrl,
    });

    return {
      stripeAccountId,
      url: accountLink.url,
      expiresAt: accountLink.expires_at,
      linkType,
    };
  },

  async getAccountStatus(providerUserId: string) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw createError('Stripe is not configured on the server', 503);
    }

    const providerProfile = await prisma.providerProfile.findUnique({
      where: { userId: providerUserId },
      select: { stripeAccountId: true },
    });

    if (!providerProfile?.stripeAccountId) {
      return {
        hasAccount: false,
        stripeAccountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      };
    }

    const acct = await stripe.accounts.retrieve(providerProfile.stripeAccountId);

    // Update status fields in database to keep them in sync
    try {
      await prisma.providerProfile.update({
        where: { userId: providerUserId },
        data: {
          stripeOnboardingComplete: acct.details_submitted || false,
          stripeChargesEnabled: acct.charges_enabled || false,
          stripePayoutsEnabled: acct.payouts_enabled || false,
        },
      });
    } catch (e: any) {
      logger.warn('Failed to update provider profile status', {
        userId: providerUserId,
        error: e.message,
      });
    }

    // Try to surface a friendly bank summary if available
    let bankAccount: { bankName?: string; last4?: string; currency?: string } | null = null;
    try {
      const external = await stripe.accounts.listExternalAccounts(providerProfile.stripeAccountId, {
        object: 'bank_account',
        limit: 1,
      });
      const first = external.data?.[0] as Stripe.BankAccount | undefined;
      if (first) {
        bankAccount = {
          bankName: first.bank_name || undefined,
          last4: first.last4 || undefined,
          currency: first.currency || undefined,
        };
      }
    } catch (e: any) {
      logger.debug('Failed to list Stripe external accounts', {
        stripeAccountId: providerProfile.stripeAccountId,
        error: e.message,
      });
    }

    return {
      hasAccount: true,
      stripeAccountId: acct.id,
      chargesEnabled: acct.charges_enabled,
      payoutsEnabled: acct.payouts_enabled,
      detailsSubmitted: acct.details_submitted,
      requirements: acct.requirements,
      bankAccount,
    };
  },
};

