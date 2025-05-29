import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
  } from "typeorm";
  import { MerchantEntity } from "./Merchant.entity";
  import { BillingCycle } from "./BillingCycle";
  import { SubscriptionEvent } from "./SubscriptionEvent";
  
  export enum SubscriptionStatus {
    ACTIVE = "active",
    PAUSED = "paused",
    CANCELLED = "cancelled",
    EXPIRED = "expired",
    PAST_DUE = "past_due",
  }
  
  export enum BillingInterval {
    MONTHLY = "monthly",
    YEARLY = "yearly",
    WEEKLY = "weekly",
    CUSTOM = "custom",
  }
  
  @Entity("subscriptions")
  export class Subscription {
    @PrimaryGeneratedColumn("uuid")
    id!: string;
  
    @Column({ unique: true })
    subscriptionId!: string;
  
    @Column()
    customerId!: string;
  
    @Column()
    customerEmail!: string;
  
    @Column()
    merchantId!: string;
  
    @ManyToOne(() => MerchantEntity)
    @JoinColumn({ name: "merchantId" })
    merchant!: MerchantEntity;
  
    @Column("decimal", { precision: 18, scale: 7 })
    amount!: number;
  
    @Column()
    currency!: string;
  
    @Column()
    tokenAddress!: string;
  
    @Column({
      type: "enum",
      enum: BillingInterval,
      default: BillingInterval.MONTHLY,
    })
    billingInterval!: BillingInterval;
  
    @Column({ type: "int", default: 1 })
    intervalCount!: number;
  
    @Column({
      type: "enum",
      enum: SubscriptionStatus,
      default: SubscriptionStatus.ACTIVE,
    })
    status!: SubscriptionStatus;
  
    @Column({ type: "timestamp" })
    startDate!: Date;
  
    @Column({ type: "timestamp", nullable: true })
    endDate?: Date;
  
    @Column({ type: "timestamp" })
    nextBillingDate!: Date;
  
    @Column({ type: "int", default: 0 })
    failedPaymentCount!: number;
  
    @Column({ type: "int", default: 3 })
    maxRetries!: number;
  
    @Column({ type: "json", nullable: true })
    metadata?: Record<string, any>;
  
    @OneToMany(() => BillingCycle, (billingCycle) => billingCycle.subscription)
    billingCycles!: BillingCycle[];
  
    @OneToMany(() => SubscriptionEvent, (event) => event.subscription)
    events!: SubscriptionEvent[];
  
    @CreateDateColumn()
    createdAt!: Date;
  
    @UpdateDateColumn()
    updatedAt!: Date;
  }