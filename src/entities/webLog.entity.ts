import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class WebhookLog {
  static createQueryBuilder(arg0: string) {
    throw new Error("Method not implemented.");
  }
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  merchantId: string;

  @Column()
  webhookUrl: string;

  @Column({ type: 'enum', enum: ['success', 'failed'] })
  status: 'success' | 'failed';

  @Column('json')
  payload: any; // or WebhookPayload interface

  @Column('json', { nullable: true })
  response?: any;

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