import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Main Redis client (singleton)
const redisClient = createClient({ url: redisUrl });

// Better error handling
redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
  // Don't exit the process, just log the error
});

redisClient.on("connect", () => {
  console.log("🚀 Connected to Redis");
});

redisClient.on("disconnect", () => {
  console.warn("⚠️ Redis disconnected");
});

redisClient.on("reconnecting", () => {
  console.log("🔄 Redis reconnecting...");
});

// Initialize connection with proper error handling
const initializeRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (err) {
    console.error("❌ Failed to connect to Redis:", err);
    console.warn("⚠️ Application will continue without Redis cache");
    // Don't exit - let the app continue without Redis
  }
};

// Initialize connection
initializeRedis();

/**
 * Creates a new Redis client instance without automatically connecting.
 * This is useful when multiple separate Redis connections are needed.
 */
export const createRedisClient = () => {
  const client = createClient({ url: redisUrl });

  client.on("error", (err) => {
    console.error("Redis client error:", err);
    // Don't throw, just log
  });

  client.on("connect", () => console.log("Connected to Redis"));

  return client; // The user must call `client.connect()` manually
};

// Safe Redis operation wrapper
export const safeRedisOperation = async <T>(
  operation: () => Promise<T>,
  fallback?: T,
): Promise<T | undefined> => {
  try {
    if (!redisClient.isOpen) {
      console.warn("Redis not connected, skipping operation");
      return fallback;
    }
    return await operation();
  } catch (error) {
    console.error("Redis operation failed:", error);
    return fallback;
  }
};

// Export both the singleton client and the factory function
export { redisClient };
