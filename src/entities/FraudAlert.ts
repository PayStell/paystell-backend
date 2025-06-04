import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
  } from "typeorm";
  
  export enum FraudAlertStatus {
    PENDING = "pending",
    APPROVED = "approved",
    BLOCKED = "blocked",
  }
  
  export enum RiskLevel {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical",
  }
  
  @Entity("fraud_alerts")
  export class FraudAlert {
    @PrimaryGeneratedColumn("uuid")
    id: string;
  
    @Column({ type: "uuid" })
    transactionId: string;
  
    @Column({ type: "uuid" })
    merchantId: string;
  
    @Column({ type: "uuid", nullable: true })
    payerId: string;
  
    @Column({ type: "decimal", precision: 10, scale: 2 })
    amount: number;
  
    @Column({ type: "int" })
    riskScore: number;
  
    @Column({
      type: "enum",
      enum: RiskLevel,
    })
    riskLevel: RiskLevel;
  
    @Column({
      type: "enum",
      enum: FraudAlertStatus,
      default: FraudAlertStatus.PENDING,
    })
    status: FraudAlertStatus;
  
    @Column({ type: "jsonb" })
    rulesTriggered: string[];
  
    @Column({ type: "jsonb", nullable: true })
    metadata: Record<string, unknown>;
  
    @Column({ nullable: true })
    reviewNotes: string;
  
    @Column({ nullable: true })
    reviewedBy: string;
  
    @Column({ nullable: true })
    reviewedAt: Date;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }