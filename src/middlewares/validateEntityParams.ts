import { Request, Response, NextFunction } from "express";
import { validate as isUUID } from "uuid";

// Import entity classes to ensure type safety and prevent drift
import { User } from "../entities/User";
import { PaymentLink } from "../entities/PaymentLink";
import { Payment } from "../entities/Payment";
import { Transaction } from "../entities/Transaction";
import { MerchantEntity } from "../entities/Merchant.entity";
import { Session } from "../entities/Session";
import { WalletVerification } from "../entities/WalletVerification";
import { TwoFactorAuth } from "../entities/TwoFactorAuth";
import { InAppNotificationEntity } from "../entities/InAppNotification.entity";
import { MerchantWebhookEntity } from "../entities/MerchantWebhook.entity";
import { MerchantWebhookEventEntity } from "../entities/MerchantWebhookEvent.entity";
import { RateLimitEvent } from "../entities/RateLimitEvent";
import { EmailVerification } from "../entities/emailVerification";

// Create a mapping of entity names to their classes for type safety
const ENTITY_CLASS_MAP = {
  User,
  PaymentLink,
  Payment,
  Transaction,
  MerchantEntity,
  Session,
  WalletVerification,
  TwoFactorAuth,
  InAppNotificationEntity,
  MerchantWebhookEntity,
  MerchantWebhookEventEntity,
  RateLimitEvent,
  EmailVerification,
} as const;

// Extract allowed entity types from the class map
const ALLOWED_ENTITY_TYPES = Object.keys(ENTITY_CLASS_MAP) as Array<
  keyof typeof ENTITY_CLASS_MAP
>;

export const validateEntityParams = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { entityType, entityId } = req.params;

  // Validate entityType
  if (
    !entityType ||
    !ALLOWED_ENTITY_TYPES.includes(entityType as keyof typeof ENTITY_CLASS_MAP)
  ) {
    res.status(400).json({
      status: "error",
      message: `Invalid entity type. Allowed types: ${ALLOWED_ENTITY_TYPES.join(", ")}`,
    });
    return;
  }

  // Validate entityId format (assuming UUID)
  if (!entityId || !isUUID(entityId)) {
    res.status(400).json({
      status: "error",
      message: "Invalid entity ID format. Must be a valid UUID.",
    });
    return;
  }

  next();
};

// Export the entity class map for use in other parts of the application
export { ENTITY_CLASS_MAP };
