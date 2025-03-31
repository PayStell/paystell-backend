import rateLimit from "express-rate-limit";

export const webhookRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 100 requests per windowMs
  message: { message: "Too many requests, please try again later." },
  headers: true,
});
