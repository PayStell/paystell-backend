import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsUrl,
  Matches,
} from "class-validator";

export class CreateMerchantDTO {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

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
