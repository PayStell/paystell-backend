import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { MerchantEntity } from "./Merchant.entity";

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => MerchantEntity, (merchant) => merchant.webhooks)
  @JoinColumn({ name: "merchantId" })
  merchant: MerchantEntity;
}
