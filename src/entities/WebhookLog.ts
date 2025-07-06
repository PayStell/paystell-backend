import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { WebhookPayload } from "../interfaces/webhook.interfaces";

@Entity("webhook_logs")
@Index(["merchantId"])
@Index(["status"])
@Index(["createdAt"])
@Index(["merchantId", "status"])
export class WebhookLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  merchantId: string;

  @Column()
  webhookUrl: string;

  @Column({
    type: "enum",
    enum: ["success", "failed"],
  })
  status: "success" | "failed";

  @Column("json")
  payload: WebhookPayload;

  @Column("json", { nullable: true })
  response?: Record<string, unknown>;

  @Column({ nullable: true })
  statusCode?: number;

  @Column({ type: "text", nullable: true })
  errorMessage?: string;

  @Column({ default: 0 })
  retryCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
