import { Request, Response, NextFunction } from "express";
import { metricsService } from "../services/MetricsService";

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime();
  res.on("finish", () => {
    try {
      metricsService.observeRequest(req, res, start);
    } catch (err) {
      // avoid breaking the request
    }
  });
  next();
}

// Optional periodic collector to be scheduled externally if needed
export async function collectPeriodicMetrics() {
  try {
    await metricsService.collectSystemResources();
    await metricsService.checkExternalStatus();
  } catch (err) {
    // swallow errors
  }
}