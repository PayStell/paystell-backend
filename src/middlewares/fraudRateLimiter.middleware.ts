import rateLimit from "express-rate-limit";

// Rate limiting for fraud alert queries
export const fraudAlertsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: "Too many fraud alert requests, please try again later"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for fraud configuration updates
export const fraudConfigRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 config updates per windowMs
  message: {
    success: false,
    error: "Too many configuration update requests, please try again later"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for fraud statistics queries
export const fraudStatsRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 stats requests per minute
  message: {
    success: false,
    error: "Too many statistics requests, please try again later"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for fraud alert reviews
export const fraudReviewRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 reviews per minute
  message: {
    success: false,
    error: "Too many review requests, please try again later"
  },
  standardHeaders: true,
  legacyHeaders: false,
});