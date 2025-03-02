import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity()
export class WalletVerification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    walletAddress: string;

    @Column()
    verificationToken: string;

    @Column()
    verificationCode: string;

    @Column({
        type: 'enum',
        enum: ['pending', 'verified', 'expired'],
        default: 'pending'
    })
    status: string;

    @Column()
    expiresAt: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
