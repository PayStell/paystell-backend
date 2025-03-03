import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Main Redis client (singleton)
const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (err) => console.error('Redis Client Error:', err));

(async () => {
  try {
    await redisClient.connect();
    console.log('🚀 Connected to Redis');
  } catch (err) {
    console.error('❌ Failed to connect to Redis:', err);
  }
})();

/**
 * Creates a new Redis client instance without automatically connecting.
 * This is useful when multiple separate Redis connections are needed.
 */
export const createRedisClient = () => {
  const client = createClient({ url: redisUrl });

  client.on('error', (err) => console.error('Redis client error:', err));
  client.on('connect', () => console.log('Connected to Redis'));

  return client; // The user must call `client.connect()` manually
};

// Export both the singleton client and the factory function
export { redisClient };
