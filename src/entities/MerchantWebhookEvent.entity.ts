import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { WebhookPayload } from "../interfaces/webhook.interfaces";
import { MerchantWebhookEventEntityStatus } from "../enums/MerchantWebhookEventStatus";
import { IsEnum } from "class-validator";
import { MerchantWebhookEntity } from "./MerchantWebhook.entity";

@Entity("merchant_webhook_events")
export class MerchantWebhookEventEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  jobId: string;

  @Column()
  merchantId: string;
  
  @Column("uuid")
  webhookId: string;

  @Column()
  webhookUrl: string;

  @Column("simple-json")
  payload: WebhookPayload;
  
  @Column("simple-json", { nullable: true })
  headers: Record<string, string>;
  
  @Column("text", { nullable: true })
  signature: string;

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

  @Column({ type: "int", default: 5 })
  maxAttempts?: number;
  
  @Column({ type: "int", nullable: true })
  responseStatusCode?: number;
  
  @Column({ type: "text", nullable: true })
  responseBody?: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: "timestamp", nullable: true })
  completedAt?: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  
  @ManyToOne(() => MerchantWebhookEntity, webhook => webhook.events)
  @JoinColumn({ name: "webhookId" })
  webhook: MerchantWebhookEntity;
}
