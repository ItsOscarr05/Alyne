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

    if (booking.clientId !== userId) {
      throw createError('Unauthorized: This booking does not belong to you', 403);
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
        bookingId,
        clientId: booking.clientId,
        providerId: booking.providerId,
      },
      description: `Payment for ${booking.service.name}`,
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
      },
    });

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    if (booking.clientId !== userId) {
      throw createError('Unauthorized', 403);
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw createError('Payment not completed', 400);
    }

    // Update payment record
    const payment = await prisma.payment.update({
      where: { bookingId },
      data: {
        status: 'completed',
        paidAt: new Date(),
      },
    });

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

    // Verify user has access (client or provider)
    if (booking.clientId !== userId && booking.providerId !== userId) {
      throw createError('Unauthorized', 403);
    }

    return booking.payment;
  },
};

