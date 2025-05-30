import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn
} from "typeorm";
import { Role } from "./Role.entity";
import { User } from "./User";

@Entity("role_audit_logs")
export class RoleAuditLog {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    action: string; // 'create', 'update', 'delete', 'assign', 'revoke'

    @Column({ type: 'jsonb', nullable: true })
    changes: Record<string, any>;

    @ManyToOne(() => Role)
    @JoinColumn({ name: "role_id" })
    role: Role;

    @ManyToOne(() => User)
    @JoinColumn({ name: "performed_by" })
    performedBy: User;

    @Column({ nullable: true })
    description: string;

    @CreateDateColumn()
    createdAt: Date;
} 