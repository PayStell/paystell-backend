import { Router } from "express";
import AppDataSource from "../config/db";

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Basic health check endpoint to verify the server is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 message:
 *                   type: string
 *                   example: "Server is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Current server timestamp
 *               required:
 *                 - status
 *                 - message
 *                 - timestamp
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /health/db:
 *   get:
 *     summary: Database health check
 *     description: Checks the database connection and returns the status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Database is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "OK"
 *                 timestamp:
 *                   type: integer
 *                   description: Unix timestamp
 *               required:
 *                 - message
 *                 - timestamp
 *       503:
 *         description: Database connection failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message describing the database issue
 *                 timestamp:
 *                   type: integer
 *                   description: Unix timestamp
 *               required:
 *                 - message
 *                 - timestamp
 */
router.get("/db", async (_req, res) => {
  const healthcheck = {
    message: "OK",
    timestamp: Date.now(),
  };

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await AppDataSource.query("SELECT 1");
    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message =
      error instanceof Error ? error.message : "Database connection failed";
    res.status(503).json(healthcheck);
  }
});

/**
 * @swagger
 * /health/dependencies:
 *   get:
 *     summary: External dependencies health check
 *     description: Checks the health of external dependencies like Stellar network
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: All dependencies are healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "OK"
 *                 dependencies:
 *                   type: object
 *                   properties:
 *                     stellar:
 *                       type: string
 *                       example: "OK"
 *                   description: Status of external dependencies
 *                 timestamp:
 *                   type: integer
 *                   description: Unix timestamp
 *               required:
 *                 - message
 *                 - dependencies
 *                 - timestamp
 *       503:
 *         description: One or more dependencies are unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message describing the dependency issue
 *                 dependencies:
 *                   type: object
 *                   properties:
 *                     stellar:
 *                       type: string
 *                       example: "FAIL"
 *                   description: Status of external dependencies
 *                 timestamp:
 *                   type: integer
 *                   description: Unix timestamp
 *               required:
 *                 - message
 *                 - dependencies
 *                 - timestamp
 */
router.get("/dependencies", async (_req, res) => {
  const healthcheck = {
    message: "OK",
    dependencies: {
      stellar: "OK",
    },
    timestamp: Date.now(),
  };

  try {
    const stellarResponse = await fetch("https://horizon-testnet.stellar.org/");

    if (!stellarResponse.ok) {
      throw new Error(`Stellar API returned ${stellarResponse.status}`);
    }
    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message =
      error instanceof Error ? error.message : "Dependencies check failed";
    healthcheck.dependencies.stellar = "FAIL";
    res.status(503).json(healthcheck);
  }
});

export default router;
