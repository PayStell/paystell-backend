import { Router } from "express";
import AppDataSource from "../config/db";
import { redisClient } from "../config/redisConfig";
import stellarConfig from "../config/stellarConfig";
import os from "os";
import process from "process";

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
    latencyMs: 0,
  };

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const start = Date.now();
    await AppDataSource.query("SELECT 1");
    healthcheck.latencyMs = Date.now() - start;
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
      redis: "OK",
      database: "OK",
    },
    details: {
      stellarLatencyMs: 0,
      redisLatencyMs: 0,
      dbLatencyMs: 0,
    },
    timestamp: Date.now(),
  };

  try {
    // Stellar
    const stellarStart = Date.now();
    const stellarResponse = await fetch(stellarConfig.STELLAR_HORIZON_URL);
    healthcheck.details.stellarLatencyMs = Date.now() - stellarStart;
    if (!stellarResponse.ok) {
      throw new Error(`Stellar API returned ${stellarResponse.status}`);
    }

    // Redis
    const redisStart = Date.now();
    const pingResult = await redisClient.ping();
    healthcheck.details.redisLatencyMs = Date.now() - redisStart;
    if (pingResult !== "PONG") {
      throw new Error("Redis ping failed");
    }

    // Database
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    const dbStart = Date.now();
    await AppDataSource.query("SELECT 1");
    healthcheck.details.dbLatencyMs = Date.now() - dbStart;

    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message =
      error instanceof Error ? error.message : "Dependencies check failed";
    // Mark failing dependency
    const msg = (error as Error)?.message || "";
    if (msg.includes("Stellar")) healthcheck.dependencies.stellar = "FAIL";
    if (msg.includes("Redis")) healthcheck.dependencies.redis = "FAIL";
    if (msg.toLowerCase().includes("db") || msg.toLowerCase().includes("query"))
      healthcheck.dependencies.database = "FAIL";
    res.status(503).json(healthcheck);
  }
});

// System resource usage health
router.get("/system", async (_req, res) => {
  try {
    const memory = process.memoryUsage();
    const uptimeSec = process.uptime();
    const cpuUsage = process.cpuUsage();
    const cores = os.cpus().length || 1;
    const cpuPercent =
      ((cpuUsage.user + cpuUsage.system) / 1000 /* to ms */) /
      (uptimeSec * 1000 * cores);

    res.status(200).json({
      message: "OK",
      timestamp: Date.now(),
      resources: {
        cpuPercent: Number((cpuPercent * 100).toFixed(2)),
        memory: {
          rss: memory.rss,
          heapTotal: memory.heapTotal,
          heapUsed: memory.heapUsed,
          external: memory.external,
        },
        loadAvg: os.loadavg(),
        uptimeSec,
      },
    });
  } catch (error) {
    res.status(503).json({
      message:
        error instanceof Error ? error.message : "Failed to get system metrics",
      timestamp: Date.now(),
    });
  }
});

export default router;
