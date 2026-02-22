import { prisma } from '../utils/db';
import Stripe from 'stripe';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { stripeConnectService } from './stripeConnect.service';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Platform fee percentage (default 7.5%, configurable via env)
const PLATFORM_FEE_PERCENTAGE = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '7.5');

/**
 * Calculate platform fee and amounts
 * @param servicePrice - The base service price (what provider charges)
 * @returns Object with providerAmount (base service price), platformFee (Alyne's fee), and totalAmount (what client pays)
 * 
 * Example: Service price = $120, Platform fee = 7.5%
 * - providerAmount = $120 (goes to provider via Stripe Connect)
 * - platformFee = $9 (stays in Alyne's Stripe account)
 * - totalAmount = $129 (what client pays via Stripe)
 */
function calculatePaymentAmounts(servicePrice: number) {
  const providerAmount = servicePrice; // Provider receives the full service price
  const platformFee = (servicePrice * PLATFORM_FEE_PERCENTAGE) / 100; // Platform fee calculated from service price
  const totalAmount = providerAmount + platformFee; // Client pays service price + platform fee
  
  return {
    providerAmount: Math.round(providerAmount * 100) / 100, // Round to 2 decimals
    platformFee: Math.round(platformFee * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

export const paymentService = {
  async createPaymentIntent(bookingId: string, userId: string) {
    // Verify booking exists and belongs to user
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        provider: {
          include: {
            providerProfile: true,
          },
        },
        service: true,
        payment: true,
      },
    });

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    // Only the booking owner (client) can create payment intent
    if (booking.clientId !== userId) {
      throw createError('Unauthorized: Only the booking owner can create payment intent', 403);
    }

    if (booking.status !== 'CONFIRMED') {
      throw createError('Payment can only be processed for confirmed bookings', 400);
    }

    const providerStripeAccountId = booking.provider.providerProfile?.stripeAccountId;
    if (!providerStripeAccountId) {
      throw createError('Provider payout is not set up yet. Please ask the provider to complete payout onboarding.', 400);
    }

    // Verify Stripe account is fully enabled before allowing payment
    try {
      const accountStatus = await stripeConnectService.getAccountStatus(booking.providerId);
      if (!accountStatus.chargesEnabled) {
        throw createError(
          'Provider payment account is not fully set up. Charges are not enabled yet. Please ask the provider to complete their Stripe onboarding.',
          400
        );
      }
      if (!accountStatus.payoutsEnabled) {
        throw createError(
          'Provider payout account is not fully set up. Payouts are not enabled yet. Please ask the provider to complete their Stripe onboarding.',
          400
        );
      }
    } catch (error: any) {
      // If it's already a createError, re-throw it
      if (error.statusCode) {
        throw error;
      }
      // Otherwise, log and throw a generic error
      logger.error('Error checking provider Stripe account status', {
        providerId: booking.providerId,
        error: error.message,
      });
      throw createError(
        'Unable to verify provider payment setup. Please try again or contact support.',
        500
      );
    }

    // Check if payment already exists
    if (booking.payment) {
      if (booking.payment.status === 'completed') {
        throw createError('Payment already completed', 409);
      }
      // Return existing payment intent if pending and still valid
      if (booking.payment.stripePaymentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            booking.payment.stripePaymentId,
            undefined,
            { stripeAccount: providerStripeAccountId }
          );
          
          // Check if payment intent is still usable (requires_payment_method, requires_confirmation, or requires_action)
          const validStatuses = ['requires_payment_method', 'requires_confirmation', 'requires_action'];
          if (validStatuses.includes(paymentIntent.status)) {
            // Payment intent is still valid, return existing client secret
            return {
              clientSecret: paymentIntent.client_secret,
              paymentId: booking.payment.id,
              amount: booking.payment.amount,
              providerAmount: booking.payment.providerAmount || booking.price,
              platformFee: booking.payment.platformFee || booking.price * (PLATFORM_FEE_PERCENTAGE / 100),
              requiresPlaidPayment: false,
              stripeAmount: booking.payment.amount,
              stripeAccountId: providerStripeAccountId,
            };
          } else {
            // Payment intent is in an invalid state (succeeded, cancelled, etc.), create a new one
            logger.warn(`Payment intent ${paymentIntent.id} is in status ${paymentIntent.status}, creating new payment intent`);
            // Fall through to create a new payment intent
          }
        } catch (error: any) {
          // Payment intent might not exist or be inaccessible, create a new one
          logger.warn(`Error retrieving payment intent ${booking.payment.stripePaymentId}: ${error.message}, creating new payment intent`);
          // Fall through to create a new payment intent
        }
      }
    }

    // Calculate payment amounts
    // - providerAmount: Full service price (provider keeps this)
    // - platformFee: Platform fee (Alyne application fee)
    // - totalAmount: What client pays in total (providerAmount + platformFee)
    const { providerAmount, platformFee, totalAmount } = calculatePaymentAmounts(booking.price);

    // Provider MoR (Direct charge): create the PaymentIntent on the provider's connected account.
    // Alyne takes an application fee automatically.
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(totalAmount * 100), // TOTAL in cents
        currency: 'usd',
        application_fee_amount: Math.round(platformFee * 100),
        automatic_payment_methods: { enabled: true },
        metadata: {
          project: 'alyne',
          bookingId,
          clientId: booking.clientId,
          providerId: booking.providerId,
          providerAmount: providerAmount.toString(),
          platformFee: platformFee.toString(),
          paymentType: 'connect_direct_charge',
        },
        description: `Alyne - Payment for ${booking.service.name}`,
      },
      { stripeAccount: providerStripeAccountId }
    );

    // Create or update payment record
    const payment = await prisma.payment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        amount: totalAmount, // Total amount client pays (providerAmount + platformFee)
        providerAmount: providerAmount, // Amount going to provider via Stripe Connect
        platformFee: platformFee, // Platform fee going to Alyne via Stripe
        currency: 'USD',
        stripePaymentId: paymentIntent.id,
        status: 'pending',
      },
      update: {
        amount: totalAmount,
        providerAmount: providerAmount,
        platformFee: platformFee,
        stripePaymentId: paymentIntent.id,
        status: 'pending',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
      amount: totalAmount, // Total client pays
      providerAmount: providerAmount, // Provider's share (held in connected balance until payout)
      platformFee: platformFee, // Alyne fee (application fee)
      requiresPlaidPayment: false,
      stripeAmount: totalAmount, // Amount in Stripe payment intent (for verification)
      stripeAccountId: providerStripeAccountId,
    };
  },

  async confirmPayment(bookingId: string, paymentIntentId: string, userId: string) {
    // Verify booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        service: true,
        provider: {
          include: {
            providerProfile: true,
          },
        },
      },
    });

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    // Only the booking owner (client) can confirm payment
    if (booking.clientId !== userId) {
      throw createError('Unauthorized: Only the booking owner can confirm payment', 403);
    }

    // Verify payment intent belongs to this booking
    // Check if payment record exists and matches the payment intent
    if (booking.payment) {
      if (booking.payment.stripePaymentId && booking.payment.stripePaymentId !== paymentIntentId) {
        throw createError('Payment intent does not match this booking', 400);
      }
    }

    const providerStripeAccountId = booking.provider.providerProfile?.stripeAccountId;
    if (!providerStripeAccountId) {
      throw createError('Provider payout is not set up yet', 400);
    }

    // Retrieve payment intent from Stripe (on connected account)
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      undefined,
      { stripeAccount: providerStripeAccountId }
    );

    // Verify payment intent metadata matches the booking
    if (paymentIntent.metadata?.bookingId && paymentIntent.metadata.bookingId !== bookingId) {
      throw createError('Payment intent does not belong to this booking', 400);
    }

    if (paymentIntent.status !== 'succeeded') {
      throw createError('Payment not completed', 400);
    }

    logger.info(`Confirming payment for booking ${bookingId}, paymentIntent ${paymentIntentId}`);

    // Get payment amounts from metadata or recalculate
    const providerAmount = booking.payment?.providerAmount 
      || parseFloat(paymentIntent.metadata?.providerAmount || booking.price.toString());
    const platformFee = booking.payment?.platformFee 
      || parseFloat(paymentIntent.metadata?.platformFee || '0');
    const totalAmount = booking.payment?.amount 
      || (providerAmount + platformFee); // Total = provider amount + platform fee

    // Provider MoR flow:
    // - Client pays TOTAL via Stripe on provider's connected account
    // - Alyne fee is captured via application_fee_amount
    // - Provider payout is delayed until booking is marked COMPLETED
    logger.info(
      `Connect payment confirmed: $${totalAmount} (Provider: $${providerAmount}, Platform fee: $${platformFee})`,
      { bookingId, paymentIntentId, providerStripeAccountId }
    );

    // Upsert payment record (create if doesn't exist, update if it does)
    const payment = await prisma.payment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        amount: totalAmount,
        providerAmount: providerAmount,
        platformFee: platformFee,
        currency: 'USD',
        stripePaymentId: paymentIntentId,
        stripeTransferId: null, // Will store Stripe payout id once released
        status: 'completed',
        paidAt: new Date(),
      },
      update: {
        amount: totalAmount,
        providerAmount: providerAmount,
        platformFee: platformFee,
        status: 'completed',
        paidAt: new Date(),
        stripePaymentId: paymentIntentId, // Ensure it's set
      },
    });

    logger.info(`Payment record ${payment.id} updated/created with status: ${payment.status}`);
    return payment;
  },

  /**
   * Release provider payout after booking completion (manual payouts).
   * This can be called from booking completion, or manually retried via API.
   */
  async processProviderPayment(bookingId: string, userId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        provider: {
          include: {
            providerProfile: true,
          },
        },
      },
    });

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    // Only provider can release payout (triggered when provider completes session)
    if (booking.providerId !== userId) {
      throw createError('Unauthorized: Only the provider can release payout', 403);
    }

    // Verify Stripe payment is completed first
    if (!booking.payment || booking.payment.status !== 'completed') {
      throw createError('Stripe payment must be completed before processing provider payment', 400);
    }

    // Only allow payout after booking is completed
    if (booking.status !== 'COMPLETED') {
      throw createError('Provider payout can only be released after booking is completed', 400);
    }

    // Prevent duplicate payouts
    if (booking.payment.stripeTransferId) {
      return {
        payoutId: booking.payment.stripeTransferId,
        status: 'already_released',
        amount: booking.payment.providerAmount || booking.price,
        payment: booking.payment,
      };
    }

    const providerProfile = booking.provider.providerProfile;
    const providerStripeAccountId = providerProfile?.stripeAccountId;
    if (!providerStripeAccountId) {
      throw createError('Provider payouts are not set up (missing Stripe Connect account)', 400);
    }

    // Verify account is enabled for payouts
    try {
      const accountStatus = await stripeConnectService.getAccountStatus(booking.providerId);
      if (!accountStatus.payoutsEnabled) {
        throw createError(
          'Provider payout account is not fully enabled. Payouts are not enabled yet.',
          400
        );
      }
    } catch (error: any) {
      if (error.statusCode) {
        throw error;
      }
      logger.error('Error checking provider payout status', {
        providerId: booking.providerId,
        error: error.message,
      });
      throw createError('Unable to verify provider payout setup', 500);
    }

    const providerAmount = booking.payment.providerAmount || booking.price;
    const payoutAmountCents = Math.round(providerAmount * 100);

    // Check account balance before creating payout (informative, Stripe will also validate)
    try {
      const balance = await stripe.balance.retrieve({ stripeAccount: providerStripeAccountId });
      const availableBalance = balance.available?.[0]?.amount || 0;
      
      if (availableBalance < payoutAmountCents) {
        logger.warn('Insufficient balance for payout', {
          providerStripeAccountId,
          required: payoutAmountCents,
          available: availableBalance,
          bookingId,
        });
        // Note: We still attempt the payout - Stripe will reject if insufficient
        // This is logged for monitoring but doesn't block the attempt
      }
    } catch (balanceError: any) {
      // Balance check failed - log but don't block payout (Stripe will validate)
      logger.warn('Failed to check account balance before payout', {
        providerStripeAccountId,
        error: balanceError.message,
      });
    }

    const payout = await stripe.payouts.create(
      {
        amount: payoutAmountCents,
        currency: 'usd',
        metadata: {
          project: 'alyne',
          bookingId,
          providerId: booking.providerId,
        },
      },
      { stripeAccount: providerStripeAccountId }
    );

    const updatedPayment = await prisma.payment.update({
      where: { bookingId },
      data: {
        stripeTransferId: payout.id,
      },
    });

    logger.info(`Stripe payout released: ${payout.id} for booking ${bookingId}`);
    return {
      payoutId: payout.id,
      status: payout.status,
      amount: providerAmount,
      payment: updatedPayment,
    };
  },

  async getPaymentByBooking(bookingId: string, userId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
      },
    });

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    // Verify user has access (client or provider can view payment receipt)
    if (booking.clientId !== userId && booking.providerId !== userId) {
      throw createError('Unauthorized: You do not have access to this payment', 403);
    }

    return booking.payment;
  },

  async getPaymentHistory(userId: string, userType: string) {
    // Get all payments for user (as client or provider)
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { clientId: userId },
          { providerId: userId },
        ],
      },
      include: {
        payment: true,
        service: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.debug(`Found ${bookings.length} bookings for user ${userId}, ${bookings.filter(b => b.payment).length} with payments`);

    // Filter to only bookings with payments
    const paymentsWithBookings = bookings
      .filter((booking) => booking.payment)
      .map((booking) => ({
        ...booking.payment,
        booking: {
          id: booking.id,
          service: booking.service,
          client: booking.client,
          provider: booking.provider,
          scheduledDate: booking.scheduledDate,
          scheduledTime: booking.scheduledTime,
          status: booking.status,
        },
      }));

    logger.debug(`Returning ${paymentsWithBookings.length} payments for user ${userId}`);
    return paymentsWithBookings;
  },
};

