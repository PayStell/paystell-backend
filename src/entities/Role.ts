import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Merchant } from './Merchant';
import { RolePermission } from './RolePermission';
import { UserRole } from './UserRole';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // ex: 'Admin', 'Operator', 'Viewer'

  @ManyToOne(() => Merchant)
  merchant: Merchant;

  @OneToMany(() => RolePermission, (rp) => rp.role)
  permissions: RolePermission[];

  @OneToMany(() => UserRole, (ur) => ur.role)
  userRoles: UserRole[];
}
