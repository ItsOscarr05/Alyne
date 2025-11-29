import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Platform fee percentage (default 10%, configurable via env)
const PLATFORM_FEE_PERCENTAGE = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '10');

/**
 * Calculate platform fee and amounts
 * @param servicePrice - The base service price (what provider charges)
 * @returns Object with providerAmount (base service price), platformFee (Alyne's fee), and totalAmount (what client pays)
 * 
 * Example: Service price = $120, Platform fee = 10%
 * - providerAmount = $120 (goes to provider via Plaid)
 * - platformFee = $12 (stays in Alyne's Stripe account)
 * - totalAmount = $132 (what client pays via Stripe)
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

    // Check if payment already exists
    if (booking.payment) {
      if (booking.payment.status === 'completed') {
        throw createError('Payment already completed', 409);
      }
      // Return existing payment intent if pending
      if (booking.payment.stripePaymentId) {
        const paymentIntent = await stripe.paymentIntents.retrieve(booking.payment.stripePaymentId);
        return {
          clientSecret: paymentIntent.client_secret,
          paymentId: booking.payment.id,
        };
      }
    }

    // Note: Provider bank account verification is not required for creating the Stripe payment intent
    // The Stripe payment (platform fee) can be created independently
    // Bank account verification is only needed when initiating the Plaid payment to the provider
    const providerProfile = booking.provider.providerProfile;
    
    // Warn if provider doesn't have bank account set up (but don't block payment intent creation)
    if (!providerProfile?.plaidAccountId || !providerProfile?.bankAccountVerified) {
      logger.warn(`Provider ${booking.providerId} does not have verified bank account. Plaid payment will need to be set up separately.`);
    }

    // Calculate payment amounts
    // - providerAmount: Full service price (goes to provider via Plaid RTP)
    // - platformFee: Platform fee (goes to Alyne via Stripe)
    // - totalAmount: What client pays in total (providerAmount + platformFee)
    const { providerAmount, platformFee, totalAmount } = calculatePaymentAmounts(booking.price);

    // Create Stripe payment intent ONLY for platform fee
    // This is the only amount that will show in Alyne's Stripe dashboard
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(platformFee * 100), // Convert to cents - ONLY the platform fee
      currency: 'usd',
      metadata: {
        project: 'alyne',
        bookingId,
        clientId: booking.clientId,
        providerId: booking.providerId,
        providerAmount: providerAmount.toString(),
        platformFee: platformFee.toString(),
        paymentType: 'platform_fee_only', // Indicates this is only the platform fee
      },
      description: `Alyne - Platform fee for ${booking.service.name}`,
    });

    // Create or update payment record
    const payment = await prisma.payment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        amount: totalAmount, // Total amount client pays (providerAmount + platformFee)
        providerAmount: providerAmount, // Amount going to provider via Plaid RTP
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
      providerAmount: providerAmount, // Goes to provider via Plaid
      platformFee: platformFee, // Goes to Alyne via Stripe
      requiresPlaidPayment: true, // Flag to indicate client needs to pay provider via Plaid
      stripeAmount: platformFee, // Amount in Stripe payment intent (for verification)
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

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

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

    // Note: In the new dual payment flow:
    // - Platform fee ($12) is paid via Stripe (this payment intent)
    // - Provider amount ($120) is paid directly via Plaid Payment Initiation (handled separately)
    // - We only confirm the Stripe payment here
    // - The Plaid payment is initiated by the client and confirmed via webhook

    logger.info(`Platform fee payment confirmed: $${platformFee} via Stripe, Provider amount: $${providerAmount} via Plaid, Total: $${totalAmount}`);

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
        stripeTransferId: null, // Not used in dual payment flow
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
   * Automatically process Plaid transfer to provider after Stripe payment is confirmed
   * This is called automatically - no user interaction needed
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

    // Only the booking owner (client) can trigger provider payment
    if (booking.clientId !== userId) {
      throw createError('Unauthorized: Only the booking owner can process provider payment', 403);
    }

    // Verify Stripe payment is completed first
    if (!booking.payment || booking.payment.status !== 'completed') {
      throw createError('Stripe payment must be completed before processing provider payment', 400);
    }

    const providerAmount = booking.payment.providerAmount || booking.price;
    const providerProfile = booking.provider.providerProfile;

    if (!providerProfile?.plaidAccessToken || !providerProfile?.plaidAccountId || !providerProfile?.bankAccountVerified) {
      throw createError('Provider bank account not set up or verified', 400);
    }

    // Import plaidService dynamically to avoid circular dependency
    const { plaidService } = await import('./plaid.service');
    
    // Process Plaid transfer to provider
    const transferResult = await plaidService.createTransfer(
      booking.providerId,
      providerAmount,
      `Payment for booking ${bookingId}`,
      bookingId
    );

    // Update payment record with Plaid transfer ID
    const updatedPayment = await prisma.payment.update({
      where: { bookingId },
      data: {
        plaidTransferId: transferResult.transferId,
      },
    });

    logger.info(`Plaid transfer processed: ${transferResult.transferId} for $${providerAmount}`);
    return {
      transferId: transferResult.transferId,
      status: transferResult.status,
      amount: transferResult.amount,
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

