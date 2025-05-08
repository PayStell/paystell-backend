# PayStell Webhook API Reference

This document provides a comprehensive guide to the webhook API endpoints available in the PayStell system.

## Authentication

All webhook API requests (except for receiving webhooks) require authentication using a merchant API token. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_API_TOKEN
```

## Endpoints

### Register a Webhook

Creates a new webhook subscription for your merchant account.

- **URL**: `/api/webhooks/register`
- **Method**: `POST`
- **Auth Required**: Yes

**Request Body**:
```json
{
  "url": "https://your-service.com/webhook-receiver",
  "eventTypes": ["transaction.created", "transaction.updated"],
  "secretKey": "your_secret_key" // Optional, will be generated if not provided
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Webhook registered successfully",
  "data": {
    "id": "webhook-uuid",
    "url": "https://your-service.com/webhook-receiver",
    "eventTypes": ["transaction.created", "transaction.updated"],
    "isActive": true,
    "createdAt": "2023-06-15T12:00:00Z"
  }
}
```

### Update a Webhook

Updates an existing webhook subscription.

- **URL**: `/api/webhooks/register`
- **Method**: `PUT`
- **Auth Required**: Yes

**Request Body**:
```json
{
  "url": "https://your-updated-service.com/webhook-receiver",
  "eventTypes": ["transaction.created"],
  "isActive": false
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Webhook updated successfully",
  "data": {
    "id": "webhook-uuid",
    "url": "https://your-updated-service.com/webhook-receiver",
    "eventTypes": ["transaction.created"],
    "isActive": false,
    "updatedAt": "2023-06-15T14:30:00Z"
  }
}
```

### Get Webhook Details

Retrieves information about your webhook subscription.

- **URL**: `/api/webhooks/register`
- **Method**: `GET`
- **Auth Required**: Yes

**Response**:
```json
{
  "status": "success",
  "data": {
    "id": "webhook-uuid",
    "url": "https://your-service.com/webhook-receiver",
    "eventTypes": ["transaction.created", "transaction.updated"],
    "isActive": true,
    "createdAt": "2023-06-15T12:00:00Z",
    "updatedAt": "2023-06-15T12:00:00Z"
  }
}
```

### Delete a Webhook

Removes your webhook subscription.

- **URL**: `/api/webhooks/register`
- **Method**: `DELETE`
- **Auth Required**: Yes

**Response**:
```json
{
  "status": "success",
  "message": "Webhook deleted successfully"
}
```

### Generate Webhook Secret

Generates a new secret key for webhook signature verification.

- **URL**: `/api/webhooks/generate-secret`
- **Method**: `POST`
- **Auth Required**: Yes

**Response**:
```json
{
  "status": "success",
  "data": {
    "secret": "generated-secret-key"
  }
}
```

### Test Webhook

Sends a test event to your webhook endpoint.

- **URL**: `/api/webhooks/test`
- **Method**: `POST`
- **Auth Required**: Yes

**Request Body**:
```json
{
  "eventType": "test.event" // Optional, defaults to "test.event"
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Test webhook sent successfully",
  "data": {
    "eventId": "event-uuid"
  }
}
```

### Test Webhook for a Specific ID

Sends a test event to a specific webhook.

- **URL**: `/api/webhooks/:id/test`
- **Method**: `POST`
- **Auth Required**: Yes

**Response**:
```json
{
  "status": "success",
  "message": "Test webhook sent successfully",
  "data": {
    "eventId": "event-uuid"
  }
}
```

### Get Webhook Events

Retrieves webhook delivery events for a specific webhook.

- **URL**: `/api/webhooks/:id/events`
- **Method**: `GET`
- **Auth Required**: Yes

**Response**:
```json
{
  "status": "success",
  "data": {
    "events": [
      {
        "id": "event-uuid",
        "eventType": "transaction.created",
        "status": "delivered",
        "createdAt": "2023-06-15T12:30:00Z",
        "deliveredAt": "2023-06-15T12:30:05Z"
      }
    ]
  }
}
```

### Get Webhook Metrics

Retrieves metrics about webhook deliveries.

- **URL**: `/api/webhooks/metrics`
- **Method**: `GET`
- **Auth Required**: Yes

**Response**:
```json
{
  "status": "success",
  "data": {
    "total": 150,
    "delivered": 145,
    "failed": 5,
    "pending": 0,
    "deliveryRate": 96.67
  }
}
```

### Retry a Failed Webhook

Retries delivery of a failed webhook event.

- **URL**: `/api/webhooks/events/:eventId/retry`
- **Method**: `POST`
- **Auth Required**: Yes

**Response**:
```json
{
  "status": "success",
  "message": "Webhook queued for retry",
  "data": {
    "jobId": "job-id",
    "status": "pending"
  }
}
```

## Error Handling

All API endpoints follow a standard error response format:

```json
{
  "status": "error",
  "message": "Error description"
}
```

Common HTTP status codes:
- 400: Bad Request - invalid input
- 401: Unauthorized - invalid or missing API token
- 404: Not Found - resource doesn't exist
- 429: Too Many Requests - rate limit exceeded
- 500: Server Error - something went wrong on our end

## Rate Limiting

Webhook API requests are rate-limited to protect our systems. Current limits are:
- 100 requests per minute per merchant
- 1000 requests per hour per merchant

## Support

If you encounter any issues with the webhook API, please contact our support team at support@paystell.com. 