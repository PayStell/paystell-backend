import { IsString, IsOptional, IsEnum, IsDateString, IsObject } from "class-validator"

export class CreateReferralDTO {
  @IsString()
  referralCode!: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}

