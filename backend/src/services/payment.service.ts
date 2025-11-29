import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { createError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

export const paymentService = {
  async createPaymentIntent(bookingId: string, userId: string) {
    // Verify booking exists and belongs to user
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        provider: true,
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

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.price * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        project: 'alyne',
        bookingId,
        clientId: booking.clientId,
        providerId: booking.providerId,
      },
      description: `Alyne - Payment for ${booking.service.name}`,
    });

    // Create or update payment record
    const payment = await prisma.payment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        amount: booking.price,
        currency: 'USD',
        stripePaymentId: paymentIntent.id,
        status: 'pending',
      },
      update: {
        stripePaymentId: paymentIntent.id,
        status: 'pending',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
    };
  },

  async confirmPayment(bookingId: string, paymentIntentId: string, userId: string) {
    // Verify booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        service: true,
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

    console.log(`[Confirm Payment] Confirming payment for booking ${bookingId}, paymentIntent ${paymentIntentId}`);

    // Upsert payment record (create if doesn't exist, update if it does)
    const payment = await prisma.payment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        amount: booking.price,
        currency: 'USD',
        stripePaymentId: paymentIntentId,
        status: 'completed',
        paidAt: new Date(),
      },
      update: {
        status: 'completed',
        paidAt: new Date(),
        stripePaymentId: paymentIntentId, // Ensure it's set
      },
    });

    console.log(`[Confirm Payment] Payment record ${payment.id} updated/created with status: ${payment.status}`);
    return payment;
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

    console.log(`[Payment History] Found ${bookings.length} bookings for user ${userId}`);
    console.log(`[Payment History] Bookings with payments: ${bookings.filter(b => b.payment).length}`);

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

    console.log(`[Payment History] Returning ${paymentsWithBookings.length} payments`);
    return paymentsWithBookings;
  },
};

