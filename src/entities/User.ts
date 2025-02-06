import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, OneToOne, OneToMany } from "typeorm";
import { Session } from "./Session";
import { EmailVerification } from "./emailVerification"
import { hash } from "bcryptjs";
import { TwoFactorAuth } from "./TwoFactorAuth";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    email: string;

    @Column({ type: 'varchar', length: 255 })
    password: string;

    @OneToOne(() => TwoFactorAuth, (tfa) => tfa.user, { cascade: true, eager: true })
    twoFactorAuth: TwoFactorAuth;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @BeforeInsert()
    async hashPassword() {
        if (this.password) {
            this.password = await hash(this.password, 10);
        }
    }
    @Column({ default: false })
    isEmailVerified!: boolean;
  
    @OneToMany(() => EmailVerification, (emailVerification) => emailVerification.user)
    emailVerifications!: EmailVerification[];

    @OneToMany(() => Session, (session) => session.user)
    sessions!: Session[];
}
