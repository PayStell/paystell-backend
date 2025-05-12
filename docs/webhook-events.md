# PayStell Webhook Events

This document provides a complete list of all event types that can be subscribed to via the webhook system. Each event type includes details about when it's triggered and the data payload structure that will be sent to your webhook endpoint.

## Event Types Overview

PayStell webhook events follow a consistent naming pattern: `resource.action`. For example, `transaction.created` indicates a new transaction was created.

## Available Events

### Transaction Events

#### `transaction.created`

Triggered when a new transaction is created in the system.

**Payload Example:**
```json
{
  "id": "evt_123456",
  "event": "transaction.created",
  "timestamp": "2023-06-15T12:00:00Z",
  "data": {
    "transactionId": "txn_abcdef123456",
    "amount": 100.00,
    "currency": "USD",
    "status": "pending",
    "merchantId": "merch_123456",
    "createdAt": "2023-06-15T12:00:00Z"
  }
}
```

#### `transaction.updated`

Triggered when a transaction's status or details are updated.

**Payload Example:**
```json
{
  "id": "evt_123457",
  "event": "transaction.updated",
  "timestamp": "2023-06-15T12:05:00Z",
  "data": {
    "transactionId": "txn_abcdef123456",
    "amount": 100.00,
    "currency": "USD",
    "status": "completed",
    "merchantId": "merch_123456",
    "createdAt": "2023-06-15T12:00:00Z",
    "updatedAt": "2023-06-15T12:05:00Z",
    "previousStatus": "pending"
  }
}
```

#### `transaction.failed`

Triggered when a transaction fails due to any reason.

**Payload Example:**
```json
{
  "id": "evt_123458",
  "event": "transaction.failed",
  "timestamp": "2023-06-15T12:10:00Z",
  "data": {
    "transactionId": "txn_ghijkl789012",
    "amount": 250.00,
    "currency": "USD",
    "status": "failed",
    "merchantId": "merch_123456",
    "createdAt": "2023-06-15T12:08:00Z",
    "failureReason": "insufficient_funds",
    "failureMessage": "The payment was declined due to insufficient funds"
  }
}
```

### Payment Events

#### `payment.succeeded`

Triggered when a payment is successfully processed.

**Payload Example:**
```json
{
  "id": "evt_123459",
  "event": "payment.succeeded",
  "timestamp": "2023-06-15T13:00:00Z",
  "data": {
    "paymentId": "pay_123456",
    "transactionId": "txn_mnopqr456789",
    "amount": 75.50,
    "currency": "USD",
    "paymentMethod": "card",
    "merchantId": "merch_123456",
    "processorResponse": "approved",
    "createdAt": "2023-06-15T13:00:00Z"
  }
}
```

#### `payment.failed`

Triggered when a payment attempt fails.

**Payload Example:**
```json
{
  "id": "evt_123460",
  "event": "payment.failed",
  "timestamp": "2023-06-15T13:05:00Z",
  "data": {
    "paymentId": "pay_654321",
    "transactionId": "txn_stuvwx789012",
    "amount": 129.99,
    "currency": "USD",
    "paymentMethod": "card",
    "merchantId": "merch_123456",
    "processorResponse": "declined",
    "errorCode": "card_declined",
    "errorMessage": "The card was declined",
    "createdAt": "2023-06-15T13:04:30Z"
  }
}
```

#### `payment.refunded`

Triggered when a payment is refunded, either partially or fully.

**Payload Example:**
```json
{
  "id": "evt_123461",
  "event": "payment.refunded",
  "timestamp": "2023-06-15T14:30:00Z",
  "data": {
    "paymentId": "pay_123456",
    "refundId": "ref_123456",
    "transactionId": "txn_mnopqr456789",
    "amount": 75.50,
    "refundAmount": 75.50,
    "currency": "USD",
    "isFullRefund": true,
    "reason": "customer_request",
    "merchantId": "merch_123456",
    "createdAt": "2023-06-15T14:30:00Z"
  }
}
```

### Customer Events

#### `customer.created`

Triggered when a new customer is added to the system.

**Payload Example:**
```json
{
  "id": "evt_123462",
  "event": "customer.created",
  "timestamp": "2023-06-16T09:00:00Z",
  "data": {
    "customerId": "cust_123456",
    "email": "customer@example.com",
    "merchantId": "merch_123456",
    "createdAt": "2023-06-16T09:00:00Z"
  }
}
```

#### `customer.updated`

Triggered when customer information is updated.

**Payload Example:**
```json
{
  "id": "evt_123463",
  "event": "customer.updated",
  "timestamp": "2023-06-16T10:15:00Z",
  "data": {
    "customerId": "cust_123456",
    "email": "newemail@example.com",
    "merchantId": "merch_123456",
    "updatedAt": "2023-06-16T10:15:00Z",
    "updatedFields": ["email", "phone"]
  }
}
```

### Subscription Events

#### `subscription.created`

Triggered when a new subscription is created.

**Payload Example:**
```json
{
  "id": "evt_123464",
  "event": "subscription.created",
  "timestamp": "2023-06-17T11:00:00Z",
  "data": {
    "subscriptionId": "sub_123456",
    "customerId": "cust_123456",
    "planId": "plan_standard",
    "status": "active",
    "amount": 19.99,
    "currency": "USD",
    "interval": "month",
    "startDate": "2023-06-17T11:00:00Z",
    "nextBillingDate": "2023-07-17T11:00:00Z",
    "merchantId": "merch_123456"
  }
}
```

#### `subscription.updated`

Triggered when a subscription is modified.

**Payload Example:**
```json
{
  "id": "evt_123465",
  "event": "subscription.updated",
  "timestamp": "2023-06-18T14:00:00Z",
  "data": {
    "subscriptionId": "sub_123456",
    "customerId": "cust_123456",
    "planId": "plan_premium",
    "status": "active",
    "amount": 29.99,
    "currency": "USD",
    "interval": "month",
    "startDate": "2023-06-17T11:00:00Z",
    "nextBillingDate": "2023-07-17T11:00:00Z",
    "merchantId": "merch_123456",
    "updatedAt": "2023-06-18T14:00:00Z",
    "previousPlanId": "plan_standard"
  }
}
```

#### `subscription.cancelled`

Triggered when a subscription is cancelled.

**Payload Example:**
```json
{
  "id": "evt_123466",
  "event": "subscription.cancelled",
  "timestamp": "2023-06-19T10:30:00Z",
  "data": {
    "subscriptionId": "sub_123456",
    "customerId": "cust_123456",
    "planId": "plan_premium",
    "status": "cancelled",
    "amount": 29.99,
    "currency": "USD",
    "interval": "month",
    "startDate": "2023-06-17T11:00:00Z",
    "cancelledAt": "2023-06-19T10:30:00Z",
    "endDate": "2023-07-17T11:00:00Z",
    "merchantId": "merch_123456",
    "cancelReason": "customer_request"
  }
}
```

### Webhook Events

#### `webhook.failed`

Triggered when a webhook delivery fails after all retries are exhausted.

**Payload Example:**
```json
{
  "id": "evt_123467",
  "event": "webhook.failed",
  "timestamp": "2023-06-20T09:45:00Z",
  "data": {
    "webhookId": "whk_123456",
    "originalEventId": "evt_123460",
    "originalEvent": "payment.failed",
    "attemptsMade": 5,
    "lastAttemptAt": "2023-06-20T09:40:00Z",
    "lastError": "Connection timeout",
    "url": "https://your-service.com/webhook-receiver",
    "merchantId": "merch_123456"
  }
}
```

## Test Events

#### `test.event`

A special event type used for testing webhook integrations.

**Payload Example:**
```json
{
  "id": "evt_test123",
  "event": "test.event",
  "timestamp": "2023-06-21T15:30:00Z",
  "data": {
    "message": "This is a test webhook event",
    "merchantId": "merch_123456"
  }
}
```

## Common Fields in All Events

Every webhook event includes these standard fields:

- `id`: A unique identifier for the event
- `event`: The type of event (from the list above)
- `timestamp`: When the event occurred (ISO 8601 format)
- `data`: Object containing the event-specific data
  - All data objects include the `merchantId` that identifies your account

## Webhook Payload Signature

For security, all webhook payloads are signed. The signature is included in the `PayStell-Signature` header using the following format:

```
PayStell-Signature: t=1623766800,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
```

Where:
- `t` is the timestamp of when the webhook was sent
- `v1` is the signature calculated using HMAC-SHA256 with your webhook secret and the request body

To verify the signature, see the [Webhook Security](./webhook-security.md) documentation. 