import {
  IsString,
  IsOptional,
  IsDateString,
  IsObject,
  Matches,
  Length,
} from "class-validator";

export class CreateReferralDTO {
  @IsString()
  @Matches(/^REF\d+[A-F0-9]+$/, { message: "Invalid referral code format" })
  @Length(10, 50, {
    message: "Referral code must be between 10 and 50 characters",
  })
  referralCode!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
