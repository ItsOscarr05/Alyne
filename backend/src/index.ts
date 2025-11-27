import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: '/socket.io/',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:8081',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  allowEIO3: true,
  transports: ['polling', 'websocket'],
  connectTimeout: 45000,
});


// Listen for connection errors at Engine.IO level
io.engine.on('connection_error', (err: any) => {
  console.error('Socket.io connection error:', err.message);
});


const PORT = process.env.PORT || 3000;

// Middleware
// Configure Helmet to allow Socket.io connections
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for Socket.io compatibility
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8081',
  credentials: true,
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
import { authRoutes } from './routes/auth.routes';
import { providerRoutes } from './routes/provider.routes';
import { bookingRoutes } from './routes/booking.routes';
import { messageRoutes } from './routes/message.routes';

app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/messages', messageRoutes);
import { reviewRoutes } from './routes/review.routes';
app.use('/api/reviews', reviewRoutes);
import { paymentRoutes } from './routes/payment.routes';
app.use('/api/payments', paymentRoutes);
// app.use('/api/users', userRoutes);

// Socket.io for real-time messaging
import { messageService } from './services/message.service';
import jwt from 'jsonwebtoken';

// Socket.io authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(new Error('JWT_SECRET not configured'));
    }

    const decoded = jwt.verify(token, secret) as { userId: string };
    (socket as any).userId = decoded.userId;
    next();
  } catch (error: any) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new Error('Invalid token'));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new Error('Token expired'));
    }
    next(new Error('Authentication failed'));
  }
});

// Handle Socket.io connections
io.on('connection', (socket: any) => {
  const userId = (socket as any).userId;
  
  if (!userId) {
    socket.disconnect();
    return;
  }

  // Join user's personal room
  socket.join(`user:${userId}`);

  // Join a conversation room
  socket.on('join-conversation', (otherUserId: string) => {
    const roomId = [userId, otherUserId].sort().join(':');
    socket.join(`conversation:${roomId}`);
  });

  // Leave a conversation room (for cleanup when navigating away)
  socket.on('leave-conversation', (otherUserId: string) => {
    const roomId = [userId, otherUserId].sort().join(':');
    socket.leave(`conversation:${roomId}`);
  });

  // Handle sending messages
  socket.on('send-message', async (data: {
    receiverId: string;
    content: string;
    bookingId?: string;
  }) => {
    try {
      // Save message to database
      const message = await messageService.sendMessage({
        senderId: userId,
        receiverId: data.receiverId,
        content: data.content,
        bookingId: data.bookingId,
      });

      // Create room ID for the conversation
      const roomId = [userId, data.receiverId].sort().join(':');

      // Update status to DELIVERED when message is received by server
      // (In a real app, this would happen when recipient's device receives it)
      // For MVP, we'll update to DELIVERED immediately after sending
      const deliveredMessage = await prisma.message.update({
        where: { id: message.id },
        data: { status: 'DELIVERED' },
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

      // Emit to conversation room (both users in the conversation)
      io.to(`conversation:${roomId}`).emit('receive-message', deliveredMessage);
      
      // Also notify receiver's personal room (for conversation list updates)
      io.to(`user:${data.receiverId}`).emit('new-message', deliveredMessage);

      // Confirm to sender with DELIVERED status (only to this socket, not broadcast)
      socket.emit('message-sent', deliveredMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message-error', { error: 'Failed to send message' });
    }
  });

  // Handle marking messages as read
  socket.on('mark-as-read', async (data: { otherUserId: string }) => {
    try {
      // Mark messages as read in database
      await messageService.markAsRead(userId, data.otherUserId);

      // Get the updated messages to send to the sender
      const updatedMessages = await prisma.message.findMany({
        where: {
          senderId: data.otherUserId,
          receiverId: userId,
          status: 'READ',
        },
        orderBy: { createdAt: 'desc' },
        take: 50, // Get recent read messages
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

      // Notify the sender that their messages were read
      // The sender is the otherUserId, so we emit to their personal room
      io.to(`user:${data.otherUserId}`).emit('messages-read', {
        messages: updatedMessages,
        readBy: userId,
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling
app.use(errorHandler);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Socket.io server ready at http://localhost:${PORT}/socket.io/`);
  console.log(`📡 CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:8081'}`);
});

export { app, io };

