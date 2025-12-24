import { prisma } from '../utils/db';
import { createError } from '../middleware/errorHandler';


export const reviewService = {
  async submitReview(data: {
    bookingId: string;
    clientId: string;
    providerId: string;
    rating: number;
    comment?: string;
  }) {
    const { bookingId, clientId, providerId, rating, comment } = data;

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw createError('Rating must be between 1 and 5', 400);
    }

    // Verify booking exists and belongs to client
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        review: true,
      },
    });

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    if (booking.clientId !== clientId) {
      throw createError('Unauthorized: This booking does not belong to you', 403);
    }

    if (booking.providerId !== providerId) {
      throw createError('Provider ID does not match booking', 400);
    }

    if (booking.status !== 'COMPLETED') {
      throw createError('Can only review completed bookings', 400);
    }

    // Check if review already exists
    if (booking.review) {
      throw createError('Review already exists for this booking', 409);
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        bookingId,
        clientId,
        providerId,
        rating,
        comment: comment || undefined,
        isVisible: true,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        booking: {
          include: {
            service: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return review;
  },

  async getReviewByBooking(bookingId: string, userId: string) {
    const review = await prisma.review.findUnique({
      where: { bookingId },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        booking: {
          include: {
            service: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!review) {
      return null;
    }

    // Verify user has access (must be client or provider)
    if (review.clientId !== userId && review.providerId !== userId) {
      throw createError('Unauthorized: Access denied', 403);
    }

    return review;
  },

  async updateReview(reviewId: string, userId: string, updates: {
    rating?: number;
    comment?: string;
    isVisible?: boolean;
  }) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw createError('Review not found', 404);
    }

    // Only client can update their review
    if (review.clientId !== userId) {
      throw createError('Unauthorized: Only the reviewer can update this review', 403);
    }

    if (updates.rating !== undefined && (updates.rating < 1 || updates.rating > 5)) {
      throw createError('Rating must be between 1 and 5', 400);
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(updates.rating !== undefined && { rating: updates.rating }),
        ...(updates.comment !== undefined && { comment: updates.comment }),
        ...(updates.isVisible !== undefined && { isVisible: updates.isVisible }),
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
    });

    return updated;
  },

  async getReviewsForBooking(bookingId: string) {
    const review = await prisma.review.findUnique({
      where: { bookingId },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
    });

    return review;
  },

  async flagReview(reviewId: string, userId: string, reason?: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw createError('Review not found', 404);
    }

    // Users can flag reviews (both clients and providers)
    // For MVP: when flagged, hide the review
    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        isFlagged: true,
        flagReason: reason || undefined,
        isVisible: false, // Hide flagged reviews
      },
    });

    return updated;
  },

  async deleteReview(reviewId: string, userId: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw createError('Review not found', 404);
    }

    // Only the client who wrote the review can delete it
    if (review.clientId !== userId) {
      throw createError('Unauthorized: Only the reviewer can delete this review', 403);
    }

    // Delete the review
    await prisma.review.delete({
      where: { id: reviewId },
    });

    return { success: true };
  },
};

