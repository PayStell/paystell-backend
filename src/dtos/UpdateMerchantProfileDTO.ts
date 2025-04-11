import { IsString, IsEmail, IsOptional, IsUrl, Matches } from "class-validator";

export class UpdateMerchantProfileDTO {
  @IsString()
  @IsOptional()
  business_name?: string;

  @IsString()
  @IsOptional()
  business_description?: string;

  @IsString()
  @IsOptional()
  business_address?: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: "Invalid phone number format",
  })
  @IsOptional()
  business_phone?: string;

  @IsEmail()
  @IsOptional()
  business_email?: string;

  @IsUrl()
  @IsOptional()
  business_logo_url?: string;
}
