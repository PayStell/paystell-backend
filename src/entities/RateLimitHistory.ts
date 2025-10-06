import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("rate_limit_history")
export class RateLimitHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", nullable: true })
  @Index()
  userId?: string;

  @Column({ nullable: true })
  @Index()
  userRole?: string;

  @Column({ type: "uuid", nullable: true })
  @Index()
  merchantId?: string;

  @Column({ nullable: true })
  merchantType?: string;

  @Column()
  @Index()
  endpoint: string;

  @Column()
  @Index()
  ip: string;

  @Column({ type: "int" })
  requestCount: number;

  @Column({ type: "int", nullable: true })
  limitUsed: number;

  @Column({ default: false })
  wasThrottled: boolean;

  @Column({ default: false })
  wasBurst: boolean;

  @Column({ nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  @Index()
  timestamp: Date;
}
