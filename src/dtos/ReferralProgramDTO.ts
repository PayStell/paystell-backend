import { IsString, IsOptional, IsEnum, IsDateString, IsObject, IsNumber, Min } from "class-validator"
import { ProgramStatus } from "../enums/ProgramStatus"
import { ProgramConditions } from "src/interfaces/ProgramConditions"

export class CreateReferralProgramDTO {
  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsNumber()
  @Min(0)
  referrerReward!: number

  @IsNumber()
  @Min(0)
  refereeReward!: number

  @IsOptional()
  @IsString()
  rewardCurrency?: string

  @IsOptional()
  @IsObject()
  conditions?: ProgramConditions

  @IsDateString()
  startDate!: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxRewardsPerUser?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalBudget?: number
}

export class UpdateReferralProgramDTO {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  referrerReward?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  refereeReward?: number

  @IsOptional()
  @IsString()
  rewardCurrency?: string

  @IsOptional()
  @IsObject()
  conditions?: ProgramConditions

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsEnum(ProgramStatus)
  status?: ProgramStatus

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxRewardsPerUser?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalBudget?: number
}
