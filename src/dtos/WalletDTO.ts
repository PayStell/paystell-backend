import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsUUID,
  IsDecimal,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  Length,
  IsDateString,
} from "class-validator";
import { Type, Transform } from "class-transformer";

// Type definitions for better type safety
export interface WalletDisplayPreferences {
  currency?: string;
  theme?: "light" | "dark";
  language?: string;
  showBalanceInFiat?: boolean;
}

export interface TransactionMetadata {
  stellarResult?: Record<string, unknown>;
  stellarTransaction?: Record<string, unknown>;
  syncedFromBlockchain?: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface ApiMetadata {
  requestId?: string;
  processingTime?: number;
  version?: string;
  [key: string]: unknown;
}

export interface ErrorDetails {
  field?: string;
  value?: unknown;
  constraint?: string;
  [key: string]: unknown;
}

// Enums
export enum WalletStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  NEEDS_VERIFICATION = "NEEDS_VERIFICATION",
}

export enum TransactionType {
  PAYMENT = "payment",
  CREATE_ACCOUNT = "create_account",
  PATH_PAYMENT = "path_payment",
}

export enum TransactionStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

// Wallet DTOs
export class CreateWalletDto {
  @IsString()
  userId: string;
}

export class WalletResponseDto {
  @IsUUID()
  id: string;

  @IsEnum(WalletStatus)
  status: WalletStatus;

  @IsString()
  publicKey: string;

  @IsBoolean()
  isVerified: boolean;

  @IsOptional()
  @IsObject()
  settings?: {
    displayPreferences?: WalletDisplayPreferences;
    notifications?: boolean;
  };

  @IsString()
  createdAt: string;

  @IsString()
  updatedAt: string;
}

export class UpdateWalletSettingsDto {
  @IsOptional()
  @IsObject()
  displayPreferences?: {
    currency?: string;
    theme?: "light" | "dark";
    language?: string;
    showBalanceInFiat?: boolean;
  };

  @IsOptional()
  @IsBoolean()
  notifications?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;
}

export class WalletAddressResponseDto {
  @IsString()
  address: string;
}

// Balance DTOs
export class BalanceDto {
  @IsString()
  assetCode: string;

  @IsOptional()
  @IsString()
  assetIssuer?: string;

  @IsDecimal({ decimal_digits: "0,7" })
  balance: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,7" })
  buyingLiabilities?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,7" })
  sellingLiabilities?: string;
}

// Transaction DTOs
export class SendPaymentDto {
  @IsString()
  @Length(56, 56, {
    message: "Destination address must be exactly 56 characters",
  })
  destinationAddress: string;

  @IsDecimal({ decimal_digits: "0,7" })
  @Transform(({ value }) => Number.parseFloat(value))
  amount: string;

  @IsOptional()
  @IsString()
  @Length(1, 12)
  assetCode?: string = "XLM";

  @IsOptional()
  @IsString()
  @Length(56, 56)
  assetIssuer?: string;

  @IsOptional()
  @IsString()
  @Length(0, 28, { message: "Memo must be 28 characters or less" })
  memo?: string;

  @IsOptional()
  @IsObject()
  metadata?: TransactionMetadata;
}

export class TransactionDto {
  @IsUUID()
  id: string;

  @IsString()
  hash: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsEnum(TransactionStatus)
  status: TransactionStatus;

  @IsString()
  sourceAccount: string;

  @IsString()
  destinationAccount: string;

  @IsDecimal({ decimal_digits: "0,7" })
  amount: string;

  @IsString()
  assetCode: string;

  @IsOptional()
  @IsString()
  assetIssuer?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,7" })
  fee?: string;

  @IsOptional()
  @IsString()
  memo?: string;

  @IsOptional()
  @IsObject()
  metadata?: TransactionMetadata;

  @IsDateString()
  createdAt: string;
}

export class GetTransactionsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => Number.parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => Number.parseInt(value))
  limit?: number = 20;

  @IsOptional()
  @IsEnum(["asc", "desc"])
  sort?: "asc" | "desc" = "desc";

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  assetCode?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class PaginationDto {
  @IsInt()
  @Min(1)
  page: number;

  @IsInt()
  @Min(1)
  @Max(100)
  limit: number;

  @IsInt()
  @Min(0)
  total: number;

  @IsInt()
  @Min(0)
  totalPages: number;

  @IsOptional()
  @IsString()
  nextCursor?: string;

  @IsOptional()
  @IsString()
  prevCursor?: string;
}

export class TransactionResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionDto)
  transactions: TransactionDto[];

  @ValidateNested()
  @Type(() => PaginationDto)
  pagination: PaginationDto;
}

// Common Response DTOs
export class ApiResponseDto<T> {
  @IsOptional()
  data?: T;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsObject()
  meta?: ApiMetadata;

  @IsDateString()
  timestamp: string;
}

export class ErrorResponseDto {
  @IsString()
  error: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsObject()
  details?: ErrorDetails;

  @IsDateString()
  timestamp: string;
}

// Utility functions
export const createApiResponse = <T>(
  data?: T,
  message?: string,
  error?: string,
  meta?: ApiMetadata,
) => ({
  data,
  message,
  error,
  meta,
  timestamp: new Date().toISOString(),
});

export const createErrorResponse = (
  error: string,
  code?: string,
  details?: ErrorDetails,
) => ({
  error,
  code,
  details,
  timestamp: new Date().toISOString(),
});
