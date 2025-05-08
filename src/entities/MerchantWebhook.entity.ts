import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { MerchantEntity } from "./Merchant.entity";
import { MerchantWebhookEventEntity } from "./MerchantWebhookEvent.entity";

@Entity("merchant_webhooks")
export class MerchantWebhookEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  merchantId: string;

  @Column()
  url: string;

  @Column({ default: true })
  isActive: boolean;
  
  @Column({ nullable: true, select: false, length: 128 })
  secretKey: string;
  
  @Column("simple-array", { nullable: true })
  eventTypes: string[];
  
  @Column({ default: 5 })
  maxRetries: number;
  
  @Column({ default: 5000 })
  initialRetryDelay: number;
  
  @Column({ default: 3600000 })
  maxRetryDelay: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => MerchantEntity, (merchant) => merchant.webhooks)
  @JoinColumn({ name: "merchantId" })
  merchant: MerchantEntity;
  
  @OneToMany(() => MerchantWebhookEventEntity, event => event.webhook)
  events: MerchantWebhookEventEntity[];
}
