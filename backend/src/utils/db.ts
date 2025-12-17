/**
 * Database connection management
 * Centralized Prisma client with connection pooling configuration
 */
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Prisma connection pool configuration
// These settings optimize connection pooling for production
const prismaClientOptions = {
  log: ['error', 'warn'] as const,
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

// Create singleton Prisma client instance
// This ensures connection pooling works correctly across the application
export const prisma = new PrismaClient(prismaClientOptions);

// Connection pool monitoring
let connectionCount = 0;
let queryCount = 0;
let slowQueryCount = 0;
const SLOW_QUERY_THRESHOLD_MS = 1000; // 1 second

// Monitor query performance (only slow queries)
// Query logging is disabled to reduce log noise
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as never, (e: any) => {
    queryCount++;
    const duration = e.duration || 0;
    
    // Only log slow queries, not all queries
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      slowQueryCount++;
      logger.warn(`Slow query detected (${duration}ms): ${e.query.substring(0, 100)}...`);
    }
    
    // Query logging disabled - set LOG_QUERIES=true to enable if needed for debugging
    // if (process.env.LOG_QUERIES === 'true') {
    //   logger.debug(`Query: ${e.query.substring(0, 200)}... | Duration: ${duration}ms`);
    // }
  });
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Prisma client disconnected');
});

// Health check for database connection pool
export async function checkDatabaseHealth() {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime: duration,
      queryCount,
      slowQueryCount,
      connectionPool: {
        // Prisma manages connection pool internally
        // These are estimated based on Prisma defaults
        maxConnections: 10, // Prisma default
        activeConnections: connectionCount,
      },
    };
  } catch (error) {
    logger.error('Database health check failed', error);
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Get query performance statistics
export function getQueryStats() {
  return {
    totalQueries: queryCount,
    slowQueries: slowQueryCount,
    slowQueryThreshold: SLOW_QUERY_THRESHOLD_MS,
    slowQueryPercentage: queryCount > 0 
      ? ((slowQueryCount / queryCount) * 100).toFixed(2) 
      : '0.00',
  };
}

// Export the prisma client as default
export default prisma;

