import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
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

  @Column({ unique: true })
  slug!: string;

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

  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User;

  @Column()
  userId: number;
}
