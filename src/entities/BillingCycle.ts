import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
  } from "typeorm";
  import { Subscription } from "./Subscription";
  
  export enum BillingCycleStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
  }
  
  @Entity("billing_cycles")
  export class BillingCycle {
    @PrimaryGeneratedColumn("uuid")
    id!: string;
  
    @Column()
    subscriptionId!: string;
  
    @ManyToOne(() => Subscription, (subscription) => subscription.billingCycles)
    @JoinColumn({ name: "subscriptionId" })
    subscription!: Subscription;
  
    @Column("decimal", { precision: 18, scale: 7 })
    amount!: number;
  
    @Column({ type: "timestamp" })
    billingDate!: Date;
  
    @Column({ type: "timestamp" })
    dueDate!: Date;
  
    @Column({
      type: "enum",
      enum: BillingCycleStatus,
      default: BillingCycleStatus.PENDING,
    })
    status!: BillingCycleStatus;
  
    @Column({ type: "int", default: 0 })
    retryCount!: number;
  
    @Column({ type: "timestamp", nullable: true })
    lastRetryAt?: Date;
  
    @Column({ type: "timestamp", nullable: true })
    nextRetryAt?: Date;
  
    @Column({ type: "timestamp", nullable: true })
    paidAt?: Date;
  
    @Column({ nullable: true })
    transactionHash?: string;
  
    @Column({ nullable: true })
    failureReason?: string;
  
    @Column({ type: "json", nullable: true })
    paymentData?: Record<string, any>;
  
    @CreateDateColumn()
    createdAt!: Date;
  
    @UpdateDateColumn()
    updatedAt!: Date;
  }