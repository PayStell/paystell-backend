# Changelog

## [1.0.0] - Initial Release

### Added
- 🔐 Authentication & Authorization
  - User role management system with multiple roles (Admin, User, Moderator)
  - JWT-based authentication

- 📨 Notification System
  - In-app notification system with support for:
    - Multiple notification types
    - Priority levels
    - Read/Unread status tracking
    - Notification categories
    - Expiration dates
    - Custom metadata
    - Recipient targeting

- 🔄 Queue System
  - Merchant webhook queue implementation using Bull
  - Asynchronous webhook processing

- 📝 Logging System
  - Multi-level logging (error, warn, info, debug)
  - Environment-based log configuration
  - Multiple output formats (console, file)
  - Separate log files for:
    - Error logs
    - Combined logs
    - Exception handling
    - Promise rejection handling
  - Integration with external logging services (Datadog)
  - Request metadata tracking

- 🛡️ Security Features
  - Rate limiting
  - CORS support
  - Input validation using class-validator and zod
  - Two-factor authentication support (via speakeasy)

- 💾 Database
  - PostgreSQL integration with TypeORM
  - Migration support
  - Entity relationship management

- 🔧 Development Tools
  - TypeScript support
  - ESLint configuration
  - Prettier code formatting
  - Jest testing framework
  - Development hot-reload
  - Comprehensive npm scripts for development workflow

- 🔌 Integrations
  - Redis support
  - Email service (via nodemailer)
  - Cron job scheduling
  - API rate limiting with Redis

### Infrastructure
- Structured project organization
- Environment configuration management
- Comprehensive error handling
- API documentation support (Swagger/OpenAPI)
- Contribution guidelines and PR templates
- Standardized issue templates