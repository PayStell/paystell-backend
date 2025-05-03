1. src/app.ts
Comment on lines +70 to +75
// Configure express.json middleware to store raw body for webhook signature verification
app.use(express.json({
  verify: (req: RequestWithRawBody, _res, buf) => {
    req.rawBody = buf;
  },
}));
@coderabbitai coderabbitai bot 3 minutes ago
⚠️ Potential issue

Add size limit to prevent potential denial-of-service attacks

The implementation correctly preserves the raw request body for webhook signature verification, but it lacks size limits which could make your application vulnerable to memory-based denial-of-service attacks.

Consider adding a size limit to the express.json middleware:

// Configure express.json middleware to store raw body for webhook signature verification
app.use(express.json({
+ limit: '1mb', // Add a reasonable size limit based on your payload requirements
  verify: (req: RequestWithRawBody, _res, buf) => {
    req.rawBody = buf;
  },
}));
For improved performance, consider applying this middleware only to webhook-related routes instead of globally:

// Configure express.json middleware with standard options for most routes
app.use(express.json({ limit: '1mb' }));

// Apply specialized middleware only to webhook routes that need raw body access
+const webhookBodyParser = express.json({
+  limit: '1mb',
+  verify: (req: RequestWithRawBody, _res, buf) => {
+    req.rawBody = buf;
+  },
+});
+
+// Then in your webhook routes file:
+// webhookRouter.use(webhookBodyParser);

2. src/controllers/merchant.controller.ts
Comment on lines +203 to +214
      return res.status(200).json({
        id: webhook.id,
        url: webhook.url,
        secretKey: webhook.secretKey,
        eventTypes: webhook.eventTypes,
        maxRetries: webhook.maxRetries,
        initialRetryDelay: webhook.initialRetryDelay,
        maxRetryDelay: webhook.maxRetryDelay,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt
      });
@coderabbitai coderabbitai bot 3 minutes ago
⚠️ Potential issue

Third instance of secret key exposure.

Same security issue with exposing the webhook secret in the API response.

 return res.status(200).json({
   id: webhook.id,
   url: webhook.url,
-  secretKey: webhook.secretKey,
+  secretKeyLastFour: webhook.secretKey.slice(-4).padStart(webhook.secretKey.length, '*'),
   eventTypes: webhook.eventTypes,
   maxRetries: webhook.maxRetries,
   initialRetryDelay: webhook.initialRetryDelay,
   maxRetryDelay: webhook.maxRetryDelay,
   isActive: webhook.isActive,
   createdAt: webhook.createdAt,
   updatedAt: webhook.updatedAt
 });

 3. src/controllers/merchant.controller.ts
Comment on lines 88 to 97
      return res.status(201).json({
        message: "Webhook registered successfully",
        webhookId: webhook.id,
        webhook: {
          id: webhook.id,
          url: webhook.url,
          secretKey: webhook.secretKey,
          eventTypes: webhook.eventTypes,
          createdAt: webhook.createdAt
        }
      });
@coderabbitai coderabbitai bot 3 minutes ago
⚠️ Potential issue

Potential security risk exposing secret key in response.

Returning the full webhook secret in the response is generally not considered a best practice. Consider only returning it during initial creation (when a merchant might need to record it) but not in subsequent responses.

 return res.status(201).json({
   message: "Webhook registered successfully",
   webhook: {
     id: webhook.id,
     url: webhook.url,
-    secretKey: webhook.secretKey,
+    secretKey: webhook.secretKey, // Only shown once during creation
     eventTypes: webhook.eventTypes,
     createdAt: webhook.createdAt
   }
 });

 4. src/controllers/merchant.controller.ts
Comment on lines +76 to 83
      const webhookData: WebhookSubscriptionRequest = {
        url,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        secretKey,
        eventTypes,
        maxRetries,
        initialRetryDelay,
        maxRetryDelay
      };
@coderabbitai coderabbitai bot 3 minutes ago
🛠️ Refactor suggestion

Webhook data structure needs validation.

The code accepts webhook configuration parameters without validating them. Consider adding validation for the retry parameters to ensure they're within reasonable bounds.

 // Create webhook data for registration
 const webhookData: WebhookSubscriptionRequest = {
   url,
   secretKey,
   eventTypes,
+  maxRetries: maxRetries !== undefined ? Math.min(Math.max(maxRetries, 0), 10) : undefined, // Limit between 0-10
+  initialRetryDelay: initialRetryDelay !== undefined ? Math.max(initialRetryDelay, 1000) : undefined, // Minimum 1000ms
+  maxRetryDelay: maxRetryDelay !== undefined ? Math.min(Math.max(maxRetryDelay, 1000), 86400000) : undefined, // Between 1s and 24h
-  maxRetries,
-  initialRetryDelay,
-  maxRetryDelay
 };

 5. src/controllers/merchant.controller.ts
Comment on lines 141 to 154
      return res.status(200).json({
        message: "Webhook updated successfully",
        webhook: updatedWebhook,
        webhook: {
          id: updatedWebhook.id,
          url: updatedWebhook.url,
          secretKey: updatedWebhook.secretKey,
          eventTypes: updatedWebhook.eventTypes,
          maxRetries: updatedWebhook.maxRetries,
          initialRetryDelay: updatedWebhook.initialRetryDelay,
          maxRetryDelay: updatedWebhook.maxRetryDelay,
          createdAt: updatedWebhook.createdAt,
          updatedAt: updatedWebhook.updatedAt
        }
      });
@coderabbitai coderabbitai bot 3 minutes ago
⚠️ Potential issue

Same security concern with exposing secret key in response.

As noted earlier, exposing the complete webhook secret in responses is a security risk.

 return res.status(200).json({
   message: "Webhook updated successfully",
   webhook: {
     id: updatedWebhook.id,
     url: updatedWebhook.url,
-    secretKey: updatedWebhook.secretKey,
+    secretKeyLastFour: updatedWebhook.secretKey.slice(-4).padStart(updatedWebhook.secretKey.length, '*'),
     eventTypes: updatedWebhook.eventTypes,
     maxRetries: updatedWebhook.maxRetries,
     initialRetryDelay: updatedWebhook.initialRetryDelay,
     maxRetryDelay: updatedWebhook.maxRetryDelay,
     createdAt: updatedWebhook.createdAt,
     updatedAt: updatedWebhook.updatedAt
   }
 });

