import rateLimit from "express-rate-limit";

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "development" ? 1000 : 100, // More lenient in development
  message: { message: "Too many requests, please try again later." },
  headers: true,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/health";
  },
});
