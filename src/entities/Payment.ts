import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { PaymentLink } from "./PaymentLink"

@Entity()
export class Payment {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: "varchar", length: 255, unique: true })
  paymentId: string

  @ManyToOne(() => PaymentLink, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn()
  paymentLink: PaymentLink

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  amount: number

  @Column({ type: "enum", enum: ["pending", "completed", "failed"], default: "pending" })
  status: "pending" | "completed" | "failed"

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
