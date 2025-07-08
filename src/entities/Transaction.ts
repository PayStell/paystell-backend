import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm"
import { Wallet } from "./Wallet"

export enum TransactionStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
}

export enum PaymentMethod {
  CARD = "card",
  BANK_TRANSFER = "bank_transfer",
  WALLET = "wallet",
}

export enum TransactionType {
  PAYMENT = "payment",
  CREATE_ACCOUNT = "create_account",
  PATH_PAYMENT = "path_payment",
  MERCHANT_PAYMENT = "merchant_payment", 
}

@Entity("transactions")
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id: string

  // Existing fields
  @Column({ type: "uuid", nullable: true })
  merchantId: string

  @Column({ type: "uuid", nullable: true })
  payerId: string

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount: number

  @Column({
    type: "enum",
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus

  @Column({
    type: "enum",
    enum: PaymentMethod,
    nullable: true,
  })
  paymentMethod: PaymentMethod

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown>

  @Column({ nullable: true })
  description: string

  @Column({ nullable: true })
  reference: string

  // New wallet-specific fields
  @Column({ nullable: true })
  hash: string 

  @Column({ nullable: true })
  walletId: string 

  @ManyToOne(
    () => Wallet,
    (wallet) => wallet.transactions,
    { nullable: true },
  )
  @JoinColumn({ name: "walletId" })
  wallet: Wallet

  @Column({
    type: "enum",
    enum: TransactionType,
    nullable: true,
  })
  type: TransactionType

  @Column({ nullable: true })
  sourceAccount: string 

  @Column({ nullable: true })
  destinationAccount: string 

  @Column({ nullable: true })
  assetCode: string

  @Column({ nullable: true })
  assetIssuer: string 

  @Column("decimal", { precision: 20, scale: 7, nullable: true })
  fee: string 
  @Column({ nullable: true })
  memo: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
