# PayStell Webhook Integration

## Overview

This module implements webhook support for the PayStell platform, allowing merchants to receive real-time notifications about payment events, account changes, and other important activities.

## Features

- **Webhook Subscriptions**: Register, update, list, and delete webhook endpoints
- **Event Types**: Support for various event types (payments, accounts, etc.)
- **Secure Delivery**: HMAC-based signature verification for webhook payloads
- **Retry Logic**: Exponential backoff for failed webhook deliveries
- **Event Logging**: Comprehensive logging of all webhook activity
- **Rate Limiting**: Protection against abuse through rate limiting
- **Testing**: Test endpoints for validating webhook integrations

## Implementation Details

### Database Schema

We use TypeORM with PostgreSQL to store webhook-related data:

- `merchant_webhooks`: Stores webhook subscriptions
- `merchant_webhook_events`: Tracks webhook delivery attempts and results

### API Endpoints

The following endpoints are available:

- `POST /api/webhooks`: Register a new webhook
- `GET /api/webhooks`: List registered webhooks
- `PUT /api/webhooks`: Update webhook configuration
- `DELETE /api/webhooks`: Delete a webhook
- `GET /api/webhook-events`: List available webhook event types
- `POST /api/webhooks/test`: Send a test webhook

### Security Implementation

- Webhook signatures are generated using HMAC-SHA256
- Signatures include timestamps to prevent replay attacks
- Constant-time comparison is used to verify signatures

### Retry Mechanism

Failed webhook deliveries are automatically retried using the following schedule:

1. 5 seconds after the initial failure
2. 10 seconds after the first retry
3. 20 seconds after the second retry
4. 40 seconds after the third retry
5. 80 seconds after the fourth retry

After 5 failed attempts, the webhook is marked as failed and no further attempts are made.

## Usage

### Registering a Webhook

```typescript
// Example API call to register a webhook
const response = await fetch('/api/webhooks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    url: 'https://example.com/webhooks/paystell',
    secretKey: 'optional-secret-or-generated-automatically',
    eventTypes: ['payment.succeeded', 'payment.failed'],
    maxRetries: 5,
    initialRetryDelay: 5000,
    maxRetryDelay: 3600000
  })
});
```

### Validating Webhook Signatures

Consumers of webhooks should validate the signature to ensure authenticity:

```typescript
import crypto from 'crypto';

function verifySignature(payload: any, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const calculated = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(calculated, 'hex'),
    Buffer.from(signature, 'hex')
  );
}
```

## Development

### Running Migrations

To update the database schema:

```bash
npm run typeorm migration:run
```

### Running Tests

```bash
npm run test:webhooks
```

## Documentation

For more detailed documentation:

- [API Reference](./webhooks.md): Comprehensive guide to the webhook API
- [Webhook Events](./webhook-events.md): List of all available webhook events
- [Security](./webhook-security.md): Security best practices for webhooks

## Future Improvements

- Add support for webhook batching
- Implement webhook replay functionality
- Add webhook analytics dashboard
- Support for webhook filtering by additional criteria 