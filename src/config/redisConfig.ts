import { createClient } from 'redis';

export const createRedisClient = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  const client = createClient({
    url: redisUrl,
  });
  
  client.on('error', (err) => {
    console.error('Redis client error:', err);
  });
  
  client.on('connect', () => {
    console.log('Connected to Redis');
  });
  
  return client;
};