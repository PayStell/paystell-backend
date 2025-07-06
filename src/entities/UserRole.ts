import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";
import { Role } from "./Role";
import { MerchantEntity } from "./Merchant.entity";

@Entity("user_roles")
@Index(["userId", "roleId", "merchantId"], { unique: true })
export class UserRole {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column()
  userId!: number;

  @ManyToOne(() => Role, { onDelete: "CASCADE" })
  @JoinColumn({ name: "roleId" })
  role!: Role;

  @Column()
  roleId!: string;

  @ManyToOne(() => MerchantEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "merchantId" })
  merchant!: MerchantEntity;

  @Column()
  merchantId!: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
