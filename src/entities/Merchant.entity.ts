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

  @Column({ type: "varchar", nullable: true })
  business_name: string | null;

  @Column({ type: "text", nullable: true })
  business_description: string | null;

  @Column({ type: "varchar", nullable: true })
  business_address: string | null;

  @Column({ type: "varchar", nullable: true })
  business_phone: string | null;

  @Column({ type: "varchar", nullable: true })
  business_email: string | null;

  @Column({ type: "varchar", nullable: true })
  business_logo_url: string | null;

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
