import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class RateLimitEvent {
    @PrimaryGeneratedColumn()
    id!: number;
    
    @Column()
    ip!: string;
    
    @Column()
    endpoint!: string;
    
    @Column({ nullable: true })
    userAgent?: string;
    
    @CreateDateColumn()
    timestamp!: Date;
    
    @Column({ nullable: true })
    email?: string;
    
    @Column({ nullable: true })
    userId?: number;
}