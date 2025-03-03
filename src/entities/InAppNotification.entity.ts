import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum NotificationType {
    BROADCAST = "broadcast",
    MERCHANT = "merchant",
    ADMIN = "admin"
}

export enum NotificationCategory {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  SUCCESS = "success",
}

export enum NotificationStatus {
  UNREAD = "unread",
  READ = "read",
  ARCHIVED = "archived",
}

@Entity("in_app_notifications")
export class InAppNotificationEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({
    type: "enum",
    enum: NotificationType,
    default: NotificationType.ADMIN,
  })
  notificationType: NotificationType;

  @Column({
    type: "enum",
    enum: NotificationCategory,
    default: NotificationCategory.INFO,
  })
  category: NotificationCategory;

  @Column({ nullable: true })
  recipientId: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  readAt: Date;

  @Column({
    type: "enum",
    enum: NotificationStatus,
    default: NotificationStatus.UNREAD,
  })
  status: NotificationStatus;

  @Column({ nullable: true })
  link: string;

  @Column({ type: "json", nullable: true })
  metadata: any;

  @Column({ default: 0 })
  priority: number;

  @Column({ nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
