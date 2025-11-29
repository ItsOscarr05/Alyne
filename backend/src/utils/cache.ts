/**
 * Redis cache utility
 * Provides caching layer for frequently accessed data
 */
import { createClient } from 'redis';
import { logger } from './logger';

let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * Initialize Redis connection
 */
export const initRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = createClient({
      url: redisUrl,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis', error);
    // Return null if Redis is not available - app should still work
    return null;
  }
};

/**
 * Get cached value
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  if (!redisClient) {
    return null;
  }

  try {
    const value = await redisClient.get(key);
    if (value) {
      return JSON.parse(value) as T;
    }
    return null;
  } catch (error) {
    logger.error(`Error getting cache for key: ${key}`, error);
    return null;
  }
};

/**
 * Set cached value with expiration
 */
export const setCache = async (
  key: string,
  value: any,
  expirationSeconds: number = 300 // Default 5 minutes
): Promise<boolean> => {
  if (!redisClient) {
    return false;
  }

  try {
    await redisClient.setEx(key, expirationSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error(`Error setting cache for key: ${key}`, error);
    return false;
  }
};

/**
 * Delete cached value
 */
export const deleteCache = async (key: string): Promise<boolean> => {
  if (!redisClient) {
    return false;
  }

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error(`Error deleting cache for key: ${key}`, error);
    return false;
  }
};

/**
 * Delete cache by pattern (e.g., "provider:*")
 */
export const deleteCachePattern = async (pattern: string): Promise<boolean> => {
  if (!redisClient) {
    return false;
  }

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    logger.error(`Error deleting cache pattern: ${pattern}`, error);
    return false;
  }
};

/**
 * Close Redis connection
 */
export const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

/**
 * Cache key generators
 */
export const cacheKeys = {
  provider: (id: string) => `provider:${id}`,
  providerList: (filters: string) => `providers:list:${filters}`,
  booking: (id: string) => `booking:${id}`,
  userBookings: (userId: string, role?: string, status?: string) => 
    `bookings:${userId}:${role || 'all'}:${status || 'all'}`,
  review: (id: string) => `review:${id}`,
  providerReviews: (providerId: string) => `reviews:provider:${providerId}`,
  conversations: (userId: string) => `conversations:${userId}`,
  messages: (senderId: string, receiverId: string) => 
    `messages:${senderId}:${receiverId}`,
};

