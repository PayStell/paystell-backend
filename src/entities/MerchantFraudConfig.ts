import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
  } from "typeorm";
  import { MerchantEntity } from "./Merchant.entity";
  
  @Entity("merchant_fraud_configs")
  export class MerchantFraudConfig {
    @PrimaryGeneratedColumn("uuid")
    id: string;
  
    @OneToOne(() => MerchantEntity)
    @JoinColumn()
    merchant: MerchantEntity;
  
    @Column({ type: "uuid" })
    merchantId: string;
  
    // Risk thresholds
    @Column({ type: "int", default: 50 })
    lowRiskThreshold: number;
  
    @Column({ type: "int", default: 70 })
    mediumRiskThreshold: number;
  
    @Column({ type: "int", default: 85 })
    highRiskThreshold: number;
  
    @Column({ type: "int", default: 95 })
    criticalRiskThreshold: number;
  
    // Transaction limits
    @Column({ type: "decimal", precision: 10, scale: 2, default: 1000 })
    maxTransactionAmount: number;
  
    @Column({ type: "decimal", precision: 10, scale: 2, default: 5000 })
    dailyLimit: number;
  
    @Column({ type: "int", default: 10 })
    maxTransactionsPerHour: number;
  
    @Column({ type: "int", default: 50 })
    maxTransactionsPerDay: number;
  
    // Velocity checks
    @Column({ type: "int", default: 3 })
    maxSameAmountInHour: number;
  
    @Column({ type: "int", default: 5 })
    maxFailedAttemptsPerHour: number;
  
    // Auto-block settings
    @Column({ type: "boolean", default: true })
    autoBlockHighRisk: boolean;
  
    @Column({ type: "boolean", default: true })
    autoBlockCritical: boolean;
  
    @Column({ type: "boolean", default: false })
    requireManualReview: boolean;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }