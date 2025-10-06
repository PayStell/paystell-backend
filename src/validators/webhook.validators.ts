import { z } from "zod";
import { WebhookPayload } from "../interfaces/webhook.interfaces";

export const webhookUrlSchema = z.object({
  url: z
    .string()
    .url()
    .startsWith("https://", { message: "Webhook URL must use HTTPS" }),
});

export const validateWebhookUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Zod schema for validating and normalizing WebhookPayload
export const webhookPayloadSchema = z.object({
  transactionId: z.string().min(1, "transactionId is required"),
  transactionType: z.string().optional(),
  status: z.string().min(1, "status is required"),
  amount: z.string().optional(),
  asset: z.string().optional(),
  merchantId: z.string().min(1, "merchantId is required"),
  timestamp: z.string().datetime("timestamp must be a valid ISO 8601 datetime"),
  nonce: z.string().optional(),
  paymentMethod: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  eventType: z.string().min(1, "eventType is required"),
  reqMethod: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"], {
    errorMap: () => ({
      message: "reqMethod must be one of: GET, POST, PUT, PATCH, DELETE",
    }),
  }),
});

/**
 * Validates and normalizes an unknown payload into a WebhookPayload
 * @param rawPayload - The raw request body to validate
 * @returns A validated and normalized WebhookPayload
 * @throws ZodError if validation fails
 */
export function validateAndNormalizeWebhookPayload(
  rawPayload: unknown
): WebhookPayload {
  // Parse and validate the payload using Zod
  const validatedPayload = webhookPayloadSchema.parse(rawPayload);

  // Return as a properly typed WebhookPayload
  return validatedPayload as WebhookPayload;
}
