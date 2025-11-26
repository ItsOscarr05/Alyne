import { Request, Response, NextFunction } from 'express';
import { messageService } from '../services/message.service';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const messageController = {
  async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { receiverId, content, bookingId } = req.body;

      if (!receiverId || !content) {
        return next(createError('Receiver ID and content are required', 400));
      }

      const message = await messageService.sendMessage({
        senderId: userId,
        receiverId,
        content,
        bookingId,
      });

      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      next(error);
    }
  },

  async getConversations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const conversations = await messageService.getConversations(userId);

      res.json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      next(error);
    }
  },

  async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { otherUserId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const cursor = req.query.cursor as string | undefined;

      const result = await messageService.getMessages(userId, otherUserId, limit, cursor);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(createError('Authentication required', 401));
      }

      const { otherUserId } = req.params;

      await messageService.markAsRead(userId, otherUserId);

      res.json({
        success: true,
        message: 'Messages marked as read',
      });
    } catch (error) {
      next(error);
    }
  },
};

