import { PrismaClient } from '@prisma/client';
import { createError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export const messageService = {
  async sendMessage(data: {
    senderId: string;
    receiverId: string;
    content: string;
    bookingId?: string;
  }) {
    const { senderId, receiverId, content, bookingId } = data;

    // Verify both users exist
    const [sender, receiver] = await Promise.all([
      prisma.user.findUnique({ where: { id: senderId } }),
      prisma.user.findUnique({ where: { id: receiverId } }),
    ]);

    if (!sender || !receiver) {
      throw createError('User not found', 404);
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
        bookingId: bookingId || undefined,
        status: 'SENT',
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
    });

    return message;
  },

  async updateMessageStatus(messageId: string, status: 'SENT' | 'DELIVERED' | 'READ') {
    return await prisma.message.update({
      where: { id: messageId },
      data: { status },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
    });
  },

  async getConversations(userId: string) {
    // Get all unique conversations for this user
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            userType: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            userType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group by conversation partner
    const conversationMap = new Map<string, {
      otherUser: any;
      lastMessage: any;
      unreadCount: number;
    }>();

    for (const message of messages) {
      const otherUser = message.senderId === userId ? message.receiver : message.sender;
      const conversationKey = otherUser.id;

      if (!conversationMap.has(conversationKey)) {
        conversationMap.set(conversationKey, {
          otherUser,
          lastMessage: message,
          // Count as unread if message was received by this user and status is not READ
          unreadCount: message.receiverId === userId && message.status !== 'READ' ? 1 : 0,
        });
      } else {
        const existing = conversationMap.get(conversationKey)!;
        // Update unread count if message is unread (received by this user and not READ)
        if (message.receiverId === userId && message.status !== 'READ') {
          existing.unreadCount += 1;
        }
        // Keep the most recent message
        if (message.createdAt > existing.lastMessage.createdAt) {
          existing.lastMessage = message;
        }
      }
    }

    // Convert to array and format
    const conversations = Array.from(conversationMap.values()).map((conv) => ({
      id: conv.otherUser.id,
      otherUser: conv.otherUser,
      lastMessage: {
        id: conv.lastMessage.id,
        content: conv.lastMessage.content,
        createdAt: conv.lastMessage.createdAt,
        senderId: conv.lastMessage.senderId,
      },
      unreadCount: conv.unreadCount,
    }));

    return conversations;
  },

  async getMessages(userId: string, otherUserId: string, limit: number = 50, cursor?: string) {
    // Verify other user exists
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
        userType: true,
      },
    });

    if (!otherUser) {
      throw createError('User not found', 404);
    }

    // Get messages between the two users
    const where = {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    };

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Mark messages as delivered/read
    await prisma.message.updateMany({
      where: {
        receiverId: userId,
        senderId: otherUserId,
        status: 'SENT',
      },
      data: {
        status: 'DELIVERED',
      },
    });

    return {
      messages: messages.reverse(), // Reverse to show oldest first
      otherUser,
    };
  },

  async markAsRead(userId: string, otherUserId: string) {
    await prisma.message.updateMany({
      where: {
        receiverId: userId,
        senderId: otherUserId,
        status: { in: ['SENT', 'DELIVERED'] },
      },
      data: {
        status: 'READ',
      },
    });
  },
};

