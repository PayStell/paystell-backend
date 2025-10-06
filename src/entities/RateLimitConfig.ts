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

@Entity("rate_limit_configs")
export class RateLimitConfig {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  merchantId: string;

  @ManyToOne(() => MerchantEntity)
  @JoinColumn({ name: "merchantId" })
  merchant: MerchantEntity;

  @Column({ nullable: true })
  userRole?: string;

  @Column({ nullable: true })
  merchantType?: string;

  @Column({ type: "int" })
  requestsPerSecond: number;

  @Column({ type: "int" })
  requestsPerMinute: number;

  @Column({ type: "int" })
  requestsPerHour: number;

  @Column({ type: "int" })
  requestsPerDay: number;

  @Column({ type: "float", default: 2.0 })
  burstMultiplier: number;

  @Column({ type: "int", default: 30 })
  burstDurationSeconds: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
