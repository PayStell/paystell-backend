import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class AssetDTO {
  @IsString()
  code: string;

  @IsString()
  @IsOptional()
  issuer?: string;
}

export class CreateAssetConfigDTO {
  @IsString()
  merchantId: string;

  @ValidateNested()
  @Type(() => AssetDTO)
  asset: AssetDTO;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsString()
  @IsOptional()
  minAmount?: string;

  @IsString()
  @IsOptional()
  maxAmount?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  priority?: number;

  @IsBoolean()
  @IsOptional()
  autoConvert?: boolean;

  @ValidateNested()
  @Type(() => AssetDTO)
  @IsOptional()
  settlementAsset?: AssetDTO;
}

export class UpdateAssetConfigDTO {
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsString()
  @IsOptional()
  minAmount?: string;

  @IsString()
  @IsOptional()
  maxAmount?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  priority?: number;

  @IsBoolean()
  @IsOptional()
  autoConvert?: boolean;

  @ValidateNested()
  @Type(() => AssetDTO)
  @IsOptional()
  settlementAsset?: AssetDTO;
}

export class MultiAssetPaymentDTO {
  @IsString()
  merchantId: string;

  @IsString()
  amount: string;

  @ValidateNested()
  @Type(() => AssetDTO)
  sourceAsset: AssetDTO;

  @ValidateNested()
  @Type(() => AssetDTO)
  @IsOptional()
  destinationAsset?: AssetDTO;

  @IsString()
  sourceAddress: string;

  @IsString()
  destinationAddress: string;

  @IsString()
  @IsOptional()
  memo?: string;
}

export class GetExchangeRateDTO {
  @ValidateNested()
  @Type(() => AssetDTO)
  sourceAsset: AssetDTO;

  @ValidateNested()
  @Type(() => AssetDTO)
  destinationAsset: AssetDTO;

  @IsString()
  amount: string;
}
