import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum BlacklistType {
  IP = "ip",
  USER = "user",
  MERCHANT = "merchant",
}

export enum BlacklistReason {
  MANUAL = "manual",
  ABUSE = "abuse",
  FRAUD = "fraud",
  EXCESSIVE_USAGE = "excessive_usage",
}

@Entity("rate_limit_blacklist")
export class RateLimitBlacklist {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: BlacklistType,
  })
  type: BlacklistType;

  @Column()
  @Index({ unique: true })
  value: string;

  @Column({
    type: "enum",
    enum: BlacklistReason,
    default: BlacklistReason.MANUAL,
  })
  reason: BlacklistReason;

  @Column({ nullable: true })
  details: string;

  @Column({ nullable: true })
  addedBy: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
