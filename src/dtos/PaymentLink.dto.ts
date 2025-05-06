import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDate,
  Min,
  MaxLength,
  IsInt,
} from "class-validator";
import { Type } from "class-transformer";

export class CreatePaymentLinkDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(50)
  sku: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @MaxLength(3)
  currency: string;

  @IsEnum(["active", "inactive", "expired"])
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsDate()
  expirationDate?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}

export class UpdatePaymentLinkDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsEnum(["active", "inactive", "expired"])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsDate()
  expirationDate?: Date;
}
