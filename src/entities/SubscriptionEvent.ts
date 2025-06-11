import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
  } from "typeorm";
  import { Subscription } from "./Subscription";
  
  export enum SubscriptionEventType {
    CREATED = "subscription.created",
    ACTIVATED = "subscription.activated",
    PAUSED = "subscription.paused",
    RESUMED = "subscription.resumed",
    CANCELLED = "subscription.cancelled",
    EXPIRED = "subscription.expired",
    PAYMENT_SUCCESS = "payment.success",
    PAYMENT_FAILED = "payment.failed",
    PAYMENT_RETRY = "payment.retry",
    DUNNING_STARTED = "dunning.started",
    DUNNING_COMPLETED = "dunning.completed",
  }
  
  @Entity("subscription_events")
  export class SubscriptionEvent {
    @PrimaryGeneratedColumn("uuid")
    id!: string;
  
    @Column()
    subscriptionId!: string;
  
    @ManyToOne(() => Subscription, (subscription) => subscription.events)
    @JoinColumn({ name: "subscriptionId" })
    subscription!: Subscription;
  
    @Column({
      type: "enum",
      enum: SubscriptionEventType,
    })
    eventType!: SubscriptionEventType;
  
    @Column({ type: "text", nullable: true })
    description?: string;
  
    @Column({ type: "json", nullable: true })
    eventData?: Record<string, any>;
  
    @Column({ nullable: true })
    billingCycleId?: string;
  
    @CreateDateColumn()
    createdAt!: Date;
  }