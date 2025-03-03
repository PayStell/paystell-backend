import { MerchantWebhook } from '../interfaces/webhook.interfaces'
import { Repository } from "typeorm";
import AppDataSource from "../config/db";
import { MerchantWebhookEntity } from "./../entities/MerchantWebhook.entity";
import { MerchantWebhookQueueService } from "./MerchantWebhookQueue.service";

export class WebhookService {
  private merchantWebhookrepository: Repository<MerchantWebhookEntity>;
  private merchantWebhookQueueService?: MerchantWebhookQueueService;

  constructor() {
    this.merchantWebhookrepository = AppDataSource.getRepository(
      MerchantWebhookEntity
    );
  }

  private getQueueService(): MerchantWebhookQueueService {
    if (!this.merchantWebhookQueueService) {
      this.merchantWebhookQueueService = new MerchantWebhookQueueService();
    }
    return this.merchantWebhookQueueService;
  }


    async register (webhookdata: MerchantWebhook): Promise<MerchantWebhook> {
        const webhookExists = await this.merchantWebhookrepository.findOne({
            where: {
                id: webhookdata.id,
                merchantId: webhookdata.merchantId
            }
        })
        if (webhookExists) {
            throw new Error('Webhook already exists')
        }

    const webhook = this.merchantWebhookrepository.create(webhookdata);
    const savedWebhook = this.merchantWebhookrepository.save(webhook);

    return savedWebhook;
  }

  async update(webhookData: MerchantWebhook): Promise<MerchantWebhook> {
    const existingWebhook = await this.merchantWebhookrepository.findOne({
      where: {
        id: webhookData.id,
        merchantId: webhookData.merchantId,
      },
    });

    if (!existingWebhook) {
      throw new Error("Webhook does not exist. Register Webhook");
    }

    const updatedWebhook = this.merchantWebhookrepository.merge(
      existingWebhook,
      webhookData
    );

    const savedUpdatedWebhook =
      this.merchantWebhookrepository.save(updatedWebhook);

    return savedUpdatedWebhook;
  }

  async getMerchantWebhook(
    merchantId: string
  ): Promise<MerchantWebhook | null> {
    try {
      const merchantWebhook = await this.merchantWebhookrepository.findOne({
        where: {
          merchantId,
        },
      });
      if (!merchantWebhook) {
        throw new Error("Merchant web hook not found");
      }
      if (!merchantWebhook.isActive) {
        throw new Error("Merchant web hook not active");
      }
      return merchantWebhook;
    } catch (err) {
      console.error("Failed to get merchant webhook", err);
      return null;
    }
  }
}