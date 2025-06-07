import { IsEnum, IsOptional, IsString } from "class-validator"
import { ReferralStatus } from "../enums/ReferralStatus"

export class ReferralQueryDTO {
  @IsOptional()
  @IsEnum(ReferralStatus)
  status?: ReferralStatus

  @IsOptional()
  @IsString()
  page?: string

  @IsOptional()
  @IsString()
  limit?: string
}
