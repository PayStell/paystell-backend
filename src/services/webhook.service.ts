import { 
  MerchantWebhook, 
  WebhookSubscriptionRequest 
} from "../interfaces/webhook.interfaces";
import { Repository } from "typeorm";
import AppDataSource from "../config/db";
import { MerchantWebhookEntity } from "./../entities/MerchantWebhook.entity";
import { MerchantWebhookQueueService } from "./merchantWebhookQueue.service";
import { WebhookEventType } from "../enums/WebhookEventTypes";
import { v4 as uuidv4 } from "uuid";
import { CryptoGeneratorService } from "./cryptoGenerator.service";
import { MerchantWebhookEventEntity } from "../entities/MerchantWebhookEvent.entity";
import { MerchantWebhookEventEntityStatus } from "../enums/MerchantWebhookEventStatus";

export class WebhookService {
  private merchantWebhookrepository: Repository<MerchantWebhookEntity>;
  private merchantWebhookEventRepository: Repository<MerchantWebhookEventEntity>;
  private merchantWebhookQueueService?: MerchantWebhookQueueService;
  private cryptoGeneratorService: CryptoGeneratorService;

  constructor() {
    this.merchantWebhookrepository = AppDataSource.getRepository(
      MerchantWebhookEntity,
    );
    this.merchantWebhookEventRepository = AppDataSource.getRepository(
      MerchantWebhookEventEntity,
    );
    this.cryptoGeneratorService = new CryptoGeneratorService();
  }

  private getQueueService(): MerchantWebhookQueueService {
    if (!this.merchantWebhookQueueService) {
      this.merchantWebhookQueueService = new MerchantWebhookQueueService();
    }
    return this.merchantWebhookQueueService;
  }

  async register(merchantId: string, webhookData: WebhookSubscriptionRequest): Promise<MerchantWebhook> {
    // Check if merchant already has a webhook
    const existingWebhook = await this.merchantWebhookrepository.findOne({
      where: {
        merchantId,
      },
    });
    
    if (existingWebhook) {
      throw new Error("Merchant already has a registered webhook. Use update instead.");
    }

    // Generate secret key if not provided
    const secretKey = webhookData.secretKey || this.cryptoGeneratorService.generateSecret();
    
    // Default to all event types if not specified
    const eventTypes = webhookData.eventTypes || Object.values(WebhookEventType);

    const webhook = this.merchantWebhookrepository.create({
      id: uuidv4(),
      merchantId,
      url: webhookData.url,
      secretKey,
      eventTypes,
      isActive: true,
      maxRetries: webhookData.maxRetries || 5,
      initialRetryDelay: webhookData.initialRetryDelay || 5000,
      maxRetryDelay: webhookData.maxRetryDelay || 3600000
    });

    const savedWebhook = await this.merchantWebhookrepository.save(webhook);
    return savedWebhook;
  }

  async update(merchantId: string, webhookData: Partial<WebhookSubscriptionRequest>): Promise<MerchantWebhook> {
    const existingWebhook = await this.merchantWebhookrepository.findOne({
      where: {
        merchantId,
      },
    });

    if (!existingWebhook) {
      throw new Error("Webhook does not exist. Register Webhook first.");
    }

    // Update only the fields that are provided
    if (webhookData.url) existingWebhook.url = webhookData.url;
    if (webhookData.secretKey) existingWebhook.secretKey = webhookData.secretKey;
    if (webhookData.eventTypes) existingWebhook.eventTypes = webhookData.eventTypes;
    if (webhookData.maxRetries !== undefined) existingWebhook.maxRetries = webhookData.maxRetries;
    if (webhookData.initialRetryDelay !== undefined) existingWebhook.initialRetryDelay = webhookData.initialRetryDelay;
    if (webhookData.maxRetryDelay !== undefined) existingWebhook.maxRetryDelay = webhookData.maxRetryDelay;

    const savedUpdatedWebhook = await this.merchantWebhookrepository.save(existingWebhook);
    return savedUpdatedWebhook;
  }

  async getMerchantWebhook(merchantId: string, includeInactive?: boolean): Promise<MerchantWebhook | null> {
    try {
      const merchantWebhook = await this.merchantWebhookrepository.findOne({
        where: {
          merchantId,
          ...(includeInactive !== true ? { isActive: true } : {})
        },
      });
      
      if (!merchantWebhook) {
        return null;
      }

      return merchantWebhook;
    } catch (err) {
      console.error("Failed to get merchant webhook", err);
      return null;
    }
  }

  async deleteWebhook(merchantId: string): Promise<boolean> {
    try {
      const merchantWebhook = await this.merchantWebhookrepository.findOne({
        where: {
          merchantId,
        },
      });
      
      if (!merchantWebhook) {
        return false;
      }

      // Soft delete by setting isActive to false
      merchantWebhook.isActive = false;
      await this.merchantWebhookrepository.save(merchantWebhook);
      return true;
    } catch (err) {
      console.error("Failed to delete merchant webhook", err);
      return false;
    }
  }

  /**
   * Get a webhook by its ID
   * @param id The webhook ID
   * @returns The webhook or null if not found
   */
  async getWebhookById(id: string): Promise<MerchantWebhook | null> {
    try {
      const webhook = await this.merchantWebhookrepository.findOne({
        where: { id }
      });
      
      return webhook || null;
    } catch (error) {
      console.error(`Error fetching webhook by ID ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Get webhook events for a specific webhook with pagination and filtering
   * @param webhookId The webhook ID
   * @param limit Maximum number of events to return
   * @param offset Number of events to skip (for pagination)
   * @param status Optional status filter (pending, completed, failed)
   * @returns Array of webhook events
   */
  async getWebhookEvents(
    webhookId: string,
    limit: number = 10,
    offset: number = 0,
    status?: string
  ): Promise<MerchantWebhookEventEntity[]> {
    try {
      // Build the base query
      const query = this.merchantWebhookEventRepository
        .createQueryBuilder('event')
        .where('event.webhookId = :webhookId', { webhookId })
        .orderBy('event.createdAt', 'DESC')
        .limit(limit)
        .offset(offset);
      
      // Add status filter if provided
      if (status) {
        query.andWhere('event.status = :status', { 
          status: status as MerchantWebhookEventEntityStatus 
        });
      }
      
      return await query.getMany();
    } catch (error) {
      console.error(`Error fetching webhook events for webhook ${webhookId}:`, error);
      return [];
    }
  }
  
  /**
   * Get the total count of webhook events for a specific webhook
   * @param webhookId The webhook ID
   * @param status Optional status filter
   * @returns Total count of matching events
   */
  async getWebhookEventsCount(
    webhookId: string,
    status?: string
  ): Promise<number> {
    try {
      // Build the base query
      const query = this.merchantWebhookEventRepository
        .createQueryBuilder('event')
        .where('event.webhookId = :webhookId', { webhookId });
      
      // Add status filter if provided
      if (status) {
        query.andWhere('event.status = :status', { 
          status: status as MerchantWebhookEventEntityStatus 
        });
      }
      
      return await query.getCount();
    } catch (error) {
      console.error(`Error counting webhook events for webhook ${webhookId}:`, error);
      return 0;
    }
  }
  
  /**
   * Get webhook delivery metrics for a merchant or specific webhook
   * @param merchantId The merchant ID
   * @param webhookId Optional webhook ID to filter metrics for a specific webhook
   * @returns Webhook delivery metrics
   */
  async getWebhookMetrics(merchantId: string, webhookId?: string): Promise<any> {
    try {
      // Get queue service for overall metrics
      const queueService = this.getQueueService();
      const metrics = await queueService.getQueueMetrics(merchantId);
      
      // If webhook ID is provided, add specific metrics for that webhook
      if (webhookId) {
        // Get status counts
        const statusCounts = await this.merchantWebhookEventRepository
          .createQueryBuilder('event')
          .select('event.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .where('event.webhookId = :webhookId', { webhookId })
          .groupBy('event.status')
          .getRawMany();
        
        // Convert to a more usable format
        const webhookMetrics = statusCounts.reduce(
          (acc, curr) => {
            acc[curr.status] = parseInt(curr.count);
            return acc;
          },
          {
            [MerchantWebhookEventEntityStatus.PENDING]: 0,
            [MerchantWebhookEventEntityStatus.COMPLETED]: 0,
            [MerchantWebhookEventEntityStatus.FAILED]: 0,
          }
        );
        
        // Calculate success rate for this webhook
        const total = 
          webhookMetrics[MerchantWebhookEventEntityStatus.COMPLETED] + 
          webhookMetrics[MerchantWebhookEventEntityStatus.FAILED];
        
        const successRate = total > 0 
          ? (webhookMetrics[MerchantWebhookEventEntityStatus.COMPLETED] / total) * 100 
          : 100;
        
        // Add to the metrics object - use type assertion to allow adding new property
        (metrics as any).webhook = {
          completed: webhookMetrics[MerchantWebhookEventEntityStatus.COMPLETED],
          failed: webhookMetrics[MerchantWebhookEventEntityStatus.FAILED],
          pending: webhookMetrics[MerchantWebhookEventEntityStatus.PENDING],
          successRate: successRate,
        };
      }
      
      return metrics;
    } catch (error) {
      console.error(`Error fetching webhook metrics:`, error);
      return {
        overall: {
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          waiting: 0,
          successRate: 0,
        },
      };
    }
  }

  async getAvailableEventTypes(): Promise<string[]> {
    return Object.values(WebhookEventType);
  }

  async generateSecret(): Promise<string> {
    return this.cryptoGeneratorService.generateSecret();
  }
}
