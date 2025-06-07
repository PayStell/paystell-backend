import { ProgramConditions } from "../interfaces/ProgramConditions"
import { ProgramStatus } from "../enums/ProgramStatus"
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity("referral_programs")
export class ReferralProgram {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ length: 255 })
  name!: string

  @Column({ type: "text", nullable: true })
  description?: string

  @Column({ name: "referrer_reward", type: "decimal", precision: 18, scale: 8 })
  referrerReward!: string

  @Column({ name: "referee_reward", type: "decimal", precision: 18, scale: 8 })
  refereeReward!: string

  @Column({ name: "reward_currency", length: 10, default: "USD" })
  rewardCurrency!: string

  @Column({ type: "jsonb", nullable: true })
  conditions?: ProgramConditions

  @Column({ name: "start_date" })
  startDate!: Date

  @Column({ name: "end_date", nullable: true })
  endDate?: Date

  @Column({
    type: "enum",
    enum: ProgramStatus,
    default: ProgramStatus.DRAFT,
  })
  status!: ProgramStatus

  @Column({ name: "max_rewards_per_user", nullable: true })
  maxRewardsPerUser?: number

  @Column({ name: "total_budget", type: "decimal", precision: 18, scale: 8, nullable: true })
  totalBudget?: string

  @Column({ name: "used_budget", type: "decimal", precision: 18, scale: 8, default: "0" })
  usedBudget!: string

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date
}
