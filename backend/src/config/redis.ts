import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        console.warn('Redis reconnection limit reached. SolWork running in degraded mode (no active lease queues).');
        return false; // stop reconnecting
      }
      return 1000; // retry after 1s
    }
  }
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Successfully connected to Redis instance.');
});

export const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.error('Failed to initialize Redis connection:', error);
  }
};
