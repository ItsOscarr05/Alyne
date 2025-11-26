import { PrismaClient, BookingStatus } from '@prisma/client';
import { createError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

interface CreateBookingData {
  clientId: string;
  providerId: string;
  serviceId: string;
  scheduledDate: string;
  scheduledTime: string;
  location?: {
    address?: string;
    coordinates?: { lat: number; lng: number };
  };
  notes?: string;
}

export const bookingService = {
  async createBooking(data: CreateBookingData) {
    const { clientId, providerId, serviceId, scheduledDate, scheduledTime, location, notes } = data;

    // Verify provider exists and is active first
    const provider = await prisma.user.findUnique({
      where: { id: providerId },
      include: {
        providerProfile: true,
      },
    });

    if (!provider || provider.userType !== 'PROVIDER' || !provider.providerProfile?.isActive) {
      throw createError('Provider not found or inactive', 404);
    }

    // Verify service belongs to provider
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        providerId: provider.providerProfile.id,
      },
    });

    if (!service) {
      throw createError('Service not found or does not belong to provider', 404);
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        clientId,
        providerId,
        serviceId,
        status: 'PENDING',
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        location: location ? location : undefined,
        notes,
        price: service.price,
      },
      include: {
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
        service: true,
      },
    });

    return booking;
  },

  async getUserBookings(userId: string, status?: string, role?: 'client' | 'provider') {
    const where: any = {};

    if (role === 'client') {
      where.clientId = userId;
    } else if (role === 'provider') {
      where.providerId = userId;
    } else {
      // Get bookings where user is either client or provider
      where.OR = [{ clientId: userId }, { providerId: userId }];
    }

    if (status) {
      where.status = status as BookingStatus;
    }

    console.log('getUserBookings query:', {
      userId,
      role,
      status,
      where,
    });

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'desc',
      },
    });

    return bookings;
  },

  async getBookingById(bookingId: string, userId: string) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [{ clientId: userId }, { providerId: userId }],
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhoto: true,
          },
        },
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhoto: true,
          },
        },
        service: true,
        payment: true,
        review: true,
      },
    });

    return booking;
  },

  async updateBooking(bookingId: string, userId: string, updates: any) {
    // Verify user has permission (must be client or provider for this booking)
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [{ clientId: userId }, { providerId: userId }],
      },
    });

    if (!booking) {
      throw createError('Booking not found or access denied', 404);
    }

    const updateData: any = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.scheduledDate) updateData.scheduledDate = new Date(updates.scheduledDate);
    if (updates.scheduledTime) updateData.scheduledTime = updates.scheduledTime;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        service: true,
      },
    });

    return updated;
  },

  async acceptBooking(bookingId: string, providerId: string) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        providerId,
        status: 'PENDING',
      },
    });

    if (!booking) {
      throw createError('Booking not found or cannot be accepted', 404);
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' },
      include: {
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
        service: true,
      },
    });

    return updated;
  },

  async declineBooking(bookingId: string, providerId: string) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        providerId,
        status: { in: ['PENDING', 'CONFIRMED'] }, // Allow declining both pending and confirmed bookings
      },
    });

    if (!booking) {
      throw createError('Booking not found or cannot be declined', 404);
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'DECLINED' },
      include: {
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
        service: true,
      },
    });

    return updated;
  },

  async cancelBooking(bookingId: string, userId: string) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [{ clientId: userId }, { providerId: userId }],
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
      },
    });

    if (!booking) {
      throw createError('Booking not found or cannot be cancelled', 404);
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
      include: {
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
        service: true,
      },
    });

    return updated;
  },
};

