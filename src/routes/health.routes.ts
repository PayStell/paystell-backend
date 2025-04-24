import { Router } from "express";
import AppDataSource from "../config/db";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

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
