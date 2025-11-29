/**
 * Redis cache utility
 * Provides caching layer for frequently accessed data
 */
import { createClient } from 'redis';
import { logger } from './logger';

let redisClient: ReturnType<typeof createClient> | null = null;
let connectionAttempted = false;

/**
 * Initialize Redis connection (optional)
 * Returns null if Redis is not configured or unavailable
 * Completely silent if REDIS_URL is not set
 */
export const initRedis = async () => {
  // Skip entirely if Redis URL is not set - no logs, no errors
  if (!process.env.REDIS_URL) {
    return null;
  }

  // Only attempt connection once
  if (connectionAttempted) {
    return redisClient;
  }

  connectionAttempted = true;

  try {
    const redisUrl = process.env.REDIS_URL;
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          // Stop retrying after 3 attempts - fail silently
          if (retries > 3) {
            return false;
          }
          // Exponential backoff: 100ms, 200ms, 400ms
          return Math.min(retries * 100, 400);
        },
        connectTimeout: 5000, // 5 second timeout
      },
    });

    // Suppress all error events - Redis is optional
    redisClient.on('error', () => {
      redisClient = null;
    });

    // Only log successful connection
    redisClient.on('connect', () => {
      logger.info('Redis connected (caching enabled)');
    });

    // Attempt connection with timeout
    const connectPromise = redisClient.connect();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    await Promise.race([connectPromise, timeoutPromise]);
    return redisClient;
  } catch (error) {
    // Silently fail - Redis is optional, app works without it
    redisClient = null;
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

