import { Router } from "express";
import rateLimitController from "../controllers/RateLimitController";
import {
  authMiddleware,
  isUserAuthorized,
} from "../middlewares/authMiddleware";
import { UserRole } from "../enums/UserRole";

const rateLimitRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Rate Limit Monitoring
 *   description: API for monitoring and retrieving rate limit statistics.
 * security:
 *   - bearerAuth: []
 */

/**
 * @swagger
 * tags:
 *   name: Rate Limit Configuration
 *   description: API for managing dynamic rate limit configurations for merchants and users.
 * security:
 *   - bearerAuth: []
 */

/**
 * @swagger
 * tags:
 *   name: Rate Limit Whitelist
 *   description: API for managing whitelisted entities (IPs, Users, Merchants) that bypass rate limits.
 * security:
 *   - bearerAuth: []
 */

/**
 * @swagger
 * tags:
 *   name: Rate Limit Blacklist
 *   description: API for managing blacklisted entities (IPs, Users, Merchants) that are blocked by rate limits.
 * security:
 *   - bearerAuth: []
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     RateLimitConfig:
 *       type: object
 *       required:
 *         - merchantId
 *         - businessType
 *         - requestsPerSecond
 *         - requestsPerMinute
 *         - requestsPerHour
 *         - requestsPerDay
 *         - burstMultiplier
 *         - burstDurationSeconds
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the configuration.
 *         merchantId:
 *           type: string
 *           description: The ID of the merchant this configuration applies to.
 *         businessType:
 *           type: string
 *           enum: [standard, premium, enterprise]
 *           description: The business type of the merchant, influencing default limits.
 *         requestsPerSecond:
 *           type: number
 *           description: Maximum requests allowed per second.
 *         requestsPerMinute:
 *           type: number
 *           description: Maximum requests allowed per minute.
 *         requestsPerHour:
 *           type: number
 *           description: Maximum requests allowed per hour.
 *         requestsPerDay:
 *           type: number
 *           description: Maximum requests allowed per day.
 *         burstMultiplier:
 *           type: number
 *           format: float
 *           description: Multiplier for burst allowance (e.g., 1.5 for 50% more requests).
 *         burstDurationSeconds:
 *           type: number
 *           description: Duration in seconds for which burst mode is active.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the configuration was created.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the configuration was last updated.
 *     RateLimitHistory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           nullable: true
 *         userRole:
 *           type: string
 *           nullable: true
 *         merchantId:
 *           type: string
 *           nullable: true
 *         merchantType:
 *           type: string
 *           nullable: true
 *         endpoint:
 *           type: string
 *         ip:
 *           type: string
 *         requestCount:
 *           type: number
 *         limitUsed:
 *           type: number
 *           nullable: true
 *         wasThrottled:
 *           type: boolean
 *         wasBurst:
 *           type: boolean
 *         userAgent:
 *           type: string
 *           nullable: true
 *         timestamp:
 *           type: string
 *           format: date-time
 *     RateLimitMetrics:
 *       type: object
 *       properties:
 *         timeframe:
 *           type: string
 *           enum: [minute, hour, day]
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *         totalRequests:
 *           type: number
 *         throttledRequests:
 *           type: number
 *         throttleRate:
 *           type: number
 *           format: float
 *         burstRequests:
 *           type: number
 *         burstRate:
 *           type: number
 *           format: float
 *         endpointStats:
 *           type: object
 *           additionalProperties:
 *             type: object
 *             properties:
 *               total:
 *                 type: number
 *               throttled:
 *                 type: number
 *               burst:
 *                 type: number
 *         roleStats:
 *           type: object
 *           additionalProperties:
 *             type: object
 *             properties:
 *               total:
 *                 type: number
 *               throttled:
 *                 type: number
 *               burst:
 *                 type: number
 *         topThrottledIPs:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               ip:
 *                 type: string
 *               throttledCount:
 *                 type: number
 *         topThrottledUsers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               throttledCount:
 *                 type: number
 *     RealTimeStatus:
 *       type: object
 *       properties:
 *         activeRequests:
 *           type: number
 *           description: Number of active requests in the last minute.
 *         throttledRequests:
 *           type: number
 *           description: Number of throttled requests in the last minute.
 *         burstModeActive:
 *           type: number
 *           description: Number of requests that utilized burst mode in the last minute.
 *         activeBurstSessions:
 *           type: number
 *           description: Number of currently active burst sessions.
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: The timestamp of when the status was retrieved.
 *         recentEvents:
 *           type: number
 *           description: Number of recent events tracked in memory.
 *     WhitelistEntry:
 *       type: object
 *       required:
 *         - type
 *         - value
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         type:
 *           type: string
 *           enum: [IP, USER, MERCHANT]
 *           description: The type of entity being whitelisted.
 *         value:
 *           type: string
 *           description: The actual value (IP address, User ID, Merchant ID).
 *         reason:
 *           type: string
 *           nullable: true
 *           description: Reason for whitelisting.
 *         addedBy:
 *           type: string
 *           nullable: true
 *           description: User who added the entry.
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Optional expiration date for the whitelist entry.
 *         createdAt:
 *           type: string
 *           format: date-time
 *     BlacklistEntry:
 *       type: object
 *       required:
 *         - type
 *         - value
 *         - reason
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         type:
 *           type: string
 *           enum: [IP, USER, MERCHANT]
 *           description: The type of entity being blacklisted.
 *         value:
 *           type: string
 *           description: The actual value (IP address, User ID, Merchant ID).
 *         reason:
 *           type: string
 *           enum: [ABUSE, FRAUD, MANUAL, OTHER]
 *           description: The reason for blacklisting.
 *         details:
 *           type: string
 *           nullable: true
 *           description: Additional details about the blacklist reason.
 *         addedBy:
 *           type: string
 *           nullable: true
 *           description: User who added the entry.
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Optional expiration date for the blacklist entry.
 *         createdAt:
 *           type: string
 *           format: date-time
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [error]
 *         message:
 *           type: string
 *         error:
 *           type: string
 *           nullable: true
 */

// ====================================================================
// Rate Limiting API Endpoints
// ====================================================================

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Get overall rate limit metrics
 *     tags: [Rate Limit Monitoring]
 *     description: Retrieves aggregated rate limit metrics across all merchants or users.
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [minute, hour, day]
 *           default: hour
 *         description: The time frame for which to retrieve metrics.
 *     responses:
 *       200:
 *         description: Successfully retrieved rate limit metrics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/RateLimitMetrics'
 *       401:
 *         description: Unauthorized - Authentication token missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
rateLimitRouter.get("/metrics", authMiddleware, rateLimitController.getMetrics);

/**
 * @swagger
 * /metrics/merchant/{merchantId}:
 *   get:
 *     summary: Get rate limit metrics for a specific merchant
 *     tags: [Rate Limit Monitoring]
 *     description: Retrieves aggregated rate limit metrics for a given merchant ID.
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the merchant.
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [minute, hour, day]
 *           default: hour
 *         description: The time frame for which to retrieve metrics.
 *     responses:
 *       200:
 *         description: Successfully retrieved merchant-specific rate limit metrics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/RateLimitMetrics'
 *       400:
 *         description: Bad Request - Merchant ID is missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Authentication token missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
rateLimitRouter.get(
  "/metrics/merchant/:merchantId",
  authMiddleware,
  rateLimitController.getMerchantMetrics,
);

/**
 * @swagger
 * /history/user/{userId}:
 *   get:
 *     summary: Get rate limit history for a specific user
 *     tags: [Rate Limit Monitoring]
 *     description: Retrieves a detailed history of rate limit events for a given user ID.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the user.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 100
 *           minimum: 1
 *           maximum: 1000
 *         description: The maximum number of history entries to return.
 *     responses:
 *       200:
 *         description: Successfully retrieved user rate limit history.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     limit:
 *                       type: number
 *                     count:
 *                       type: number
 *                     history:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/RateLimitHistory'
 *       400:
 *         description: Bad Request - User ID or limit is missing/invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Authentication token missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
rateLimitRouter.get(
  "/history/user/:userId",
  authMiddleware,
  rateLimitController.getUserHistory,
);

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Get real-time rate limit status
 *     tags: [Rate Limit Monitoring]
 *     description: Retrieves real-time statistics on active, throttled, and burst requests.
 *     responses:
 *       200:
 *         description: Successfully retrieved real-time status.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/RealTimeStatus'
 *       401:
 *         description: Unauthorized - Authentication token missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
rateLimitRouter.get(
  "/status",
  authMiddleware,
  rateLimitController.getRealTimeStatus,
);

/**
 * @swagger
 * /config/merchant/{merchantId}:
 *   get:
 *     summary: Get all rate limit configurations for a merchant
 *     tags: [Rate Limit Configuration]
 *     description: Retrieves all dynamic rate limit configurations associated with a specific merchant ID. Requires ADMIN role.
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the merchant.
 *     responses:
 *       200:
 *         description: Successfully retrieved merchant configurations.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     merchantId:
 *                       type: string
 *                     count:
 *                       type: number
 *                     configs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/RateLimitConfig'
 *       400:
 *         description: Bad Request - Merchant ID is missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Authentication token missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User does not have ADMIN role.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
rateLimitRouter.get(
  "/config/merchant/:merchantId",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  rateLimitController.getMerchantConfigs,
);

/**
 * @swagger
 * /config:
 *   post:
 *     summary: Create a new rate limit configuration
 *     tags: [Rate Limit Configuration]
 *     description: Creates a new dynamic rate limit configuration for a merchant. Requires ADMIN role.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RateLimitConfig'
 *           example:
 *             merchantId: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *             businessType: "standard"
 *             requestsPerSecond: 10
 *             requestsPerMinute: 500
 *             requestsPerHour: 20000
 *             requestsPerDay: 100000
 *             burstMultiplier: 1.2
 *             burstDurationSeconds: 300
 *     responses:
 *       201:
 *         description: Rate limit configuration created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Rate limit configuration created successfully
 *                 data:
 *                   $ref: '#/components/schemas/RateLimitConfig'
 *       400:
 *         description: Bad Request - Missing required fields or invalid data.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Authentication token missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User does not have ADMIN role.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
rateLimitRouter.post(
  "/config",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  rateLimitController.createConfig,
);

/**
 * @swagger
 * /config/{configId}:
 *   put:
 *     summary: Update an existing rate limit configuration
 *     tags: [Rate Limit Configuration]
 *     description: Updates a dynamic rate limit configuration by its ID. Requires ADMIN role.
 *     parameters:
 *       - in: path
 *         name: configId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the rate limit configuration to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RateLimitConfig'
 *           example:
 *             requestsPerMinute: 600
 *             burstMultiplier: 1.3
 *     responses:
 *       200:
 *         description: Rate limit configuration updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Rate limit configuration updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/RateLimitConfig'
 *       400:
 *         description: Bad Request - No updates provided or invalid data.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Authentication token missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User does not have ADMIN role.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not Found - Rate limit configuration not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
rateLimitRouter.put(
  "/config/:configId",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  rateLimitController.updateConfig,
);

/**
 * @swagger
 * /config/{configId}:
 *   delete:
 *     summary: Delete a rate limit configuration
 *     tags: [Rate Limit Configuration]
 *     description: Deletes a dynamic rate limit configuration by its ID. Requires ADMIN role.
 *     parameters:
 *       - in: path
 *         name: configId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the rate limit configuration to delete.
 *     responses:
 *       200:
 *         description: Rate limit configuration deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Rate limit configuration deleted successfully
 *       400:
 *         description: Bad Request - Configuration ID is missing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Authentication token missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User does not have ADMIN role.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not Found - Rate limit configuration not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
rateLimitRouter.delete(
  "/config/:configId",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  rateLimitController.deleteConfig,
);

/**
 * @swagger
 * /whitelist:
 *   get:
 *     summary: Get all whitelisted entries
 *     tags: [Rate Limit Whitelist]
 *     description: Retrieves all entries in the rate limit whitelist. Can filter by type. Requires ADMIN role.
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [IP, USER, MERCHANT]
 *         description: Optional filter to retrieve entries of a specific type.
 *     responses:
 *       200:
 *         description: Successfully retrieved whitelist entries.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [IP, USER, MERCHANT, all]
 *                     count:
 *                       type: number
 *                     entries:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/WhitelistEntry'
 *       401:
 *         description: Unauthorized - Authentication token missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User does not have ADMIN role.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Add an entry to the whitelist
 *     tags: [Rate Limit Whitelist]
 *     description: Adds a new IP, User, or Merchant ID to the rate limit whitelist. Requires ADMIN role.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - value
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [IP, USER, MERCHANT]
 *                 description: The type of entity to whitelist.
 *               value:
 *                 type: string
 *                 description: The value of the entity (e.g., "192.168.1.1", "user123", "merchantABC").
 *               reason:
 *                 type: string
 *                 nullable: true
 *                 description: Optional reason for whitelisting.
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: Optional expiration date for the whitelist entry.
 *           example:
 *             type: "IP"
 *             value: "203.0.113.45"
 *             reason: "Internal testing server"
 *             expiresAt: "2025-12-31T23:59:59Z"
 *     responses:
 *       201:
 *         description: Entry added to whitelist successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Entry added to whitelist successfully
 *                 data:
 *                   $ref: '#/components/schemas/WhitelistEntry'
 *       400:
 *         description: Bad Request - Missing required fields or invalid type/value.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Authentication token missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User does not have ADMIN role.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
rateLimitRouter.get(
  "/whitelist",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  rateLimitController.getWhitelist,
);
rateLimitRouter.post(
  "/whitelist",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  rateLimitController.addToWhitelist,
);

/**
 * @swagger
 * /whitelist/{id}:
 *   delete:
 *     summary: Remove an entry from the whitelist
 *     tags: [Rate Limit Whitelist]
 *     description: Removes a whitelist entry by its ID. Requires ADMIN role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the whitelist entry to remove.
 *     responses:
 *       200:
 *         description: Removed from whitelist successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Removed from whitelist successfully
 *       400:
 *         description: Bad Request - Whitelist entry ID is missing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Authentication token missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User does not have ADMIN role.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not Found - Whitelist entry not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
rateLimitRouter.delete(
  "/whitelist/:id",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  rateLimitController.removeFromWhitelist,
);

/**
 * @swagger
 * /blacklist:
 *   get:
 *     summary: Get all blacklisted entries
 *     tags: [Rate Limit Blacklist]
 *     description: Retrieves all entries in the rate limit blacklist. Can filter by type. Requires ADMIN role.
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [IP, USER, MERCHANT]
 *         description: Optional filter to retrieve entries of a specific type.
 *     responses:
 *       200:
 *         description: Successfully retrieved blacklist entries.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [IP, USER, MERCHANT, all]
 *                     count:
 *                       type: number
 *                     entries:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BlacklistEntry'
 *       401:
 *         description: Unauthorized - Authentication token missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User does not have ADMIN role.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Add an entry to the blacklist
 *     tags: [Rate Limit Blacklist]
 *     description: Adds a new IP, User, or Merchant ID to the rate limit blacklist. Requires ADMIN role.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - value
 *               - reason
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [IP, USER, MERCHANT]
 *                 description: The type of entity to blacklist.
 *               value:
 *                 type: string
 *                 description: The value of the entity (e.g., "192.168.1.1", "user123", "merchantABC").
 *               reason:
 *                 type: string
 *                 enum: [ABUSE, FRAUD, MANUAL, OTHER]
 *                 description: The reason for blacklisting.
 *               details:
 *                 type: string
 *                 nullable: true
 *                 description: Optional additional details about the blacklist reason.
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: Optional expiration date for the blacklist entry.
 *           example:
 *             type: "USER"
 *             value: "user12345"
 *             reason: "ABUSE"
 *             details: "Repeated attempts to bypass rate limits"
 *             expiresAt: "2025-08-01T00:00:00Z"
 *     responses:
 *       201:
 *         description: Entry added to blacklist successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Entry added to blacklist successfully
 *                 data:
 *                   $ref: '#/components/schemas/BlacklistEntry'
 *       400:
 *         description: Bad Request - Missing required fields or invalid type/value/reason.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Authentication token missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User does not have ADMIN role.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
rateLimitRouter.get(
  "/blacklist",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  rateLimitController.getBlacklist,
);
rateLimitRouter.post(
  "/blacklist",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  rateLimitController.addToBlacklist,
);

/**
 * @swagger
 * /blacklist/{id}:
 *   delete:
 *     summary: Remove an entry from the blacklist
 *     tags: [Rate Limit Blacklist]
 *     description: Removes a blacklist entry by its ID. Requires ADMIN role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the blacklist entry to remove.
 *     responses:
 *       200:
 *         description: Removed from blacklist successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Removed from blacklist successfully
 *       400:
 *         description: Bad Request - Blacklist entry ID is missing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Authentication token missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User does not have ADMIN role.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not Found - Blacklist entry not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
rateLimitRouter.delete(
  "/blacklist/:id",
  authMiddleware,
  isUserAuthorized([UserRole.ADMIN]),
  rateLimitController.removeFromBlacklist,
);

export default rateLimitRouter;
