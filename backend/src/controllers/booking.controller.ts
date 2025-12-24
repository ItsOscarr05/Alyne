import { Response, NextFunction } from 'express';
import { bookingService } from '../services/booking.service';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { io } from '../index';
import { parsePagination, createPaginationResult } from '../utils/pagination';

export const bookingController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { providerId, serviceId, scheduledDate, scheduledTime, location, notes } = req.body;

      const booking = await bookingService.createBooking({
        clientId: userId,
        providerId,
        serviceId,
        scheduledDate,
        scheduledTime,
        location,
        notes,
      });

      // Emit real-time update to the client
      if (booking.clientId) {
        io.to(`user:${booking.clientId}`).emit('booking-updated', {
          bookingId: booking.id,
          status: booking.status,
          booking,
        });
      }

      // Also notify the provider
      if (booking.providerId) {
        io.to(`user:${booking.providerId}`).emit('booking-updated', {
          bookingId: booking.id,
          status: booking.status,
          booking,
        });
      }

      res.status(201).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  },

  async getMyBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { status, role } = req.query; // role: 'client' or 'provider'
      const { skip, take, page, limit } = parsePagination(req.query);

      const result = await bookingService.getUserBookings(
        userId,
        status as string | undefined,
        role as 'client' | 'provider' | undefined,
        skip,
        take
      );

      const paginationResult = createPaginationResult(
        result.bookings,
        result.total,
        page,
        limit
      );

      res.json({
        success: true,
        data: paginationResult.data,
        pagination: paginationResult.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const booking = await bookingService.getBookingById(id, userId);

      if (!booking) {
        return next(createError('Booking not found', 404));
      }

      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const updates = req.body;

      const booking = await bookingService.updateBooking(id, userId, updates);

      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  },

  async accept(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const booking = await bookingService.acceptBooking(id, userId);

      // Get the full booking object with all relations for socket event
      // This ensures the client receives the complete booking data
      const fullBooking = await bookingService.getBookingById(id, userId);

      // Emit real-time update to the client with full booking data
      if (booking.clientId && fullBooking) {
        io.to(`user:${booking.clientId}`).emit('booking-updated', {
          bookingId: booking.id,
          status: booking.status,
          booking: fullBooking,
        });
      }

      // Also notify the provider
      if (booking.providerId && fullBooking) {
        io.to(`user:${booking.providerId}`).emit('booking-updated', {
          bookingId: booking.id,
          status: booking.status,
          booking: fullBooking,
        });
      }

      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  },

  async decline(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const booking = await bookingService.declineBooking(id, userId);

      // Get the full booking object with all relations for socket event
      const fullBooking = await bookingService.getBookingById(id, userId);

      // Emit real-time update to the client with full booking data
      if (booking.clientId && fullBooking) {
        io.to(`user:${booking.clientId}`).emit('booking-updated', {
          bookingId: booking.id,
          status: booking.status,
          booking: fullBooking,
        });
      }

      // Also notify the provider
      if (booking.providerId && fullBooking) {
        io.to(`user:${booking.providerId}`).emit('booking-updated', {
          bookingId: booking.id,
          status: booking.status,
          booking: fullBooking,
        });
      }

      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  },

  async cancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const booking = await bookingService.cancelBooking(id, userId);

      // Get the full booking object with all relations for socket event
      const fullBooking = await bookingService.getBookingById(id, userId);

      // Emit real-time update to the client with full booking data
      if (booking.clientId && fullBooking) {
        io.to(`user:${booking.clientId}`).emit('booking-updated', {
          bookingId: booking.id,
          status: booking.status,
          booking: fullBooking,
        });
      }

      // Also notify the provider
      if (booking.providerId && fullBooking) {
        io.to(`user:${booking.providerId}`).emit('booking-updated', {
          bookingId: booking.id,
          status: booking.status,
          booking: fullBooking,
        });
      }

      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  },

  async complete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const booking = await bookingService.completeBooking(id, userId);

      // Get the full booking object with all relations for socket event
      const fullBooking = await bookingService.getBookingById(id, userId);

      // Emit real-time update to the client with full booking data
      if (booking.clientId && fullBooking) {
        io.to(`user:${booking.clientId}`).emit('booking-updated', {
          bookingId: booking.id,
          status: booking.status,
          booking: fullBooking,
        });
      }

      // Also notify the provider
      if (booking.providerId && fullBooking) {
        io.to(`user:${booking.providerId}`).emit('booking-updated', {
          bookingId: booking.id,
          status: booking.status,
          booking: fullBooking,
        });
      }

      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  },
};

