import { IsDateString, IsEnum, IsObject, IsOptional } from "class-validator"
import { ReferralStatus } from "../enums/ReferralStatus"

export class UpdateReferralDTO {
  @IsOptional()
  @IsEnum(ReferralStatus)
  status?: ReferralStatus

  @IsOptional()
  @IsDateString()
  conversionDate?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}