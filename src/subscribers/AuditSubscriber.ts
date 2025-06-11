import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from "typeorm";
import { auditService, AuditContext } from "../services/AuditService";
import { User } from "../entities/User";
import { PaymentLink } from "../entities/PaymentLink";
import { MerchantEntity } from "../entities/Merchant.entity";
import { MerchantWebhookEntity } from "../entities/MerchantWebhook.entity";
import { Session } from "../entities/Session";
import { AsyncLocalStorage } from "async_hooks";

// Create async local storage for request context
export const auditContext = new AsyncLocalStorage<AuditContext>();

// Define entities that should be audited
const AUDITED_ENTITIES = [
  User,
  PaymentLink,
  MerchantEntity,
  MerchantWebhookEntity,
  Session,
];

// Define a union type for audited entities
type AuditedEntity =
  | User
  | PaymentLink
  | MerchantEntity
  | MerchantWebhookEntity
  | Session;

@EventSubscriber()
export class AuditSubscriber
  implements EntitySubscriberInterface<AuditedEntity>
{
  listenTo(): typeof User {
    return User;
  }

  /**
   * Called after entity insertion.
   */
  async afterInsert(event: InsertEvent<AuditedEntity>) {
    const context = auditContext.getStore();
    if (!context) return;

    // Check if this entity should be audited
    if (!this.shouldAuditEntity(event.entity)) return;

    try {
      await auditService.createAuditLog({
        entityType: event.metadata.name,
        entityId: this.getEntityId(event.entity),
        action: "CREATE",
        newValues: this.sanitizeEntity(event.entity),
        context,
      });
    } catch (error) {
      console.error("Failed to create audit log for INSERT:", error);
    }
  }

  /**
   * Called after entity update.
   */
  async afterUpdate(event: UpdateEvent<AuditedEntity>) {
    const context = auditContext.getStore();
    if (!context) return;

    // Check if this entity should be audited
    if (!this.shouldAuditEntity(event.entity)) return;

    try {
      await auditService.createAuditLog({
        entityType: event.metadata.name,
        entityId: this.getEntityId(event.entity),
        action: "UPDATE",
        oldValues: this.sanitizeEntity(event.databaseEntity),
        newValues: this.sanitizeEntity(event.entity),
        context,
      });
    } catch (error) {
      console.error("Failed to create audit log for UPDATE:", error);
    }
  }

  /**
   * Called after entity removal.
   */
  async afterRemove(event: RemoveEvent<AuditedEntity>) {
    const context = auditContext.getStore();
    if (!context) return;

    const entityToCheck = event.entity || event.databaseEntity;
    if (!this.shouldAuditEntity(entityToCheck)) return;

    try {
      await auditService.createAuditLog({
        entityType: event.metadata.name,
        entityId: this.getEntityId(entityToCheck),
        action: "DELETE",
        oldValues: this.sanitizeEntity(entityToCheck),
        context,
      });
    } catch (error) {
      console.error("Failed to create audit log for DELETE:", error);
    }
  }

  private shouldAuditEntity(entity: unknown): entity is AuditedEntity {
    if (!entity || typeof entity !== "object") return false;

    // Check if the entity constructor is in our audited entities list
    return AUDITED_ENTITIES.some(
      (EntityClass) => entity instanceof EntityClass,
    );
  }

  private getEntityId(entity: AuditedEntity | null | undefined): string {
    if (!entity) return "unknown";

    // Handle different ID types
    if ("id" in entity && entity.id) {
      return entity.id.toString();
    }

    return "unknown";
  }

  private sanitizeEntity(
    entity: AuditedEntity | null | undefined,
  ): Record<string, unknown> {
    if (!entity) return {};

    // Convert entity to plain object
    const plainObject = { ...entity } as Record<string, unknown>;

    // Remove sensitive fields
    const sensitiveFields = [
      "password",
      "secret",
      "apiKey",
      "token",
      "refreshToken",
      "verificationCode",
      "twoFactorSecret",
    ];

    for (const field of sensitiveFields) {
      if (plainObject[field]) {
        plainObject[field] = "[REDACTED]";
      }
    }

    return plainObject;
  }
}
