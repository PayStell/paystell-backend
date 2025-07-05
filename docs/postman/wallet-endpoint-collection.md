# Wallet API Endpoints Documentation

This document describes the API endpoints for managing cryptocurrency wallets and blockchain transactions on the Stellar network.

## Base URL

All endpoints are relative to the base URL: `https://api.paystell.com`

## Authentication

All endpoints require JWT Bearer token authentication.
Include the JWT token in the request headers:

```plaintext
Authorization: Bearer your_jwt_token_here
```

## Endpoints

### Get or Create Wallet

Retrieves the user's wallet or creates one if it doesn't exist.

- **URL**: `/api/wallet`
- **Method**: `GET`
- **Authentication**: Required


**Example Request**:

```plaintext
GET /api/wallet
```

**Example Response**:

```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "ACTIVE",
    "publicKey": "GCKFBEIYTKP6RCZX6CFEHKBL5GGWYCZKFHKBGP3UFVQRLNW7MXRI3RGU",
    "isVerified": true,
    "settings": {
      "notifications": true
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Get Wallet Address

Returns the wallet's public address for receiving payments.

- **URL**: `/api/wallet/address`
- **Method**: `GET`
- **Authentication**: Required


**Example Request**:

```plaintext
GET /api/wallet/address
```

**Example Response**:

```json
{
  "data": {
    "address": "GCKFBEIYTKP6RCZX6CFEHKBL5GGWYCZKFHKBGP3UFVQRLNW7MXRI3RGU"
  }
}
```

### Get Wallet Balance

Retrieves all asset balances for the user's wallet.

- **URL**: `/api/wallet/balance`
- **Method**: `GET`
- **Authentication**: Required


**Example Request**:

```plaintext
GET /api/wallet/balance
```

**Example Response**:

```json
{
  "data": [
    {
      "assetCode": "XLM",
      "assetIssuer": null,
      "balance": "100.5000000",
      "assetType": "native",
      "isAuthorized": true
    },
    {
      "assetCode": "USDC",
      "assetIssuer": "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      "balance": "50.0000000",
      "assetType": "credit_alphanum4",
      "isAuthorized": true
    }
  ]
}
```

### Get Wallet Info

Returns detailed wallet information from the Stellar network.

- **URL**: `/api/wallet/info`
- **Method**: `GET`
- **Authentication**: Required


**Example Request**:

```plaintext
GET /api/wallet/info
```

**Example Response**:

```json
{
  "data": {
    "accountId": "GCKFBEIYTKP6RCZX6CFEHKBL5GGWYCZKFHKBGP3UFVQRLNW7MXRI3RGU",
    "sequence": "123456789012345678",
    "balances": [...],
    "exists": true,
    "publicKey": "GCKFBEIYTKP6RCZX6CFEHKBL5GGWYCZKFHKBGP3UFVQRLNW7MXRI3RGU"
  }
}
```

### Get Transaction History

Retrieves paginated transaction history for the user's wallet.

- **URL**: `/api/wallet/transactions`
- **Method**: `GET`
- **Authentication**: Required
- **Parameters**:

- `page` (optional): Page number (default: 1, min: 1)
- `limit` (optional): Items per page (default: 20, min: 1, max: 100)
- `sort` (optional): Sort order - "asc" or "desc" (default: "desc")





**Example Request**:

```plaintext
GET /api/wallet/transactions?page=1&limit=20&sort=desc
```

**Example Response**:

```json
{
  "data": {
    "transactions": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "hash": "stellar_transaction_hash",
        "type": "PAYMENT",
        "status": "success",
        "amount": 10.50,
        "assetCode": "XLM",
        "memo": "Payment memo",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2
    }
  }
}
```

### Get Single Transaction

Returns details of a specific transaction.

- **URL**: `/api/wallet/transactions/:id`
- **Method**: `GET`
- **Authentication**: Required
- **URL Parameters**:

- `id`: Transaction UUID





**Example Request**:

```plaintext
GET /api/wallet/transactions/123e4567-e89b-12d3-a456-426614174000
```

**Example Response**:

```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "hash": "stellar_transaction_hash",
    "type": "PAYMENT",
    "status": "success",
    "sourceAccount": "GCKFBEIYTKP6RCZX6CFEHKBL5GGWYCZKFHKBGP3UFVQRLNW7MXRI3RGU",
    "destinationAccount": "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
    "amount": 10.50,
    "assetCode": "XLM",
    "fee": "0.0001000",
    "memo": "Payment description",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Send Payment

Sends a payment from the user's wallet to another Stellar address.

- **URL**: `/api/wallet/send`
- **Method**: `POST`
- **Authentication**: Required
- **Request Body**:

- `destinationAddress` (required): Stellar public key (56 characters)
- `amount` (required): Payment amount (decimal with up to 7 decimal places)
- `assetCode` (optional): Asset code (default: "XLM")
- `assetIssuer` (optional): Asset issuer (required for non-native assets)
- `memo` (optional): Payment memo (max 28 characters)





**Example Request**:

```json
{
  "destinationAddress": "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
  "amount": "10.5000000",
  "assetCode": "XLM",
  "memo": "Payment for services"
}
```

**Example Response**:

```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "hash": "stellar_transaction_hash",
    "status": "success",
    "sourceAccount": "GCKFBEIYTKP6RCZX6CFEHKBL5GGWYCZKFHKBGP3UFVQRLNW7MXRI3RGU",
    "destinationAccount": "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
    "amount": 10.50,
    "assetCode": "XLM",
    "fee": "0.0001000",
    "memo": "Payment for services",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Payment sent successfully"
}
```

### Activate Wallet

Activates the user's wallet to enable transaction capabilities.

- **URL**: `/api/wallet/activate`
- **Method**: `POST`
- **Authentication**: Required


**Example Request**:

```plaintext
POST /api/wallet/activate
```

**Example Response**:

```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "ACTIVE",
    "publicKey": "GCKFBEIYTKP6RCZX6CFEHKBL5GGWYCZKFHKBGP3UFVQRLNW7MXRI3RGU",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Wallet activated successfully"
}
```

### Verify Wallet

Verifies the user's wallet for enhanced features.

- **URL**: `/api/wallet/verify`
- **Method**: `POST`
- **Authentication**: Required


**Example Request**:

```plaintext
POST /api/wallet/verify
```

**Example Response**:

```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "isVerified": true,
    "status": "ACTIVE",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Wallet verified successfully"
}
```

### Update Wallet Settings

Updates wallet preferences and notification settings.

- **URL**: `/api/wallet/settings`
- **Method**: `PUT`
- **Authentication**: Required
- **Request Body**: Settings object with preferences


**Example Request**:

```json
{
  "displayPreferences": {
    "currency": "USD",
    "theme": "dark",
    "language": "en"
  },
  "notifications": true,
  "emailNotifications": false
}
```

**Example Response**:

```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "settings": {
      "displayPreferences": {
        "currency": "USD",
        "theme": "dark",
        "language": "en"
      },
      "notifications": true,
      "emailNotifications": false
    },
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Wallet settings updated successfully"
}
```

### Estimate Transaction Fee

Estimates the fee for a transaction based on the number of operations.

- **URL**: `/api/wallet/estimate-fee`
- **Method**: `GET`
- **Authentication**: Required
- **Parameters**:

- `operations` (optional): Number of operations (default: 1, min: 1, max: 100)





**Example Request**:

```plaintext
GET /api/wallet/estimate-fee?operations=1
```

**Example Response**:

```json
{
  "data": {
    "estimatedFee": "0.0001000",
    "operationCount": 1,
    "currency": "XLM"
  }
}
```

### Sync Transactions

Syncs transactions from the Stellar blockchain to the local database.

- **URL**: `/api/wallet/sync`
- **Method**: `POST`
- **Authentication**: Required


**Example Request**:

```plaintext
POST /api/wallet/sync
```

**Example Response**:

```json
{
  "data": null,
  "message": "Transactions synced successfully"
}
```

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Common Error Codes

- `400 Bad Request`: Validation errors, insufficient funds
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: Access denied
- `404 Not Found`: Wallet or transaction not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error


## Rate Limits

- General endpoints: 100 requests per 15 minutes
- Wallet endpoints: 50 requests per 15 minutes


## Environment Variables

Set the following variables in your Postman environment:

- `base_url`: API base URL (e.g., `https://api.paystell.com`)
- `jwt_token`: Your JWT authentication token
- `transaction_id`: Transaction UUID for single transaction requests