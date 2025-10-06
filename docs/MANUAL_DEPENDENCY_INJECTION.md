# Manual Dependency Injection in PayStell Backend

## Overview

PayStell backend now uses manual dependency injection (DI) to improve modularity, testability, and maintainability. Instead of services and controllers directly instantiating their dependencies, all dependencies are passed explicitly via constructors. This approach avoids tight coupling and makes unit testing easier.

## How It Works

- **Dependencies are defined as interfaces** in `src/interfaces/` (e.g., `IWebhookService`, `IMerchantAuthService`).
- **Controllers and services accept dependencies via their constructors**. No direct instantiation of dependencies inside these classes.
- **Dependencies are instantiated and wired together manually** in the application entry point or route files (e.g., `src/routes/webhook.routes.ts`).

## Example: WebhookController

### 1. Define Interfaces
Interfaces for each dependency are defined in `src/interfaces/`:
```ts
// src/interfaces/IWebhookService.ts
export interface IWebhookService {
  getMerchantWebhook(merchantId: string): Promise<any>;
}
```

### 2. Refactor Controller to Use Constructor Injection
```ts
import { IWebhookService } from '../interfaces/IWebhookService';
import { IMerchantAuthService } from '../interfaces/IMerchantAuthService';
import { IWebhookNotificationService } from '../interfaces/IWebhookNotificationService';

export class WebhookController {
  constructor(
    private webhookService: IWebhookService,
    private merchantAuthService: IMerchantAuthService,
    private webhookNotificationService: IWebhookNotificationService,
  ) {}
  // ...
}
```

### 3. Instantiate and Inject Dependencies Manually
In your route or entry file:
```ts
import { WebhookController } from '../controllers/webhook.controller';
import { WebhookService } from '../services/webhook.service';
import { MerchantAuthService } from '../services/merchant.service';
import { WebhookNotificationService } from '../services/webhookNotification.service';
import { CryptoGeneratorService } from '../services/cryptoGenerator.service';

const webhookService = new WebhookService();
const merchantAuthService = new MerchantAuthService();
const cryptoGeneratorService = new CryptoGeneratorService();
const webhookNotificationService = new WebhookNotificationService(
  merchantAuthService,
  cryptoGeneratorService
);

const webhookController = new WebhookController(
  webhookService,
  merchantAuthService,
  webhookNotificationService
);
```

## Adding New Services
1. **Define an interface** for the new service in `src/interfaces/`.
2. **Implement the service** in `src/services/`.
3. **Update the controller or service** to accept the new dependency via its constructor.
4. **Manually instantiate and inject** the new service where needed.

## Benefits
- Loose coupling between components
- Easier unit testing (mock dependencies)
- Improved maintainability and scalability

## Notes
- No DI framework is used; all wiring is manual for transparency and control.
- All dependencies must be passed explicitly—no direct `new` inside controllers/services.
- See `src/routes/webhook.routes.ts` for a real example.
