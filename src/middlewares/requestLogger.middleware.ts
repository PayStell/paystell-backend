import { Request, Response, NextFunction } from "express";
import { logHttp } from "../utils/logger";
import { v4 as uuidv4 } from "uuid";

/**
 * Middleware to log all incoming HTTP requests
 * Adds a unique request ID to each request for tracking
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Add request ID if not already present
  if (!req.headers["x-request-id"]) {
    const requestId = uuidv4();
    req.headers["x-request-id"] = requestId;
    res.setHeader("x-request-id", requestId);
  }

  // Record start time
  const startTime = Date.now();

  // Log response when finished (only log once when the response is complete)
  res.on("finish", () => {
    const responseTime = Date.now() - startTime;
    logHttp(req, responseTime, res.statusCode);
  });

  next();
};
