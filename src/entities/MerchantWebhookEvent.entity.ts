import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { WebhookPayload } from "../interfaces/webhook.interfaces";
import { MerchantWebhookEventEntityStatus } from "../enums/MerchantWebhookEventStatus";
import { IsEnum } from "class-validator";

@Entity("merchant_webhook_events")
export class MerchantWebhookEventEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  jobId: string;

  @Column()
  merchantId: string;

  @Column()
  webhookUrl: string;

  @Column("json")
  payload: WebhookPayload;

  @Column({
    type: "enum",
    enum: MerchantWebhookEventEntityStatus,
    default: MerchantWebhookEventEntityStatus.PENDING,
  })
  @IsEnum(MerchantWebhookEventEntityStatus)
  status: MerchantWebhookEventEntityStatus;

  @Column({ type: "text", nullable: true })
  error?: string;

  @Column({ default: 0 })
  attemptsMade: number;

  @Column({ nullable: true })
  nextRetry?: Date;

  @Column({ nullable: true })
  maxAttempts?: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: "timestamp", nullable: true })
  completedAt?: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
