import type { Request, Response, NextFunction } from "express";
// Do NOT import intelligentRateLimiter here yet, as we need to mock its dependency first.
import rateLimitConfigService from "../services/rateLimitConfigService";
import whitelistBlacklistService from "../services/whitelistBlacklistService";
import RateLimitMonitoringService from "../services/rateLimitMonitoring.service";
import { redisClient } from "../config/redisConfig";
import { UserRole } from "../enums/UserRole";
import { jest } from "@jest/globals";

// --- START: Accurate Mock Interfaces based on your provided types ---
interface MockMerchantWebhookEntity {
  id: string;
  url: string;
  event: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  merchantId: string;
  merchant: MockMerchant; // Circular reference, but necessary for type accuracy
}

interface MockMerchant {
  id: string;
  apiKey: string;
  secret: string;
  name: string;
  email: string;
  isActive: boolean;
  business_name: string | null;
  business_description: string | null;
  business_address: string | null;
  business_phone: string | null;
  business_email: string | null;
  business_logo_url: string | null;
  createdAt: Date;
  updatedAt: Date;
  webhooks: MockMerchantWebhookEntity[];
  business_type?: "standard" | "premium" | "enterprise";
}

interface MockUser {
  id: number;
  email: string;
  role: UserRole;
}

interface MockRateLimitConfig {
  id: string;
  merchantId: string;
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstMultiplier: number;
  burstDurationSeconds: number;
  businessType?: "standard" | "premium" | "enterprise";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  merchant: MockMerchant;
}

// Extend Express Request to include custom properties for testing
declare module "express-serve-static-core" {
  interface Request {
    user?: MockUser;
    merchant?: MockMerchant;
    rateLimit?: {
      limit: number;
      current: number;
      remaining: number;
      resetTime: Date;
      total: number;
    };
  }
}

// Define a type for the options passed to express-rate-limit
interface RateLimitOptions {
  handler: (
    req: Request,
    res: Response,
    next: NextFunction,
    options: RateLimitOptions,
  ) => Promise<void> | void;
  max: number | ((req: Request, res: Response) => Promise<number>);
  windowMs: number;
  skip: (req: Request, res: Response) => boolean;
  // Add other options used by the limiter if necessary
}

// Define a type for the mocked express-rate-limit instance
interface MockRateLimitInstance extends jest.Mock {
  _options: RateLimitOptions;
  resetKey: jest.Mock;
}

// --- END: Accurate Mock Interfaces ---

// Mock external dependencies
jest.mock("../services/rateLimitConfigService");
jest.mock("../services/whitelistBlacklistService");
jest.mock("../services/rateLimitMonitoring.service");
jest.mock("../config/redisConfig", () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

// --- CRITICAL FIX: Mock express-rate-limit itself ---
const mockRateLimit = jest.fn((options: RateLimitOptions) => {
  const middlewareInstance = jest.fn(
    (req: Request, res: Response, next: NextFunction) => next(),
  ) as MockRateLimitInstance;
  middlewareInstance._options = options;
  middlewareInstance.resetKey = jest.fn();
  return middlewareInstance;
}) as unknown as (options: RateLimitOptions) => MockRateLimitInstance; // Cast the mock function itself

jest.mock("express-rate-limit", () => ({
  __esModule: true,
  default: mockRateLimit,
}));

// Now, import the module under test AFTER its dependencies are mocked.
import intelligentRateLimiter from "../middleware/rateLimiter";

// Get typed mocks for the services
const mockedRateLimitConfigService = jest.mocked(rateLimitConfigService);
const mockedWhitelistBlacklistService = jest.mocked(whitelistBlacklistService);
const mockedRateLimitMonitoringService = jest.mocked(
  RateLimitMonitoringService,
);
const mockedRedisClient = jest.mocked(redisClient);

describe("intelligentRateLimiter", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let originalSend: jest.Mock;

  // Helper to create a default MockMerchant
  const defaultMockMerchant: MockMerchant = {
    id: "default-merchant-id",
    apiKey: "default-api-key",
    secret: "default-secret",
    name: "Default Mock Merchant",
    email: "default@mock.com",
    isActive: true,
    business_name: "Default Business",
    business_description: "A default mock business.",
    business_address: "123 Default St",
    business_phone: "555-0000",
    business_email: "defaultbiz@mock.com",
    business_logo_url: null,
    webhooks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    business_type: "standard",
  };

  // Helper to create a full MockRateLimitConfig
  const createMockRateLimitConfig = (
    rpm: number,
    merchantId = defaultMockMerchant.id,
    businessType: "standard" | "premium" | "enterprise" = "standard",
    isActive = true,
    merchant: MockMerchant = {
      ...defaultMockMerchant,
      id: merchantId,
      business_type: businessType,
    },
  ): MockRateLimitConfig => ({
    id: `config-${merchantId}-${businessType}`,
    merchantId: merchantId,
    requestsPerMinute: rpm,
    requestsPerSecond: Math.ceil(rpm / 60),
    requestsPerHour: rpm * 60,
    requestsPerDay: rpm * 60 * 24,
    burstMultiplier: 2,
    burstDurationSeconds: 30,
    businessType: businessType,
    isActive: isActive,
    createdAt: new Date(),
    updatedAt: new Date(),
    merchant: merchant,
  });

  beforeEach(() => {
    mockRequest = {
      ip: "127.0.0.1",
      originalUrl: "/api/test", // Default to a non-skipped path
      path: "/api/test", // Default to a non-skipped path
      headers: {},
      user: undefined,
      merchant: undefined,
    };
    mockResponse = {
      statusCode: 200,
      setHeader: jest.fn(),
      send: jest.fn(),
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    originalSend = jest.fn();
    (mockResponse as Response).send = originalSend;
    jest.clearAllMocks();

    // Default mock implementations using typed mocks and full config objects
    mockedRateLimitConfigService.getConfigForUser.mockResolvedValue(
      createMockRateLimitConfig(60),
    );
    mockedWhitelistBlacklistService.isBlacklisted.mockResolvedValue(false);
    mockedWhitelistBlacklistService.isWhitelisted.mockResolvedValue(false);
    mockedRedisClient.get.mockResolvedValue(null);
    mockedRedisClient.set.mockResolvedValue("OK");
    mockedRateLimitMonitoringService.logAdvancedRateLimitEvent.mockResolvedValue(
      undefined,
    );
  });

  // CRITICAL FIX: Simulate req.rateLimit being set by the express-rate-limit middleware
  const simulateRateLimitExceeded = async (
    limiter: MockRateLimitInstance,
    req: Request,
    res: Response,
  ) => {
    const handler = limiter._options.handler;
    const options = limiter._options;
    // Manually set req.rateLimit to simulate the state when limit is exceeded
    req.rateLimit = {
      limit: options.max as number, // The configured max limit
      current: (options.max as number) + 1, // Simulate current count exceeding the limit
      remaining: -1, // No requests remaining
      resetTime: new Date(Date.now() + options.windowMs), // Reset time in the future
      total: (options.max as number) + 1, // Total requests made
    };
    // Call the handler with the correct arguments
    await handler(req, res, mockNext, options);
  };

  it("should apply default unauthenticated limit if no user/merchant context", async () => {
    const limiter = intelligentRateLimiter as MockRateLimitInstance;
    const maxFn = limiter._options.max as (
      req: Request,
      res: Response,
    ) => Promise<number>;
    const limit = await maxFn(mockRequest as Request, mockResponse as Response);
    expect(limit).toBe(30);
  });

  it("should apply default authenticated limit if user but no specific config", async () => {
    mockRequest.user = {
      id: 123,
      email: "user@example.com",
      role: UserRole.USER,
    };
    const limiter = intelligentRateLimiter as MockRateLimitInstance;
    const maxFn = limiter._options.max as (
      req: Request,
      res: Response,
    ) => Promise<number>;
    const limit = await maxFn(mockRequest as Request, mockResponse as Response);
    expect(limit).toBe(100);
  });

  it("should apply admin limit if user is ADMIN", async () => {
    mockRequest.user = {
      id: 456,
      email: "admin@example.com",
      role: UserRole.ADMIN,
    };
    const limiter = intelligentRateLimiter as MockRateLimitInstance;
    const maxFn = limiter._options.max as (
      req: Request,
      res: Response,
    ) => Promise<number>;
    const limit = await maxFn(mockRequest as Request, mockResponse as Response);
    expect(limit).toBe(200);
  });

  it("should apply dynamic limit based on user/merchant config", async () => {
    mockRequest.user = {
      id: 789,
      email: "user@example.com",
      role: UserRole.USER,
    };
    const mockMerchant: MockMerchant = {
      ...defaultMockMerchant,
      id: "merchantABC",
      name: "Mock Merchant",
      email: "mock@merchant.com",
      business_name: "Mock Business",
      business_type: "standard",
    };
    mockRequest.merchant = mockMerchant;
    mockedRateLimitConfigService.getConfigForUser.mockResolvedValueOnce(
      createMockRateLimitConfig(
        120,
        mockMerchant.id,
        mockMerchant.business_type,
        true,
        mockMerchant,
      ),
    );
    const limiter = intelligentRateLimiter as MockRateLimitInstance;
    const maxFn = limiter._options.max as (
      req: Request,
      res: Response,
    ) => Promise<number>;
    const limit = await maxFn(mockRequest as Request, mockResponse as Response);
    expect(limit).toBe(120);
    expect(mockedRateLimitConfigService.getConfigForUser).toHaveBeenCalledWith(
      "789",
      "merchantABC",
      UserRole.USER,
    );
  });

  it("should return 0 (unlimited) if IP is whitelisted", async () => {
    mockedWhitelistBlacklistService.isWhitelisted.mockResolvedValueOnce(true);
    const limiter = intelligentRateLimiter as MockRateLimitInstance;
    const maxFn = limiter._options.max as (
      req: Request,
      res: Response,
    ) => Promise<number>;
    const limit = await maxFn(mockRequest as Request, mockResponse as Response);
    expect(limit).toBe(0);
    expect(mockedWhitelistBlacklistService.isWhitelisted).toHaveBeenCalledWith(
      "ip",
      "127.0.0.1",
    );
  });

  it("should return 0 (block) if IP is blacklisted", async () => {
    mockedWhitelistBlacklistService.isBlacklisted.mockResolvedValueOnce(true);
    const limiter = intelligentRateLimiter as MockRateLimitInstance;
    const maxFn = limiter._options.max as (
      req: Request,
      res: Response,
    ) => Promise<number>;
    const limit = await maxFn(mockRequest as Request, mockResponse as Response);
    expect(limit).toBe(0);
    expect(mockedWhitelistBlacklistService.isBlacklisted).toHaveBeenCalledWith(
      "ip",
      "127.0.0.1",
    );
  });

  it("should activate burst mode and return burst limit if user is authenticated and limit exceeded", async () => {
    // CRITICAL FIX: Create a new request object for this test to set the specific path
    const testRequest: Request = {
      ...mockRequest,
      originalUrl: "/api-docs", // Set specific path for this test
      path: "/api-docs", // Set specific path for this test
      user: { id: 101, email: "burst@example.com", role: UserRole.USER },
    } as Request;
    const mockMerchant: MockMerchant = {
      ...defaultMockMerchant,
      id: "merchantXYZ",
      name: "Burst Merchant",
      email: "burst@merchant.com",
      business_name: "Burst Business",
      business_type: "premium",
    };
    testRequest.merchant = mockMerchant; // Assign merchant to the new testRequest
    const mockConfig = createMockRateLimitConfig(
      60,
      mockMerchant.id,
      mockMerchant.business_type,
      true,
      mockMerchant,
    );
    mockedRateLimitConfigService.getConfigForUser.mockResolvedValue(mockConfig); // Use mockResolvedValue for consistency

    const limiter = intelligentRateLimiter as MockRateLimitInstance;
    const maxFn = limiter._options.max as (
      req: Request,
      res: Response,
    ) => Promise<number>;
    // First, call the max function to set up the config
    await maxFn(testRequest, mockResponse as Response); // Use testRequest here

    // Now simulate rate limit exceeded
    await simulateRateLimitExceeded(
      limiter,
      testRequest,
      mockResponse as Response,
    ); // Use testRequest here

    // Check if burst mode was activated
    expect(mockedRedisClient.set).toHaveBeenCalledWith(
      "burst:101:/api-docs",
      "1",
      { EX: 30 },
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      "X-RateLimit-Burst",
      "activated",
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      "X-RateLimit-Burst-Duration",
      "30",
    );
    expect(mockResponse.status).toHaveBeenCalledWith(429);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        message: "Too many requests, please try again later",
        code: "RATE_LIMIT_EXCEEDED",
        burstModeAvailable: true,
      }),
    );

    // Test that burst limit is returned when burst mode is active
    mockedRedisClient.get.mockResolvedValue("1"); // Simulate burst active
    const burstLimit = await maxFn(testRequest, mockResponse as Response); // Use testRequest here
    expect(burstLimit).toBe(120); // 60 * 2 (burstMultiplier)
  });

  it("should log advanced rate limit event when limit is exceeded", async () => {
    // CRITICAL FIX: Create a new request object for this test to set the specific path
    const testRequest: Request = {
      ...mockRequest,
      originalUrl: "/api-docs", // Set specific path for this test
      path: "/api-docs", // Set specific path for this test
      user: { id: 202, email: "test@example.com", role: UserRole.USER },
      headers: { "user-agent": "jest-test" },
    } as Request;
    const mockMerchant: MockMerchant = {
      ...defaultMockMerchant,
      id: "merchantABC",
      name: "Test Enterprise",
      email: "test@enterprise.com",
      business_name: "Test Enterprise",
      business_type: "enterprise",
    };
    testRequest.merchant = mockMerchant; // Assign merchant to the new testRequest

    // Set up the config for this user/merchant
    const mockConfig = createMockRateLimitConfig(
      60,
      mockMerchant.id,
      mockMerchant.business_type,
      true,
      mockMerchant,
    );
    mockedRateLimitConfigService.getConfigForUser.mockResolvedValue(mockConfig); // Use mockResolvedValue for consistency

    const limiter = intelligentRateLimiter as MockRateLimitInstance;
    const maxFn = limiter._options.max as (
      req: Request,
      res: Response,
    ) => Promise<number>;
    // First call the max function to ensure config is loaded
    await maxFn(testRequest, mockResponse as Response); // Use testRequest here

    // Now simulate rate limit exceeded
    await simulateRateLimitExceeded(
      limiter,
      testRequest,
      mockResponse as Response,
    ); // Use testRequest here

    expect(
      mockedRateLimitMonitoringService.logAdvancedRateLimitEvent,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        ip: "127.0.0.1",
        endpoint: "/api-docs",
        userAgent: "jest-test",
        userId: 202, // userId is number in RateLimitEvent
        email: "test@example.com",
        userRole: UserRole.USER,
        merchantId: "merchantABC",
        merchantType: "enterprise",
        wasThrottled: true,
        requestCount: 1,
      }),
    );
  });

  it("should skip rate limiting for configured paths", async () => {
    const limiter = intelligentRateLimiter as MockRateLimitInstance;
    const skipFn = limiter._options.skip;

    // CRITICAL FIX: Create new request objects for each test case to avoid read-only property error
    const healthRequest = { ...mockRequest, path: "/health" } as Request;
    expect(skipFn(healthRequest, mockResponse as Response)).toBe(true);

    const apiDocsRequest = {
      ...mockRequest,
      path: "/api-docs/swagger",
    } as Request;
    expect(skipFn(apiDocsRequest, mockResponse as Response)).toBe(true);

    const otherRequest = {
      ...mockRequest,
      path: "/api/some-other-path",
    } as Request;
    expect(skipFn(otherRequest, mockResponse as Response)).toBe(false);
  });
});
