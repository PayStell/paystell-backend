import type { Request, Response, NextFunction } from "express";
import { logError } from "../utils/logger";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Set default status code if not provided
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  // Log the error with request context
  logError(err, req, {
    statusCode,
    isOperational,
  });

  // Send appropriate response to client
  res.status(statusCode).json({
    status: "error",
    message:
      statusCode === 500 && process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

// Helper function to create operational errors
export const createError = (message: string, statusCode = 400): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};
