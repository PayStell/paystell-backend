import { IsNumber, IsEnum, IsBoolean, IsArray, IsOptional, IsString, IsObject, Min, Max, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { RiskLevel, FraudAlertStatus } from '../entities/FraudAlert';
import { Transaction } from '../entities/Transaction';

export class FraudCheckResultDTO {
  @IsNumber()
  @Min(0)
  @Max(100)
  riskScore: number;

  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  @IsBoolean()
  shouldBlock: boolean;

  @IsArray()
  @IsString({ each: true })
  rulesTriggered: string[];

  @IsBoolean()
  requiresReview: boolean;

  @IsOptional()
  @IsObject()
  alert?: any; // FraudAlert object
}

export class TransactionContextDTO {
  @ValidateNested()
  @Type(() => Transaction)
  transaction: Transaction;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  deviceFingerprint?: string;
}

export class RiskLevelBreakdownDTO {
  @IsNumber()
  @Min(0)
  low: number;

  @IsNumber()
  @Min(0)
  medium: number;

  @IsNumber()
  @Min(0)
  high: number;

  @IsNumber()
  @Min(0)
  critical: number;
}

export class TopTriggeredRuleDTO {
  @IsString()
  rule: string;

  @IsNumber()
  @Min(0)
  count: number;
}

export class FraudStatsDTO {
  @IsNumber()
  @Min(0)
  totalAlerts: number;

  @IsNumber()
  @Min(0)
  blockedTransactions: number;

  @IsNumber()
  @Min(0)
  pendingReviews: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  averageRiskScore: number;

  @ValidateNested()
  @Type(() => RiskLevelBreakdownDTO)
  riskLevelBreakdown: RiskLevelBreakdownDTO;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopTriggeredRuleDTO)
  topTriggeredRules: TopTriggeredRuleDTO[];

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsNumber()
  @Min(0)
  blockedAmount: number;
}

export class ReviewFraudAlertDTO {
  @IsEnum(FraudAlertStatus)
  status: FraudAlertStatus;

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class GetFraudAlertsQueryDTO {
  @IsOptional()
  @IsString()
  merchantId?: string;

  @IsOptional()
  @IsEnum(FraudAlertStatus)
  status?: FraudAlertStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class GetFraudStatsQueryDTO {
  @IsOptional()
  @IsString()
  merchantId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number;
}

export class CreateMerchantFraudConfigDTO {
  @IsUUID()
  merchantId: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  lowRiskThreshold?: number = 50;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  mediumRiskThreshold?: number = 70;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  highRiskThreshold?: number = 85;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  criticalRiskThreshold?: number = 95;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1000000)
  @IsOptional()
  maxTransactionAmount?: number = 1000;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(10000000)
  @IsOptional()
  dailyLimit?: number = 5000;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  maxTransactionsPerHour?: number = 10;

  @IsNumber()
  @Min(1)
  @Max(10000)
  @IsOptional()
  maxTransactionsPerDay?: number = 50;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  maxSameAmountInHour?: number = 3;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  maxFailedAttemptsPerHour?: number = 5;

  @IsBoolean()
  @IsOptional()
  autoBlockHighRisk?: boolean = true;

  @IsBoolean()
  @IsOptional()
  autoBlockCritical?: boolean = true;

  @IsBoolean()
  @IsOptional()
  requireManualReview?: boolean = false;
}

export class UpdateMerchantFraudConfigDTO {
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  lowRiskThreshold?: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  mediumRiskThreshold?: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  highRiskThreshold?: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  criticalRiskThreshold?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1000000)
  @IsOptional()
  maxTransactionAmount?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(10000000)
  @IsOptional()
  dailyLimit?: number;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  maxTransactionsPerHour?: number;

  @IsNumber()
  @Min(1)
  @Max(10000)
  @IsOptional()
  maxTransactionsPerDay?: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  maxSameAmountInHour?: number;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  maxFailedAttemptsPerHour?: number;

  @IsBoolean()
  @IsOptional()
  autoBlockHighRisk?: boolean;

  @IsBoolean()
  @IsOptional()
  autoBlockCritical?: boolean;

  @IsBoolean()
  @IsOptional()
  requireManualReview?: boolean;
}