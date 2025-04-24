import { Request, Response, NextFunction } from "express";

interface ValidationRule {
  type: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}

interface ValidationSchema {
  [key: string]: ValidationRule;
}

export const validateRequest = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    Object.entries(schema).forEach(([field, rules]) => {
      const value = req.body[field];

      if (
        rules.required &&
        (value === undefined || value === null || value === "")
      ) {
        errors.push(`${field} is required`);
        return;
      }

      if (value !== undefined && value !== null) {
        if (typeof value !== rules.type) {
          errors.push(`${field} must be a ${rules.type}`);
        }

        if (rules.type === "string") {
          if (rules.minLength && value.length < rules.minLength) {
            errors.push(
              `${field} must be at least ${rules.minLength} characters`,
            );
          }
          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(
              `${field} must not exceed ${rules.maxLength} characters`,
            );
          }
          if (rules.pattern && !rules.pattern.test(value)) {
            errors.push(`${field} format is invalid`);
          }
        }
      }
    });

    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    next();
  };
};
