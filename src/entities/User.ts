import { IsEmail, IsNotEmpty, IsEnum, MinLength } from "class-validator";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, OneToOne, OneToMany } from "typeorm";
import { UserRole } from "../enums/UserRole";
import { Session } from "./Session";
import { EmailVerification } from "./emailVerification";
import { TwoFactorAuth } from "./TwoFactorAuth";
import { hash } from "bcryptjs";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    @IsNotEmpty()
    name!: string;

    @Column({ unique: true })
    @IsEmail()
    email!: string;

    @Column()
    @MinLength(8) // minimum length for password
    password!: string;

    @Column({ 
        type: 'enum',
        enum: UserRole,
        default: UserRole.USER
    })
    @IsEnum(UserRole)
    role!: UserRole;

    @Column({ nullable: true })
    description?: string;

    @OneToOne(() => TwoFactorAuth, (tfa) => tfa.user, { cascade: true, eager: true })
    twoFactorAuth: TwoFactorAuth;

    @Column({ nullable: true })
    logoUrl?: string;

    @Column({ nullable: true })
    walletAddress?: string;

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

    @Column({ default: false })
    isWalletVerified!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column({ nullable: true })
    tokenExp?: number;
}