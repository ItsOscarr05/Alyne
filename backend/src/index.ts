import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:8081',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
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
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new Error('JWT_SECRET not configured'));
  }

  try {
    const decoded = jwt.verify(token, secret) as { userId: string };
    (socket as any).userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket: any) => {
  const userId = socket.userId;
  console.log('User connected:', socket.id, 'userId:', userId);

  // Join user's personal room
  socket.join(`user:${userId}`);

  // Join a conversation room
  socket.on('join-conversation', (otherUserId: string) => {
    const roomId = [userId, otherUserId].sort().join(':');
    socket.join(`conversation:${roomId}`);
    console.log(`User ${userId} joined conversation ${roomId}`);
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

      // Emit to both users
      io.to(`conversation:${roomId}`).emit('receive-message', message);
      io.to(`user:${data.receiverId}`).emit('new-message', message);

      // Confirm to sender
      socket.emit('message-sent', message);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message-error', { error: 'Failed to send message' });
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
});

export { app, io };

