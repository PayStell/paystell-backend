import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from "class-validator";
import {
  NotificationType,
  NotificationCategory,
  NotificationStatus,
} from "../entities/InAppNotification.entity";

type MetadataValue = string | number | boolean | null;

export class CreateNotificationDTO {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  notificationType: NotificationType;

  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @IsOptional()
  @IsString()
  recipientId?: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  metadata?: Record<string, MetadataValue>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}

export class NotificationQueryDTO {
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsDateString()
  dateFrom?: Date;

  @IsOptional()
  @IsDateString()
  dateTo?: Date;
}
