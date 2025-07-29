import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum WhitelistType {
  IP = "ip",
  USER = "user",
  MERCHANT = "merchant",
}

@Entity("rate_limit_whitelist")
export class RateLimitWhitelist {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: WhitelistType,
  })
  type: WhitelistType;

  @Column()
  @Index({ unique: true })
  value: string;

  @Column({ nullable: true })
  reason: string;

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
