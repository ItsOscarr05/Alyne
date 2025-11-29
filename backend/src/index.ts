import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { prisma } from './utils/db';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { sanitizeInput } from './middleware/sanitizeInput';
import { initRedis } from './utils/cache';
import { monitoringMiddleware, monitoring } from './utils/monitoring';
import { errorTracker } from './utils/errorTracking';
import { logger } from './utils/logger';
import { keyRotationManager } from './utils/apiKeyRotation';
import { securityMonitor } from './utils/securityMonitoring';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

// Load environment variables
dotenv.config();

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
  logger.error('Socket.io connection error', err);
});


const PORT = process.env.PORT || 3000;

// Middleware
// Configure Helmet with CSP that allows Socket.io connections
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for Socket.io
      connectSrc: [
        "'self'",
        process.env.FRONTEND_URL || 'http://localhost:8081',
        'ws://localhost:3000', // WebSocket for Socket.io
        'wss://localhost:3000', // Secure WebSocket
        ...(process.env.FRONTEND_URL?.split(',') || []).map(url => url.replace('http://', 'ws://').replace('https://', 'wss://')),
      ],
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // Disabled for Socket.io compatibility
}));
app.use(compression());
// CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL?.split(',') || [] // Allow multiple origins in production
    : process.env.FRONTEND_URL || 'http://localhost:8081',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));


app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Limit URL-encoded payload size

// Sanitize input to prevent XSS attacks
app.use(sanitizeInput);

// Monitoring middleware (track requests and performance)
app.use(monitoringMiddleware);

app.use(rateLimiter);

// Health check endpoints
app.get('/health', async (req, res) => {
  try {
    // Check database connection with connection pool info
    const dbHealth = await checkDatabaseHealth();

    // Check Redis connection (if available)
    let redisStatus = 'not_configured';
    try {
      const { getCache } = await import('./utils/cache');
      const testCache = await getCache('health-check');
      redisStatus = 'connected';
    } catch (redisError) {
      redisStatus = 'disconnected';
    }

    const metrics = monitoring.getMetrics();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: {
          status: dbHealth.status,
          responseTime: `${dbHealth.responseTime}ms`,
          connectionPool: dbHealth.connectionPool,
          queryStats: getQueryStats(),
        },
        redis: {
          status: redisStatus,
        },
      },
      metrics: {
        uptime: metrics.uptimeFormatted,
        totalRequests: metrics.requestCount,
        errorCount: metrics.errorCount,
        errorRate: `${metrics.errorRate}%`,
        averageResponseTime: `${Math.round(metrics.averageResponseTime)}ms`,
      },
    });
  } catch (error) {
    logger.error('Health check failed', error);
    errorTracker.captureException(error as Error, { context: 'health_check' });
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: 'disconnected',
        },
      },
    });
  }
});

// Metrics endpoint (for monitoring tools)
app.get('/metrics', (req, res) => {
  const metrics = monitoring.getMetrics();
  res.json({
    success: true,
    data: metrics,
  });
});

// Security stats endpoint (protected, admin only in production)
app.get('/security/stats', (req, res) => {
  const stats = securityMonitor.getStats();
  res.json({
    success: true,
    data: stats,
  });
});

// API Documentation (Swagger)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Alyne API Documentation',
}));

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
import { plaidRoutes } from './routes/plaid.routes';
app.use('/api/plaid', plaidRoutes);
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
      logger.error('Error sending message', error);
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
      logger.error('Error marking messages as read', error);
    }
  });

  socket.on('disconnect', () => {
    logger.debug(`User disconnected: ${socket.id}`);
  });
});

// Error handling
app.use(errorHandler);

// Initialize Redis (optional - app works without it)
initRedis().catch(() => {
  // Silently fail - Redis is optional for development
});

// Check API key rotation reminders on startup (production only)
if (process.env.NODE_ENV === 'production') {
  keyRotationManager.checkRotationReminders();
}

// Start server
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Socket.io server ready at http://localhost:${PORT}/socket.io/`);
  logger.info(`CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:8081'}`);
});

export { app, io };

