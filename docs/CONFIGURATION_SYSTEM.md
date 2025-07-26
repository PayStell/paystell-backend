# Multi-Environment Configuration Management System

## Overview

The PayStell backend now includes a comprehensive Multi-Environment Configuration Management System that provides centralized configuration management, feature flags, and dynamic configuration updates across different environments (development, staging, production).

## Features

- ✅ **Centralized Configuration Management**: All configurations stored in database with environment-specific values
- ✅ **Configuration Validation**: Automatic validation of required configurations at startup
- ✅ **Feature Flags System**: Dynamic feature toggles with targeting and percentage rollouts
- ✅ **Encryption Support**: Automatic encryption of sensitive configurations
- ✅ **Hot Reload**: Update configurations without server restart
- ✅ **Audit Logging**: Complete audit trail of all configuration changes
- ✅ **Environment Support**: Separate configurations for development, staging, and production
- ✅ **API Management**: RESTful API for configuration management
- ✅ **Caching**: In-memory caching for performance
- ✅ **Import/Export**: Bulk configuration import and export capabilities

## Architecture

### Core Components

1. **Configuration Entity** (`src/entities/Configuration.ts`)
   - Stores configuration values with metadata
   - Supports different data types (string, number, boolean, JSON, encrypted)
   - Environment-specific configurations
   - Validation rules and constraints

2. **Feature Flag Entity** (`src/entities/FeatureFlag.ts`)
   - Manages feature flags with targeting rules
   - Supports percentage rollouts and scheduling
   - Different scopes (global, user, merchant, environment)

3. **Configuration Service** (`src/services/ConfigurationService.ts`)
   - Core business logic for configuration management
   - Encryption/decryption of sensitive values
   - Caching and validation
   - Feature flag evaluation

4. **Configuration Controller** (`src/controllers/ConfigurationController.ts`)
   - REST API endpoints for configuration management
   - CRUD operations for configurations and feature flags
   - Import/export functionality

5. **Configuration Middleware** (`src/middlewares/configurationMiddleware.ts`)
   - Injects configuration service into requests
   - Feature flag checking middleware
   - Environment-specific configuration injection

## Database Schema

### Configuration Table
```sql
CREATE TABLE configurations (
  id UUID PRIMARY KEY,
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  environment VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  is_encrypted BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_required BOOLEAN DEFAULT FALSE,
  validation_rules TEXT,
  default_value TEXT,
  allowed_values TEXT,
  expires_at TIMESTAMP,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(255),
  UNIQUE(key, environment)
);
```

### Feature Flag Table
```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  environment VARCHAR(50) NOT NULL,
  scope VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  targeting_rules JSONB,
  scheduled_start_date TIMESTAMP,
  scheduled_end_date TIMESTAMP,
  metadata JSONB,
  owner VARCHAR(255),
  tags TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(255),
  UNIQUE(name, environment)
);
```

## API Endpoints

### Configuration Management

#### Get All Configurations
```http
GET /api/config
Authorization: Bearer <token>
```

#### Get Configuration by Key
```http
GET /api/config/{key}
Authorization: Bearer <token>
```

#### Create/Update Configuration
```http
POST /api/config
Authorization: Bearer <token>
Content-Type: application/json

{
  "key": "PAYMENT_MIN_AMOUNT",
  "value": "0.01",
  "type": "number",
  "category": "payment",
  "description": "Minimum payment amount",
  "isRequired": true,
  "isEncrypted": false
}
```

#### Delete Configuration
```http
DELETE /api/config/{key}
Authorization: Bearer <token>
```

#### Get Configurations by Category
```http
GET /api/config/category/{category}
Authorization: Bearer <token>
```

#### Reload Configurations
```http
POST /api/config/reload
Authorization: Bearer <token>
```

#### Validate Configurations
```http
GET /api/config/validate
Authorization: Bearer <token>
```

### Feature Flag Management

#### Get All Feature Flags
```http
GET /api/config/feature-flags
Authorization: Bearer <token>
```

#### Create/Update Feature Flag
```http
POST /api/config/feature-flags
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "advanced_fraud_detection",
  "description": "Enable advanced fraud detection features",
  "isEnabled": true,
  "scope": "global",
  "targetingRules": {
    "percentage": 25
  }
}
```

#### Evaluate Feature Flag
```http
GET /api/config/feature-flags/{flagName}/evaluate?userId=123&userRole=admin
Authorization: Bearer <token>
```

### Utility Endpoints

#### Get Configuration Statistics
```http
GET /api/config/stats
Authorization: Bearer <token>
```

#### Export Configurations
```http
GET /api/config/export?environment=production
Authorization: Bearer <token>
```

#### Import Configurations
```http
POST /api/config/import
Authorization: Bearer <token>
Content-Type: application/json

{
  "configurations": [
    {
      "key": "PAYMENT_MIN_AMOUNT",
      "value": "0.01",
      "type": "number",
      "category": "payment"
    }
  ],
  "overwrite": false
}
```

## Usage Examples

### In Controllers/Services

```typescript
import { configurationService } from "../services/ConfigurationService";

// Get configuration value
const minAmount = await configurationService.getConfig("PAYMENT_MIN_AMOUNT", "0.01");

// Check feature flag
const isAdvancedFraudEnabled = await configurationService.evaluateFeatureFlag(
  "advanced_fraud_detection",
  { userId: "123", userRole: "admin" }
);

// Set configuration
await configurationService.setConfig("PAYMENT_MAX_AMOUNT", 10000, {
  type: ConfigurationType.NUMBER,
  category: ConfigurationCategory.PAYMENT,
  description: "Maximum payment amount",
  isRequired: true,
  updatedBy: "user123"
});
```

### In Request Handlers

```typescript
// Using injected configuration service
app.get("/payment", async (req, res) => {
  const minAmount = await req.config?.get("PAYMENT_MIN_AMOUNT", "0.01");
  const isFeatureEnabled = await req.config?.isFeatureEnabled("real_time_notifications");
  
  // Use configurations...
});
```

### Feature Flag Middleware

```typescript
import { featureFlagMiddleware } from "../middlewares/configurationMiddleware";

// Protect route with feature flag
app.get("/analytics", 
  featureFlagMiddleware("advanced_analytics"),
  (req, res) => {
    // Route only accessible if feature flag is enabled
  }
);
```

## Configuration Categories

### Database
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

### Authentication
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_DOMAIN`

### Stellar
- `STELLAR_HORIZON_URL`
- `STELLAR_NETWORK_PASSPHRASE`
- `STELLAR_SECRET_KEY`
- `SOROBAN_CONTRACT_ID`

### Payment
- `PAYMENT_MIN_AMOUNT`
- `PAYMENT_MAX_AMOUNT`
- `PAYMENT_CURRENCIES`
- `PAYMENT_TIMEOUT_MINUTES`

### Security
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`
- `SESSION_SECRET`
- `CONFIG_ENCRYPTION_KEY`

### Email
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `FROM_EMAIL`

### Monitoring
- `NEW_RELIC_LICENSE_KEY`
- `LOG_LEVEL`

### General
- `APP_NAME`
- `APP_VERSION`
- `BASE_URL`
- `NODE_ENV`

## Feature Flags

### Default Feature Flags

1. **advanced_fraud_detection**
   - Description: Enable advanced fraud detection features
   - Scope: Global
   - Default: Disabled

2. **real_time_notifications**
   - Description: Enable real-time payment notifications
   - Scope: Global
   - Default: Enabled

3. **multi_currency_support**
   - Description: Enable support for multiple currencies
   - Scope: Global
   - Default: Enabled

4. **advanced_analytics**
   - Description: Enable advanced analytics dashboard
   - Scope: User
   - Default: Disabled

5. **beta_features**
   - Description: Enable beta features for testing
   - Scope: User
   - Default: Disabled
   - Targeting: 10% rollout

## Setup and Initialization

### 1. Initialize Database
```bash
npm run migration:run
```

### 2. Initialize Configurations
```bash
npm run init-config
```

This will create default configurations for all environments (development, staging, production).

### 3. Environment Variables
Ensure these environment variables are set:
```bash
NODE_ENV=development
CONFIG_ENCRYPTION_KEY=your-encryption-key
```

## Security Considerations

### Encryption
- Sensitive configurations are automatically encrypted using AES-256-CBC
- Encryption key is stored in environment variable `CONFIG_ENCRYPTION_KEY`
- Encrypted values are never logged or exposed in API responses

### Access Control
- All configuration endpoints require authentication
- Role-based access control using RBAC system
- Audit logging for all configuration changes

### Validation
- Configuration values are validated against allowed values
- Required configurations are checked at startup
- Type validation for different configuration types

## Best Practices

### 1. Configuration Naming
- Use descriptive, hierarchical names (e.g., `PAYMENT_MIN_AMOUNT`)
- Use UPPER_CASE for configuration keys
- Group related configurations by category

### 2. Feature Flags
- Use descriptive names for feature flags
- Document the purpose and impact of each flag
- Set appropriate scopes and targeting rules
- Clean up deprecated feature flags

### 3. Environment Management
- Use different configurations for each environment
- Never commit sensitive values to version control
- Use environment-specific encryption keys

### 4. Monitoring
- Monitor configuration changes through audit logs
- Set up alerts for missing required configurations
- Track feature flag usage and impact

## Troubleshooting

### Common Issues

1. **Configuration Not Found**
   - Check if configuration exists for current environment
   - Verify configuration key spelling
   - Check if configuration is active

2. **Encryption Errors**
   - Verify `CONFIG_ENCRYPTION_KEY` is set
   - Check if encryption key is consistent across restarts
   - Re-encrypt configurations if needed

3. **Feature Flag Not Working**
   - Check if feature flag is enabled
   - Verify targeting rules and scope
   - Check if user context is provided correctly

4. **Validation Errors**
   - Check configuration value against allowed values
   - Verify configuration type matches expected type
   - Check if required configurations are missing

### Debug Commands

```bash
# Check configuration status
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/config/validate

# Get configuration statistics
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/config/stats

# Export configurations for backup
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/config/export
```

## Migration from Environment Variables

To migrate from environment variables to the configuration system:

1. **Export current environment variables**
2. **Import them using the configuration API**
3. **Update application code to use configuration service**
4. **Remove environment variables gradually**

Example migration script:
```typescript
const envToConfig = [
  { env: "POSTGRES_HOST", config: "POSTGRES_HOST" },
  { env: "JWT_SECRET", config: "JWT_SECRET", encrypted: true },
  // ... more mappings
];

for (const mapping of envToConfig) {
  const value = process.env[mapping.env];
  if (value) {
    await configurationService.setConfig(mapping.config, value, {
      isEncrypted: mapping.encrypted || false,
      updatedBy: "migration"
    });
  }
}
```

## Performance Considerations

### Caching
- Configuration values are cached in memory
- Cache is invalidated when configurations are updated
- Request-level caching for frequently accessed values

### Database Optimization
- Indexes on key and environment columns
- Efficient queries for configuration lookups
- Connection pooling for database access

### Monitoring
- Monitor configuration access patterns
- Track cache hit rates
- Monitor database query performance

This configuration system provides a robust, secure, and flexible way to manage application configurations across multiple environments while supporting feature flags and dynamic updates. 