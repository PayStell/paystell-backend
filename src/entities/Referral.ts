import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from "typeorm"
import { User } from "./User"
import { ReferralReward } from "./ReferralReward"
import { ReferralStatus } from "../enums/ReferralStatus"

@Entity("referrals")
@Index(["referralCode"], { unique: true })
@Index(["referrerId", "refereeId"], { unique: true })
export class Referral {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: "referrer_id" })
  referrerId!: number

  @Column({ name: "referee_id", nullable: true })
  refereeId?: number

  @Column({ name: "referral_code", unique: true, length: 20 })
  referralCode!: string

  @Column({
    type: "enum",
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status!: ReferralStatus

  @Column({ name: "conversion_date", nullable: true })
  conversionDate?: Date

  @Column({ name: "expires_at", nullable: true })
  expiresAt?: Date

  @Column({ name: "metadata", type: "jsonb", nullable: true })
  metadata?: Record<string, any>

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date

  // Relations
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: "referrer_id" })
  referrer!: User

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: "referee_id" })
  referee?: User

  @OneToMany(
    () => ReferralReward,
    (reward) => reward.referral,
  )
  rewards!: ReferralReward[]
}
