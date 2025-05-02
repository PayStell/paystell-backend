import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsEmail,
  ValidateNested,
} from "class-validator";
import { IsStellarAddress } from "../validators/IsStellarAddress";

export class MerchantRegistrationDTO {
  @IsNotEmpty()
  @IsStellarAddress()
  merchantAddress: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class TokenSupportDTO {
  @IsNotEmpty()
  @IsStellarAddress()
  merchantAddress: string;

  @IsNotEmpty()
  @IsStellarAddress()
  tokenAddress: string;
}

export class PaymentOrderDTO {
  @IsNotEmpty()
  @IsStellarAddress()
  merchantAddress: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsNotEmpty()
  @IsStellarAddress()
  tokenAddress: string;

  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsNotEmpty()
  @IsNumber()
  nonce: number;

  @IsNotEmpty()
  @IsNumber()
  expiration: number;
}

export class PaymentProcessingDTO {
  @IsNotEmpty()
  @IsStellarAddress()
  payerAddress: string;

  @IsNotEmpty()
  @ValidateNested()
  paymentOrder: PaymentOrderDTO;

  @IsNotEmpty()
  @IsString()
  signature: string;

  @IsNotEmpty()
  @IsString()
  merchantPublicKey: string;

  @IsOptional()
  @IsString()
  memo?: string;
}
