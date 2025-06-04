import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("audit_logs")
@Index(["entityType", "entityId"])
@Index(["userId"])
@Index(["createdAt"])
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  entityType: string; // 'User', 'PaymentLink', 'MerchantEntity', etc.

  @Column()
  entityId: string;

  @Column({
    type: "enum",
    enum: ["CREATE", "UPDATE", "DELETE"],
  })
  action: "CREATE" | "UPDATE" | "DELETE";

  @Column("json", { nullable: true })
  oldValues?: Record<string, unknown>;

  @Column("json", { nullable: true })
  newValues?: Record<string, unknown>;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  userEmail?: string;

  @Column()
  ipAddress: string;

  @Column()
  userAgent: string;

  @Column({ nullable: true })
  sessionId?: string;

  @CreateDateColumn()
  createdAt: Date;
}
