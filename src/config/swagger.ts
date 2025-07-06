import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PayStell API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for the PayStell backend service. This API provides endpoints for user management, payments, wallet verification, merchant operations, and more.',
      contact: {
        name: 'PayStell Development Team',
        email: 'dev@paystell.com',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.paystell.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from authentication endpoints',
        },
        auth0Auth: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: `${process.env.AUTH0_DOMAIN || 'https://dev-example.auth0.com'}/authorize`,
              tokenUrl: `${process.env.AUTH0_DOMAIN || 'https://dev-example.auth0.com'}/oauth/token`,
              scopes: {
                'openid': 'OpenID Connect scope',
                'profile': 'Access to user profile information',
                'email': 'Access to user email address',
                'read:users': 'Read user information',
                'write:users': 'Create and update users',
                'read:payments': 'Read payment information',
                'write:payments': 'Create and update payments',
              },
            },
          },
        },
      },
      schemas: {
        // User related schemas
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Unique user identifier' },
            name: { type: 'string', description: 'User full name' },
            email: { type: 'string', format: 'email', description: 'User email address' },
            role: { 
              type: 'string', 
              enum: ['USER', 'ADMIN', 'MERCHANT'],
              description: 'User role in the system'
            },
            description: { type: 'string', description: 'User description' },
            logoUrl: { type: 'string', description: 'URL to user logo' },
            walletAddress: { type: 'string', description: 'User wallet address' },
            isEmailVerified: { type: 'boolean', description: 'Email verification status' },
            isWalletVerified: { type: 'boolean', description: 'Wallet verification status' },
            createdAt: { type: 'string', format: 'date-time', description: 'User creation timestamp' },
            updatedAt: { type: 'string', format: 'date-time', description: 'User last update timestamp' },
          },
          required: ['id', 'name', 'email', 'role'],
        },
        CreateUserDTO: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, description: 'User full name' },
            email: { type: 'string', format: 'email', description: 'User email address' },
            password: { type: 'string', minLength: 8, description: 'User password' },
            description: { type: 'string', description: 'User description' },
            logoUrl: { type: 'string', description: 'URL to user logo' },
            walletAddress: { type: 'string', description: 'User wallet address' },
          },
          required: ['name', 'email', 'password'],
        },
        UpdateUserDTO: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, description: 'User full name' },
            email: { type: 'string', format: 'email', description: 'User email address' },
            description: { type: 'string', description: 'User description' },
            logoUrl: { type: 'string', description: 'URL to user logo' },
            walletAddress: { type: 'string', description: 'User wallet address' },
          },
        },

        // Payment related schemas
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Unique payment identifier' },
            paymentId: { type: 'string', description: 'Unique payment ID' },
            amount: { type: 'number', format: 'decimal', description: 'Payment amount' },
            status: { 
              type: 'string', 
              enum: ['pending', 'completed', 'failed'],
              description: 'Payment status'
            },
            createdAt: { type: 'string', format: 'date-time', description: 'Payment creation timestamp' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Payment last update timestamp' },
          },
          required: ['id', 'paymentId', 'amount', 'status'],
        },
        PaymentLink: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Unique payment link identifier' },
            title: { type: 'string', description: 'Payment link title' },
            description: { type: 'string', description: 'Payment link description' },
            amount: { type: 'number', format: 'decimal', description: 'Payment amount' },
            currency: { type: 'string', description: 'Payment currency' },
            isActive: { type: 'boolean', description: 'Payment link active status' },
            expiresAt: { type: 'string', format: 'date-time', description: 'Payment link expiration date' },
            createdAt: { type: 'string', format: 'date-time', description: 'Payment link creation timestamp' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Payment link last update timestamp' },
          },
          required: ['id', 'title', 'amount', 'currency'],
        },

        // Merchant related schemas
        Merchant: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Unique merchant identifier' },
            name: { type: 'string', description: 'Merchant name' },
            email: { type: 'string', format: 'email', description: 'Merchant email' },
            description: { type: 'string', description: 'Merchant description' },
            logoUrl: { type: 'string', description: 'URL to merchant logo' },
            website: { type: 'string', description: 'Merchant website URL' },
            isActive: { type: 'boolean', description: 'Merchant active status' },
            createdAt: { type: 'string', format: 'date-time', description: 'Merchant creation timestamp' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Merchant last update timestamp' },
          },
          required: ['id', 'name', 'email'],
        },
        CreateMerchantDTO: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Merchant name' },
            email: { type: 'string', format: 'email', description: 'Merchant email' },
            description: { type: 'string', description: 'Merchant description' },
            logoUrl: { type: 'string', description: 'URL to merchant logo' },
            website: { type: 'string', description: 'Merchant website URL' },
          },
          required: ['name', 'email'],
        },

        // Authentication schemas
        LoginRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', description: 'User email' },
            password: { type: 'string', description: 'User password' },
          },
          required: ['email', 'password'],
        },
        Login2FARequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', description: 'User email' },
            password: { type: 'string', description: 'User password' },
            token: { type: 'string', minLength: 6, maxLength: 6, description: '2FA token' },
          },
          required: ['email', 'password', 'token'],
        },
        AuthResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', description: 'JWT access token' },
            refreshToken: { type: 'string', description: 'JWT refresh token' },
            user: { $ref: '#/components/schemas/User' },
          },
          required: ['accessToken', 'refreshToken', 'user'],
        },

        // Wallet verification schemas
        WalletVerification: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Unique verification identifier' },
            walletAddress: { type: 'string', description: 'Wallet address to verify' },
            status: { 
              type: 'string', 
              enum: ['pending', 'verified', 'failed'],
              description: 'Verification status'
            },
            createdAt: { type: 'string', format: 'date-time', description: 'Verification creation timestamp' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Verification last update timestamp' },
          },
          required: ['id', 'walletAddress', 'status'],
        },

        // Referral related schemas
        Referral: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Unique referral identifier' },
            referrerId: { type: 'integer', description: 'ID of the user making the referral' },
            referredId: { type: 'integer', description: 'ID of the referred user' },
            status: { 
              type: 'string', 
              enum: ['pending', 'completed', 'expired'],
              description: 'Referral status'
            },
            rewardAmount: { type: 'number', description: 'Reward amount for the referral' },
            createdAt: { type: 'string', format: 'date-time', description: 'Referral creation timestamp' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Referral last update timestamp' },
          },
          required: ['id', 'referrerId', 'referredId', 'status'],
        },

        // Error schemas
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Error type' },
            message: { type: 'string', description: 'Error message' },
            statusCode: { type: 'integer', description: 'HTTP status code' },
          },
          required: ['error', 'message'],
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Error type' },
            message: { type: 'string', description: 'Error message' },
            details: { 
              type: 'array', 
              items: { 
                type: 'object',
                properties: {
                  field: { type: 'string', description: 'Field name' },
                  message: { type: 'string', description: 'Validation message' },
                },
              },
              description: 'Validation error details'
            },
          },
          required: ['error', 'message'],
        },

        // Success response schemas
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', description: 'Success status' },
            message: { type: 'string', description: 'Success message' },
            data: { type: 'object', description: 'Response data' },
          },
          required: ['success', 'message'],
        },

        // Pagination schemas
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { type: 'object' }, description: 'Array of items' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', description: 'Current page number' },
                limit: { type: 'integer', description: 'Items per page' },
                total: { type: 'integer', description: 'Total number of items' },
                totalPages: { type: 'integer', description: 'Total number of pages' },
              },
              required: ['page', 'limit', 'total', 'totalPages'],
            },
          },
          required: ['data', 'pagination'],
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/dtos/*.ts',
    './src/entities/*.ts',
  ],
};

export const specs = swaggerJsdoc(options); 
