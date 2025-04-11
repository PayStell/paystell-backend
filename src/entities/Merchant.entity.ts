// src/entities/Merchant.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { MerchantWebhookEntity } from "./MerchantWebhook.entity";

@Entity("merchants")
export class MerchantEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  apiKey: string;

  @Column()
  secret: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ default: true })
  isActive: boolean;
  @Column({ nullable: true })
  business_name: string;

  @Column({ nullable: true })
  business_description: string;

  @Column({ nullable: true })
  business_address: string;

  @Column({ nullable: true })
  business_phone: string;

  @Column({ nullable: true })
  business_email: string;

  @Column({ nullable: true })
  business_logo_url: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => MerchantWebhookEntity, (webhook) => webhook.merchant, {
    cascade: true,
  })
  webhooks: MerchantWebhookEntity[];
}

// src/entities/MerchantWebhook.entity.ts
