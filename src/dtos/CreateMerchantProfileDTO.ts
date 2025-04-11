import { IsString, IsEmail, IsUrl, Matches } from "class-validator";

export class CreateMerchantProfileDTO {
  @IsString()
  business_name?: string;

  @IsString()
  business_description?: string;

  @IsString()
  business_address?: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: "Invalid phone number format",
  })
  business_phone?: string;

  @IsEmail()
  business_email?: string;

  @IsUrl()
  business_logo_url?: string;
}
