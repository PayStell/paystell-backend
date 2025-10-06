import { UserRole } from "../enums/UserRole";

export interface RateLimitTier {
  name: string;
  description: string;
  limits: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  burstMultiplier: number;
  burstDurationSeconds: number;
}

export interface MerchantTypeRateLimits {
  [key: string]: RateLimitTier;
}

export interface UserRoleRateLimits {
  [key: string]: RateLimitTier;
}

////////////////////////////////////
//  Default rate limit tiers
////////////////////////////////////
export const DEFAULT_RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  basic: {
    name: "Basic",
    description: "Default rate limits for standard users",
    limits: {
      requestsPerSecond: 5,
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
    },
    burstMultiplier: 2,
    burstDurationSeconds: 30,
  },
  premium: {
    name: "Premium",
    description: "Higher limits for premium users",
    limits: {
      requestsPerSecond: 10,
      requestsPerMinute: 300,
      requestsPerHour: 3000,
      requestsPerDay: 50000,
    },
    burstMultiplier: 2,
    burstDurationSeconds: 30,
  },
  enterprise: {
    name: "Enterprise",
    description: "Highest limits for enterprise users",
    limits: {
      requestsPerSecond: 50,
      requestsPerMinute: 1000,
      requestsPerHour: 10000,
      requestsPerDay: 100000,
    },
    burstMultiplier: 2,
    burstDurationSeconds: 30,
  },
};

////////////////////////////////////
// Default rate limits by user role
////////////////////////////////////

export const DEFAULT_USER_ROLE_LIMITS: UserRoleRateLimits = {
  [UserRole.USER]: DEFAULT_RATE_LIMIT_TIERS.basic,
  [UserRole.ADMIN]: DEFAULT_RATE_LIMIT_TIERS.premium,
};

////////////////////////////////////
// Default rate limits by merchant type
////////////////////////////////////
export const DEFAULT_MERCHANT_TYPE_LIMITS: MerchantTypeRateLimits = {
  standard: DEFAULT_RATE_LIMIT_TIERS.basic,
  premium: DEFAULT_RATE_LIMIT_TIERS.premium,
  enterprise: DEFAULT_RATE_LIMIT_TIERS.enterprise,
};
