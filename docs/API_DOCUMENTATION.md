# PayStell API Documentation

## Overview

The PayStell backend API is now fully documented using OpenAPI 3.0 specification. This documentation provides a comprehensive, interactive reference for all API endpoints, making it easier for developers to understand and integrate with the PayStell platform.

## Accessing the Documentation

### Interactive Swagger UI

The interactive API documentation is available at:
- **Development**: `http://localhost:3000/api-docs`
- **Production**: `https://api.paystell.com/api-docs`

### OpenAPI Specification

The raw OpenAPI specification is available at:
- **Development**: `http://localhost:3000/api-docs/swagger.json`
- **Production**: `https://api.paystell.com/api-docs/swagger.json`

## Features

### 🔐 Authentication

The API supports multiple authentication methods:

1. **JWT Bearer Token**: Most endpoints require a valid JWT token in the Authorization header
   ```
   Authorization: Bearer <your-jwt-token>
   ```

2. **Auth0 OAuth2**: For OAuth-based authentication flows
   - Authorization URL: `https://your-auth0-domain.auth0.com/authorize`
   - Token URL: `https://your-auth0-domain.auth0.com/oauth/token`

### 📋 API Endpoints

The API is organized into the following categories:

#### Authentication (`/auth`)
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login with email/password
- `POST /auth/login-2fa` - Login with 2FA
- `POST /auth/refresh-token` - Refresh access token
- `POST /auth/logout` - Logout user
- `POST /auth/enable-2fa` - Enable two-factor authentication
- `POST /auth/disable-2fa` - Disable two-factor authentication
- `POST /auth/verify-2fa` - Verify 2FA token

#### Users (`/users`)
- `POST /users` - Create a new user
- `GET /users` - Get all users (with pagination)
- `GET /users/{id}` - Get user by ID
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user

#### Payments (`/payment`)
- `POST /payment` - Create a new payment
- `POST /payment/process` - Process payment with signature verification
- `GET /payment/{paymentId}` - Get payment by ID
- `PUT /payment/{paymentId}/status` - Update payment status
- `POST /payment/verify-transaction` - Verify Stellar transaction
- `GET /payment/generate-nonce` - Generate secure nonce

#### Payment Links (`/paymentlink`)
- `POST /paymentlink` - Create a new payment link
- `GET /paymentlink/user` - Get user's payment links
- `GET /paymentlink/{id}` - Get payment link by ID
- `PUT /paymentlink/{id}` - Update payment link
- `DELETE /paymentlink/{id}` - Delete payment link
- `PATCH /paymentlink/{id}/soft-delete` - Soft delete payment link

#### Merchants (`/merchants`)
- `GET /merchants/profile` - Get merchant profile
- `POST /merchants/profile` - Register a new merchant
- `PUT /merchants/profile` - Update merchant profile
- `POST /merchants/logo` - Upload merchant logo
- `DELETE /merchants/logo` - Delete merchant logo

#### Wallet Verification (`/wallet-verification`)
- `POST /wallet-verification/initiate` - Initiate wallet verification
- `POST /wallet-verification/verify` - Verify wallet

#### Health Checks (`/health`)
- `GET /health` - Basic health check
- `GET /health/db` - Database health check
- `GET /health/dependencies` - External dependencies health check

### 📊 Data Models

The API uses consistent data models across all endpoints:

#### User
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "USER",
  "description": "User description",
  "logoUrl": "https://example.com/logo.png",
  "walletAddress": "G...",
  "isEmailVerified": true,
  "isWalletVerified": false,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### Payment
```json
{
  "id": 1,
  "paymentId": "pay_123456789",
  "amount": 100.50,
  "status": "completed",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### Payment Link
```json
{
  "id": 1,
  "title": "Payment for Services",
  "description": "Payment link description",
  "amount": 50.00,
  "currency": "USD",
  "isActive": true,
  "expiresAt": "2024-12-31T23:59:59Z",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### Merchant
```json
{
  "id": 1,
  "name": "Acme Corp",
  "email": "contact@acme.com",
  "description": "Merchant description",
  "logoUrl": "https://example.com/logo.png",
  "website": "https://acme.com",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 🔒 Error Handling

The API uses consistent error responses:

#### Standard Error Response
```json
{
  "error": "error_type",
  "message": "Human-readable error message",
  "statusCode": 400
}
```

#### Validation Error Response
```json
{
  "error": "validation_error",
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 📄 Rate Limiting

The API implements rate limiting on various endpoints:

- **Authentication endpoints**: 5 requests per minute
- **Payment processing**: 10 requests per minute
- **Payment link creation**: 3 requests per minute
- **General API**: 100 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Getting Started

### 1. Authentication

First, register a new user or login to get an access token:

```bash
# Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

### 2. Using the API

Once you have an access token, you can make authenticated requests:

```bash
# Get user profile
curl -X GET http://localhost:3000/users/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Create a payment link
curl -X POST http://localhost:3000/paymentlink \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Payment for Services",
    "amount": 50.00,
    "currency": "USD"
  }'
```

### 3. Testing with Swagger UI

1. Open `http://localhost:3000/api-docs` in your browser
2. Click the "Authorize" button at the top
3. Enter your JWT token in the format: `Bearer YOUR_TOKEN`
4. Try out any endpoint directly from the UI

## Development

### Adding New Endpoints

To add documentation for new endpoints:

1. Add JSDoc comments above the route definition:

```javascript
/**
 * @swagger
 * /api/new-endpoint:
 *   post:
 *     summary: Brief description
 *     description: Detailed description
 *     tags: [Category]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/YourSchema'
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResponseSchema'
 */
router.post('/new-endpoint', controller.method);
```

2. Add new schemas to `src/config/swagger.ts` if needed:

```javascript
schemas: {
  YourSchema: {
    type: 'object',
    properties: {
      // Define your schema properties
    },
    required: ['requiredField']
  }
}
```

### Updating Documentation

The documentation is automatically generated from the code comments. To update:

1. Modify the JSDoc comments in the route files
2. Restart the development server
3. The changes will be reflected in the Swagger UI

### Validation

The API documentation is validated against the actual implementation. To ensure consistency:

1. All endpoints must have proper JSDoc documentation
2. Request/response schemas must match the actual DTOs
3. Error responses must be documented
4. Authentication requirements must be specified

## Best Practices

### For API Consumers

1. **Always check the response status codes** - The API uses standard HTTP status codes
2. **Handle rate limiting** - Implement exponential backoff for rate-limited requests
3. **Validate responses** - Use the documented schemas to validate API responses
4. **Use pagination** - For list endpoints, use the pagination parameters
5. **Implement proper error handling** - Handle both client and server errors gracefully

### For API Developers

1. **Keep documentation up to date** - Update JSDoc comments when changing endpoints
2. **Use consistent naming** - Follow the established naming conventions
3. **Document all possible responses** - Include success and error cases
4. **Provide meaningful examples** - Include realistic example data
5. **Test the documentation** - Verify that the Swagger UI works correctly

## Support

For questions about the API documentation:

1. Check the interactive Swagger UI for the most up-to-date information
2. Review the error responses for troubleshooting
3. Contact the development team for additional support

## Changelog

### Version 1.0.0
- Initial OpenAPI 3.0 documentation implementation
- Complete coverage of all existing endpoints
- Interactive Swagger UI integration
- Comprehensive schema definitions
- Authentication documentation
- Error handling documentation 
