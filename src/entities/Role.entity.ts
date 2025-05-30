import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, ManyToOne, JoinTable } from 'typeorm';
import { Permission } from './Permission.entity';
import { User } from './User';
import { MerchantEntity } from './Merchant.entity';

@Entity('roles')
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    description: string;

    @Column({ default: false })
    isSystem: boolean;

    @ManyToOne(() => MerchantEntity, merchant => merchant.roles)
    merchant: MerchantEntity;

    @ManyToMany(() => Permission, permission => permission.roles)
    permissions: Permission[];

    @ManyToMany(() => User, user => user.roles)
    @JoinTable({
        name: 'user_roles',
        joinColumn: { name: 'role_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' }
    })
    users: User[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 