import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm"
import { User } from "./User"
import { Referral } from "./Referral"
import { RewardStatus } from "../enums/RewardStatus"
import { RewardType } from "../enums/RewardType"

@Entity("referral_rewards")
export class ReferralReward {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: "referral_id" })
  referralId!: number

  @Column({ name: "user_id" })
  userId!: number

  @Column({ type: "decimal", precision: 18, scale: 8 })
  amount!: string

  @Column({ length: 10, default: "USD" })
  currency!: string

  @Column({
    type: "enum",
    enum: RewardStatus,
    default: RewardStatus.PENDING,
  })
  status!: RewardStatus

  @Column({
    type: "enum",
    enum: RewardType,
  })
  type!: RewardType

  @Column({ name: "paid_at", nullable: true })
  paidAt?: Date

  @Column({ name: "transaction_hash", nullable: true })
  transactionHash?: string

  @Column({ name: "metadata", type: "jsonb", nullable: true })
  metadata?: Record<string, unknown>

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date

  // Relations
  @ManyToOne(
    () => Referral,
    (referral) => referral.rewards,
  )
  @JoinColumn({ name: "referral_id" })
  referral!: Referral

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: "user_id" })
  user!: User
}
