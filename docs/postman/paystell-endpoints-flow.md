## 0. Sales Summary Endpoints

These endpoints provide merchants with sales statistics and reporting capabilities. For detailed documentation, see `sales-summary-endpoints.md`. A separate Postman collection has been provided in `sales-summary-collection.json`.

### 0.1. Get Complete Sales Summary
- **Endpoint**: `GET /api/sales-summary`
- **Description**: Retrieves a comprehensive sales summary with all metrics
- **Authentication**: API Key (via X-API-Key header)
- **Parameters**:
  - **Query**:
    - `startDate` (optional): Starting date for the summary period (ISO 8601)
    - `endDate` (optional): Ending date for the summary period (ISO 8601)

### 0.2. Get Total Sales
- **Endpoint**: `GET /api/sales-summary/total`
- **Description**: Retrieves the total sales amount for a merchant
- **Authentication**: API Key (via X-API-Key header)
- **Parameters**:
  - **Query**:
    - `startDate` (optional): Starting date for the summary period (ISO 8601)
    - `endDate` (optional): Ending date for the summary period (ISO 8601)

### 0.3. Get Sales by Time Period
- **Endpoint**: `GET /api/sales-summary/by-period/:timePeriod`
- **Description**: Retrieves sales data broken down by a specific time period
- **Authentication**: API Key (via X-API-Key header)
- **Parameters**:
  - **Path**:
    - `timePeriod`: Time period to group by (daily, weekly, monthly)
  - **Query**:
    - `startDate` (optional): Starting date for the summary period (ISO 8601)
    - `endDate` (optional): Ending date for the summary period (ISO 8601)

### 0.4. Get Top Selling Products
- **Endpoint**: `GET /api/sales-summary/top-products`
- **Description**: Retrieves the top selling products for a merchant
- **Authentication**: API Key (via X-API-Key header)
- **Parameters**:
  - **Query**:
    - `limit` (optional): Maximum number of products to return (default: 5)
    - `startDate` (optional): Starting date for the summary period (ISO 8601)
    - `endDate` (optional): Ending date for the summary period (ISO 8601)

## 1. User Authentication Endpoints

### 1.1. User Registration
- **Endpoint**: `POST /auth/register`
- **Description**: Creates a new user account
- **Parameters**:
  - **Body** (JSON):
    ```json
    {
      "name": "Full Name",
      "email": "user@example.com",
      "password": "password123"
    }
    ```
- **Successful Response** (201 Created):
    ```json
    {
      "id": 1,
      "name": "Full Name",
      "email": "user@example.com",
      "createdAt": "2025-03-12T04:02:01.021Z",
      "updatedAt": "2025-03-12T04:02:01.021Z"
    }
    ```
- **Error Response** (400 Bad Request):
    ```json
    {
      "message": "Email already registered"
    }
    ```

### 1.2. Login
- **Endpoint**: `POST /auth/login`
- **Description**: Authenticates a user and generates JWT tokens
- **Parameters**:
  - **Body** (JSON):
    ```json
    {
      "email": "user@example.com",
      "password": "password123"
    }
    ```
- **Successful Response** (200 OK):
    ```json
    {
      "user": {
        "id": 1,
        "name": "Full Name",
        "email": "user@example.com",
        "createdAt": "2025-03-12T04:02:01.021Z",
        "updatedAt": "2025-03-12T04:02:01.021Z"
      },
      "tokens": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
    ```
- **Error Response** (401 Unauthorized):
    ```json
    {
      "message": "Invalid email or password"
    }
    ```
- **Response if 2FA is enabled** (403 Forbidden):
    ```json
    {
      "message": "2FA is enabled. Please use /login-2fa instead."
    }
    ```

### 1.3. Refresh Token
- **Endpoint**: `POST /auth/refresh-token`
- **Description**: Generates new JWT tokens using a refresh token
- **Parameters**:
  - **Body** (JSON):
    ```json
    {
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
- **Successful Response** (200 OK):
    ```json
    {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
- **Error Response** (401 Unauthorized):
    ```json
    {
      "message": "Invalid refresh token"
    }
    ```

### 1.4. Get Profile
- **Endpoint**: `GET /auth/profile`
- **Description**: Retrieves the current user's profile information
- **Headers**:
  - **Authorization**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Successful Response** (200 OK):
    ```json
    {
      "id": 1,
      "name": "Full Name",
      "email": "user@example.com",
      "createdAt": "2025-03-12T04:02:01.021Z",
      "updatedAt": "2025-03-12T04:02:01.021Z"
    }
    ```
- **Error Response** (401 Unauthorized):
    ```json
    {
      "message": "Unauthorized"
    }
    ```

## 2. System Health Endpoints

### 2.1. General Health Check
- **Endpoint**: `GET /health`
- **Description**: Checks if the API is functioning correctly
- **Successful Response** (200 OK):
    ```json
    {
      "status": "ok",
      "timestamp": "2025-03-12T05:18:38.123Z",
      "version": "1.0.0"
    }
    ```

### 2.2. Database Health Check
- **Endpoint**: `GET /health/db`
- **Description**: Checks the connection to the database
- **Successful Response** (200 OK):
    ```json
    {
      "status": "ok",
      "timestamp": "2025-03-12T05:19:21.921Z",
      "responseTime": 18
    }
    ```
- **Error Response** (503 Service Unavailable):
    ```json
    {
      "status": "error",
      "message": "Database connection failed"
    }
    ```

### 2.3. Dependencies Health Check
- **Endpoint**: `GET /health/dependencies`
- **Description**: Checks the connection to external services (Redis, etc.)
- **Successful Response** (200 OK):
    ```json
    {
      "status": "ok",
      "dependencies": {
        "redis": "connected",
        "cache": "connected"
      },
      "timestamp": "2025-03-12T05:18:59.859Z",
      "responseTime": 1127
    }
    ```
- **Error Response** (503 Service Unavailable):
    ```json
    {
      "status": "error",
      "dependencies": {
        "redis": "disconnected",
        "cache": "connected"
      }
    }
    ```

## 3. Two-Factor Authentication (2FA) Endpoints

### 3.1. Enable 2FA
- **Endpoint**: `POST /auth/enable-2fa`
- **Description**: Generates a QR code to set up 2FA
- **Headers**:
  - **Authorization**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Successful Response** (200 OK):
    ```json
    {
      "qrCode": "otpauth://totp/Paystell:user@example.com?secret=ABCDEFGHIJKLMNOP&issuer=Paystell",
      "secret": "ABCDEFGHIJKLMNOP"
    }
    ```
- **Complete Flow**:
  1. User logs in normally (`/auth/login`)
  2. User requests to enable 2FA (`/auth/enable-2fa`)
  3. Backend generates a unique secret and returns a QR code
  4. User scans the QR code with an app like Google Authenticator
  5. User uses the code generated in the app to verify setup (`/auth/verify-2fa`)

### 3.2. Verify 2FA Setup
- **Endpoint**: `POST /auth/verify-2fa`
- **Description**: Verifies that the 2FA setup works correctly
- **Headers**:
  - **Authorization**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Parameters**:
  - **Body** (JSON):
    ```json
    {
      "token": "123456"
    }
    ```
- **Successful Response** (200 OK):
    ```json
    {
      "success": true,
      "message": "2FA verification successful"
    }
    ```
- **Error Response** (400 Bad Request):
    ```json
    {
      "message": "Invalid 2FA token"
    }
    ```

### 3.3. Login with 2FA
- **Endpoint**: `POST /auth/login-2fa`
- **Description**: Authenticates a user with credentials + 2FA code
- **Parameters**:
  - **Body** (JSON):
    ```json
    {
      "email": "user@example.com",
      "password": "password123",
      "token": "123456"
    }
    ```
- **Successful Response** (200 OK): (same as `/auth/login`)
- **Error Response** (401 Unauthorized):
    ```json
    {
      "message": "Invalid 2FA token"
    }
    ```
- **Complete Flow**:
  1. User tries to log in normally (`/auth/login`)
  2. If 2FA is enabled, receives a 403 with the message
  3. User sends credentials + 2FA code to `/auth/login-2fa`
  4. Backend verifies both credentials and 2FA code
  5. If everything is correct, receives JWT tokens as in normal login

### 3.4. Disable 2FA
- **Endpoint**: `POST /auth/disable-2fa`
- **Description**: Disables two-factor authentication
- **Headers**:
  - **Authorization**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Successful Response** (200 OK):
    ```json
    {
      "message": "2FA disabled successfully"
    }
    ```
- **Error Response** (400 Bad Request):
    ```json
    {
      "message": "2FA is not enabled for this user"
    }
    ```

## 4. Transaction Reports Endpoints

### 4.1. Generate Transaction Report

- **Endpoint**: `GET /reports/transactions`
- **Description**: Generates a filtered report of transactions with various export options
- **Headers**:
  - **Authorization**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Parameters**:
  - **Query Parameters**:
    - `startDate`: (Optional) Start date for the report in ISO format (e.g., "2023-01-01T00:00:00Z")
    - `endDate`: (Optional) End date for the report in ISO format (e.g., "2023-12-31T23:59:59Z")
    - `status`: (Optional) Filter by transaction status ("SUCCESS", "PENDING", "FAILED")
    - `paymentMethod`: (Optional) Filter by payment method ("card", "bank_transfer", "wallet")
    - `format`: (Optional) Response format ("json" or "csv"), defaults to "json"
- **Successful Response** (200 OK) - JSON format:
  ```json
  {
    "success": true,
    "data": {
      "summary": {
        "totalTransactions": 123,
        "totalAmount": 12345.67,
        "successfulTransactions": 115,
        "failedTransactions": 8,
        "averageTransactionAmount": 100.37
      },
      "transactions": [
        {
          "id": "tx_123abc",
          "amount": 50.0,
          "status": "SUCCESS",
          "paymentMethod": "card",
          "createdAt": "2023-05-12T09:32:41.021Z",
          "reference": "INV-001",
          "description": "Monthly subscription"
        }
        // ... more transactions ...
      ]
    }
  }
  ```
- **Successful Response** (200 OK) - CSV format:
  Text file with CSV-formatted data (Content-Type: text/csv)
- **Error Response** (401 Unauthorized):
  ```json
  {
    "success": false,
    "message": "Unauthorized"
  }
  ```
- **Error Response** (400 Bad Request):
  ```json
  {
    "success": false,
    "message": "Invalid date format"
  }
  ```

## 5. Merchant Management Endpoints

These endpoints provide functionality for managing merchants, including authentication, profile updates, and logo management.

### 5.1. Merchant Authentication

- **Authentication Mechanism**: Merchants authenticate using an API Key.
- **Header Requirement**: `x-api-key`
- **Middleware**: `authenticateMerchant` validates the API Key via `MerchantAuthService`.
- **Endpoints**:
  - `GET /merchants/profile`: Retrieves merchant profile details.
  - `PUT /merchants/profile`: Updates merchant profile information.
  - `POST /merchants/logo`: Uploads a merchant logo.
  - `DELETE /merchants/logo`: Deletes the existing merchant logo.

### 5.2. Update Merchant Profile
- **Endpoint**: `PUT /merchants/profile`
- **Description**: Updates merchant profile information.
- **Authentication**: Requires API Key (`x-api-key`).
- **Process**:
  - The merchant sends a `PUT` request with updated JSON data.
  - Data fields: `business_name`, `business_email`, `business_description`, `business_address`, `business_phone`.
  - The API Key is verified.
  - The service `updateMerchantProfile` validates data via `UpdateMerchantProfileDTO`.
  - A database transaction ensures data integrity.
  - If successful, returns the updated profile.

### 5.3. Upload Merchant Logo
- **Endpoint**: `POST /merchants/logo`
- **Description**: Uploads a logo for the merchant profile.
- **Authentication**: Requires API Key (`x-api-key`).
- **Process**:
  - The merchant sends a `POST` request with an image file (`multipart/form-data`).
  - The API Key is verified.
  - The file is processed via `fileUploadService.upload.single('logo')`.
  - Constraints: Maximum size 3MB, allowed formats (`jpg, jpeg, png, gif`).
  - The file is uploaded to AWS S3.
  - The controller updates the merchant profile with the logo URL.
  - A database transaction ensures data integrity.
  - If successful, returns a confirmation message and logo URL.

### 5.4. Delete Merchant Logo
- **Endpoint**: `DELETE /merchants/logo`
- **Description**: Removes the merchant's logo.
- **Authentication**: Requires API Key (`x-api-key`).
- **Process**:
  - The merchant sends a `DELETE` request.
  - The API Key is verified.
  - The controller retrieves the merchant ID.
  - The service checks for an existing logo in the database.
  - If a logo exists, it is removed from AWS S3.
  - The merchant profile is updated to remove the logo URL.
  - A database transaction ensures data integrity.
  - If successful, returns a confirmation message.

## 6. Payment Link Endpoints

These endpoints provide functionality for managing payment links, including creation, retrieval, updates, and deletion.

### 6.1. Create Payment Link
- **Endpoint**: `POST /api/payment-links`
- **Description**: Creates a new payment link
- **Authentication**: JWT Token (Bearer)
- **Rate Limited**: Yes
- **Parameters**:
  - **Body** (JSON):
    ```json
    {
      "amount": 100.00,
      "description": "Product or service description",
      "expiryDate": "2025-03-12T04:02:01.021Z",
      "currency": "USD"
    }
    ```
- **Successful Response** (201 Created):
    ```json
    {
      "id": "pl_123abc",
      "url": "https://pay.paystell.com/pl_123abc",
      "amount": 100.00,
      "description": "Product or service description",
      "expiryDate": "2025-03-12T04:02:01.021Z",
      "status": "active",
      "createdAt": "2025-03-12T04:02:01.021Z"
    }
    ```

### 6.2. Get User's Payment Links
- **Endpoint**: `GET /api/payment-links/user`
- **Description**: Retrieves all payment links for the authenticated user
- **Authentication**: JWT Token (Bearer)
- **Successful Response** (200 OK):
    ```json
    {
      "paymentLinks": [
        {
          "id": "pl_123abc",
          "url": "https://pay.paystell.com/pl_123abc",
          "amount": 100.00,
          "description": "Product or service description",
          "status": "active",
          "createdAt": "2025-03-12T04:02:01.021Z"
        }
        // ... more payment links ...
      ]
    }
    ```

### 6.3. Get Payment Link by ID
- **Endpoint**: `GET /api/payment-links/:id`
- **Description**: Retrieves a specific payment link by ID
- **Authentication**: JWT Token (Bearer)
- **Parameters**:
  - **Path**: `id` - Payment link ID
- **Successful Response** (200 OK):
    ```json
    {
      "id": "pl_123abc",
      "url": "https://pay.paystell.com/pl_123abc",
      "amount": 100.00,
      "description": "Product or service description",
      "status": "active",
      "createdAt": "2025-03-12T04:02:01.021Z"
    }
    ```

### 6.4. Update Payment Link
- **Endpoint**: `PUT /api/payment-links/:id`
- **Description**: Updates an existing payment link
- **Authentication**: JWT Token (Bearer)
- **Parameters**:
  - **Path**: `id` - Payment link ID
  - **Body** (JSON):
    ```json
    {
      "amount": 150.00,
      "description": "Updated description",
      "expiryDate": "2025-03-12T04:02:01.021Z"
    }
    ```

### 6.5. Delete Payment Link
- **Endpoint**: `DELETE /api/payment-links/:id`
- **Description**: Permanently deletes a payment link
- **Authentication**: JWT Token (Bearer)
- **Parameters**:
  - **Path**: `id` - Payment link ID

### 6.6. Soft Delete Payment Link
- **Endpoint**: `PATCH /api/payment-links/:id/soft-delete`
- **Description**: Marks a payment link as deleted without removing it from the database
- **Authentication**: JWT Token (Bearer)
- **Parameters**:
  - **Path**: `id` - Payment link ID

## 7. Webhook Management Endpoints

### 7.1. Register Webhook
- **Endpoint**: `POST /api/webhooks/register`
- **Description**: Registers a new webhook endpoint for merchant notifications
- **Authentication**: Merchant API Key
- **Parameters**:
  - **Body** (JSON):
    ```json
    {
      "url": "https://merchant.com/webhook",
      "events": ["payment.success", "payment.failed"],
      "description": "Payment notifications webhook"
    }
    ```
- **Successful Response** (201 Created):
    ```json
    {
      "id": "wh_123abc",
      "url": "https://merchant.com/webhook",
      "events": ["payment.success", "payment.failed"],
      "status": "active",
      "createdAt": "2025-03-12T04:02:01.021Z"
    }
    ```

### 7.2. Update Webhook
- **Endpoint**: `PUT /api/webhooks/register/:id`
- **Description**: Updates an existing webhook configuration
- **Authentication**: Merchant API Key
- **Parameters**:
  - **Path**: `id` - Webhook ID
  - **Body** (JSON):
    ```json
    {
      "url": "https://merchant.com/new-webhook",
      "events": ["payment.success", "payment.failed", "refund.success"],
      "description": "Updated webhook configuration"
    }
    ```

### 7.3. Stellar Webhook Handler
- **Endpoint**: `POST /api/webhooks/stellar`
- **Description**: Handles incoming webhooks from the Stellar network
- **Authentication**: Stellar Webhook Authentication
- **Parameters**:
  - **Body**: Stellar webhook payload
- **Note**: This endpoint is for internal use and processes Stellar network events.

## 8. Stellar Contract Endpoints

These endpoints handle Stellar blockchain contract interactions, merchant registration, and payment processing.

### 8.1. Register Merchant on Stellar
- **Endpoint**: `POST /api/stellar/merchants/register`
- **Description**: Registers a merchant on the Stellar blockchain
- **Authentication**: Merchant API Key
- **Parameters**:
  - **Body** (JSON):
    ```json
    {
      "stellarAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "merchantName": "Merchant Name",
      "merchantDescription": "Merchant Description"
    }
    ```
- **Successful Response** (201 Created):
    ```json
    {
      "merchantId": "m_123abc",
      "stellarAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "status": "active",
      "contractAddress": "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "createdAt": "2025-03-12T04:02:01.021Z"
    }
    ```

### 8.2. Add Supported Token
- **Endpoint**: `POST /api/stellar/merchants/tokens`
- **Description**: Adds support for a new token/asset to the merchant's contract
- **Authentication**: Merchant API Key
- **Parameters**:
  - **Body** (JSON):
    ```json
    {
      "assetCode": "USDC",
      "assetIssuer": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "minimumAmount": "1.0",
      "maximumAmount": "10000.0"
    }
    ```
- **Successful Response** (200 OK):
    ```json
    {
      "success": true,
      "asset": {
        "code": "USDC",
        "issuer": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "limits": {
          "min": "1.0",
          "max": "10000.0"
        }
      }
    }
    ```

### 8.3. Process Payment
- **Endpoint**: `POST /api/stellar/payments/process`
- **Description**: Processes a payment through the Stellar contract
- **Authentication**: Merchant API Key
- **Rate Limited**: Yes
- **Parameters**:
  - **Body** (JSON):
    ```json
    {
      "amount": "100.00",
      "assetCode": "USDC",
      "customerAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "reference": "order_123",
      "memo": "Payment for Order #123"
    }
    ```
- **Successful Response** (200 OK):
    ```json
    {
      "transactionId": "tx_123abc",
      "status": "pending",
      "stellarTxHash": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "amount": "100.00",
      "assetCode": "USDC",
      "createdAt": "2025-03-12T04:02:01.021Z"
    }
    ```

### 8.4. Get Merchant Details
- **Endpoint**: `GET /api/stellar/merchants/:merchantAddress`
- **Description**: Retrieves merchant details and contract information
- **Authentication**: Merchant API Key
- **Parameters**:
  - **Path**: `merchantAddress` - Stellar address of the merchant
- **Successful Response** (200 OK):
    ```json
    {
      "merchantId": "m_123abc",
      "stellarAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "contractAddress": "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "status": "active",
      "supportedAssets": [
        {
          "code": "USDC",
          "issuer": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          "limits": {
            "min": "1.0",
            "max": "10000.0"
          }
        }
      ],
      "statistics": {
        "totalTransactions": 150,
        "totalVolume": "15000.00",
        "lastActivity": "2025-03-12T04:02:01.021Z"
      }
    }
    ```

## 9. Payment Processing Endpoints

### 9.1. Create Payment
- **Endpoint**: `POST /api/payments`
- **Description**: Creates a new payment transaction
- **Authentication**: JWT Token (Bearer)
- **Parameters**:
  - **Body** (JSON):
    ```json
    {
      "amount": "100.00",
      "currency": "USD",
      "description": "Payment for services",
      "customerId": "cust_123",
      "metadata": {
        "orderNumber": "ORDER123",
        "productId": "PROD456"
      }
    }
    ```
- **Successful Response** (201 Created):
    ```json
    {
      "paymentId": "pay_123abc",
      "amount": "100.00",
      "currency": "USD",
      "status": "pending",
      "createdAt": "2025-03-12T04:02:01.021Z",
      "metadata": {
        "orderNumber": "ORDER123",
        "productId": "PROD456"
      }
    }
    ```

## 10. Wallet Verification Endpoints

These endpoints handle the verification of user wallets to ensure they have control over their Stellar addresses.

### 10.1. Initiate Wallet Verification
- **Endpoint**: `POST /api/wallet-verification/initiate`
- **Description**: Initiates the wallet verification process
- **Authentication**: JWT Token (Bearer)
- **Parameters**:
  - **Body** (JSON):
    ```json
    {
      "walletAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "network": "testnet"
    }
    ```
- **Successful Response** (200 OK):
    ```json
    {
      "verificationId": "wv_123abc",
      "challenge": "RANDOM_CHALLENGE_STRING",
      "expiresAt": "2025-03-12T04:07:01.021Z"
    }
    ```

### 10.2. Verify Wallet
- **Endpoint**: `POST /api/wallet-verification/verify`
- **Description**: Completes the wallet verification process
- **Authentication**: JWT Token (Bearer)
- **Parameters**:
  - **Body** (JSON):
    ```json
    {
      "verificationId": "wv_123abc",
      "signedChallenge": "SIGNED_CHALLENGE_STRING"
    }
    ```
- **Successful Response** (200 OK):
    ```json
    {
      "verified": true,
      "walletAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "verifiedAt": "2025-03-12T04:02:01.021Z"
    }
    ```
- **Error Response** (400 Bad Request):
    ```json
    {
      "verified": false,
      "error": "Invalid signature"
    }
    ```