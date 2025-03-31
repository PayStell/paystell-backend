import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

@Entity()
export class PaymentLink {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  sku!: string;

  @Column("decimal", { precision: 10, scale: 2 })
  amount!: number;

  @Column()
  currency!: string;

  @Column({
    type: "enum",
    enum: ["active", "inactive", "expired"],
    default: "active",
  })
  status!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  expirationDate?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User;

  @Column()
  userId: number;
}
