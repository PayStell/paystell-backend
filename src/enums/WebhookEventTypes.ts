export enum WebhookEventType {
  PAYMENT_SUCCEEDED = "payment.succeeded",
  PAYMENT_FAILED = "payment.failed",
  PAYMENT_REFUNDED = "payment.refunded",
  PAYMENT_PENDING = "payment.pending",
  ACCOUNT_CREATED = "account.created",
  ACCOUNT_UPDATED = "account.updated",
  TEST_WEBHOOK = "test.webhook",
  WILDCARD = "*",
  // More events can be added as needed
} 