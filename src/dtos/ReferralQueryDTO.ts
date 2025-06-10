import { IsEnum, IsOptional, IsString, IsNumberString, Min, Max } from "class-validator"
import { Transform } from "class-transformer"
import { ReferralStatus } from "src/enums/ReferralStatus"

 export class ReferralQueryDTO {
   @IsOptional()
   @IsEnum(ReferralStatus)
   status?: ReferralStatus

  @IsOptional()
  @IsNumberString({}, { message: 'Page must be a valid number' })
  @Transform(({ value }) => parseInt(value))
  @Min(1, { message: 'Page must be at least 1' })
  page?: number

  @IsOptional()
  @IsNumberString({}, { message: 'Limit must be a valid number' })
  @Transform(({ value }) => parseInt(value))
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number
 }