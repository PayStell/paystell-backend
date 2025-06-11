import { Request, Response, NextFunction } from "express";
import { validationResult, FieldValidationError } from "express-validator";
import logger from "../utils/logger";

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field:
        error.type === "field"
          ? (error as FieldValidationError).path
          : "unknown",
      message: error.msg,
      value:
        error.type === "field"
          ? (error as FieldValidationError).value
          : undefined,
    }));

    logger.warn("Validation errors:", {
      url: req.originalUrl,
      method: req.method,
      errors: errorMessages,
      body: req.body,
      params: req.params,
    });

    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errorMessages,
    });
    return;
  }

  next();
};
