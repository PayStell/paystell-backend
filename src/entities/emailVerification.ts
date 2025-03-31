import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";

//
@Entity()
export class EmailVerification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  token!: string;

  @Column()
  email!: string;

  @Column({ type: "timestamp" })
  expiresAt!: Date;

  @Column({ default: false })
  isVerified!: boolean;

  @ManyToOne(() => User, (user) => user.emailVerifications, {
    onDelete: "CASCADE",
  })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
