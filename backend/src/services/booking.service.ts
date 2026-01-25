import { prisma } from '../utils/db';
import { BookingStatus } from '@prisma/client';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';


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

    // Check for conflicting bookings (same provider, same date, overlapping time)
    const scheduledDateTime = new Date(scheduledDate + 'T' + scheduledTime + ':00');
    const startOfDay = new Date(scheduledDateTime);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(scheduledDateTime);
    endOfDay.setHours(23, 59, 59, 999);

    // Calculate booking end time considering service duration
    const [timeHour, timeMinute] = scheduledTime.split(':').map(Number);
    const timeTotalMinutes = timeHour * 60 + timeMinute;
    const endTimeTotalMinutes = timeTotalMinutes + service.duration;
    const endHour = Math.floor(endTimeTotalMinutes / 60);
    const endMinute = endTimeTotalMinutes % 60;
    const endTimeString = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

    // Check for conflicting bookings
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        providerId,
        status: { in: ['PENDING', 'CONFIRMED'] }, // Only check active bookings
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        service: true,
      },
    });

    // Check for time overlap
    const hasConflict = conflictingBookings.some(existingBooking => {
      const [existingStartHour, existingStartMinute] = existingBooking.scheduledTime.split(':').map(Number);
      const existingStartTotalMinutes = existingStartHour * 60 + existingStartMinute;
      const existingDuration = existingBooking.service.duration;
      const existingEndTotalMinutes = existingStartTotalMinutes + existingDuration;

      // Check if time ranges overlap
      return (
        (timeTotalMinutes < existingEndTotalMinutes && endTimeTotalMinutes > existingStartTotalMinutes)
      );
    });

    if (hasConflict) {
      throw createError('This time slot is already booked. Please choose another time.', 400);
    }

    // Create booking with CONFIRMED status (auto-confirmed)
    const booking = await prisma.booking.create({
      data: {
        clientId,
        providerId,
        serviceId,
        status: 'CONFIRMED',
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

  async getUserBookings(
    userId: string,
    status?: string,
    role?: 'client' | 'provider',
    skip: number = 0,
    take: number = 20
  ) {
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

    logger.debug('getUserBookings query', { userId, role, status, where, skip, take });

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
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
          payment: true,
        },
        orderBy: {
          scheduledDate: 'desc',
        },
        skip,
        take,
      }),
      prisma.booking.count({ where }),
    ]);

    return { bookings, total };
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

  async completeBooking(bookingId: string, providerId: string) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        providerId,
        status: 'CONFIRMED', // Only confirmed bookings can be marked as completed
      },
    });

    if (!booking) {
      throw createError('Booking not found or cannot be completed', 404);
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'COMPLETED' },
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

  async rescheduleBooking(
    bookingId: string,
    clientId: string,
    newDate: string,
    newTime: string
  ) {
    // Verify booking exists and user is the client
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
      },
      include: {
        service: true,
        provider: {
          include: {
            providerProfile: {
              include: {
                availability: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw createError('Booking not found', 404);
    }

    if (booking.clientId !== clientId) {
      throw createError('Only clients can reschedule bookings', 403);
    }

    // Verify booking status allows rescheduling
    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED' || booking.status === 'DECLINED') {
      throw createError('This booking cannot be rescheduled', 400);
    }

    // Check minimum notice (24 hours)
    const newDateTime = new Date(newDate + 'T' + newTime + ':00');
    const now = new Date();
    const hoursUntilBooking = (newDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilBooking < 24) {
      throw createError('Cannot reschedule within 24 hours of appointment. Please cancel instead.', 400);
    }

    // Verify provider availability for new time slot
    const dayOfWeek = newDateTime.getDay();
    const matchingAvailabilitySlots = booking.provider.providerProfile?.availability.filter(slot => {
      if (slot.specificDate) {
        const specificDate = new Date(slot.specificDate);
        return specificDate.toDateString() === newDateTime.toDateString();
      } else if (slot.isRecurring) {
        return slot.dayOfWeek === dayOfWeek;
      }
      return false;
    }) || [];

    if (matchingAvailabilitySlots.length === 0) {
      throw createError('Provider is not available on the selected date', 400);
    }

    // Check if time slot falls within availability window
    const [timeHour, timeMinute] = newTime.split(':').map(Number);
    const timeTotalMinutes = timeHour * 60 + timeMinute;
    
    const isWithinAvailability = matchingAvailabilitySlots.some(slot => {
      const [startHour, startMinute] = slot.startTime.split(':').map(Number);
      const [endHour, endMinute] = slot.endTime.split(':').map(Number);
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;
      
      return timeTotalMinutes >= startTotalMinutes && timeTotalMinutes < endTotalMinutes;
    });

    if (!isWithinAvailability) {
      throw createError('Selected time is not within provider availability window', 400);
    }

    // Calculate end time considering service duration
    const serviceDuration = booking.service.duration;
    const endTimeTotalMinutes = timeTotalMinutes + serviceDuration;
    const endHour = Math.floor(endTimeTotalMinutes / 60);
    const endMinute = endTimeTotalMinutes % 60;
    const endTimeString = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

    // Check for conflicting bookings (same provider, same date, overlapping time)
    // Exclude the current booking from conflict check
    // Convert newDate to start and end of day for date comparison
    const startOfDay = new Date(newDateTime);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(newDateTime);
    endOfDay.setHours(23, 59, 59, 999);

    const conflictingBookings = await prisma.booking.findMany({
      where: {
        providerId: booking.providerId,
        id: { not: bookingId }, // Exclude current booking
        status: { in: ['PENDING', 'CONFIRMED'] }, // Only check active bookings
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        service: true,
      },
    });

    // Check for time overlap
    const hasConflict = conflictingBookings.some(existingBooking => {
      const [existingStartHour, existingStartMinute] = existingBooking.scheduledTime.split(':').map(Number);
      const existingStartTotalMinutes = existingStartHour * 60 + existingStartMinute;
      const existingDuration = existingBooking.service.duration;
      const existingEndTotalMinutes = existingStartTotalMinutes + existingDuration;

      // Check if time ranges overlap
      return (
        (timeTotalMinutes < existingEndTotalMinutes && endTimeTotalMinutes > existingStartTotalMinutes)
      );
    });

    if (hasConflict) {
      throw createError('This time slot conflicts with another booking. Please choose another time.', 400);
    }

    // Update booking with new date/time
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        scheduledDate: newDateTime,
        scheduledTime: newTime,
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

  async deleteBooking(bookingId: string, userId: string) {
    // Verify booking exists and user has permission (must be client or provider)
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

    if (!booking) {
      throw createError('Booking not found or you do not have permission to delete it', 404);
    }

    // Permanently delete the booking
    await prisma.booking.delete({
      where: { id: bookingId },
    });

    return booking;
  },
};

