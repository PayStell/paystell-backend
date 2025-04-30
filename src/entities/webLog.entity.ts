import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { WebhookPayload } from 'src/interfaces/webhook.interfaces';

@Entity()
export class WebhookLog {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  merchantId: string;

  @Column()
  webhookUrl: string;

  @Column({ type: 'enum', enum: ['success', 'failed'] })
  status: 'success' | 'failed';

  @Column('json')
  payload: WebhookPayload; // or WebhookPayload interface

  @Column('json', { nullable: true })
  response?: Record<string, unknown> | null;

  @Column({ nullable: true })
  statusCode?: number;

  @Column({ nullable: true })
  errorMessage?: string;

  @Column({ default: 0 })
  retryCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}