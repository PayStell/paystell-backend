import { IsString, IsOptional, IsDateString, IsObject } from "class-validator"

export class CreateReferralDTO {
  @IsString()
  referralCode!: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}

