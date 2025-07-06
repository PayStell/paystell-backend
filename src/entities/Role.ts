import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { MerchantEntity } from "./Merchant.entity";
import { UserRole } from "./UserRole";
import { RolePermission } from "./RolePermission";

@Entity("roles")
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  isDefault!: boolean; // For default roles like Owner, Admin, etc.

  @ManyToOne(() => MerchantEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "merchantId" })
  merchant!: MerchantEntity;

  @Column()
  merchantId!: string;

  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles!: UserRole[];

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
  rolePermissions!: RolePermission[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
