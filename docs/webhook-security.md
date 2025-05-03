# Webhook Security Best Practices

Webhooks are a powerful way to integrate with the PayStell platform, but they also present unique security challenges. This document outlines best practices for securing your webhook implementation.

## Verifying Webhook Signatures

All webhook requests from PayStell include a signature header that allows you to verify the authenticity of the webhook payload.

### How to Verify Signatures

1. Extract the signature and timestamp from the `PayStell-Signature` header
2. Verify that the webhook was sent within a reasonable timeframe
3. Compute the expected signature using your webhook secret and the raw request body
4. Compare the expected signature with the received signature

Here's a code example in Node.js:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, header, secret) {
  // Extract timestamp and signature from header
  const [timestampHeader, signatureHeader] = header.split(',');
  const timestamp = timestampHeader.split('=')[1];
  const signature = signatureHeader.split('=')[1];
  
  // Check timestamp is recent (within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (now - parseInt(timestamp) > 300) {
    throw new Error('Webhook timestamp is too old');
  }
  
  // Compute expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  // Ensure signatures are the same length for timingSafeEqual
  if (signature.length !== expectedSignature.length) {
    throw new Error('Webhook signature verification failed');
  }
  
  // Compare signatures using constant-time comparison
  const valid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
  
  if (!valid) {
    throw new Error('Webhook signature verification failed');
  }
  
  return true;
}

// Usage in an Express.js server
app.post('/webhook-endpoint', (req, res) => {
  const payload = req.rawBody; // You need to configure Express to preserve the raw body
  const signature = req.headers['paystell-signature'];
  const secret = 'your_webhook_secret';
  
  try {
    verifyWebhookSignature(payload, signature, secret);
    // Process the webhook
    res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Webhook verification failed:', error.message);
    res.status(401).send('Invalid signature');
  }
});
```

## Other Security Best Practices

### 1. Use HTTPS for Your Webhook Endpoint

Always use HTTPS for your webhook receiver endpoint to ensure payloads are encrypted in transit.

### 2. Implement Proper Error Handling

When processing webhooks, implement robust error handling to prevent exploitation of error messages.

```javascript
try {
  // Process webhook payload
} catch (error) {
  // Log error details internally
  console.error('Webhook processing error:', error);
  
  // Return a generic error message to the client
  return res.status(500).json({ error: 'An error occurred processing the webhook' });
}
```

### 3. Implement Idempotency

Webhooks may occasionally be delivered more than once. Implement idempotency by checking the event ID to ensure you don't process the same event multiple times.

```javascript
async function processWebhook(eventPayload) {
  const eventId = eventPayload.id;
  
  // Check if this event has already been processed
  const exists = await db.events.findOne({ eventId });
  if (exists) {
    console.log(`Event ${eventId} already processed, skipping`);
    return;
  }
  
  // Process the event
  await processEvent(eventPayload);
  
  // Record that this event has been processed
  await db.events.insert({ eventId, processedAt: new Date() });
}
```

### 4. Use a Dedicated URL for Each Integration

When creating multiple webhook subscriptions, use a different URL for each one. This allows you to:

- Identify which integration a webhook is coming from
- Revoke one integration without affecting others
- Implement separate logic for different integrations

### 5. Implement Rate Limiting

Protect your webhook endpoint with rate limiting to prevent denial-of-service attacks.

### 6. Rotate Webhook Secrets

Periodically rotate your webhook secrets to reduce the risk of them being compromised.

1. Generate a new secret using the `/api/webhooks/generate-secret` endpoint
2. Update your webhook subscription with the new secret
3. Update your webhook receiver to validate using the new secret
4. Verify a test webhook succeeds with the new secret

### 7. Keep Webhook Processing Code Secure

Sanitize incoming data and validate it against expected schemas before processing:

```javascript
const Joi = require('joi');

// Define schema for transaction.created event
const transactionCreatedSchema = Joi.object({
  id: Joi.string().required(),
  event: Joi.string().valid('transaction.created').required(),
  timestamp: Joi.string().isoDate().required(),
  data: Joi.object({
    transactionId: Joi.string().required(),
    amount: Joi.number().positive().required(),
    currency: Joi.string().length(3).required(),
    status: Joi.string().required(),
    merchantId: Joi.string().required(),
    createdAt: Joi.string().isoDate().required()
  }).required()
});

// Validate incoming webhook against schema
const { error, value } = transactionCreatedSchema.validate(webhookPayload);
if (error) {
  console.error('Invalid webhook payload:', error.message);
  return res.status(400).send('Invalid webhook payload');
}

// Process validated webhook
processWebhook(value);
```

### 8. Respond Promptly to Webhook Requests

Always respond to webhook requests with a 2xx status code as quickly as possible, even if you'll process the webhook asynchronously. This prevents unnecessary retries.

```javascript
app.post('/webhook-endpoint', (req, res) => {
  // Verify signature
  
  // Send immediate response
  res.status(200).send('Webhook received');
  
  // Process webhook asynchronously
  setImmediate(() => {
    processWebhook(req.body)
      .catch(error => console.error('Error processing webhook:', error));
  });
});
```

## Handling Failed Webhook Deliveries

PayStell automatically retries failed webhook deliveries with an exponential backoff strategy. You can also manually retry failed webhooks through the dashboard or via the API.

## Security Checklist

- [ ] Use HTTPS for your webhook endpoint
- [ ] Verify webhook signatures
- [ ] Store your webhook secret securely
- [ ] Implement idempotency to handle duplicate events
- [ ] Add timeouts for webhook processing
- [ ] Sanitize and validate incoming webhook data
- [ ] Respond quickly to webhook requests
- [ ] Implement proper error handling
- [ ] Monitor webhook processing for errors
- [ ] Use a dedicated URL for each integration
- [ ] Implement rate limiting for your webhook endpoint

## Need Help?

If you have any questions about webhook security or need assistance implementing secure webhook handling, please contact our support team at support@paystell.com. 